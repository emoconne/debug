import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('=== DALL-E Endpoint Test ===');
    
    // 環境変数の値を確認
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const instanceName = process.env.AZURE_OPENAI_API_INSTANCE_NAME;
    const dalleDeploymentName = process.env.AZURE_OPENAI_DALLE_DEPLOYMENT_NAME;
    const dalleApiKey = process.env.AZURE_OPENAI_DALLE_API_KEY;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION;
    
    console.log('Raw environment variables:', {
      AZURE_OPENAI_ENDPOINT: endpoint,
      AZURE_OPENAI_API_INSTANCE_NAME: instanceName,
      AZURE_OPENAI_DALLE_DEPLOYMENT_NAME: dalleDeploymentName,
      AZURE_OPENAI_DALLE_API_KEY: dalleApiKey ? '***SET***' : 'NOT_SET',
      AZURE_OPENAI_API_VERSION: apiVersion
    });

    // エンドポイントの構築テスト
    let constructedEndpoint = endpoint?.replace(/\/$/, '');
    
    if (!constructedEndpoint && instanceName) {
      constructedEndpoint = `https://${instanceName}.openai.azure.com`;
    }
    
    // エンドポイントがAzure Cognitive Services形式の場合は、Azure OpenAI形式に変換
    if (constructedEndpoint && constructedEndpoint.includes('cognitiveservices.azure.com')) {
      const resourceName = constructedEndpoint.match(/https:\/\/([^.]+)\.cognitiveservices\.azure\.com/)?.[1];
      if (resourceName) {
        constructedEndpoint = `https://${resourceName}.openai.azure.com`;
        console.log('Converted endpoint from Cognitive Services to OpenAI format:', constructedEndpoint);
      }
    }

    const baseURL = `${constructedEndpoint}/openai`;
    const fullRequestURL = `${baseURL}/deployments/${dalleDeploymentName}/images/generations`;
    
    const response = {
      status: 'success',
      environmentVariables: {
        hasEndpoint: !!endpoint,
        hasInstanceName: !!instanceName,
        hasDalleDeploymentName: !!dalleDeploymentName,
        hasDalleApiKey: !!dalleApiKey,
        hasApiVersion: !!apiVersion,
        endpoint: endpoint,
        instanceName: instanceName,
        dalleDeploymentName: dalleDeploymentName,
        apiVersion: apiVersion
      },
      constructedEndpoint: {
        original: endpoint,
        constructed: constructedEndpoint,
        baseURL: baseURL,
        fullRequestURL: fullRequestURL
      },
      analysis: {
        isCognitiveServicesEndpoint: endpoint?.includes('cognitiveservices.azure.com') || false,
        isOpenAIEndpoint: constructedEndpoint?.includes('openai.azure.com') || false,
        resourceName: constructedEndpoint?.match(/https:\/\/([^.]+)\.openai\.azure\.com/)?.[1] || null
      }
    };

    return NextResponse.json(response);
    
  } catch (error) {
    console.error('DALL-E Endpoint Test Error:', error);
    
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
