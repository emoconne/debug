import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('=== DALL-E Deployments Test ===');
    
    // 環境変数の値を確認
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const instanceName = process.env.AZURE_OPENAI_API_INSTANCE_NAME;
    const dalleApiKey = process.env.AZURE_OPENAI_DALLE_API_KEY;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION;
    
    // エンドポイントの構築
    let constructedEndpoint = endpoint?.replace(/\/$/, '');
    
    if (!constructedEndpoint && instanceName) {
      constructedEndpoint = `https://${instanceName}.openai.azure.com`;
    }
    
    // エンドポイントがAzure Cognitive Services形式の場合は、Azure OpenAI形式に変換
    if (constructedEndpoint && constructedEndpoint.includes('cognitiveservices.azure.com')) {
      const resourceName = constructedEndpoint.match(/https:\/\/([^.]+)\.cognitiveservices\.azure\.com/)?.[1];
      if (resourceName) {
        constructedEndpoint = `https://${resourceName}.openai.azure.com`;
      }
    }

    const deploymentsURL = `${constructedEndpoint}/openai/deployments`;
    
    console.log('Fetching deployments from:', deploymentsURL);
    
    // デプロイメント一覧を取得
    const deploymentsResponse = await fetch(deploymentsURL, {
      method: 'GET',
      headers: {
        'api-key': dalleApiKey || '',
        'api-version': apiVersion || '2024-02-15-preview'
      }
    });
    
    console.log('Deployments Response Status:', deploymentsResponse.status);
    console.log('Deployments Response Headers:', Object.fromEntries(deploymentsResponse.headers.entries()));
    
    let deploymentsBody;
    try {
      deploymentsBody = await deploymentsResponse.text();
      console.log('Deployments Response Body:', deploymentsBody);
    } catch (error) {
      console.log('Failed to read deployments response body:', error);
      deploymentsBody = 'Failed to read response body';
    }
    
    // モデル一覧も取得してみる
    const modelsURL = `${constructedEndpoint}/openai/models`;
    
    console.log('Fetching models from:', modelsURL);
    
    const modelsResponse = await fetch(modelsURL, {
      method: 'GET',
      headers: {
        'api-key': dalleApiKey || '',
        'api-version': apiVersion || '2024-02-15-preview'
      }
    });
    
    console.log('Models Response Status:', modelsResponse.status);
    
    let modelsBody;
    try {
      modelsBody = await modelsResponse.text();
      console.log('Models Response Body:', modelsBody);
    } catch (error) {
      console.log('Failed to read models response body:', error);
      modelsBody = 'Failed to read response body';
    }
    
    const response = {
      status: 'success',
      endpoint: {
        original: endpoint,
        constructed: constructedEndpoint,
        deploymentsURL: deploymentsURL,
        modelsURL: modelsURL
      },
      deployments: {
        status: deploymentsResponse.status,
        statusText: deploymentsResponse.statusText,
        headers: Object.fromEntries(deploymentsResponse.headers.entries()),
        body: deploymentsBody,
        isSuccess: deploymentsResponse.ok
      },
      models: {
        status: modelsResponse.status,
        statusText: modelsResponse.statusText,
        headers: Object.fromEntries(modelsResponse.headers.entries()),
        body: modelsBody,
        isSuccess: modelsResponse.ok
      },
      analysis: {
        hasValidEndpoint: !!constructedEndpoint,
        hasApiKey: !!dalleApiKey,
        hasApiVersion: !!apiVersion
      }
    };

    return NextResponse.json(response);
    
  } catch (error) {
    console.error('DALL-E Deployments Test Error:', error);
    
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
