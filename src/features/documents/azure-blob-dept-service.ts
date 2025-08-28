"use server";

import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";

// Azure Blob Storage接続設定
let blobServiceClient: BlobServiceClient;

function getBlobServiceClient(): BlobServiceClient {
  if (!blobServiceClient) {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      console.log("Azure Blob Storage Config:", {
        connectionString: "未設定",
        accountName: "不明"
      });
      throw new Error('AZURE_STORAGE_CONNECTION_STRING environment variable is not set');
    }
    
    console.log("Azure Blob Storage Config:", {
      connectionString: "設定済み",
      accountName: connectionString.match(/AccountName=([^;]+)/)?.[1] || "不明"
    });
    
    // Azure Blob Storage SDKの設定を改善（日本語ファイル名サポート強化）
    blobServiceClient = BlobServiceClient.fromConnectionString(connectionString, {
      userAgentOptions: {
        userAgentPrefix: "Azure-Blob-Storage-Japanese-Support"
      }
    });
  }
  return blobServiceClient;
}

// 環境変数のチェックは関数内で行う

// コンテナを作成（存在しない場合）
export async function createContainerIfNotExists(containerName: string): Promise<void> {
  try {
    console.log(`Attempting to create container: ${containerName}`);
    const containerClient = getBlobServiceClient().getContainerClient(containerName);
    
    // コンテナの存在確認
    const exists = await containerClient.exists();
    console.log(`Container '${containerName}' exists: ${exists}`);
    
    if (!exists) {
      console.log(`Creating container: ${containerName}`);
      await containerClient.createIfNotExists();
      console.log(`Container '${containerName}' created successfully`);
    } else {
      console.log(`Container '${containerName}' already exists`);
    }
  } catch (error) {
    console.error(`Error creating container '${containerName}':`, error);
    throw new Error(`コンテナ '${containerName}' の作成に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`);
  }
}

// コンテナの存在確認
export async function containerExists(containerName: string): Promise<boolean> {
  try {
    const containerClient = getBlobServiceClient().getContainerClient(containerName);
    const exists = await containerClient.exists();
    return exists;
  } catch (error) {
    console.error(`Error checking container existence '${containerName}':`, error);
    return false;
  }
}

// コンテナ一覧を取得
export async function listContainers(): Promise<string[]> {
  try {
    const containers: string[] = [];
    for await (const container of getBlobServiceClient().listContainers()) {
      containers.push(container.name);
    }
    return containers;
  } catch (error) {
    console.error("Error listing containers:", error);
    throw new Error("コンテナ一覧の取得に失敗しました");
  }
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

// ファイルをアップロード（エイリアス関数）
export async function uploadFileToBlob(
  containerName: string, 
  fileName: string, 
  fileData: ArrayBuffer,
  contentType?: string
): Promise<{ url: string; blobName: string }> {
  return uploadFile(containerName, fileName, fileData, contentType);
}

// ファイルをアップロード
export async function uploadFile(
  containerName: string, 
  fileName: string, 
  fileData: ArrayBuffer,
  contentType?: string
): Promise<{ url: string; blobName: string }> {
  try {
    console.log(`Starting file upload to container: ${containerName}, file: ${fileName}`);
    
    // コンテナが存在しない場合は作成
    await createContainerIfNotExists(containerName);
    
    const containerClient = getBlobServiceClient().getContainerClient(containerName);
    // ファイル名を安全な形式に変換（日本語文字を保持）
    const safeFileName = sanitizeFileNameForBlob(fileName);
    const blobName = `${Date.now()}_${safeFileName}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    console.log(`Uploading file as blob: ${blobName}, size: ${fileData.byteLength} bytes`);
    console.log(`Original file name: ${fileName}`);
    console.log(`Safe file name: ${safeFileName}`);
    
    // ファイルをアップロード
    await blockBlobClient.upload(fileData, fileData.byteLength, {
      blobHTTPHeaders: {
        blobContentType: contentType || 'application/octet-stream',
      },
      metadata: {
        originalName: Buffer.from(fileName, 'utf-8').toString('base64'), // 元のファイル名をBase64エンコードして保存
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
    console.error("Error uploading file:", error);
    throw new Error(`ファイルのアップロードに失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`);
  }
}

// ファイルをダウンロード
export async function downloadFile(containerName: string, blobName: string): Promise<{
  data: ArrayBuffer;
  contentType: string;
  originalName: string;
}> {
  try {
    const containerClient = getBlobServiceClient().getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    const downloadResponse = await blockBlobClient.download();
    const arrayBuffer = await streamToArrayBuffer(downloadResponse.readableStreamBody!);
    
    // メタデータから元のファイル名を取得
    const properties = await blockBlobClient.getProperties();
    let originalName = properties.metadata?.originalName;
    
    // メタデータに元のファイル名がない場合は、blobNameから復元を試行
    if (!originalName) {
      // blobNameがBase64エンコードされている場合の復元
      const parts = blobName.split('_');
      if (parts.length > 1) {
        try {
          const encodedFileName = parts.slice(1).join('_'); // タイムスタンプ以降を取得
          originalName = Buffer.from(encodedFileName, 'base64').toString('utf-8');
        } catch (error) {
          // Base64デコードに失敗した場合は、blobNameからタイムスタンプを除去
          originalName = blobName.replace(/^\d+_/, '');
        }
      } else {
        originalName = blobName;
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
      data: arrayBuffer,
      contentType: downloadResponse.contentType || 'application/octet-stream',
      originalName: originalName,
    };
  } catch (error) {
    console.error("Error downloading file:", error);
    throw new Error("ファイルのダウンロードに失敗しました");
  }
}

// ファイルを削除
export async function deleteFile(containerName: string, blobName: string): Promise<void> {
  try {
    const containerClient = getBlobServiceClient().getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    await blockBlobClient.delete();
  } catch (error) {
    console.error("Error deleting file:", error);
    throw new Error("ファイルの削除に失敗しました");
  }
}

// コンテナ内のファイル一覧を取得
export async function listFiles(containerName: string): Promise<Array<{
  name: string;
  url: string;
  size: number;
  lastModified: Date;
  contentType: string;
}>> {
  try {
    const containerClient = getBlobServiceClient().getContainerClient(containerName);
    const files: Array<{
      name: string;
      url: string;
      size: number;
      lastModified: Date;
      contentType: string;
    }> = [];
    
    for await (const blob of containerClient.listBlobsFlat()) {
      const blockBlobClient = containerClient.getBlockBlobClient(blob.name);
      files.push({
        name: blob.name,
        url: blockBlobClient.url,
        size: blob.properties.contentLength || 0,
        lastModified: blob.properties.lastModified || new Date(),
        contentType: blob.properties.contentType || 'application/octet-stream',
      });
    }
    
    return files;
  } catch (error) {
    console.error("Error listing files:", error);
    throw new Error("ファイル一覧の取得に失敗しました");
  }
}

// StreamをArrayBufferに変換するヘルパー関数
async function streamToArrayBuffer(stream: NodeJS.ReadableStream): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('end', () => {
      const buffer = Buffer.concat(chunks);
      resolve(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
    });
    stream.on('error', reject);
  });
}
