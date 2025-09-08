import { userHashedId } from "@/features/auth/helpers";
import { OpenAIInstance } from "@/features/common/openai";
import { AI_NAME } from "@/features/theme/customise";
import { OpenAIStream, StreamingTextResponse } from "ai";
import { initAndGuardChatSession } from "./chat-thread-service";
import { CosmosDBChatMessageHistory } from "./cosmosdb/cosmosdb";
import { PromptGPTProps } from "./models";
import { DalleImageService } from "./dalle-image-service";

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
  } as any);

  const history = await chatHistory.getMessages();
  const topHistory = history.slice(history.length - 30, history.length);

  // 画像生成要求かどうかをチェック
  const isImageRequest = DalleImageService.isImageGenerationRequest(lastHumanMessage.content);
  
  if (isImageRequest) {
    // DALL-Eの設定が有効かどうかをチェック
    const configValidation = DalleImageService.validateConfiguration();
    if (!configValidation.isValid) {
      // DALL-Eの設定が不完全な場合、通常のテキストチャットにフォールバック
      console.log('DALL-E: Configuration invalid, falling back to text chat');
      
      // ユーザーに画像生成機能が利用できないことを通知
      const fallbackMessage = `申し訳ございませんが、現在画像生成機能は利用できません。\n\nDALL-E画像生成機能を使用するには、以下の環境変数を設定してください：\n\n**必要な環境変数：**\n- AZURE_OPENAI_DALLE_ENDPOINT: DALL-E専用のエンドポイントURL\n- AZURE_OPENAI_DALLE_DEPLOYMENT_NAME: DALL-Eデプロイメントの名前（例：dall-e-3）\n- AZURE_OPENAI_DALLE_API_KEY: DALL-E専用のAPIキー\n\n**設定手順：**\n1. Azure Cognitive ServicesでDALL-Eデプロイメントを作成\n2. エンドポイントURL、デプロイメント名、APIキーを環境変数に設定\n3. アプリケーションを再起動\n\n代わりに、テキストでの回答をお試しください。`;
      
      await chatHistory.addMessage({
        content: fallbackMessage,
        role: "assistant",
      } as any);
      
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(fallbackMessage));
          controller.close();
        },
      });
      
      return new StreamingTextResponse(stream);
    }
          try {
        console.log('DALL-E: Image generation request detected');
      
      // DALL-Eを使用して画像を生成
      const dalleService = new DalleImageService();
      const optimizedPrompt = DalleImageService.optimizePromptForImage(lastHumanMessage.content);
      
      const imageResult = await dalleService.generateImage(optimizedPrompt);
      
      // 画像生成の結果をメッセージとして保存
      const imageMessage = `画像を生成しました。\n\n**生成された画像:**\n![Generated Image](${imageResult.url})\n\n**使用されたプロンプト:** ${imageResult.revisedPrompt || optimizedPrompt}`;
      
      await chatHistory.addMessage({
        content: imageMessage,
        role: "assistant",
        imageUrl: imageResult.url,
      } as any);
      
      // ストリーミングレスポンスとして返す
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(imageMessage));
          controller.close();
        },
      });
      
      return new StreamingTextResponse(stream);
      
    } catch (error) {
      console.error('DALL-E: Image generation failed:', error);
      
      const errorMessage = `画像生成に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      await chatHistory.addMessage({
        content: errorMessage,
        role: "assistant",
      } as any);
      
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(errorMessage));
          controller.close();
        },
      });
      
      return new StreamingTextResponse(stream);
    }
  }

  // 通常のテキストチャット
  try {
    const response = await openAI.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `あなたは ${AI_NAME} です。ユーザーからの質問に対して日本語で丁寧に回答します。
          - 明確かつ簡潔な質問をし、丁寧かつ専門的な回答を返します。
          - 質問には正直かつ正確に答えます。
          - 絵を描くような要求があった場合は、DALL-Eを使用して画像を生成することを提案してください。`,
        },
        ...topHistory,
      ],
      model: chatAPIModel, //process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME,
      stream: true,
    });

    const stream = OpenAIStream(response as any, {
      async onCompletion(completion) {
        await chatHistory.addMessage({
          content: completion,
          role: "assistant",
        } as any);
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
