"use server";

import { uniqueId } from "@/features/common/util";
import {
  AzureKeyCredential,
  DocumentAnalysisClient,
} from "@azure/ai-form-recognizer";
import {
  AzureCogDocumentIndex,
  ensureIndexIsCreated,
  indexDocuments,
} from "@/features/chat/chat-services/azure-cog-search/azure-cog-vector-store";
import { userHashedId } from "@/features/auth/helpers";
import { chunkDocumentWithOverlap, TextChunk } from "@/features/chat/chat-services/text-chunk";
import { updateDocument } from "./cosmos-db-document-service";

const MAX_DOCUMENT_SIZE = 20000000;

// Document Intelligenceクライアントの初期化
export const initDocumentIntelligence = async () => {
  const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
  const key = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;

  if (!endpoint || !key) {
    throw new Error('Azure Document Intelligence configuration is missing');
  }

  const client = new DocumentAnalysisClient(
    endpoint,
    new AzureKeyCredential(key)
  );

  return client;
};

// ファイルをDocument Intelligenceで処理
export const processFileWithDocumentIntelligence = async (
  file: File
): Promise<string[]> => {
  try {
    console.log('=== PROCESS FILE WITH DOCUMENT INTELLIGENCE START ===');
    console.log('File details:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    // ファイル形式のチェック
    const supportedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif', '.heic', '.heif', '.webp', '.gif'];
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!supportedExtensions.includes(extension)) {
      throw new Error(`サポートされていないファイル形式です: ${extension}`);
    }

    console.log('File format check passed:', extension);

    if (file.size >= MAX_DOCUMENT_SIZE) {
      throw new Error(`ファイルサイズが大きすぎます。最大${MAX_DOCUMENT_SIZE / 1024 / 1024}MBまでサポートされています。`);
    }

    const client = await initDocumentIntelligence();
    const blob = new Blob([file], { type: file.type });

    console.log('Starting Document Intelligence analysis...');
    const poller = await client.beginAnalyzeDocument(
      "prebuilt-document",
      await blob.arrayBuffer()
    );
    
    console.log('Waiting for analysis to complete...');
    const { paragraphs } = await poller.pollUntilDone();
    console.log('Document Intelligence analysis completed');

    const docs: Array<string> = [];

    if (paragraphs) {
      for (const paragraph of paragraphs) {
        docs.push(paragraph.content);
      }
    }

    console.log(`Extracted ${docs.length} paragraphs from document`);
    return docs;

  } catch (e) {
    const error = e as any;
    console.error('Document Intelligence error:', error);

    if (error.details) {
      if (error.details.length > 0) {
        throw new Error(error.details[0].message);
      } else if (error.details.error?.innererror?.message) {
        throw new Error(error.details.error.innererror.message);
      }
    }

    // より詳細なエラーメッセージを提供
    if (error.message) {
      if (error.message.includes('401')) {
        throw new Error('認証エラー: Document Intelligenceの認証情報を確認してください');
      } else if (error.message.includes('413')) {
        throw new Error('ファイルサイズが大きすぎます');
      } else if (error.message.includes('415')) {
        throw new Error('サポートされていないファイル形式です');
      } else if (error.message.includes('429')) {
        throw new Error('レート制限に達しました。しばらく待ってから再試行してください');
      } else if (error.message.includes('500')) {
        throw new Error('サーバーエラーが発生しました。しばらく待ってから再試行してください');
      } else {
        throw new Error(`Document Intelligence エラー: ${error.message}`);
      }
    }

    throw new Error('ファイルの処理中にエラーが発生しました');
  }
};

// ドキュメントをAI Searchにインデックス化
export const indexDocumentToSearch = async (
  fileName: string,
  docs: string[],
  documentId: string,
  departmentName: string
): Promise<void> => {
  try {
    console.log('=== INDEX DOCUMENT TO SEARCH START ===');
    console.log('Indexing document:', { fileName, docsCount: docs.length, documentId, departmentName });
    
    // AI Searchの設定を確認
    await ensureSearchIsConfigured();
    
    // ドキュメントをチャンクに分割
    const splitDocuments = chunkDocumentWithOverlap(docs.join("\n"));
    console.log('Chunking completed, chunks count:', splitDocuments.length);
    
    const documentsToIndex: AzureCogDocumentIndex[] = [];
    const userId = await userHashedId();

    for (const doc of splitDocuments) {
      // TextChunkオブジェクトからcontent文字列を抽出
      let pageContent: string;
      if (typeof doc === 'string') {
        pageContent = doc;
      } else if (doc && typeof doc === 'object' && 'content' in doc) {
        pageContent = (doc as TextChunk).content;
      } else {
        console.warn('Unexpected document format:', doc);
        continue; // このドキュメントをスキップ
      }
      
      // 空のコンテンツをスキップ
      if (!pageContent || pageContent.trim().length === 0) {
        console.warn('Empty document content, skipping');
        continue;
      }
      
      const docToAdd: AzureCogDocumentIndex = {
        id: uniqueId(),
        chatThreadId: documentId, // documentIdをchatThreadIdとして使用
        user: userId,
        pageContent: pageContent,
        metadata: fileName,
        chatType: "doc", // 社内FAQ検索用
        deptName: departmentName,
        embedding: [],
      };

      documentsToIndex.push(docToAdd);
    }

    console.log('Documents prepared for indexing:', documentsToIndex.length);
    await indexDocuments(documentsToIndex);
    console.log('Documents indexed successfully');

    // Cosmos DBのステータスを完了に更新
    await updateDocument(documentId, { status: 'completed' });
    console.log('Document status updated to completed');

  } catch (e) {
    console.error('IndexDocumentToSearch error:', e);
    
    // エラーが発生した場合はステータスをエラーに更新
    try {
      await updateDocument(documentId, { status: 'error' });
      console.log('Document status updated to error');
    } catch (updateError) {
      console.error('Failed to update document status to error:', updateError);
    }
    
    throw e;
  }
};

// AI Searchの設定確認
export const ensureSearchIsConfigured = async (): Promise<void> => {
  const isSearchConfigured =
    process.env.AZURE_SEARCH_NAME &&
    process.env.AZURE_SEARCH_API_KEY &&
    process.env.AZURE_SEARCH_INDEX_NAME &&
    process.env.AZURE_SEARCH_API_VERSION;

  if (!isSearchConfigured) {
    throw new Error("Azure search environment variables are not configured.");
  }

  const isDocumentIntelligenceConfigured =
    process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT &&
    process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;

  if (!isDocumentIntelligenceConfigured) {
    throw new Error(
      "Azure document intelligence environment variables are not configured."
    );
  }

  const isEmbeddingsConfigured = process.env.AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME;

  if (!isEmbeddingsConfigured) {
    throw new Error("Azure openai embedding variables are not configured.");
  }

  await ensureIndexIsCreated();
};

// 非同期でドキュメント処理を実行
export const processDocumentAsync = async (
  file: File,
  documentId: string,
  departmentName: string
): Promise<void> => {
  try {
    console.log('=== PROCESS DOCUMENT ASYNC START ===');
    console.log('Processing document:', { fileName: file.name, documentId, departmentName });

    // ステータスを処理中に更新
    await updateDocument(documentId, { status: 'processing' });
    console.log('Document status updated to processing');

    // Document Intelligenceでファイルを処理
    const docs = await processFileWithDocumentIntelligence(file);
    console.log('Document Intelligence processing completed');

    // AI Searchにインデックス化
    await indexDocumentToSearch(file.name, docs, documentId, departmentName);
    console.log('Document processing completed successfully');

  } catch (error) {
    console.error('ProcessDocumentAsync error:', error);
    
    // エラーが発生した場合はステータスをエラーに更新
    try {
      await updateDocument(documentId, { status: 'error' });
      console.log('Document status updated to error');
    } catch (updateError) {
      console.error('Failed to update document status to error:', updateError);
    }
    
    throw error;
  }
};
