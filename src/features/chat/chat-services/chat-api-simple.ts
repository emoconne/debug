import { userHashedId } from "@/features/auth/helpers";
import { OpenAIInstance } from "@/features/common/openai";
import { AI_NAME } from "@/features/theme/customise";
import { OpenAIStream, StreamingTextResponse } from "ai";
import { initAndGuardChatSession } from "./chat-thread-service";
import { CosmosDBChatMessageHistory } from "./cosmosdb/cosmosdb";
import { PromptGPTProps } from "./models";

export const ChatAPISimple = async (props: PromptGPTProps) => {
  const { lastHumanMessage, chatThread } = await initAndGuardChatSession(props);
  // CosmosDBからデフォルトのGPTモデルを取得
  let chatAPIModel = process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME || "gpt-4o";
  
  try {
    const { getDefaultGPTModel } = await import("@/features/documents/cosmos-db-gpt-model-service");
    const defaultModel = await getDefaultGPTModel();
    if (defaultModel) {
      chatAPIModel = defaultModel.deploymentName;
    }
  } catch (error) {
    console.log('Failed to get default GPT model from CosmosDB, using environment variable:', error);
  }
  
  console.log('Using model:', chatAPIModel);
  
  const openAI = OpenAIInstance();
  
  // デバッグ情報を出力
  console.log('OpenAI configuration:', {
    baseURL: process.env.AZURE_OPENAI_ENDPOINT,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION,
    deploymentName: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME,
    hasApiKey: !!process.env.OPENAI_API_KEY
  });

  const userId = await userHashedId();

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

  try {
    const response = await openAI.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `あなたは ${AI_NAME} です。ユーザーからの質問に対して日本語で丁寧に回答します。
          - 明確かつ簡潔な質問をし、丁寧かつ専門的な回答を返します。
          - 質問には正直かつ正確に答えます。`,
        },
        ...topHistory,
      ],
      model: chatAPIModel, //process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME,
      stream: true,
    });

    const stream = OpenAIStream(response, {
      async onCompletion(completion) {
        await chatHistory.addMessage({
          content: completion,
          role: "assistant",
        });
      },
    });
    return new StreamingTextResponse(stream);
  } catch (e: unknown) {
    console.error('ChatAPISimple error:', e);
    
    if (e instanceof Error) {
      console.error('Error details:', {
        message: e.message,
        stack: e.stack,
        name: e.name
      });
      
      return new Response(JSON.stringify({
        error: e.message,
        details: e.stack,
        type: e.name
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } else {
      console.error('Unknown error:', e);
      return new Response(JSON.stringify({
        error: "An unknown error occurred.",
        details: String(e)
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
  }
};
