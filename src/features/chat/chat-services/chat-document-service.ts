"use server";

import { userHashedId } from "@/features/auth/helpers";
import { CosmosDBContainer } from "@/features/common/cosmos";

import { uniqueId } from "@/features/common/util";
import {
  AzureKeyCredential,
  DocumentAnalysisClient,
} from "@azure/ai-form-recognizer";
import { SqlQuerySpec } from "@azure/cosmos";
import {
  AzureCogDocumentIndex,
  ensureIndexIsCreated,
  indexDocuments,
} from "./azure-cog-search/azure-cog-vector-store";
import {
  CHAT_DOCUMENT_ATTRIBUTE,
  ChatDocumentModel,
  ServerActionResponse,
} from "./models";
import { chunkDocumentWithOverlap } from "./text-chunk";
import { isNotNullOrEmpty } from "./utils";

const MAX_DOCUMENT_SIZE = 20000000;

export const UploadDocument = async (
  formData: FormData
): Promise<ServerActionResponse<string[]>> => {
  try {
    console.log('=== UploadDocument START ===');
    await ensureSearchIsConfigured();

    const { docs } = await LoadFile(formData);
    console.log('LoadFile completed, docs count:', docs.length);
    
    const splitDocuments = chunkDocumentWithOverlap(docs.join("\n"));
    console.log('Chunking completed, chunks count:', splitDocuments.length);

    // TextChunk[]をstring[]に変換
    const response = splitDocuments.map(chunk => chunk.content);

    return {
      success: true,
      error: "",
      response: response,
    };
  } catch (e) {
    console.error('UploadDocument error:', e);
    return {
      success: false,
      error: (e as Error).message,
      response: [],
    };
  }
};

const LoadFile = async (formData: FormData) => {
  try {
    console.log('=== LoadFile START ===');
    const file = formData.get("file") as { name: string; type: string; size: number; arrayBuffer: () => Promise<ArrayBuffer> } | null;

    if (!file) {
      throw new Error('ファイルが選択されていません');
    }

    console.log('File details:', {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: (file as any).lastModified
    });

    // ファイル名のエンコーディングを修正
    let fileName = file.name;
    try {
      // ファイル名が破損している場合の修正
      if (fileName.includes('\\x')) {
        fileName = decodeURIComponent(escape(fileName));
      }
    } catch (encodingError) {
      console.warn('File name encoding fix failed:', encodingError);
    }

    // ファイル形式のチェック
    const supportedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif', '.heic', '.heif', '.webp', '.gif', '.pptx', '.ppt', '.docx', '.doc', '.xlsx', '.xls', '.txt'];
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    if (!supportedExtensions.includes(extension)) {
      throw new Error(`サポートされていないファイル形式です: ${extension}`);
    }
    
    // MIMEタイプの検証
    const expectedMimeTypes = {
      '.pdf': 'application/pdf',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.doc': 'application/msword',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.xls': 'application/vnd.ms-excel',
      '.txt': 'text/plain'
    };
    
    const expectedMimeType = expectedMimeTypes[extension as keyof typeof expectedMimeTypes];
    if (expectedMimeType && file.type !== expectedMimeType) {
      console.warn(`MIME type mismatch for ${extension}: expected ${expectedMimeType}, got ${file.type}`);
    }

    console.log('File format check passed:', extension);

    if (file.size < MAX_DOCUMENT_SIZE) {
      const client = await initDocumentIntelligence();

      const arrayBuffer = await file.arrayBuffer();

      // ファイルの内容を検証
      console.log(`File size: ${arrayBuffer.byteLength} bytes`);
      if (arrayBuffer.byteLength === 0) {
        throw new Error('ファイルが空です');
      }

      // ファイル形式に応じた処理
      let paragraphs: any[] = [];
      let processingError: any = null;
      
      console.log(`File extension: ${extension}, File name: ${fileName}`);
      
      // 参考ソースに基づいてモデル選択を修正
      let modelToUse: string;
      let useContentInsteadOfParagraphs = false;
      
      if (extension === '.txt') {
        // テキストファイルは prebuilt-read を使用
        modelToUse = "prebuilt-read";
        useContentInsteadOfParagraphs = true;
        console.log('Text file detected, using prebuilt-read model');
      } else {
        // その他のファイルは prebuilt-layout を優先
        modelToUse = "prebuilt-layout";
        console.log(`${extension} file detected, using prebuilt-layout model`);
      }
      
      try {
        console.log(`Processing file: ${fileName} with model: ${modelToUse}`);
        
        const poller = await client.beginAnalyzeDocument(modelToUse, arrayBuffer);
        const result = await poller.pollUntilDone();
        
        if (useContentInsteadOfParagraphs) {
          // テキストファイルの場合、contentを使用
          if (result.content) {
            paragraphs = [{ content: result.content }];
          }
        } else {
          // その他のファイルの場合、paragraphsを使用
          paragraphs = result.paragraphs || [];
          
          // テーブル情報も追加
          if (result.tables && result.tables.length > 0) {
            console.log(`Found ${result.tables.length} tables`);
            for (const table of result.tables) {
              if (table.cells) {
                const tableText = table.cells.map(cell => cell.content).join(' | ');
                paragraphs.push({ content: `[TABLE] ${tableText}` });
              }
            }
          }
        }
        
        console.log(`Successfully processed with model: ${modelToUse}, content length: ${paragraphs.length}`);
      } catch (modelError) {
        console.error(`Model ${modelToUse} failed for file ${fileName}:`, modelError);
        processingError = modelError;
      }
      
      // すべてのモデルが失敗した場合
      if (paragraphs.length === 0) {
        console.error('All Document Intelligence models failed for file:', fileName);
        console.error('Last error:', processingError);
        
        // ファイルが破損している可能性がある場合の詳細なエラーメッセージ
        if (processingError?.details?.error?.innererror?.message?.includes('corrupted') || 
            processingError?.details?.error?.innererror?.message?.includes('unsupported')) {
          
          // 代替処理として、ファイル名のみを返す
          console.log('Attempting fallback processing for corrupted file');
          const fallbackText = `[ファイル処理エラー] ${fileName} - このファイルは破損しているか、サポートされていない形式のため、Document Intelligenceで処理できませんでした。`;
          paragraphs = [{ content: fallbackText }];
          
        } else if (processingError?.details?.error?.innererror?.message) {
          throw new Error(`Document Intelligence エラー: ${processingError.details.error.innererror.message}`);
        } else if (processingError?.message) {
          throw new Error(`Document Intelligence エラー: ${processingError.message}`);
        } else {
          throw new Error(`ファイルの処理に失敗しました: ${fileName}`);
        }
      }

      const docs: Array<string> = [];

      if (paragraphs) {
        for (const paragraph of paragraphs) {
          docs.push(paragraph.content);
        }
      }

      return { docs };
    }
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

  throw new Error(`ファイルサイズが大きすぎます。最大${MAX_DOCUMENT_SIZE / 1024 / 1024}MBまでサポートされています。`);
};

export const IndexDocuments = async (
  fileName: string,
  docs: any[],
  chatThreadId: string
): Promise<ServerActionResponse<AzureCogDocumentIndex[]>> => {
  try {
    console.log('=== IndexDocuments START ===');
    console.log('Indexing documents:', { fileName, docsCount: docs.length, chatThreadId });
    
    const documentsToIndex: AzureCogDocumentIndex[] = [];

    for (const doc of docs) {
      console.log('Processing doc:', doc);
      console.log('Doc type:', typeof doc);
      console.log('Doc is array:', Array.isArray(doc));
      console.log('Doc is object:', doc && typeof doc === 'object');
      
      // docを文字列に変換
      let pageContent: string;
      if (typeof doc === 'string') {
        pageContent = doc;
      } else if (Array.isArray(doc)) {
        pageContent = doc.join(' ');
      } else if (doc && typeof doc === 'object') {
        pageContent = JSON.stringify(doc);
      } else {
        pageContent = String(doc || '');
      }
      
      console.log('Converted pageContent:', pageContent);
      
      const docToAdd: AzureCogDocumentIndex = {
        id: uniqueId(),
        chatThreadId,
        user: await userHashedId(),
        pageContent: pageContent,
        metadata: fileName,
        chatType: "data",
        deptName: "",
        embedding: [],
      };

      documentsToIndex.push(docToAdd);
    }

    console.log('Documents prepared for indexing:', documentsToIndex.length);
    await indexDocuments(documentsToIndex);
    console.log('Documents indexed successfully');

    await UpsertChatDocument(fileName, chatThreadId);
    console.log('Chat document upserted successfully');
    
    return {
      success: true,
      error: "",
      response: documentsToIndex,
    };
  } catch (e) {
    console.error('IndexDocuments error:', e);
    return {
      success: false,
      error: (e as Error).message,
      response: [],
    };
  }
};

export const initDocumentIntelligence = async () => {
  const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
  const key = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;

  console.log('Document Intelligence configuration:');
  console.log('Endpoint:', endpoint ? 'Set' : 'Missing');
  console.log('Key:', key ? 'Set' : 'Missing');

  if (!endpoint || !key) {
    throw new Error('Azure Document Intelligence configuration is missing');
  }

  const client = new DocumentAnalysisClient(
    endpoint,
    new AzureKeyCredential(key)
  );

  console.log('Document Intelligence client created successfully');
  return client;
};

export const FindAllChatDocuments = async (chatThreadID: string) => {
  const container = await CosmosDBContainer.getInstance().getContainer();

  const querySpec: SqlQuerySpec = {
    query:
      "SELECT * FROM root r WHERE r.type=@type AND r.chatThreadId = @threadId AND r.isDeleted=@isDeleted",
    parameters: [
      {
        name: "@type",
        value: CHAT_DOCUMENT_ATTRIBUTE,
      },
      {
        name: "@threadId",
        value: chatThreadID,
      },
      {
        name: "@isDeleted",
        value: false,
      },
    ],
  };

  const { resources } = await container.items
    .query<ChatDocumentModel>(querySpec)
    .fetchAll();

  return resources;
};

export const UpsertChatDocument = async (
  fileName: string,
  chatThreadID: string
) => {
  const modelToSave: ChatDocumentModel = {
    chatThreadId: chatThreadID,
    id: uniqueId(),
    userId: await userHashedId(),
    createdAt: new Date(),
    type: CHAT_DOCUMENT_ATTRIBUTE,
    isDeleted: false,
    name: fileName,
  };

  const container = await CosmosDBContainer.getInstance().getContainer();
  await container.items.upsert(modelToSave);
};

export const ensureSearchIsConfigured = async () => {
  var isSearchConfigured =
    isNotNullOrEmpty(process.env.AZURE_SEARCH_NAME) &&
    isNotNullOrEmpty(process.env.AZURE_SEARCH_API_KEY) &&
    isNotNullOrEmpty(process.env.AZURE_SEARCH_INDEX_NAME) &&
    isNotNullOrEmpty(process.env.AZURE_SEARCH_API_VERSION);

  if (!isSearchConfigured) {
    throw new Error("Azure search environment variables are not configured.");
  }

  var isDocumentIntelligenceConfigured =
    isNotNullOrEmpty(process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT) &&
    isNotNullOrEmpty(process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY);

  if (!isDocumentIntelligenceConfigured) {
    throw new Error(
      "Azure document intelligence environment variables are not configured."
    );
  }

  var isEmbeddingsConfigured = isNotNullOrEmpty(
    process.env.AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME
  );

  if (!isEmbeddingsConfigured) {
    throw new Error("Azure openai embedding variables are not configured.");
  }

  await ensureIndexIsCreated();
};
