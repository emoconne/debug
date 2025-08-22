"use server";

import { SearchClient, AzureKeyCredential } from "@azure/search-documents";

// AI Search設定
const searchEndpoint = process.env.AZURE_SEARCH_ENDPOINT;
const searchKey = process.env.AZURE_SEARCH_API_KEY || process.env.AZURE_SEARCH_KEY;
const searchIndexName = process.env.AZURE_SEARCH_INDEX_NAME || "documents";

export interface SearchTestResult {
  success: boolean;
  message: string;
  details?: {
    endpoint: string;
    indexName: string;
    hasKey: boolean;
    connectionTest: boolean;
    indexExists: boolean;
    indexStats?: any;
  };
  error?: string;
}

export async function testAzureSearchConnection(): Promise<SearchTestResult> {
  console.log('=== AZURE SEARCH CONNECTION TEST START ===');
  
  // デバッグ用：環境変数の値をログ出力（キーは一部マスク）
  console.log('Environment variables debug:', {
    AZURE_SEARCH_ENDPOINT: searchEndpoint || 'NOT_SET',
    AZURE_SEARCH_API_KEY: process.env.AZURE_SEARCH_API_KEY ? `${process.env.AZURE_SEARCH_API_KEY.substring(0, 8)}...` : 'NOT_SET',
    AZURE_SEARCH_KEY: process.env.AZURE_SEARCH_KEY ? `${process.env.AZURE_SEARCH_KEY.substring(0, 8)}...` : 'NOT_SET',
    AZURE_SEARCH_INDEX_NAME: searchIndexName,
    FINAL_SEARCH_KEY: searchKey ? `${searchKey.substring(0, 8)}...` : 'NOT_SET'
  });
  
  try {
    // 1. 環境変数の確認
    if (!searchEndpoint) {
      return {
        success: false,
        message: "AZURE_SEARCH_ENDPOINTが設定されていません",
        details: {
          endpoint: "未設定",
          indexName: searchIndexName,
          hasKey: !!searchKey,
          connectionTest: false,
          indexExists: false
        }
      };
    }

    if (!searchKey) {
      return {
        success: false,
        message: "AZURE_SEARCH_KEYが設定されていません",
        details: {
          endpoint: searchEndpoint,
          indexName: searchIndexName,
          hasKey: false,
          connectionTest: false,
          indexExists: false
        }
      };
    }

    console.log('Search config:', {
      endpoint: searchEndpoint,
      indexName: searchIndexName,
      hasKey: !!searchKey
    });

    // 2. SearchClientの作成
    const searchClient = new SearchClient(
      searchEndpoint,
      searchIndexName,
      new AzureKeyCredential(searchKey)
    );

    console.log('SearchClient created successfully');

    // 3. 接続テスト（検索操作でインデックスの存在確認）
    try {
      // 簡単な検索操作を試行してインデックスの存在と接続を確認
      const searchResults = await searchClient.search("*", {
        top: 1,
        skip: 0
      });
      
      console.log('Search operation successful');
      
      return {
        success: true,
        message: "AI Search接続テストが成功しました",
        details: {
          endpoint: searchEndpoint,
          indexName: searchIndexName,
          hasKey: true,
          connectionTest: true,
          indexExists: true,
          indexStats: {
            documentCount: "取得できません",
            storageSize: "取得できません",
            fieldCount: "取得できません"
          }
        }
      };
    } catch (searchError) {
      console.log('Search operation failed:', searchError);
      throw searchError;
    }

  } catch (error) {
    console.error('Azure Search test error:', error);
    
    const errorMessage = error instanceof Error ? error.message : "不明なエラー";
    
    return {
      success: false,
      message: `AI Search接続テストに失敗しました: ${errorMessage}`,
      details: {
        endpoint: searchEndpoint || "未設定",
        indexName: searchIndexName,
        hasKey: !!searchKey,
        connectionTest: false,
        indexExists: false
      },
      error: errorMessage
    };
  }
}

// インデックスの存在確認
export async function checkSearchIndexExists(): Promise<boolean> {
  try {
    if (!searchEndpoint || !searchKey) {
      return false;
    }

    const searchClient = new SearchClient(
      searchEndpoint,
      searchIndexName,
      new AzureKeyCredential(searchKey)
    );

    // 検索操作でインデックスの存在を確認
    await searchClient.search("*", { top: 1 });
    return true;
  } catch (error) {
    console.error('Index existence check failed:', error);
    return false;
  }
}

// インデックスの作成テスト
export async function testCreateSearchIndex(): Promise<SearchTestResult> {
  console.log('=== AZURE SEARCH INDEX CREATION TEST START ===');
  
  try {
    if (!searchEndpoint || !searchKey) {
      return {
        success: false,
        message: "AI Searchの設定が不完全です",
        details: {
          endpoint: searchEndpoint || "未設定",
          indexName: searchIndexName,
          hasKey: !!searchKey,
          connectionTest: false,
          indexExists: false
        }
      };
    }

    // SearchIndexClientを使用してインデックス作成をテスト
    const { SearchIndexClient } = await import("@azure/search-documents");
    
    const indexClient = new SearchIndexClient(
      searchEndpoint,
      new AzureKeyCredential(searchKey)
    );

    // テスト用インデックス定義
    const testIndexName = `test-index-${Date.now()}`;
    const testIndex = {
      name: testIndexName,
      fields: [
        {
          name: "id",
          type: "Edm.String" as const,
          key: true,
          searchable: false
        },
        {
          name: "content",
          type: "Edm.String" as const,
          searchable: true
        }
      ]
    };

    // インデックス作成
    await indexClient.createIndex(testIndex);
    console.log(`Test index '${testIndexName}' created successfully`);

    // インデックス削除
    await indexClient.deleteIndex(testIndexName);
    console.log(`Test index '${testIndexName}' deleted successfully`);

    return {
      success: true,
      message: "AI Searchインデックス作成テストが成功しました",
      details: {
        endpoint: searchEndpoint,
        indexName: searchIndexName,
        hasKey: true,
        connectionTest: true,
        indexExists: true
      }
    };

  } catch (error) {
    console.error('Search index creation test error:', error);
    
    const errorMessage = error instanceof Error ? error.message : "不明なエラー";
    
    return {
      success: false,
      message: `AI Searchインデックス作成テストに失敗しました: ${errorMessage}`,
      details: {
        endpoint: searchEndpoint || "未設定",
        indexName: searchIndexName,
        hasKey: !!searchKey,
        connectionTest: false,
        indexExists: false
      },
      error: errorMessage
    };
  }
}

