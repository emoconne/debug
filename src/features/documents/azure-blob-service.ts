"use server";

import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import { StorageSharedKeyCredential } from "@azure/storage-blob";
import { generateBlobSASQueryParameters } from "@azure/storage-blob";
import { BlobSASPermissions } from "@azure/storage-blob";

export interface BlobFile {
  name: string;
  url: string;
  size: number;
  lastModified: Date;
  contentType: string;
}

// サービスインスタンスを作成
function createBlobService() {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'documents';

  if (!connectionString) {
    throw new Error('Azure Storage connection string is not configured');
  }

  // Azure Blob Storage SDKの設定を改善（日本語ファイル名サポート強化）
  const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString, {
    // 日本語ファイル名のサポートを強化
    userAgentOptions: {
      userAgentPrefix: "Azure-Blob-Storage-Japanese-Support"
    }
  });
  const containerClient = blobServiceClient.getContainerClient(containerName);
  
  return { blobServiceClient, containerClient };
}

// ファイル名を安全な形式に変換する関数（日本語対応）
function sanitizeFileNameForBlob(fileName: string): string {
  // 日本語文字を保持し、危険な文字のみを除去
  return fileName
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') // 危険な文字をアンダースコアに変換
    .replace(/[()&]/g, '_') // 括弧とアンパサンドもアンダースコアに変換（Azure Blob Storageで問題になる可能性があるため）
    .replace(/_{2,}/g, '_') // 連続するアンダースコアを1つに
    .replace(/^_+|_+$/g, '') // 先頭と末尾のアンダースコアを除去
    .trim(); // 前後の空白を除去
}

// URLエンコーディングを安全に行う関数
function encodeBlobName(blobName: string): string {
  // Azure Blob Storageでは、URLエンコーディングされたファイル名が使用される
  // 日本語文字はUTF-8でエンコードされる
  return encodeURIComponent(blobName);
}

// ファイルをアップロード
export async function uploadFile(file: File, userId: string): Promise<{ url: string; blobName: string }> {
  const { containerClient } = createBlobService();
  const timestamp = Date.now();
  // ファイル名を安全な形式に変換（日本語文字を保持）
  const safeFileName = sanitizeFileNameForBlob(file.name);
  const blobName = `${userId}/${timestamp}_${safeFileName}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  const arrayBuffer = await file.arrayBuffer();
  await blockBlobClient.upload(arrayBuffer, arrayBuffer.byteLength, {
    blobHTTPHeaders: {
      blobContentType: file.type,
    },
    metadata: {
      originalName: Buffer.from(file.name, 'utf-8').toString('base64'), // 元のファイル名をBase64エンコードして保存
      uploadedBy: userId,
      uploadedAt: new Date().toISOString(),
      fileSize: file.size.toString(),
    },
  });

  return {
    url: blockBlobClient.url,
    blobName: blobName,
  };
}

// ファイルをダウンロード
export async function downloadFile(blobName: string): Promise<{ data: ArrayBuffer; contentType: string; originalName: string }> {
  const { containerClient } = createBlobService();
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  const downloadResponse = await blockBlobClient.download();
  
  if (!downloadResponse.readableStreamBody) {
    throw new Error('File not found');
  }

  const chunks: Uint8Array[] = [];
  for await (const chunk of downloadResponse.readableStreamBody) {
    // chunkをUint8Arrayに変換（より安全な方法）
    let uint8Chunk: Uint8Array;
    if (chunk instanceof Uint8Array) {
      uint8Chunk = chunk;
    } else if (typeof chunk === 'string') {
      uint8Chunk = new TextEncoder().encode(chunk);
    } else {
      uint8Chunk = new Uint8Array(chunk);
    }
    chunks.push(uint8Chunk);
  }

  const data = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    data.set(chunk, offset);
    offset += chunk.length;
  }

  const properties = await blockBlobClient.getProperties();
  let originalName = properties.metadata?.originalName;
  
  // メタデータに元のファイル名がない場合は、blobNameから復元を試行
  if (!originalName) {
    // blobNameがBase64エンコードされている場合の復元
    const parts = blobName.split('/');
    if (parts.length > 1) {
      const fileNamePart = parts[parts.length - 1]; // 最後の部分（ファイル名部分）
      const fileNameParts = fileNamePart.split('_');
      if (fileNameParts.length > 1) {
        try {
          const encodedFileName = fileNameParts.slice(1).join('_'); // タイムスタンプ以降を取得
          originalName = Buffer.from(encodedFileName, 'base64').toString('utf-8');
        } catch (error) {
          // Base64デコードに失敗した場合は、blobNameからタイムスタンプを除去
          originalName = blobName.split('/').pop() || 'unknown';
        }
      } else {
        originalName = fileNamePart;
      }
    } else {
      originalName = blobName.split('/').pop() || 'unknown';
    }
  } else {
    // メタデータのoriginalNameがBase64エンコードされている場合の復元
    try {
      originalName = Buffer.from(originalName, 'base64').toString('utf-8');
    } catch (error) {
      // Base64デコードに失敗した場合は、そのまま使用
      console.warn('Failed to decode originalName from base64:', originalName);
    }
  }

  return {
    data: data.buffer,
    contentType: properties.contentType || 'application/octet-stream',
    originalName,
  };
}

// 指定されたコンテナからファイルをダウンロード
export async function downloadFileFromContainer(containerName: string, blobName: string): Promise<{ data: ArrayBuffer; contentType: string; originalName: string }> {
  try {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error('Azure Storage connection string is not configured');
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    // コンテナの存在確認
    const containerExists = await containerClient.exists();
    if (!containerExists) {
      throw new Error(`Container '${containerName}' does not exist`);
    }
    
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    // ファイルの存在確認
    const blobExists = await blockBlobClient.exists();
    if (!blobExists) {
      throw new Error(`Blob '${blobName}' does not exist in container '${containerName}'`);
    }
    
    const downloadResponse = await blockBlobClient.download();
    
    if (!downloadResponse.readableStreamBody) {
      throw new Error('File not found');
    }

    const chunks: Uint8Array[] = [];
    for await (const chunk of downloadResponse.readableStreamBody) {
      // chunkをUint8Arrayに変換（より安全な方法）
      let uint8Chunk: Uint8Array;
      if (chunk instanceof Uint8Array) {
        uint8Chunk = chunk;
      } else if (typeof chunk === 'string') {
        uint8Chunk = new TextEncoder().encode(chunk);
      } else {
        uint8Chunk = new Uint8Array(chunk);
      }
      chunks.push(uint8Chunk);
    }

    const data = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) {
      data.set(chunk, offset);
      offset += chunk.length;
    }

    const properties = await blockBlobClient.getProperties();
    const originalName = properties.metadata?.originalName || blobName.split('/').pop() || 'unknown';

    return {
      data: data.buffer,
      contentType: properties.contentType || 'application/octet-stream',
      originalName,
    };
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
}

// ファイルを削除
export async function deleteFile(blobName: string): Promise<void> {
  const { containerClient } = createBlobService();
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  await blockBlobClient.delete();
}

// 指定されたコンテナからファイルを削除
export async function deleteFileFromContainer(containerName: string, blobName: string): Promise<void> {
  try {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error('Azure Storage connection string is not configured');
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    // コンテナの存在確認
    const containerExists = await containerClient.exists();
    if (!containerExists) {
      throw new Error(`Container '${containerName}' does not exist`);
    }
    
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    // ファイルの存在確認
    const blobExists = await blockBlobClient.exists();
    if (!blobExists) {
      throw new Error(`Blob '${blobName}' does not exist in container '${containerName}'`);
    }
    
    await blockBlobClient.delete();
    console.log(`File '${blobName}' deleted successfully from container '${containerName}'`);
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
}

// ユーザーのファイル一覧を取得
export async function listUserFiles(userId: string): Promise<BlobFile[]> {
  const { containerClient } = createBlobService();
  const files: BlobFile[] = [];
  
  for await (const blob of containerClient.listBlobsFlat({ prefix: `${userId}/` })) {
    if (blob.metadata) {
      files.push({
        name: blob.metadata.originalName || blob.name,
        url: `${containerClient.url}/${blob.name}`,
        size: blob.properties.contentLength || 0,
        lastModified: blob.properties.lastModified || new Date(),
        contentType: blob.properties.contentType || 'application/octet-stream',
      });
    }
  }

  return files.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
}

// 全ファイル一覧を取得（管理者用）
export async function listAllFiles(): Promise<BlobFile[]> {
  const { containerClient } = createBlobService();
  const files: BlobFile[] = [];
  
  for await (const blob of containerClient.listBlobsFlat()) {
    if (blob.metadata) {
      files.push({
        name: blob.metadata.originalName || blob.name,
        url: `${containerClient.url}/${blob.name}`,
        size: blob.properties.contentLength || 0,
        lastModified: blob.properties.lastModified || new Date(),
        contentType: blob.properties.contentType || 'application/octet-stream',
      });
    }
  }

  return files.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
}

// 指定されたコンテナのファイル一覧を取得
export async function listFiles(containerName: string): Promise<BlobFile[]> {
  try {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error('Azure Storage connection string is not configured');
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    // コンテナの存在確認
    const containerExists = await containerClient.exists();
    if (!containerExists) {
      console.error(`Container '${containerName}' does not exist`);
      return [];
    }
    
    const files: BlobFile[] = [];
    
    for await (const blob of containerClient.listBlobsFlat()) {
      if (blob.metadata) {
        files.push({
          name: blob.metadata.originalName || blob.name,
          url: `${containerClient.url}/${blob.name}`,
          size: blob.properties.contentLength || 0,
          lastModified: blob.properties.lastModified || new Date(),
          contentType: blob.properties.contentType || 'application/octet-stream',
        });
      }
    }

    return files.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
  } catch (error) {
    console.error('Error listing files:', error);
    throw error;
  }
}

// ファイルの存在確認
export async function fileExists(blobName: string): Promise<boolean> {
  const { containerClient } = createBlobService();
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  return await blockBlobClient.exists();
}

// 指定されたコンテナからファイルを取得（テキスト用）
export async function getBlobContent(containerName: string, blobName: string): Promise<string | null> {
  try {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error('Azure Storage connection string is not configured');
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    // コンテナの存在確認
    const containerExists = await containerClient.exists();
    if (!containerExists) {
      console.error(`Container '${containerName}' does not exist`);
      return null;
    }
    
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    // ファイルの存在確認
    const blobExists = await blockBlobClient.exists();
    if (!blobExists) {
      console.error(`Blob '${blobName}' does not exist in container '${containerName}'`);
      return null;
    }
    
    const downloadResponse = await blockBlobClient.download();
    
    if (!downloadResponse.readableStreamBody) {
      return null;
    }

    const chunks: Uint8Array[] = [];
    for await (const chunk of downloadResponse.readableStreamBody) {
      // chunkをUint8Arrayに変換（より安全な方法）
      let uint8Chunk: Uint8Array;
      if (chunk instanceof Uint8Array) {
        uint8Chunk = chunk;
      } else if (typeof chunk === 'string') {
        uint8Chunk = new TextEncoder().encode(chunk);
      } else {
        uint8Chunk = new Uint8Array(chunk);
      }
      chunks.push(uint8Chunk);
    }

    const data = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) {
      data.set(chunk, offset);
      offset += chunk.length;
    }

    return new TextDecoder().decode(data);
  } catch (error) {
    console.error('Error getting blob content:', error);
    return null;
  }
}

// 指定されたコンテナからバイナリファイルを取得
export async function getBlobBinaryContent(containerName: string, blobName: string): Promise<ArrayBuffer | null> {
  try {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error('Azure Storage connection string is not configured');
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    // コンテナの存在確認
    const containerExists = await containerClient.exists();
    if (!containerExists) {
      console.error(`Container '${containerName}' does not exist`);
      return null;
    }
    
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    // ファイルの存在確認
    const blobExists = await blockBlobClient.exists();
    if (!blobExists) {
      console.error(`Blob '${blobName}' does not exist in container '${containerName}'`);
      return null;
    }
    
    const downloadResponse = await blockBlobClient.download();
    
    if (!downloadResponse.readableStreamBody) {
      return null;
    }

    const chunks: Uint8Array[] = [];
    for await (const chunk of downloadResponse.readableStreamBody) {
      // chunkをUint8Arrayに変換（より安全な方法）
      let uint8Chunk: Uint8Array;
      if (chunk instanceof Uint8Array) {
        uint8Chunk = chunk;
      } else if (typeof chunk === 'string') {
        uint8Chunk = new TextEncoder().encode(chunk);
      } else {
        uint8Chunk = new Uint8Array(chunk);
      }
      chunks.push(uint8Chunk);
    }

    const data = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) {
      data.set(chunk, offset);
      offset += chunk.length;
    }

    return data.buffer;
  } catch (error) {
    console.error('Error getting blob binary content:', error);
    return null;
  }
}

// 指定されたコンテナにファイルをアップロード（文字列用）
export async function uploadFileToBlob(containerName: string, blobName: string, content: string): Promise<void> {
  try {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error('Azure Storage connection string is not configured');
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    // コンテナが存在しない場合は作成
    try {
      console.log(`Creating container '${containerName}' if it doesn't exist...`);
      await containerClient.createIfNotExists();
      console.log(`Container '${containerName}' created or already exists`);
    } catch (containerError) {
      console.error(`Error creating container '${containerName}':`, containerError);
      throw containerError;
    }
    
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    const buffer = new TextEncoder().encode(content);
    console.log(`Uploading ${buffer.length} bytes to ${containerName}/${blobName}`);
    await blockBlobClient.upload(buffer, buffer.length, {
      blobHTTPHeaders: {
        blobContentType: 'text/plain',
      },
      metadata: {
        originalName: blobName.split('/').pop() || 'unknown',
        uploadedAt: new Date().toISOString(),
      },
    });
    
    console.log(`File uploaded successfully to ${containerName}/${blobName}`);
  } catch (error) {
    console.error('Error uploading file to blob:', error);
    throw error;
  }
}

// 指定されたコンテナにファイルをアップロード（ArrayBuffer用）
export async function uploadFileToBlobWithArrayBuffer(
  containerName: string, 
  fileName: string, 
  fileData: ArrayBuffer,
  contentType?: string
): Promise<{ url: string; blobName: string }> {
  try {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error('Azure Storage connection string is not configured');
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    // コンテナが存在しない場合は作成
    try {
      console.log(`Creating container '${containerName}' if it doesn't exist...`);
      await containerClient.createIfNotExists();
      console.log(`Container '${containerName}' created or already exists`);
    } catch (containerError) {
      console.error(`Error creating container '${containerName}':`, containerError);
      throw containerError;
    }
    
    const blobName = `${Date.now()}_${fileName}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    console.log(`Uploading file as blob: ${blobName}, size: ${fileData.byteLength} bytes`);
    
    // ファイルをアップロード
    await blockBlobClient.upload(fileData, fileData.byteLength, {
      blobHTTPHeaders: {
        blobContentType: contentType || 'application/octet-stream',
      },
      metadata: {
        originalName: fileName,
        uploadedAt: new Date().toISOString(),
        fileSize: fileData.byteLength.toString(),
      },
    });
    
    const url = blockBlobClient.url;
    console.log(`File uploaded successfully. URL: ${url}`);
    
    return {
      url,
      blobName,
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error(`ファイルのアップロードに失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`);
  }
}

// 元のファイルをBLOBにアップロード
export async function uploadOriginalFileToBlob(containerName: string, blobName: string, file: { name: string; type: string; size: number; arrayBuffer: () => Promise<ArrayBuffer> }): Promise<void> {
  try {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error('Azure Storage connection string is not configured');
    }

    // Azure Blob Storage SDKの設定を改善（日本語ファイル名サポート強化）
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString, {
      userAgentOptions: {
        userAgentPrefix: "Azure-Blob-Storage-Japanese-Support"
      }
    });
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    // コンテナの存在確認（作成はスキップ）
    try {
      console.log(`Checking if container '${containerName}' exists...`);
      const containerExists = await containerClient.exists();
      if (!containerExists) {
        throw new Error(`Container '${containerName}' does not exist. Please create it manually.`);
      }
      console.log(`Container '${containerName}' exists`);
    } catch (containerError) {
      console.error(`Error checking container '${containerName}':`, containerError);
      throw containerError;
    }
    
    // blobNameが既にBase64エンコードされている場合はそのまま使用
    const finalBlobName = blobName;
    console.log(`Original blob name: ${blobName}`);
    console.log(`Final blob name: ${finalBlobName}`);
    
    const blockBlobClient = containerClient.getBlockBlobClient(finalBlobName);

    // ファイルサイズのチェック（Azure Blob Storageの制限: 4.75TB）
    if (file.size > 4.75 * 1024 * 1024 * 1024 * 1024) {
      throw new Error('ファイルサイズが大きすぎます。最大4.75TBまでサポートされています。');
    }
    
    // ファイルをArrayBufferに変換
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    
    console.log(`Uploading original file ${file.name} (${buffer.length} bytes) to ${containerName}/${finalBlobName}`);
    console.log(`Block blob client URL: ${blockBlobClient.url}`);
    
    try {
      await blockBlobClient.upload(buffer, buffer.length, {
        blobHTTPHeaders: {
          blobContentType: file.type || 'application/octet-stream',
        },
        metadata: {
          originalName: Buffer.from(file.name, 'utf-8').toString('base64'), // 元のファイル名をBase64エンコードして保存
          uploadedAt: new Date().toISOString(),
          fileSize: file.size.toString(),
        },
      });
      console.log(`Original file uploaded successfully to ${containerName}/${finalBlobName}`);
    } catch (uploadError) {
      console.error('Upload error details:', {
        error: uploadError instanceof Error ? {
          name: uploadError.name,
          message: uploadError.message,
          stack: uploadError.stack
        } : uploadError,
        containerName,
        blobName: finalBlobName,
        fileSize: buffer.length,
        contentType: file.type
      });
      throw uploadError;
    }
  } catch (error) {
    console.error('Error uploading original file to blob:', error);
    throw error;
  }
} 

// SAS URLを生成する共通関数
export const generateSasUrl = async (containerName: string, blobName: string): Promise<string> => {
  try {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error("Azure Storage設定が不完全です");
    }

    // 接続文字列からアカウント名とアカウントキーを抽出
    const accountNameMatch = connectionString.match(/AccountName=([^;]+)/i);
    const accountKeyMatch = connectionString.match(/AccountKey=([^;]+)/i);

    if (!accountNameMatch || !accountKeyMatch) {
      throw new Error("Azure Storage接続文字列の形式が正しくありません");
    }

    const accountName = accountNameMatch[1];
    const accountKey = accountKeyMatch[1];

    // StorageSharedKeyCredentialを作成
    const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
    const blobServiceClient = new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net`,
      sharedKeyCredential
    );

    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // ファイルの存在確認
    const blobExists = await blockBlobClient.exists();
    if (!blobExists) {
      throw new Error("ファイルが見つかりません");
    }

    // SAS署名付きURLを生成（1時間有効）
    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: containerName,
        blobName: blobName,
        permissions: BlobSASPermissions.parse("r"),
        startsOn: new Date(),
        expiresOn: new Date(new Date().valueOf() + 3600 * 1000), // 1時間後
      },
      sharedKeyCredential
    ).toString();

    const sasUrl = `${blockBlobClient.url}?${sasToken}`;

    console.log('SAS URL generated:', {
      containerName,
      blobName,
      sasUrl: sasUrl.substring(0, 100) + '...'
    });

    return sasUrl;
  } catch (error) {
    console.error("SAS URL生成エラー:", error);
    throw error;
  }
}; 