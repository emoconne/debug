"use server";

import { uploadFileToBlob, downloadFile, deleteFile, listFiles } from "./azure-blob-dept-service";
import { saveDocument, updateDocument, deleteDocument as deleteCosmosDocument, getAllDocuments, getDocument as getCosmosDocument, getDocumentStats, DocumentMetadata } from "./cosmos-db-document-service";
import { getDepartment } from "./cosmos-db-dept-service";
import { userHashedId } from "@/features/auth/helpers";
import { processDocumentAsync } from "./document-intelligence-service";
import { deleteDocumentsByDocumentId } from "@/features/chat/chat-services/azure-cog-search/azure-cog-vector-store";

export interface DocumentInfo {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: string;
  status: 'uploaded' | 'completed' | 'error';
  departmentId: string;
  departmentName: string;
  containerName: string;
  blobName: string;
  blobUrl: string;
}

export interface UploadResult {
  success: boolean;
  documentId?: string;
  message: string;
  error?: string;
}

// ファイルをアップロード（BLOBコンテナのみ）
export async function uploadFileToDepartment(
  file: File, 
  departmentId: string
): Promise<UploadResult> {
  console.log('=== UPLOAD FILE TO DEPARTMENT START ===');
  try {
    const userId = await userHashedId();
    console.log('Debug: User ID:', userId);
    
    // 1. 部門情報を取得
    const department = await getDepartment(departmentId);
    if (!department) {
      return {
        success: false,
        message: "指定された部門が見つかりません",
        error: "Department not found"
      };
    }

    console.log('Debug: Department found:', {
      name: department.name,
      blobContainerName: department.blobContainerName
    });

    // 2. ファイルをArrayBufferに変換
    const arrayBuffer = await file.arrayBuffer();
    
    // 3. Azure Blob Storageにアップロード
    console.log('Debug: Uploading to blob container:', department.blobContainerName);
    const uploadResult = await uploadFileToBlob(
      department.blobContainerName,
      file.name,
      arrayBuffer,
      file.type
    );
    
    console.log('Debug: Upload result:', uploadResult);
    
    // 4. Cosmos DBにメタデータを保存（初期ステータスはuploaded）
    const documentId = await saveDocument({
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      uploadedBy: userId,
      uploadedAt: new Date().toISOString(),
      blobUrl: uploadResult.url,
      blobName: uploadResult.blobName,
      departmentId: departmentId,
      departmentName: department.name,
      containerName: department.blobContainerName,
      status: 'uploaded', // 初期ステータス
      isDeleted: false,
    });

    // 5. 非同期でDocument Intelligence処理を開始
    processDocumentAsync(file, documentId, department.name).catch(error => {
      console.error('Document Intelligence processing failed:', error);
    });

    const result = {
      success: true,
      documentId,
      message: "ファイルが正常にアップロードされました"
    };
    console.log('Debug: Returning result:', result);
    return result;

  } catch (error) {
    console.error("=== UPLOAD ERROR ===");
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

// ドキュメント一覧を取得（最適化版）
export async function getDocuments(): Promise<DocumentInfo[]> {
  try {
    console.log('=== GET DOCUMENTS START ===');
    const startTime = Date.now();
    
    const documents = await getAllDocuments();
    
    console.log(`=== GET DOCUMENTS COMPLETED in ${Date.now() - startTime}ms ===`);
    console.log(`Retrieved ${documents.length} documents`);
    
    return documents.map(doc => ({
      id: doc.id,
      fileName: doc.fileName,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      uploadedBy: doc.uploadedBy,
      uploadedAt: doc.uploadedAt,
      status: doc.status,
      departmentId: doc.departmentId || '',
      departmentName: doc.departmentName || '',
      containerName: doc.containerName || '',
      blobName: doc.blobName || '',
      blobUrl: doc.blobUrl || '',
    }));
  } catch (error) {
    console.error("Get documents error:", error);
    throw new Error("ドキュメント一覧の取得に失敗しました");
  }
}

// ドキュメントを削除
export async function deleteDocument(documentId: string): Promise<void> {
  try {
    console.log('=== DELETE DOCUMENT START ===');
    console.log('Deleting document:', documentId);

    const document = await getCosmosDocument(documentId);
    if (!document) {
      throw new Error("ドキュメントが見つかりません");
    }

    // 1. AI Searchから削除
    try {
      console.log('Deleting from AI Search...');
      await deleteDocumentsByDocumentId(documentId);
      console.log('AI Search deletion completed');
    } catch (searchError) {
      console.error('AI Search deletion error:', searchError);
      // AI Searchの削除に失敗しても処理を続行
    }

    // 2. Azure Blob Storageから削除
    if (document.containerName && document.blobName) {
      console.log('Deleting from Azure Blob Storage...');
      await deleteFile(document.containerName, document.blobName);
      console.log('Azure Blob Storage deletion completed');
    }

    // 3. Cosmos DBから論理削除
    console.log('Deleting from Cosmos DB...');
    await deleteCosmosDocument(documentId);
    console.log('Cosmos DB deletion completed');

    console.log('=== DELETE DOCUMENT COMPLETED ===');

  } catch (error) {
    console.error("Delete document error:", error);
    throw new Error("ドキュメントの削除に失敗しました");
  }
}

// ドキュメントをダウンロード
export async function downloadDocument(documentId: string): Promise<{
  data: ArrayBuffer;
  contentType: string;
  fileName: string;
}> {
  try {
    const document = await getCosmosDocument(documentId);
    if (!document) {
      throw new Error("ドキュメントが見つかりません");
    }

    if (!document.containerName || !document.blobName) {
      throw new Error("BLOB情報が見つかりません");
    }

    const downloadResult = await downloadFile(document.containerName, document.blobName);
    
    return {
      data: downloadResult.data,
      contentType: downloadResult.contentType,
      fileName: downloadResult.originalName,
    };

  } catch (error) {
    console.error("Download document error:", error);
    throw new Error("ドキュメントのダウンロードに失敗しました");
  }
}

// 統計情報を取得
export async function getStats(): Promise<{
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  totalSize: number;
}> {
  try {
    const cosmosStats = await getDocumentStats();
    return cosmosStats;
  } catch (error) {
    console.error("Get stats error:", error);
    throw new Error("統計情報の取得に失敗しました");
  }
} 