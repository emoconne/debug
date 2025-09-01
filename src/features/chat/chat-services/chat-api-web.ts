import { userHashedId } from "@/features/auth/helpers";
import { OpenAIInstance } from "@/features/common/openai";
import { AI_NAME } from "@/features/theme/customise";
import { OpenAIStream, StreamingTextResponse } from "ai";
import { initAndGuardChatSession } from "./chat-thread-service";
import { CosmosDBChatMessageHistory } from "./cosmosdb/cosmosdb";
import { BingSearchResult } from "./Azure-bing-search/bing";
import { PromptGPTProps } from "./models";

export const ChatAPIWeb = async (props: PromptGPTProps) => {
  var snippet = "";
  var Prompt = "";
  var BingResult = "";
  const { lastHumanMessage, chatThread } = await initAndGuardChatSession(props);

  // デバッグ情報を収集
  const debugInfo = {
    query: lastHumanMessage.content,
    searchResults: [] as any[],
    processedSnippet: '',
    bingResult: '',
    prompt: '',
    assistantResponse: '',
    timestamp: new Date().toISOString()
  };

  const openAI = OpenAIInstance();
  const userId = await userHashedId();
  let chatAPIModel = process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME || "gpt-4o";

  // スレッドベースのメモリ機能を実装
  // チャットスレッドIDを基にスレッドを取得または作成
  let threadId = chatThread.id;
  
  // スレッドIDをグローバルに保存（セッション間で継続）
  if (!(global as any).webSearchThreads) {
    (global as any).webSearchThreads = new Map();
  }
  
  // ユーザーIDとチャットスレッドIDの組み合わせでスレッドを管理
  const threadKey = `${userId}_${chatThread.id}`;
  
  if (!(global as any).webSearchThreads.has(threadKey)) {
    // 新しいスレッドを作成
    console.log('Creating new thread for web search conversation');
    (global as any).webSearchThreads.set(threadKey, null); // スレッドIDは後で設定
  }
  
  // 現在のスレッドIDを取得
  const currentThreadId = (global as any).webSearchThreads.get(threadKey);
  console.log('Current thread ID:', currentThreadId);
  
  // コンテキスト付きのクエリを作成（前の会話を考慮）
  let contextQuery = lastHumanMessage.content;



  const bing = new BingSearchResult();
  let searchResult: any;
  let assistantResponse: string = '';
  
  try {
    // 検索結果とAssistantの回答を取得（スレッドID付きで実行）
    const searchResponse = await bing.SearchWeb(contextQuery, currentThreadId) as any;
    searchResult = searchResponse.searchResults || searchResponse;
    assistantResponse = searchResponse.assistantResponse || '';
    
    // スレッドIDを保存（次回の検索で使用）
    if (searchResponse.threadId) {
      (global as any).webSearchThreads.set(threadKey, searchResponse.threadId);
      console.log('Thread ID saved:', searchResponse.threadId);
    }
    
    // デバッグ情報を更新
    debugInfo.assistantResponse = assistantResponse;
    
    console.log('Search completed:', {
      searchResultsCount: searchResult?.webPages?.value?.length || 0,
      assistantResponseLength: assistantResponse.length,
      searchResponseKeys: Object.keys(searchResponse),
      threadId: searchResponse.threadId
    });
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

  // デバッグ情報を更新
  debugInfo.searchResults = searchResults;
  debugInfo.processedSnippet = snippet;
  debugInfo.bingResult = BingResult;
  
  console.log('Search results processed:', {
    webPagesCount: webPages.length,
    searchResultsCount: searchResults.length,
    snippetLength: snippet.length,
    bingResultLength: BingResult.length
  });

  // デバッグ用の詳細ログ出力
  if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
    console.log('=== SEARCH RESULTS DETAILS ===');
    console.log('Raw webPages count:', webPages.length);
    console.log('Processed searchResults count:', searchResults.length);
    console.log('Snippet preview:', snippet.substring(0, 200) + '...');
    console.log('BingResult preview:', BingResult.substring(0, 200) + '...');
    console.log('=== END SEARCH RESULTS ===');
  }
  
  // 検索結果からCitation用のデータを準備
  const citationItems = searchResults.map((result: any, index: number) => ({
    name: result.name,
    id: result.url,
    snippet: result.snippet
  }));

  Prompt = `以下の質問について、Web検索結果を基に、構造化された分かりやすい回答を提供してください。

回答の要件：
1. **要点を明確に**: 最も重要な情報から順に記載
2. **構造化**: 箇条書きや段落分けを活用
3. **具体的な情報**: 数字、日付、場所などの具体的な情報を優先
4. **信頼性**: 複数の情報源で確認できる情報を重視
5. **実用性**: 質問者の立場に立った実用的な情報を提供

文字数制限: 800文字程度

回答の最後には必ず以下の形式でWebCitationを含めてください：
{% webCitation items=[${citationItems.map((item: any) => `{name:"${item.name || ''}",id:"${item.id || ''}"}`).join(', ')}] /%}

【質問】${lastHumanMessage.content}
【Web検索結果】${snippet}`;

  // デバッグ情報を更新
  debugInfo.prompt = Prompt;

  // チャット履歴にメッセージを追加
  const chatHistory = new CosmosDBChatMessageHistory({
    sessionId: chatThread.id,
    userId: userId,
  });

  await chatHistory.addMessage({
    content: lastHumanMessage.content,
    role: "user",
  } as any);

  // Assistantの回答が既に取得されている場合は、それを直接使用
  if (assistantResponse && assistantResponse.trim()) {
    console.log('Using pre-generated Assistant response');
    
    // Citationを生成
    const citationItems = searchResults.map((result: any, index: number) => ({
      name: result.name,
      id: result.url,
      snippet: result.snippet
    }));
    
    // Assistantの回答からソース情報を除去
    let cleanResponse = assistantResponse;
    
    // 【3:2†source】形式のソース情報を除去
    cleanResponse = cleanResponse.replace(/【\d+:\d+†source】/g, '');
    
    // 連続する句読点を整理
    cleanResponse = cleanResponse.replace(/[。、]+/g, '。');
    cleanResponse = cleanResponse.replace(/。+/g, '。');
    
    // 前後の空白を除去
    cleanResponse = cleanResponse.trim();
    
    // Citationを含む回答を生成
    let finalResponse = cleanResponse;
    
    // WebCitationを追加
    if (citationItems.length > 0) {
      const webCitation = `{% webCitation items=[${citationItems.map((item: any) => `{name:"${item.name || ''}",id:"${item.id || ''}"}`).join(', ')}] /%}`;
      finalResponse += '\n\n' + webCitation;
    }
    
    // ストリーミングレスポンスを模擬
    const stream = new ReadableStream({
      start(controller) {
        // 回答を文字単位でストリーミング
        const text = finalResponse;
        let index = 0;
        
        const sendChunk = () => {
          if (index < text.length) {
            const chunk = text.slice(index, Math.min(index + 10, text.length));
            controller.enqueue(new TextEncoder().encode(chunk));
            index += 10;
            setTimeout(sendChunk, 50);
          } else {
            controller.close();
          }
        };
        
        sendChunk();
      }
    });

    const streamingResponse = new StreamingTextResponse(stream);
    
    // Assistantの回答をCosmosDBに保存
    try {
      await chatHistory.addMessage({
        content: finalResponse,
        role: "assistant",
        metadata: {
          chatType: 'web',
          searchResults: searchResults,
          citationItems: citationItems,
          threadId: (global as any).webSearchThreads?.get(threadKey) || null
        }
      } as any);
      console.log('Assistant response saved to CosmosDB with metadata');
    } catch (error) {
      console.error('Error saving assistant response to CosmosDB:', error);
    }
    
    // デバッグ情報を更新
    debugInfo.assistantResponse = finalResponse;
    
    // デバッグ情報をグローバルに保存（NEXT_PUBLIC_DEBUG=trueの場合のみ）
    if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
      (global as any).lastWebSearchDebugInfo = debugInfo;
      console.log('=== WEB SEARCH DEBUG INFO ===');
      console.log('Query:', debugInfo.query);
      console.log('Search Results Count:', debugInfo.searchResults.length);
      console.log('Processed Snippet Length:', debugInfo.processedSnippet.length);
      console.log('BingResult Length:', debugInfo.bingResult.length);
      console.log('Prompt Length:', debugInfo.prompt.length);
      console.log('Assistant Response Length:', debugInfo.assistantResponse.length);
      console.log('Citation Items Count:', citationItems.length);
      console.log('Timestamp:', debugInfo.timestamp);
      console.log('=== END DEBUG INFO ===');
    }
    
    return streamingResponse;
  }

  // Assistantの回答がない場合は、エラーメッセージを返す
  console.log('No Assistant response available, returning error');
  console.log('Debug info:', {
    assistantResponse: assistantResponse,
    assistantResponseLength: assistantResponse?.length || 0,
    searchResult: searchResult,
    searchResultKeys: Object.keys(searchResult || {})
  });
  return new Response("検索結果を取得できませんでした。しばらく時間をおいて再度お試しください。", {
    status: 500,
    statusText: "No Assistant Response",
  });
};
