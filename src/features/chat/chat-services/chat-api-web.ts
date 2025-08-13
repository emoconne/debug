import { userHashedId } from "@/features/auth/helpers";
import { OpenAIInstance } from "@/features/common/openai";
import { AI_NAME } from "@/features/theme/customise";
import { OpenAIStream, StreamingTextResponse } from "ai";
import { initAndGuardChatSession } from "./chat-thread-service";
import { CosmosDBChatMessageHistory } from "./cosmosdb/cosmosdb";
import { BingSearchResult } from "./Azure-bing-search/bing";
import { PromptGPTProps } from "./models";
import puppeteer from 'puppeteer'
import { Lexend_Tera } from "next/font/google";

export const ChatAPIWeb = async (props: PromptGPTProps) => {
  var snippet = "";
  var Prompt = "";
  var BingResult = "";
  var WebinnerText = "";
  const { lastHumanMessage, chatThread } = await initAndGuardChatSession(props);

  const openAI = OpenAIInstance();

  const userId = await userHashedId();

  let chatAPIModel = "";
  if (props.chatAPIModel === "GPT-3") {
    chatAPIModel = "gpt-35-turbo-16k";
  }else{
    chatAPIModel = "gpt-4o";
  }
//  console.log("Model_web: ", process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME);
//  console.log("PromptGPTProps_web: ", props.chatAPIModel);

  const bing = new BingSearchResult();
  let searchResult;
  
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


/*   // ブラウザを起動
  const browser = await puppeteer.launch({ headless: true })
  // 新しくページを開く
  const page = await browser.newPage()
  // 対象のページへ遷移
  await page.goto(searchResult.webPages.value[0].url)
  let pageText = await page.evaluate(() => document.body.innerText);
  WebinnerText = '参照URL:'+ searchResult.webPages.value[0].url + '検索結果:'+ pageText.substring(0, 1000);
  // 対象のページへ遷移
  //await page.goto(searchResult.webPages.value[1].url)
  //pageText += await page.evaluate(() => document.body.innerText);
  //WebinnerText = '参照URL:'+ searchResult.webPages.value[0].url + '検索結果:'+ pageText.substring(0, 1000);
　// ブラウザを閉じる
  await browser.close()
 */
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
  const searchResults = webPages.slice(0, 5).map((page, index) => ({
    name: page.name || 'タイトルなし',
    snippet: page.snippet || '説明なし',
    url: page.url || '#',
    sortOrder: index + 1
  }));

  //console.log(snippet) ;
  
  // 検索結果からCitation用のデータを準備
  const citationItems = searchResults.map((result, index) => ({
    name: result.name,
    id: result.url,
    snippet: result.snippet
  }));
  
  Prompt = "次の{問い合わせ}について、{Web検索結果}を元に要点を絞って簡潔に回答してください（800文字程度）。" ;
  Prompt += "回答の最後には必ず以下の形式でWebCitationを含めてください：{% webCitation items=[{name:\"" + citationItems[0]?.name + "\",id:\"" + citationItems[0]?.id + "\"}" ;
  if (citationItems.length > 1) {
    Prompt += ", {name:\"" + citationItems[1]?.name + "\",id:\"" + citationItems[1]?.id + "\"}" ;
  }
  if (citationItems.length > 2) {
    Prompt += ", {name:\"" + citationItems[2]?.name + "\",id:\"" + citationItems[2]?.id + "\"}" ;
  }
  Prompt += "] /%}" ;
  Prompt += "【問い合わせ】 "  + lastHumanMessage.content ;
  //Prompt += "【Web検索結果】" + snippet; 
  Prompt += "【Web検索結果】" + snippet; 
  //Prompt += "参照URLを回答最後に表示してください"; 

  const chatHistory = new CosmosDBChatMessageHistory({
    sessionId: chatThread.id,
    userId: userId,
  });

  await chatHistory.addMessage({
    content: lastHumanMessage.content,
    role: "user",
  });

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
          - 質問には正直かつ正確に答えます。`,
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


    const stream = OpenAIStream(response, {
      async onCompletion(completion) {
        // 検索結果をメッセージに含める
        const messageWithSearchResults = {
          content: completion,
          role: "assistant",
          searchResults: searchResults // 検索結果を追加
        };
        

        
        console.log('Saving message with search results:', {
          contentLength: completion.length,
          searchResultsCount: searchResults.length,
          searchResults: searchResults
        });
        
        await chatHistory.addMessage(messageWithSearchResults);
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
