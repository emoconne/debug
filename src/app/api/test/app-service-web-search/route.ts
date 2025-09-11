import { NextRequest, NextResponse } from 'next/server';
import { BingSearchResult } from '@/features/chat/chat-services/Azure-bing-search/bing';

export async function GET(request: NextRequest) {
  try {
    console.log('=== App Service Web Search Test ===');
    
    const searchText = 'Microsoft';
    console.log(`Testing web search with query: ${searchText}`);
    
    // BingSearchResultインスタンスを作成
    const bingSearch = new BingSearchResult();
    
    // Web検索を実行
    const result = await bingSearch.SearchWeb(searchText);
    
    console.log('Search result:', {
      success: !!result,
      hasSearchResults: !!(result && result.searchResults),
      hasAssistantResponse: !!(result && result.assistantResponse),
      threadId: result?.threadId
    });
    
    return NextResponse.json({
      success: true,
      searchText,
      result: {
        hasSearchResults: !!(result && result.searchResults),
        hasAssistantResponse: !!(result && result.assistantResponse),
        threadId: result?.threadId,
        searchResultsCount: result?.searchResults?.webPages?.value?.length || 0,
        assistantResponseLength: result?.assistantResponse?.length || 0
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('App Service Web Search Test Error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
