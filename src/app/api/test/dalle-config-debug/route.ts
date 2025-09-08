import { NextResponse } from 'next/server';
import { DalleImageService } from '@/features/chat/chat-services/dalle-image-service';

export async function GET() {
  try {
    console.log('=== DALL-E Configuration Debug API ===');
    
    // 環境変数の確認
    const dalleEndpoint = process.env.AZURE_OPENAI_DALLE_ENDPOINT;
    const dalleDeploymentName = process.env.AZURE_OPENAI_DALLE_DEPLOYMENT_NAME;
    const dalleApiKey = process.env.AZURE_OPENAI_DALLE_API_KEY;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION;
    
    console.log('DALL-E environment variables:', {
      hasDalleEndpoint: !!dalleEndpoint,
      hasDalleDeploymentName: !!dalleDeploymentName,
      hasDalleApiKey: !!dalleApiKey,
      hasApiVersion: !!apiVersion,
      dalleEndpoint: dalleEndpoint,
      dalleDeploymentName: dalleDeploymentName,
      apiVersion: apiVersion
    });

    // 設定の検証
    const configValidation = DalleImageService.validateConfiguration();
    
    const response = {
      status: 'success',
      configuration: {
        hasDalleEndpoint: !!dalleEndpoint,
        hasDalleDeploymentName: !!dalleDeploymentName,
        hasDalleApiKey: !!dalleApiKey,
        hasApiVersion: !!apiVersion,
        dalleEndpoint: dalleEndpoint,
        dalleDeploymentName: dalleDeploymentName,
        apiVersion: apiVersion
      },
      validation: {
        isValid: configValidation.isValid,
        errors: configValidation.errors
      },
      recommendations: []
    };

    // 推奨事項を追加
    if (!dalleEndpoint) {
      response.recommendations.push('AZURE_OPENAI_DALLE_ENDPOINTを設定してください');
    }
    
    if (!dalleDeploymentName) {
      response.recommendations.push('AZURE_OPENAI_DALLE_DEPLOYMENT_NAMEを設定してください（例：dall-e-3）');
    }
    
    if (!dalleApiKey) {
      response.recommendations.push('AZURE_OPENAI_DALLE_API_KEYを設定してください');
    }

    if (configValidation.isValid) {
      response.recommendations.push('設定は正常です。DALL-E画像生成機能が利用可能です。');
    } else {
      response.recommendations.push('設定に問題があります。上記の推奨事項を確認してください。');
    }

    return NextResponse.json(response);
    
  } catch (error) {
    console.error('DALL-E Configuration Debug Error:', error);
    
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      configuration: {
        hasDalleEndpoint: !!process.env.AZURE_OPENAI_DALLE_ENDPOINT,
        hasDalleDeploymentName: !!process.env.AZURE_OPENAI_DALLE_DEPLOYMENT_NAME,
        hasDalleApiKey: !!process.env.AZURE_OPENAI_DALLE_API_KEY,
        hasApiVersion: !!process.env.AZURE_OPENAI_API_VERSION
      }
    }, { status: 500 });
  }
}
