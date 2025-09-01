import { OpenAIEmbeddingInstance } from "@/features/common/openai";

export interface AzureCogDocumentIndex {
  id: string;
  pageContent: string;
  embedding?: number[];
  user: string;
  chatThreadId: string;
  metadata: string;
  // 元の（タイムスタンプ無しの）ファイル名
  fileName?: string;
  chatType: string;
  deptName: string;
  createdAt?: string;
  sasUrl?: string; // SAS URLフィールドを追加
}

interface DocumentSearchResponseModel<TModel> {
  value: TModel[];
}

type DocumentSearchModel = {
  "@search.score": number;
};

type DocumentDeleteModel = {
  id: string;
  "@search.action": "delete";
};

export interface AzureCogDocument {}

type AzureCogVectorField = {
  vector: number[];
  fields: string;
  k: number;
  kind: string;
};

type AzureCogFilter = {
  search?: string;
  facets?: string[];
  filter?: string;
  top?: number;
};

type AzureCogRequestObject = {
  search: string;
  facets: string[];
  filter: string;
  vectorQueries?: AzureCogVectorField[];
  top: number;
};

export const simpleSearch = async (
  filter?: AzureCogFilter
): Promise<Array<AzureCogDocumentIndex & DocumentSearchModel>> => {
  const url = `${baseIndexUrl()}/docs/search?api-version=${
    process.env.AZURE_SEARCH_API_VERSION
  }`;
  const searchBody: AzureCogRequestObject = {
    search: filter?.search || "*",
    facets: filter?.facets || [],
    filter: filter?.filter || "",
    top: filter?.top || 10,
  };

  const resultDocuments = (await fetcher(url, {
    method: "POST",
    body: JSON.stringify(searchBody),
  })) as DocumentSearchResponseModel<
    AzureCogDocumentIndex & DocumentSearchModel
  >;

  return resultDocuments.value;
};

export const similaritySearchVectorWithScore = async (
  query: string,
  k: number,
  filter?: AzureCogFilter
): Promise<Array<AzureCogDocumentIndex & DocumentSearchModel>> => {
  const openai = OpenAIEmbeddingInstance();

  // クエリの検証
  if (!query || query.trim().length === 0) {
    console.log('Empty query provided, returning empty results');
    return [];
  }

  // 制御文字や無効な文字をチェック
  const hasInvalidChars = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(query);
  if (hasInvalidChars) {
    console.log('Query contains invalid characters, returning empty results');
    return [];
  }

  const cleanQuery = query.trim();

  const embeddings = await openai.embeddings.create({
    input: cleanQuery,
    model: process.env.AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME,
  });
  const url = `${baseIndexUrl()}/docs/search?api-version=${
    process.env.AZURE_SEARCH_API_VERSION
  }`;

  const searchBody: AzureCogRequestObject = {
    search: filter?.search || "*",
    facets: filter?.facets || [],
    filter: filter?.filter || "",
    vectorQueries: [
      { vector: embeddings.data[0].embedding, fields: "embedding", k: k, kind: "vector" },
    ],
    top: filter?.top || k,
  };

  const resultDocuments = (await fetcher(url, {
    method: "POST",
    body: JSON.stringify(searchBody),
  })) as DocumentSearchResponseModel<
    AzureCogDocumentIndex & DocumentSearchModel
  >;

  return resultDocuments.value;
};

export const indexDocuments = async (
  documents: Array<AzureCogDocumentIndex>
): Promise<void> => {
  try {
    console.log('=== indexDocuments START ===');
    console.log('Documents to index:', documents.length);
    
    const url = `${baseIndexUrl()}/docs/index?api-version=${
      process.env.AZURE_SEARCH_API_VERSION
    }`;

    console.log('Generating embeddings...');
    await embedDocuments(documents);
    console.log('Embeddings generated successfully');

    // 埋め込み次元数の確認
    if (documents.length > 0 && documents[0].embedding) {
      console.log('Embedding dimensions check:', {
        documentId: documents[0].id,
        embeddingLength: documents[0].embedding.length,
        expectedDimensions: 3072 // text-embedding-3-largeの次元数
      });
      
      // 次元数が一致しない場合は警告
      if (documents[0].embedding.length !== 3072) {
        console.warn(`WARNING: Embedding dimensions mismatch! Expected 3072, got ${documents[0].embedding.length}`);
      }
    }

    const documentIndexRequest: DocumentSearchResponseModel<AzureCogDocumentIndex> =
      {
        value: documents,
      };

    console.log('Sending documents to Azure Cognitive Search...');
    const response = await fetcher(url, {
      method: "POST",
      body: JSON.stringify(documentIndexRequest),
    });
    
    console.log('Indexing completed successfully:', response);
  } catch (error) {
    console.error('IndexDocuments error:', error);
    throw error;
  }
};

export const deleteDocuments = async (chatThreadId: string): Promise<void> => {
  // find all documents for chat thread

  const documentsInChat = await simpleSearch({
    filter: `chatThreadId eq '${chatThreadId}'`,
  });

  const documentsToDelete: DocumentDeleteModel[] = [];

  documentsInChat.forEach(async (document: { id: string }) => {
    const doc: DocumentDeleteModel = {
      "@search.action": "delete",
      id: document.id,
    };
    documentsToDelete.push(doc);
  });

  // delete the documents
  await fetcher(
    `${baseIndexUrl()}/docs/index?api-version=${
      process.env.AZURE_SEARCH_API_VERSION
    }`,
    {
      method: "POST",
      body: JSON.stringify({ value: documentsToDelete }),
    }
  );
};

// ドキュメント管理用：documentIdでAI Searchから削除
export const deleteDocumentsByDocumentId = async (documentId: string): Promise<void> => {
  try {
    console.log('=== DELETE DOCUMENTS BY DOCUMENT ID START ===');
    console.log('Deleting documents for documentId:', documentId);

    // documentIdでAI Searchからドキュメントを検索（chatType: "doc"のドキュメントのみ）
    const documentsInSearch = await simpleSearch({
      filter: `chatThreadId eq '${documentId}' and chatType eq 'doc'`,
    });

    console.log(`Found ${documentsInSearch.length} documents in AI Search to delete`);

    if (documentsInSearch.length === 0) {
      console.log('No documents found in AI Search for deletion');
      return;
    }

    const documentsToDelete: DocumentDeleteModel[] = [];

    documentsInSearch.forEach((document: { id: string }) => {
      const doc: DocumentDeleteModel = {
        "@search.action": "delete",
        id: document.id,
      };
      documentsToDelete.push(doc);
    });

    // AI Searchからドキュメントを削除
    const response = await fetcher(
      `${baseIndexUrl()}/docs/index?api-version=${
        process.env.AZURE_SEARCH_API_VERSION
      }`,
      {
        method: "POST",
        body: JSON.stringify({ value: documentsToDelete }),
      }
    );

    console.log('AI Search deletion response:', response);
    console.log('=== DELETE DOCUMENTS BY DOCUMENT ID COMPLETED ===');

  } catch (error) {
    console.error('DeleteDocumentsByDocumentId error:', error);
    throw error;
  }
};

export const embedDocuments = async (
  documents: Array<AzureCogDocumentIndex>
) => {
  try {
    console.log('=== embedDocuments START ===');
    console.log('Documents to embed:', documents.length);
    
    const openai = OpenAIEmbeddingInstance();

    // 各ドキュメントのpageContentを処理
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      console.log(`Processing document ${i}:`, {
        id: doc.id,
        pageContentType: typeof doc.pageContent,
        pageContentLength: doc.pageContent?.length
      });

      // pageContentを文字列に変換
      let contentStr = '';
      if (typeof doc.pageContent === 'string') {
        contentStr = doc.pageContent;
      } else if (Array.isArray(doc.pageContent)) {
        contentStr = (doc.pageContent as any[]).join(' ');
      } else if (doc.pageContent && typeof doc.pageContent === 'object') {
        contentStr = JSON.stringify(doc.pageContent);
      } else {
        contentStr = String(doc.pageContent || '');
      }

      // 空の文字列をスキップ
      if (!contentStr || contentStr.trim().length === 0) {
        console.log(`Skipping empty content for document ${i}`);
        continue;
      }

      // 制御文字を除去
      contentStr = contentStr.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

      // embeddingを生成
      try {
        console.log(`Generating embedding for document ${i} using model:`, process.env.AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME);
        const embedding = await openai.embeddings.create({
          model: process.env.AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME,
          input: contentStr,
        });

        doc.embedding = embedding.data[0].embedding;
        console.log(`Embedding generated for document ${i}, length:`, doc.embedding.length, 'using model:', process.env.AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME);
      } catch (embedError) {
        console.error(`Failed to generate embedding for document ${i}:`, embedError);
        // エラーが発生した場合は空の配列を設定
        doc.embedding = [];
      }
    }

    console.log('=== embedDocuments COMPLETED ===');
  } catch (error) {
    console.error('embedDocuments error:', error);
    throw error;
  }
};


const baseUrl = (): string => {
  const endpoint = process.env.AZURE_SEARCH_ENDPOINT;
  if (!endpoint) {
    throw new Error('AZURE_SEARCH_ENDPOINT is not configured');
  }
  return `${endpoint}/indexes`;
};

const baseIndexUrl = (): string => {
  const endpoint = process.env.AZURE_SEARCH_ENDPOINT;
  const indexName = process.env.AZURE_SEARCH_INDEX_NAME;
  if (!endpoint || !indexName) {
    throw new Error('AZURE_SEARCH_ENDPOINT or AZURE_SEARCH_INDEX_NAME is not configured');
  }
  return `${endpoint}/indexes/${indexName}`;
};

const fetcher = async (url: string, init?: RequestInit) => {
  try {
    console.log('=== FETCHER REQUEST ===');
    console.log('URL:', url);
    console.log('Method:', init?.method || 'GET');
    console.log('Headers:', {
      'Content-Type': 'application/json',
      'api-key': process.env.AZURE_SEARCH_API_KEY || process.env.AZURE_SEARCH_KEY ? 'SET' : 'NOT_SET'
    });
    
    if (init?.body) {
      console.log('Request body preview:', JSON.stringify(init.body).substring(0, 200) + '...');
    }
    
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.AZURE_SEARCH_API_KEY || process.env.AZURE_SEARCH_KEY || '',
      },
    });

    console.log('=== FETCHER RESPONSE ===');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      let errorMessage = `Azure Cognitive Search Error: ${response.status} ${response.statusText}`;
      let errorDetails = null;
      
      try {
        const err = await response.json();
        errorDetails = err;
        if (err.error?.message) {
          errorMessage = `Azure Cognitive Search Error: ${err.error.message}`;
        } else if (err.message) {
          errorMessage = `Azure Cognitive Search Error: ${err.message}`;
        }
      } catch (parseError) {
        console.log('Failed to parse error response as JSON');
      }
      
      console.error('=== FETCHER ERROR ===');
      console.error('Error message:', errorMessage);
      console.error('Error details:', errorDetails);
      console.error('Response status:', response.status);
      console.error('Response status text:', response.statusText);
      
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('=== FETCHER SUCCESS ===');
    console.log('Response received successfully');
    return result;
  } catch (error) {
    console.error('=== FETCHER EXCEPTION ===');
    console.error('Exception details:', {
      url,
      method: init?.method || 'GET',
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error
    });
    throw error;
  }
};

export const ensureIndexIsCreated = async (): Promise<void> => {
  try {
    console.log('=== ensureIndexIsCreated START ===');
    
    // 環境変数の確認
    const endpoint = process.env.AZURE_SEARCH_ENDPOINT;
    const key = process.env.AZURE_SEARCH_API_KEY || process.env.AZURE_SEARCH_KEY;
    const indexName = process.env.AZURE_SEARCH_INDEX_NAME;
    const apiVersion = process.env.AZURE_SEARCH_API_VERSION;
    
    console.log('Index creation environment check:', {
      endpoint: endpoint ? 'SET' : 'NOT_SET',
      key: key ? 'SET' : 'NOT_SET',
      indexName: indexName || 'NOT_SET',
      apiVersion: apiVersion || 'NOT_SET'
    });

    if (!endpoint || !key || !indexName || !apiVersion) {
      throw new Error('AI Search environment variables are not properly configured');
    }

    // 埋め込みモデルの次元数を事前に確認
    console.log('Checking embedding model dimensions...');
    const dimensions = await getEmbeddingDimensions();
    console.log(`Detected embedding dimensions: ${dimensions}`);

    // 強制的にインデックスを再作成（ベクトル次元の問題を解決するため）
    console.log('Force recreating index to ensure correct dimensions...');
    await deleteCogSearchIndex();
    await createCogSearchIndex();
    console.log('Index recreated successfully with correct dimensions');
    
  } catch (e) {
    console.log('Error occurred during index recreation, creating new index...');
    console.log('Error details:', e);
    await createCogSearchIndex();
    console.log('Index created successfully');
  }
};

const createCogSearchIndex = async (): Promise<void> => {
  try {
    console.log('=== createCogSearchIndex START ===');
    
    const endpoint = process.env.AZURE_SEARCH_ENDPOINT;
    const indexName = process.env.AZURE_SEARCH_INDEX_NAME;
    const apiVersion = process.env.AZURE_SEARCH_API_VERSION;
    
    // 埋め込みモデルの次元数を取得
    const dimensions = await getEmbeddingDimensions();
    console.log(`Using embedding dimensions: ${dimensions}`);
    
    const url = `${baseUrl()}?api-version=${apiVersion}`;
    console.log('Creating index URL:', url);
    
    const indexDefinition = getAzureSearchIndexDefinition(dimensions);
    
    console.log('Index definition:', JSON.stringify(indexDefinition, null, 2));
    
    await fetcher(url, {
      method: "POST",
      body: JSON.stringify(indexDefinition),
    });
    
    console.log('Index creation request sent successfully');
  } catch (error) {
    console.error('=== createCogSearchIndex ERROR ===');
    console.error('Error details:', {
      endpoint: process.env.AZURE_SEARCH_ENDPOINT,
      indexName: process.env.AZURE_SEARCH_INDEX_NAME,
      apiVersion: process.env.AZURE_SEARCH_API_VERSION,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error
    });
    throw error;
  }
};

// 埋め込みモデルの次元数を取得する関数
const getEmbeddingDimensions = async (): Promise<number> => {
  try {
    console.log('Getting embedding dimensions for model:', process.env.AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME);
    const openai = OpenAIEmbeddingInstance();
    const testEmbedding = await openai.embeddings.create({
      input: "test",
      model: process.env.AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME,
    });
    
    const dimensions = testEmbedding.data[0].embedding.length;
    console.log(`Detected embedding dimensions: ${dimensions} for model: ${process.env.AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME}`);
    return dimensions;
  } catch (error) {
    console.error('Error getting embedding dimensions:', error);
    // デフォルト値として1536を返す
    return 1536;
  }
};

// インデックス削除関数
const deleteCogSearchIndex = async (): Promise<void> => {
  try {
    const endpoint = process.env.AZURE_SEARCH_ENDPOINT;
    const indexName = process.env.AZURE_SEARCH_INDEX_NAME;
    const apiVersion = process.env.AZURE_SEARCH_API_VERSION || '2025-05-01-preview';
    
    const url = `${baseUrl()}/${indexName}?api-version=${apiVersion}`;
    console.log('Deleting index URL:', url);
    
    await fetcher(url, {
      method: "DELETE",
    });
    
    console.log('Index deletion request sent successfully');
  } catch (error) {
    console.error('Error deleting index:', error);
    // 削除エラーは無視（インデックスが存在しない場合など）
  }
};

const getAzureSearchIndexDefinition = (dimensions: number = 1536) => ({
  name: process.env.AZURE_SEARCH_INDEX_NAME,
  fields: [
    {
      name: "id",
      type: "Edm.String",
      key: true,
      filterable: true,
    },
    {
      name: "user",
      type: "Edm.String",
      searchable: true,
      filterable: true,
    },
    {
      name: "chatThreadId",
      type: "Edm.String",
      searchable: true,
      filterable: true,
    },
    {
      name: "pageContent",
      searchable: true,
      type: "Edm.String",
    },
    {
      name: "metadata",
      type: "Edm.String",
    },
    {
      // 元の（タイムスタンプ無しの）ファイル名
      name: "fileName",
      type: "Edm.String",
      searchable: true,
      filterable: true,
      sortable: false,
      facetable: false,
    },
    {
      name : "chatType",
      type: "Edm.String",
      searchable: true,
      filterable: true,
    },
    {
      name : "deptName",
      type: "Edm.String",
      searchable: true,
      filterable: true,
    },
    {
      name: "source",
      type: "Edm.String",
      searchable: true,
      filterable: true,
    },
    {
      name: "confidence",
      type: "Edm.Double",
      filterable: true,
      sortable: true,
    },
    {
      name: "reasoning",
      type: "Edm.String",
      searchable: true,
    },
    {
      name: "createdAt",
      type: "Edm.DateTimeOffset",
      filterable: true,
      sortable: true,
    },
    {
      name: "sasUrl",
      type: "Edm.String",
      searchable: false,
      filterable: false,
      sortable: false,
      facetable: false,
      retrievable: true,
    },
    {
      name: "embedding",
      type: "Collection(Edm.Single)",
      searchable: true,
      filterable: false,
      sortable: false,
      facetable: false,
      retrievable: true,
      dimensions: dimensions,
      vectorSearchProfile: "default",
    },
  ],
  vectorSearch: {
    algorithms: [
      {
        name: "default",
        kind: "hnsw",
      },
    ],
    profiles: [
      {
        name: "default",
        algorithm: "default",
      },
    ],
  },
});
