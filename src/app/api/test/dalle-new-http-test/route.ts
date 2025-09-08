import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('=== DALL-E New HTTP Test ===');
    
    // 環境変数の値を確認
    const dalleEndpoint = process.env.AZURE_OPENAI_DALLE_ENDPOINT;
    const dalleDeploymentName = process.env.AZURE_OPENAI_DALLE_DEPLOYMENT_NAME;
    const dalleApiKey = process.env.AZURE_OPENAI_DALLE_API_KEY;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION;
    
    if (!dalleEndpoint || !dalleApiKey) {
      return NextResponse.json({
        status: 'error',
        error: '必要な環境変数が設定されていません'
      }, { status: 400 });
    }

    // エンドポイントからベースURLを抽出
    let baseURL = dalleEndpoint;
    
    // エンドポイントが完全なURLの場合は、ベースURLを抽出
    if (dalleEndpoint.includes('/deployments/')) {
      baseURL = dalleEndpoint.split('/deployments/')[0];
    }
    
    // APIバージョンを抽出
    let extractedApiVersion = apiVersion || '2024-02-01';
    if (dalleEndpoint.includes('api-version=')) {
      const apiVersionMatch = dalleEndpoint.match(/api-version=([^&]+)/);
      if (apiVersionMatch) {
        extractedApiVersion = apiVersionMatch[1];
      }
    }

    const fullRequestURL = `${baseURL}/deployments/${dalleDeploymentName}/images/generations?api-version=${extractedApiVersion}`;
    
    console.log('Making HTTP request to:', fullRequestURL);
    
    // 実際のHTTPリクエストをテスト
    const testResponse = await fetch(fullRequestURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': dalleApiKey
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
        originalEndpoint: dalleEndpoint,
        baseURL: baseURL,
        deploymentName: dalleDeploymentName,
        apiVersion: extractedApiVersion
      }
    };

    return NextResponse.json(response);
    
  } catch (error) {
    console.error('DALL-E New HTTP Test Error:', error);
    
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
