import { NextResponse } from 'next/server';
import { OpenAIInstance } from '@/features/common/openai';

export async function GET() {
  try {
    console.log('=== Azure OpenAI Debug API ===');
    
    // 環境変数の確認
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const deploymentName = process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME;
    const apiKey = process.env.OPENAI_API_KEY;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION;
    
    console.log('Azure OpenAI environment variables:', {
      hasEndpoint: !!endpoint,
      hasDeploymentName: !!deploymentName,
      hasApiKey: !!apiKey,
      hasApiVersion: !!apiVersion,
      endpoint: endpoint,
      deploymentName: deploymentName,
      apiVersion: apiVersion
    });

    if (!endpoint || !deploymentName || !apiKey || !apiVersion) {
      return NextResponse.json({
        error: 'Azure OpenAIの環境変数が設定されていません',
        missing: {
          endpoint: !endpoint,
          deploymentName: !deploymentName,
          apiKey: !apiKey,
          apiVersion: !apiVersion
        }
      }, { status: 400 });
    }

    // OpenAIインスタンスの作成とテスト
    try {
      console.log('Testing Azure OpenAI connection...');
      const openai = OpenAIInstance();
      
      // 簡単なテストリクエスト
      const response = await openai.chat.completions.create({
        messages: [
          {
            role: "user",
            content: "Hello, this is a test message."
          }
        ],
        model: deploymentName,
        max_tokens: 10,
        stream: false,
      });
      
      console.log('Azure OpenAI test successful');
      
      return NextResponse.json({
        success: true,
        message: 'Azure OpenAIの設定が正常です',
        config: {
          endpoint: endpoint,
          deploymentName: deploymentName,
          apiVersion: apiVersion
        },
        testResponse: {
          content: response.choices[0]?.message?.content,
          usage: response.usage
        }
      });

    } catch (openaiError) {
      console.error('OpenAI test error:', openaiError);
      return NextResponse.json({
        error: 'Azure OpenAI APIのテストに失敗しました',
        details: openaiError instanceof Error ? openaiError.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Azure OpenAI Debug API error:', error);
    return NextResponse.json({
      error: 'Azure OpenAIのデバッグ処理中にエラーが発生しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
