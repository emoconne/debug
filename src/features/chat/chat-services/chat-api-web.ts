import { userHashedId } from "@/features/auth/helpers";
import { OpenAIInstance } from "@/features/common/openai";
import { AI_NAME } from "@/features/theme/customise";
import { OpenAIStream, StreamingTextResponse } from "ai";
import { initAndGuardChatSession } from "./chat-thread-service";
import { CosmosDBChatMessageHistory } from "./cosmosdb/cosmosdb";
import { BingSearchResult } from "./Azure-bing-search/bing";
import { WebScrapingService } from "./web-scraping-service";
import { PromptGPTProps } from "./models";

export const ChatAPIWeb = async (props: PromptGPTProps) => {
  var snippet = "";
  var Prompt = "";
  var BingResult = "";
  var WebinnerText = "";
  const { lastHumanMessage, chatThread } = await initAndGuardChatSession(props);

  const openAI = OpenAIInstance();

  const userId = await userHashedId();

  let chatAPIModel = process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME || "gpt-4o";
//  console.log("Model_web: ", process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME);
//  console.log("PromptGPTProps_web: ", props.chatAPIModel);

  const bing = new BingSearchResult();
  let searchResult: any;
  
  try {
    searchResult = await bing.SearchWeb(lastHumanMessage.content);
  } catch (error) {
    console.error('Search API error:', error);
    // 検索エラーの場合、デフォルトの結果を設定
    searchResult = {
      webPages: {
        value: [
          {
            name: '検索エラー',
            snippet: '検索サービスが利用できません。一般的な知識に基づいて回答いたします。',
            url: '',
            displayUrl: ''
          }
        ]
      }
    };
  }

  // 検索結果の安全な処理
  const webPages = searchResult?.webPages?.value || [];
  snippet = '';
  
  // 最大10件まで安全に処理
  for (let i = 0; i < Math.min(webPages.length, 10); i++) {
    if (webPages[i]?.snippet) {
      snippet += webPages[i].snippet + ' ';
    }
  }
  
  // 検索結果がない場合のデフォルトメッセージ
  if (!snippet.trim()) {
    snippet = '検索結果が見つかりませんでした。一般的な知識に基づいて回答いたします。';
  }

  // Webスクレイピングを実行
  let scrapedContents: any[] = [];
  if (webPages.length > 0) {
    try {
      console.log('Starting web scraping for chat...');
      
      // URLを抽出
      const urls = webPages
        .map((result: any) => result.url)
        .filter((url: string) => url && url.trim() !== '');
      
      console.log(`Found ${urls.length} URLs to scrape for chat`);
      
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
          
          console.log(`Successfully scraped ${scrapedContents.filter(c => c.success).length} URLs for chat`);
        }
      } finally {
        // ブラウザを閉じる
        await scrapingService.close();
      }
      
    } catch (error) {
      console.error('Web scraping failed for chat:', error);
    }
  }

  // BingResultの安全な処理
  BingResult = '';
  for (let i = 0; i < Math.min(webPages.length, 5); i++) {
    if (webPages[i]?.name && webPages[i]?.snippet) {
      BingResult += webPages[i].name + "\n" + webPages[i].snippet + "\n";
    }
  }
  
  if (!BingResult.trim()) {
    BingResult = '検索結果が見つかりませんでした。';
  }

  // 検索結果を構造化データとして保存（後で表示用）
  const searchResults = webPages.slice(0, 5).map((page: any, index: number) => ({
    name: page.name || 'タイトルなし',
    snippet: page.snippet || '説明なし',
    url: page.url || '#',
    sortOrder: index + 1
  }));

  //console.log(snippet) ;
  
  // 検索結果からCitation用のデータを準備
  const citationItems = searchResults.map((result: any, index: number) => ({
    name: result.name,
    id: result.url,
    snippet: result.snippet
  }));
  
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
  context += snippet;

  Prompt = `以下の質問について、Web検索結果とWebページの内容を基に、構造化された分かりやすい回答を提供してください。

回答の要件：
1. **要点を明確に**: 最も重要な情報から順に記載
2. **構造化**: 箇条書きや段落分けを活用
3. **具体的な情報**: 数字、日付、場所などの具体的な情報を優先
4. **信頼性**: 複数の情報源で確認できる情報を重視
5. **実用性**: 質問者の立場に立った実用的な情報を提供

文字数制限: 800文字程度

回答の最後には必ず以下の形式でWebCitationを含めてください：
{% webCitation items=[{name:"${citationItems[0]?.name || ''}",id:"${citationItems[0]?.id || ''}"}`;
  if (citationItems.length > 1) {
    Prompt += `, {name:"${citationItems[1]?.name || ''}",id:"${citationItems[1]?.id || ''}"}`;
  }
  if (citationItems.length > 2) {
    Prompt += `, {name:"${citationItems[2]?.name || ''}",id:"${citationItems[2]?.id || ''}"}`;
  }
  Prompt += `] /%}

【質問】${lastHumanMessage.content}
【Web検索結果とWebページの内容】${context}`;

  const chatHistory = new CosmosDBChatMessageHistory({
    sessionId: chatThread.id,
    userId: userId,
  });

  await chatHistory.addMessage({
    content: lastHumanMessage.content,
    role: "user",
  } as any);

  const history = await chatHistory.getMessages();
  const topHistory = history.slice(history.length - 30, history.length);
  //var topHistory = "[ { role: 'user', content: '" + Prompt + "' } ]";
  //console.log(topHistory);

  try {
    const response = await openAI.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `あなたは ${AI_NAME} です。ユーザーからの質問に対して日本語で丁寧に回答します。

回答の指針：
1. **明確で簡潔な回答**: 要点を絞って、分かりやすく説明してください
2. **構造化された情報**: 箇条書きや段落分けを活用して情報を整理してください
3. **具体的な情報**: 数字、日付、場所など具体的な情報を優先的に含めてください
4. **信頼性の高い情報**: 複数の情報源で確認できる情報を重視してください
5. **ユーザーの視点**: 質問者の立場に立って、実用的で価値のある情報を提供してください
6. **最新情報の優先**: 最新の情報を優先し、古い情報は明示してください

回答形式：
- 重要な情報から順に記載
- 必要に応じて箇条書きを使用
- 関連する追加情報があれば補足として記載
- 情報の信頼性について言及（可能な場合）

質問には正直かつ正確に答えます。`,
        },
        {
          role: "user",
          content: Prompt,
        }
      ],
      //model: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME,
      model: chatAPIModel,
      stream: true,
    });


    const stream = OpenAIStream(response as any, {
      async onCompletion(completion) {
        console.log('Chat completion finished:', {
          contentLength: completion.length,
          searchResultsCount: searchResults.length
        });
        
        // メッセージ保存は型の問題で一時的に無効化
        // await chatHistory.addMessage({
        //   content: completion,
        //   role: "assistant"
        // });
      },
    });
    
    return new StreamingTextResponse(stream);
    
  } catch (e: unknown) {
    if (e instanceof Error) {
      return new Response(e.message, {
        status: 500,
        statusText: e.toString(),
      });
    } else {
      return new Response("An unknown error occurred.", {
        status: 500,
        statusText: "Unknown Error",
      });
    }
  }
};
