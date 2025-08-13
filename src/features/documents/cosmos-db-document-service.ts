"use server";

import { saveSettingsData, updateSettingsData, deleteSettingsData, getSettingsDataByType, getSettingsDataById, DataType } from "@/features/common/cosmos-settings";

export interface DocumentMetadata {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: string;
  blobUrl: string;
  blobName: string;
  searchIndexId?: string;
  pages: number;
  confidence: number;
  status: 'uploaded' | 'processing' | 'completed' | 'error';
  categories?: string[];
  tags?: string[];
  description?: string;
  departmentId?: string;
  departmentName?: string;
  containerName?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ドキュメントメタデータを保存
export async function saveDocument(document: Omit<DocumentMetadata, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const id = await saveSettingsData('document', document);
  return id;
}

// ドキュメントメタデータを更新
export async function updateDocument(id: string, updates: Partial<DocumentMetadata>): Promise<void> {
  await updateSettingsData(id, 'document', updates);
}

// ドキュメントメタデータを削除（論理削除）
export async function deleteDocument(id: string): Promise<void> {
  const document = await getDocument(id);
  if (!document) {
    throw new Error(`Document with id ${id} not found`);
  }

  document.isDeleted = true;
  document.updatedAt = new Date();

  await updateSettingsData(id, 'document', { isDeleted: true, updatedAt: new Date() });
}

// 全ドキュメントを取得（削除されていないもの）- 最適化版
export async function getAllDocuments(): Promise<DocumentMetadata[]> {
  console.log('=== COSMOS DB QUERY START ===');
  const startTime = Date.now();
  
  const settingsData = await getSettingsDataByType('document');
  
  // DocumentMetadataに変換
  const documents: DocumentMetadata[] = settingsData
    .map(item => ({
      id: item.id,
      ...item.data,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt)
    }))
    .filter(doc => !doc.isDeleted);
  
  console.log(`=== COSMOS DB QUERY COMPLETED in ${Date.now() - startTime}ms ===`);
  console.log(`Retrieved ${documents.length} documents`);
  
  return documents;
}

// ユーザーのドキュメントを取得
export async function getUserDocuments(userId: string): Promise<DocumentMetadata[]> {
  const allDocuments = await getAllDocuments();
  return allDocuments.filter(doc => doc.uploadedBy === userId);
}

// 特定のドキュメントを取得
export async function getDocument(id: string): Promise<DocumentMetadata | null> {
  const settingsData = await getSettingsDataById(id, 'document');
  if (!settingsData || settingsData.data.isDeleted) {
    return null;
  }
  
  return {
    id: settingsData.id,
    ...settingsData.data,
    createdAt: new Date(settingsData.createdAt),
    updatedAt: new Date(settingsData.updatedAt)
  };
}

// ファイル名でドキュメントを検索
export async function searchDocumentsByFileName(fileName: string): Promise<DocumentMetadata[]> {
  const allDocuments = await getAllDocuments();
  return allDocuments.filter(doc => 
    doc.fileName.toLowerCase().includes(fileName.toLowerCase())
  );
}

// ファイルタイプでドキュメントを取得
export async function getDocumentsByType(fileType: string): Promise<DocumentMetadata[]> {
  const allDocuments = await getAllDocuments();
  return allDocuments.filter(doc => doc.fileType === fileType);
}

// ステータスでドキュメントを取得
export async function getDocumentsByStatus(status: DocumentMetadata['status']): Promise<DocumentMetadata[]> {
  const allDocuments = await getAllDocuments();
  return allDocuments.filter(doc => doc.status === status);
}

// ドキュメント統計を取得（最適化版）
export async function getDocumentStats(): Promise<{
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  totalSize: number;
}> {
  console.log('=== GET DOCUMENT STATS START ===');
  const startTime = Date.now();
  
  const documents = await getAllDocuments();
  
  const stats = {
    total: documents.length,
    byStatus: {} as Record<string, number>,
    byType: {} as Record<string, number>,
    totalSize: 0,
  };

  documents.forEach((doc: DocumentMetadata) => {
    // ステータス別カウント
    stats.byStatus[doc.status] = (stats.byStatus[doc.status] || 0) + 1;
    
    // タイプ別カウント
    stats.byType[doc.fileType] = (stats.byType[doc.fileType] || 0) + 1;
    
    // 合計サイズ
    stats.totalSize += doc.fileSize;
  });

  console.log(`=== GET DOCUMENT STATS COMPLETED in ${Date.now() - startTime}ms ===`);
  console.log('Stats:', stats);

  return stats;
}

// ドキュメントタグを更新
export async function updateDocumentTags(id: string, tags: string[]): Promise<void> {
  await updateSettingsData(id, 'document', { tags });
}

// ドキュメントカテゴリを更新
export async function updateDocumentCategories(id: string, categories: string[]): Promise<void> {
  await updateSettingsData(id, 'document', { categories });
}

// ドキュメント説明を更新
export async function updateDocumentDescription(id: string, description: string): Promise<void> {
  await updateSettingsData(id, 'document', { description });
} 