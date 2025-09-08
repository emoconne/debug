import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('=== DALL-E HTTP Test ===');
    
    // 環境変数の値を確認
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const instanceName = process.env.AZURE_OPENAI_API_INSTANCE_NAME;
    const dalleDeploymentName = process.env.AZURE_OPENAI_DALLE_DEPLOYMENT_NAME;
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

    const baseURL = `${constructedEndpoint}/openai`;
    const fullRequestURL = `${baseURL}/deployments/${dalleDeploymentName}/images/generations`;
    
    console.log('Making HTTP request to:', fullRequestURL);
    
    // 実際のHTTPリクエストをテスト
    const testResponse = await fetch(fullRequestURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': dalleApiKey || '',
        'api-version': apiVersion || '2024-02-15-preview'
      },
      body: JSON.stringify({
        prompt: 'A simple red circle on white background',
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        style: 'natural'
      })
    });
    
    console.log('HTTP Response Status:', testResponse.status);
    console.log('HTTP Response Headers:', Object.fromEntries(testResponse.headers.entries()));
    
    let responseBody;
    try {
      responseBody = await testResponse.text();
      console.log('HTTP Response Body:', responseBody);
    } catch (error) {
      console.log('Failed to read response body:', error);
      responseBody = 'Failed to read response body';
    }
    
    const response = {
      status: 'success',
      httpTest: {
        requestURL: fullRequestURL,
        responseStatus: testResponse.status,
        responseStatusText: testResponse.statusText,
        responseHeaders: Object.fromEntries(testResponse.headers.entries()),
        responseBody: responseBody,
        isSuccess: testResponse.ok
      },
      configuration: {
        endpoint: constructedEndpoint,
        baseURL: baseURL,
        deploymentName: dalleDeploymentName,
        apiVersion: apiVersion
      }
    };

    return NextResponse.json(response);
    
  } catch (error) {
    console.error('DALL-E HTTP Test Error:', error);
    
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
