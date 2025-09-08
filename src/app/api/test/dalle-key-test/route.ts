import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('=== DALL-E API Key Test ===');
    
    // 環境変数の値を確認
    const dalleApiKey = process.env.AZURE_OPENAI_DALLE_API_KEY;
    const dalleEndpoint = process.env.AZURE_OPENAI_DALLE_ENDPOINT;
    
    if (!dalleApiKey) {
      return NextResponse.json({
        status: 'error',
        error: 'AZURE_OPENAI_DALLE_API_KEYが設定されていません'
      }, { status: 400 });
    }
    
    // APIキーの形式を確認
    const keyLength = dalleApiKey.length;
    const keyPrefix = dalleApiKey.substring(0, 4);
    const keySuffix = dalleApiKey.substring(keyLength - 4);
    const isBase64 = /^[A-Za-z0-9+/]*={0,2}$/.test(dalleApiKey);
    
    // エンドポイントからリソース名を抽出
    let resourceName = '';
    if (dalleEndpoint) {
      const match = dalleEndpoint.match(/https:\/\/([^.]+)\.cognitiveservices\.azure\.com/);
      if (match) {
        resourceName = match[1];
      }
    }
    
    const response = {
      status: 'success',
      apiKeyAnalysis: {
        hasKey: !!dalleApiKey,
        keyLength: keyLength,
        keyPrefix: keyPrefix,
        keySuffix: keySuffix,
        isBase64Format: isBase64,
        keyPreview: `${keyPrefix}...${keySuffix}`
      },
      endpointAnalysis: {
        hasEndpoint: !!dalleEndpoint,
        resourceName: resourceName,
        endpoint: dalleEndpoint
      },
      recommendations: []
    };
    
    // 推奨事項を追加
    if (keyLength < 32) {
      response.recommendations.push('APIキーが短すぎます。正しいAPIキーを確認してください。');
    }
    
    if (!isBase64) {
      response.recommendations.push('APIキーの形式が正しくありません。Base64形式である必要があります。');
    }
    
    if (!resourceName) {
      response.recommendations.push('エンドポイントからリソース名を抽出できませんでした。');
    }
    
    if (response.recommendations.length === 0) {
      response.recommendations.push('APIキーの形式は正常です。');
    }

    return NextResponse.json(response);
    
  } catch (error) {
    console.error('DALL-E API Key Test Error:', error);
    
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
