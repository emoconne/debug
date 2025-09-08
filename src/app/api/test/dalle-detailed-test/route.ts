import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('=== DALL-E Detailed Test ===');
    
    // 環境変数の値を確認
    const dalleEndpoint = process.env.AZURE_OPENAI_DALLE_ENDPOINT;
    const dalleApiKey = process.env.AZURE_OPENAI_DALLE_API_KEY;
    
    if (!dalleEndpoint || !dalleApiKey) {
      return NextResponse.json({
        status: 'error',
        error: '必要な環境変数が設定されていません',
        missing: {
          endpoint: !dalleEndpoint,
          apiKey: !dalleApiKey
        }
      }, { status: 400 });
    }

    console.log('Making detailed HTTP request to:', dalleEndpoint);
    
    // テスト用のリクエストボディ
    const requestBody = {
      prompt: 'A simple red circle on white background',
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      style: 'natural'
    };
    
    console.log('Request body:', JSON.stringify(requestBody, null, 2));
    
    // 実際のHTTPリクエストをテスト
    const testResponse = await fetch(dalleEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': dalleApiKey
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('Response Status:', testResponse.status);
    console.log('Response Status Text:', testResponse.statusText);
    console.log('Response Headers:', Object.fromEntries(testResponse.headers.entries()));
    
    let responseBody;
    let responseData;
    let isJson = false;
    
    try {
      responseBody = await testResponse.text();
      console.log('Raw Response Body:', responseBody);
      
      // JSONとして解析を試行
      try {
        responseData = JSON.parse(responseBody);
        isJson = true;
        console.log('Parsed JSON Response:', JSON.stringify(responseData, null, 2));
      } catch (parseError) {
        console.log('Response is not valid JSON');
        responseData = null;
      }
    } catch (error) {
      console.log('Failed to read response body:', error);
      responseBody = 'Failed to read response body';
      responseData = null;
    }
    
    const response = {
      status: 'success',
      request: {
        url: dalleEndpoint,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': '***HIDDEN***'
        },
        body: requestBody
      },
      response: {
        status: testResponse.status,
        statusText: testResponse.statusText,
        headers: Object.fromEntries(testResponse.headers.entries()),
        body: responseBody,
        isJson: isJson,
        parsedData: responseData,
        isSuccess: testResponse.ok
      },
      analysis: {
        hasValidEndpoint: !!dalleEndpoint,
        hasValidApiKey: !!dalleApiKey,
        endpointFormat: dalleEndpoint.includes('/deployments/') ? 'full' : 'base',
        hasApiVersion: dalleEndpoint.includes('api-version='),
        isCognitiveServices: dalleEndpoint.includes('cognitiveservices.azure.com')
      }
    };

    return NextResponse.json(response);
    
  } catch (error) {
    console.error('DALL-E Detailed Test Error:', error);
    
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
