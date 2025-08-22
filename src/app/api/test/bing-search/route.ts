import { NextRequest, NextResponse } from "next/server";
import { BingSearchResult } from "@/features/chat/chat-services/Azure-bing-search/bing";
import { OpenAIInstance } from "@/features/common/openai";
import { WebScrapingService } from "@/features/chat/chat-services/web-scraping-service";

export async function POST(request: NextRequest) {
  console.log('=== BING SEARCH TEST START ===');
  
  try {
    const { searchQuery } = await request.json();
    
    if (!searchQuery) {
      return NextResponse.json({
        success: false,
        message: "検索クエリが指定されていません",
        error: "Search query is required"
      }, { status: 400 });
    }

    console.log('Testing Bing search with query:', searchQuery);

    // 環境変数の確認
    const projectEndpoint = process.env.AZURE_AI_FOUNDRY_ENDPOINT;
    const agentId = process.env.AZURE_AI_FOUNDRY_AGENT_ID;
    
    console.log('Environment variables check:');
    console.log('AZURE_AI_FOUNDRY_ENDPOINT:', projectEndpoint ? 'SET' : 'NOT SET');
    console.log('AZURE_AI_FOUNDRY_AGENT_ID:', agentId ? 'SET' : 'NOT SET');

    if (!projectEndpoint || !agentId) {
      return NextResponse.json({
        success: false,
        message: "Azure AI Foundry設定が不完全です",
        error: "Missing Azure AI Foundry configuration",
        details: {
          projectEndpoint: !!projectEndpoint,
          agentId: !!agentId
        }
      }, { status: 400 });
    }

    // Bing検索を実行
    const bing = new BingSearchResult();
    const searchResult = await bing.SearchWeb(searchQuery);

    console.log('Bing search completed successfully');
    console.log('Search results count:', (searchResult as any)?.webPages?.value?.length || 0);

    // 検索結果からURLを抽出してWebスクレイピングを実行
    let scrapedContents: any[] = [];
    let scrapingError = null;
    let llmAnswer = null;
    let llmError = null;
    
    if (searchResult && typeof searchResult === 'object' && 'webPages' in searchResult && 
        searchResult.webPages && typeof searchResult.webPages === 'object' && 'value' in searchResult.webPages &&
        Array.isArray(searchResult.webPages.value) && searchResult.webPages.value.length > 0) {
      
      try {
        console.log('Starting web scraping process...');
        
        // URLを抽出
        const urls = (searchResult as any).webPages.value
          .map((result: any) => result.url)
          .filter((url: string) => url && url.trim() !== '');
        
        console.log(`Found ${urls.length} URLs to scrape`);
        
        // Webスクレイピングサービスを初期化
        const scrapingService = new WebScrapingService();
        
        try {
          // 有効なURLのみをフィルタリング
          const validUrls = scrapingService.filterValidUrls(urls);
          console.log(`Valid URLs after filtering: ${validUrls.length}`);
          
          if (validUrls.length > 0) {
            // Webスクレイピングを実行（最大3つのURLまで）
            const urlsToScrape = validUrls.slice(0, 3);
            scrapedContents = await scrapingService.scrapeMultipleUrls(urlsToScrape);
            
            console.log(`Successfully scraped ${scrapedContents.filter(c => c.success).length} URLs`);
          }
        } finally {
          // ブラウザを閉じる
          await scrapingService.close();
        }
        
      } catch (error) {
        console.error('Web scraping failed:', error);
        scrapingError = error instanceof Error ? error.message : 'Webスクレイピング中にエラーが発生しました';
      }
      
      // LLMで回答を生成
      try {
        console.log('Generating LLM answer from scraped content...');
        
        // スクレイピング結果と検索結果を組み合わせてコンテキストを作成
        let context = '';
        
        // スクレイピング結果を追加
        if (scrapedContents.length > 0) {
          const successfulScrapes = scrapedContents.filter(c => c.success);
          if (successfulScrapes.length > 0) {
            context += '=== Webページの内容 ===\n';
            successfulScrapes.forEach((scrape, index) => {
              context += `${index + 1}. ${scrape.title}\n`;
              context += `URL: ${scrape.url}\n`;
              context += `内容: ${scrape.content}\n\n`;
            });
          }
        }
        
        // 検索結果のスニペットも追加
        context += '=== 検索結果のスニペット ===\n';
        const searchSnippets = (searchResult as any).webPages.value
          .map((result: any, index: number) => 
            `${index + 1}. ${result.name || 'タイトルなし'}\n${result.snippet || '説明なし'}\nURL: ${result.url}`
          )
          .join('\n\n');
        context += searchSnippets;

        // LLMで回答を生成
        const openai = OpenAIInstance();
        const llmResponse = await openai.chat.completions.create({
          model: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME || "gpt-4o",
          messages: [
            {
              role: "system",
              content: `あなたは検索結果とWebページの内容に基づいて質問に答えるアシスタントです。以下の情報を参考にして、ユーザーの質問に対して正確で有用な回答を提供してください。

Webページの内容と検索結果の情報のみを使用し、推測は避けてください。情報が不十分な場合は、その旨を明示してください。

回答は日本語で、簡潔で分かりやすく提供してください。情報源を明記してください。`
            },
            {
              role: "user",
              content: `質問: ${searchQuery}

${context}

上記の情報に基づいて、質問に対する回答を提供してください。`
            }
          ],
          temperature: 0.3,
          max_tokens: 1000
        });

        llmAnswer = llmResponse.choices[0]?.message?.content || '回答を生成できませんでした';
        console.log('LLM answer generated successfully');
        
      } catch (error) {
        console.error('LLM answer generation failed:', error);
        llmError = error instanceof Error ? error.message : 'LLM回答生成中にエラーが発生しました';
      }
    }

    return NextResponse.json({
      success: true,
      message: "Bing検索、Webスクレイピング、LLM回答生成が完了しました",
      searchQuery,
      results: (searchResult as any)?.webPages?.value || [],
      resultCount: (searchResult as any)?.webPages?.value?.length || 0,
      scrapedContents,
      scrapingError,
      llmAnswer,
      llmError,
      details: {
        projectEndpoint,
        agentId,
        searchCompleted: true,
        scrapingCompleted: scrapedContents.length > 0,
        scrapingSuccessCount: scrapedContents.filter(c => c.success).length,
        llmAnswerGenerated: !!llmAnswer,
        llmError: !!llmError
      }
    });

  } catch (error) {
    console.error('Bing search test error:', error);
    
    return NextResponse.json({
      success: false,
      message: "Bing検索テスト中にエラーが発生しました",
      error: error instanceof Error ? error.message : "Unknown error",
      details: {
        errorType: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined
      }
    }, { status: 500 });
  }
}
