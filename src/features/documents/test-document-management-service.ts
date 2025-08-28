"use server";

import { userHashedId } from "@/features/auth/helpers";
import { saveDocument } from "@/features/documents/cosmos-db-document-service";
import { uploadOriginalFileToBlob } from "@/features/documents/azure-blob-service";

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
    
    // ファイル名を安全な形式に変換（日本語文字を保持）
    const safeFileName = sanitizeFileNameForBlob(file.name);
    // 日本語ファイル名をBase64エンコードして安全に保存
    const encodedFileName = Buffer.from(file.name, 'utf-8').toString('base64');
    const blobName = `${timestamp}_${encodedFileName}`;
    
    console.log('Debug: Original file name:', file.name);
    console.log('Debug: Safe file name:', safeFileName);
    console.log('Debug: Encoded file name:', encodedFileName);
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
      console.error('Debug: Upload error details:', {
        error: uploadError instanceof Error ? {
          name: uploadError.name,
          message: uploadError.message,
          stack: uploadError.stack
        } : uploadError,
        fileName: file.name,
        safeFileName,
        blobName,
        fileSize: file.size,
        fileType: file.type
      });
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
        containerName: 'Test Department', // 部門名を保存（BLOBコンテナ名ではなく）
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
