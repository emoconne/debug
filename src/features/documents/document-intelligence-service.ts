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
import { updateDocument, getDocument } from "./cosmos-db-document-service";
import { generateSasUrl } from "./azure-blob-service";

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
    console.log('Indexing document:', { 
      fileName, 
      docsCount: docs.length, 
      documentId, 
      departmentName 
    });
    
    // AI Searchの設定を確認
    console.log('Ensuring search is configured...');
    await ensureSearchIsConfigured();
    console.log('Search configuration verified');
    
    // ドキュメントをチャンクに分割
    console.log('Chunking document content...');
    const splitDocuments = chunkDocumentWithOverlap(docs.join("\n"));
    console.log('Chunking completed, chunks count:', splitDocuments.length);
    
    const documentsToIndex: AzureCogDocumentIndex[] = [];
    const userId = await userHashedId();
    console.log('User ID for indexing:', userId);

    // CosmosDBからドキュメント情報を取得してSAS URLを生成
    console.log('Generating SAS URL for document...');
    const document = await getDocument(documentId);
    if (!document) {
      throw new Error('ドキュメント情報が見つかりません');
    }

    let sasUrl = '';
    if (document.containerName && document.blobName) {
      try {
        sasUrl = await generateSasUrl(document.containerName, document.blobName);
        console.log('SAS URL generated successfully');
      } catch (error) {
        console.warn('Failed to generate SAS URL:', error);
        sasUrl = '';
      }
    }

    for (let i = 0; i < splitDocuments.length; i++) {
      const doc = splitDocuments[i];
      // TextChunkオブジェクトからcontent文字列を抽出
      let pageContent: string;
      if (typeof doc === 'string') {
        pageContent = doc;
      } else if (doc && typeof doc === 'object' && 'content' in doc) {
        pageContent = (doc as TextChunk).content;
      } else {
        console.warn('Unexpected document format at index', i, ':', doc);
        continue; // このドキュメントをスキップ
      }
      
      // 空のコンテンツをスキップ
      if (!pageContent || pageContent.trim().length === 0) {
        console.warn('Empty document content at index', i, ', skipping');
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
        sasUrl: sasUrl, // SAS URLを追加
      };

      documentsToIndex.push(docToAdd);
    }

    console.log('Documents prepared for indexing:', documentsToIndex.length);
    if (documentsToIndex.length === 0) {
      throw new Error('インデックス化するドキュメントがありません');
    }
    
    console.log('Starting document indexing...');
    await indexDocuments(documentsToIndex);
    console.log('Documents indexed successfully');

    // Cosmos DBのステータスを完了に更新
    await updateDocument(documentId, { status: 'completed' });
    console.log('Document status updated to completed');

  } catch (e) {
    console.error('=== INDEX DOCUMENT TO SEARCH ERROR ===');
    console.error('Error details:', {
      fileName,
      documentId,
      departmentName,
      docsCount: docs.length,
      error: e instanceof Error ? {
        name: e.name,
        message: e.message,
        stack: e.stack
      } : e
    });
    
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
  console.log('=== ENSURING SEARCH IS CONFIGURED ===');
  
  // 環境変数の確認
  const searchEndpoint = process.env.AZURE_SEARCH_ENDPOINT;
  const searchKey = process.env.AZURE_SEARCH_API_KEY || process.env.AZURE_SEARCH_KEY;
  const searchIndexName = process.env.AZURE_SEARCH_INDEX_NAME;
  const searchApiVersion = process.env.AZURE_SEARCH_API_VERSION;
  
  console.log('Search configuration check:', {
    endpoint: searchEndpoint ? 'SET' : 'NOT_SET',
    key: searchKey ? 'SET' : 'NOT_SET',
    indexName: searchIndexName || 'NOT_SET',
    apiVersion: searchApiVersion || 'NOT_SET'
  });

  const isSearchConfigured = searchEndpoint && searchKey && searchIndexName && searchApiVersion;

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

  console.log('All configurations verified, ensuring index is created...');
  await ensureIndexIsCreated();
  console.log('Search configuration completed successfully');
};

// 非同期でドキュメント処理を実行
export const processDocumentAsync = async (
  file: File,
  documentId: string,
  departmentName: string
): Promise<void> => {
  try {
    console.log('=== PROCESS DOCUMENT ASYNC START ===');
    console.log('Processing document:', { 
      fileName: file.name, 
      documentId, 
      departmentName,
      fileSize: file.size,
      fileType: file.type
    });

    // ステータスを処理中に更新
    await updateDocument(documentId, { status: 'processing' });
    console.log('Document status updated to processing');

    // Document Intelligenceでファイルを処理
    console.log('Starting Document Intelligence processing...');
    const docs = await processFileWithDocumentIntelligence(file);
    console.log('Document Intelligence processing completed, extracted paragraphs:', docs.length);

    if (docs.length === 0) {
      throw new Error('Document Intelligenceでテキストが抽出されませんでした');
    }

    // AI Searchにインデックス化
    console.log('Starting AI Search indexing...');
    await indexDocumentToSearch(file.name, docs, documentId, departmentName);
    console.log('Document processing completed successfully');

  } catch (error) {
    console.error('=== PROCESS DOCUMENT ASYNC ERROR ===');
    console.error('Error details:', {
      fileName: file.name,
      documentId,
      departmentName,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error
    });
    
    // エラーが発生した場合はステータスをエラーに更新
    try {
      await updateDocument(documentId, { status: 'error' });
      console.log('Document status updated to error');
    } catch (updateError) {
      console.error('Failed to update document status to error:', updateError);
    }
    
    // エラーを再スローしない（非同期処理なので）
    console.error('Document processing failed but continuing:', error);
  }
};
