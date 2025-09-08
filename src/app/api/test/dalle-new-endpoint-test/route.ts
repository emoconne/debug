import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('=== DALL-E New Endpoint Test ===');
    
    // 環境変数の値を確認
    const dalleEndpoint = process.env.AZURE_OPENAI_DALLE_ENDPOINT;
    const dalleDeploymentName = process.env.AZURE_OPENAI_DALLE_DEPLOYMENT_NAME;
    const dalleApiKey = process.env.AZURE_OPENAI_DALLE_API_KEY;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION;
    
    console.log('DALL-E environment variables:', {
      dalleEndpoint: dalleEndpoint,
      dalleDeploymentName: dalleDeploymentName,
      hasDalleApiKey: !!dalleApiKey,
      apiVersion: apiVersion
    });

    if (!dalleEndpoint) {
      return NextResponse.json({
        status: 'error',
        error: 'AZURE_OPENAI_DALLE_ENDPOINTが設定されていません'
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
    
    const response = {
      status: 'success',
      environmentVariables: {
        hasDalleEndpoint: !!dalleEndpoint,
        hasDalleDeploymentName: !!dalleDeploymentName,
        hasDalleApiKey: !!dalleApiKey,
        hasApiVersion: !!apiVersion,
        dalleEndpoint: dalleEndpoint,
        dalleDeploymentName: dalleDeploymentName,
        apiVersion: apiVersion
      },
      endpointAnalysis: {
        originalEndpoint: dalleEndpoint,
        extractedBaseURL: baseURL,
        extractedApiVersion: extractedApiVersion,
        hasDeploymentsPath: dalleEndpoint.includes('/deployments/'),
        hasApiVersionParam: dalleEndpoint.includes('api-version=')
      },
      constructedURLs: {
        baseURL: baseURL,
        fullRequestURL: `${baseURL}/deployments/${dalleDeploymentName}/images/generations?api-version=${extractedApiVersion}`
      }
    };

    return NextResponse.json(response);
    
  } catch (error) {
    console.error('DALL-E New Endpoint Test Error:', error);
    
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
