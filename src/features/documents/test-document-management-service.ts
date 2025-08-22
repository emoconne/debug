"use server";

import { uploadOriginalFileToBlob } from "./azure-blob-service";
import { saveDocument } from "./cosmos-db-document-service";
import { userHashedId } from "@/features/auth/helpers";

export interface TestUploadResult {
  success: boolean;
  documentId?: string;
  message: string;
  error?: string;
}

// テスト用：ファイルをアップロード（testコンテナ）
export async function uploadFileToTestContainer(
  file: File
): Promise<TestUploadResult> {
  console.log('=== UPLOAD FILE TO TEST CONTAINER START ===');
  try {
    console.log('Debug: File details:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    const userId = await userHashedId();
    console.log('Debug: User ID:', userId);

    // 1. 環境変数の確認
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      console.error('Debug: AZURE_STORAGE_CONNECTION_STRING is not set');
      return {
        success: false,
        message: "Azure Storage接続文字列が設定されていません",
        error: "Azure Storage connection string not configured"
      };
    }

    console.log('Debug: Azure Storage connection string is configured');

    // 2. Azure Blob Storageにアップロード（testコンテナ）
    const containerName = 'test';
    console.log('Debug: Uploading to blob container:', containerName);
    const timestamp = Date.now();
    
    // ファイル名を安全な形式に変換
    const safeFileName = file.name.replace(/[^\w\-\.]/g, '_').replace(/_{2,}/g, '_').replace(/^_+|_+$/g, '');
    const blobName = `${timestamp}_${safeFileName}`;
    
    console.log('Debug: Original file name:', file.name);
    console.log('Debug: Safe file name:', safeFileName);
    console.log('Debug: Blob name:', blobName);
    
    try {
      await uploadOriginalFileToBlob(
        containerName,
        blobName,
        file
      );
      console.log('Debug: File uploaded successfully to blob storage');
    } catch (uploadError) {
      console.error('Debug: Blob upload failed:', uploadError);
      return {
        success: false,
        message: "ファイルのアップロードに失敗しました",
        error: uploadError instanceof Error ? uploadError.message : "Unknown upload error"
      };
    }
    
    // Azure Storage Account名を接続文字列から抽出
    const accountNameMatch = connectionString.match(/AccountName=([^;]+)/);
    const accountName = accountNameMatch?.[1] || 'unknown';
    
    const uploadResult = {
      url: `https://${accountName}.blob.core.windows.net/${containerName}/${blobName}`,
      blobName: blobName
    };
    
    console.log('Debug: Upload result:', uploadResult);
    
    // 3. Cosmos DBにメタデータを保存（初期ステータスはuploaded）
    console.log('Debug: Saving document metadata to Cosmos DB...');
    let documentId: string;
    try {
      documentId = await saveDocument({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        uploadedBy: userId,
        uploadedAt: new Date().toISOString(),
        blobUrl: uploadResult.url,
        blobName: uploadResult.blobName,
        departmentId: 'test',
        departmentName: 'Test Department',
        containerName: containerName,
        status: 'uploaded', // 初期ステータス
        isDeleted: false,
        pages: 0, // 初期値
        confidence: 0, // 初期値
      });
      console.log('Debug: Document metadata saved successfully, ID:', documentId);
    } catch (saveError) {
      console.error('Debug: Failed to save document metadata:', saveError);
      return {
        success: false,
        message: "ドキュメントメタデータの保存に失敗しました",
        error: saveError instanceof Error ? saveError.message : "Unknown save error"
      };
    }

    const result = {
      success: true,
      documentId,
      message: "ファイルが正常にアップロードされました"
    };
    console.log('Debug: Returning result:', result);
    return result;

  } catch (error) {
    console.error("=== TEST UPLOAD ERROR ===");
    console.error("Upload error:", {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error
    });
    return {
      success: false,
      message: "アップロードに失敗しました",
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
