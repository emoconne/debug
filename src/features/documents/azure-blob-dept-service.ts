"use server";

import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";

// Azure Blob Storage接続設定
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

console.log("Azure Blob Storage Config:", {
  connectionString: connectionString ? "設定済み" : "未設定",
  accountName: connectionString ? connectionString.match(/AccountName=([^;]+)/)?.[1] : "不明"
});

if (!connectionString) {
  throw new Error("AZURE_STORAGE_CONNECTION_STRING environment variable is not set");
}

const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
console.log("BlobServiceClient initialized successfully");

// コンテナを作成（存在しない場合）
export async function createContainerIfNotExists(containerName: string): Promise<void> {
  try {
    console.log(`Attempting to create container: ${containerName}`);
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
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
    const containerClient = blobServiceClient.getContainerClient(containerName);
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
    for await (const container of blobServiceClient.listContainers()) {
      containers.push(container.name);
    }
    return containers;
  } catch (error) {
    console.error("Error listing containers:", error);
    throw new Error("コンテナ一覧の取得に失敗しました");
  }
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
    
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobName = `${Date.now()}_${fileName}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    console.log(`Uploading file as blob: ${blobName}, size: ${fileData.byteLength} bytes`);
    
    // ファイルをアップロード
    await blockBlobClient.upload(fileData, fileData.byteLength, {
      blobHTTPHeaders: {
        blobContentType: contentType || 'application/octet-stream',
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
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    const downloadResponse = await blockBlobClient.download();
    const arrayBuffer = await streamToArrayBuffer(downloadResponse.readableStreamBody!);
    
    return {
      data: arrayBuffer,
      contentType: downloadResponse.contentType || 'application/octet-stream',
      originalName: blobName,
    };
  } catch (error) {
    console.error("Error downloading file:", error);
    throw new Error("ファイルのダウンロードに失敗しました");
  }
}

// ファイルを削除
export async function deleteFile(containerName: string, blobName: string): Promise<void> {
  try {
    const containerClient = blobServiceClient.getContainerClient(containerName);
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
    const containerClient = blobServiceClient.getContainerClient(containerName);
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
