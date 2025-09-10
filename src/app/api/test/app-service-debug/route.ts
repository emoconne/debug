import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/features/auth/auth-api";

export async function GET(request: NextRequest) {
  try {
    console.log('=== App Service Debug API ===');
    
    // 認証確認
    const session = await getServerSession(authOptions);
    const isAuthenticated = !!session?.user;
    const isAdmin = !!session?.user?.isAdmin;
    
    console.log('Authentication status:', { isAuthenticated, isAdmin });
    
    // 環境変数の確認
    const envVars = {
      // Azure AI Foundry
      AZURE_AI_FOUNDRY_ENDPOINT: process.env.AZURE_AI_FOUNDRY_ENDPOINT ? 'SET' : 'NOT SET',
      AZURE_AI_FOUNDRY_API_KEY: process.env.AZURE_AI_FOUNDRY_API_KEY ? 'SET' : 'NOT SET',
      AZURE_AI_FOUNDRY_AGENT_ID: process.env.AZURE_AI_FOUNDRY_AGENT_ID ? 'SET' : 'NOT SET',
      
      // Azure OpenAI
      AZURE_OPENAI_ENDPOINT: process.env.AZURE_OPENAI_ENDPOINT ? 'SET' : 'NOT SET',
      AZURE_OPENAI_API_KEY: process.env.AZURE_OPENAI_API_KEY ? 'SET' : 'NOT SET',
      AZURE_OPENAI_API_DEPLOYMENT_NAME: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME ? 'SET' : 'NOT SET',
      
      // Azure Speech
      AZURE_SPEECH_REGION: process.env.AZURE_SPEECH_REGION ? 'SET' : 'NOT SET',
      AZURE_SPEECH_KEY: process.env.AZURE_SPEECH_KEY ? 'SET' : 'NOT SET',
      AZURE_SPEECH_ENDPOINT: process.env.AZURE_SPEECH_ENDPOINT ? 'SET' : 'NOT SET',
      
      // CosmosDB
      AZURE_COSMOSDB_URI: process.env.AZURE_COSMOSDB_URI ? 'SET' : 'NOT SET',
      AZURE_COSMOSDB_KEY: process.env.AZURE_COSMOSDB_KEY ? 'SET' : 'NOT SET',
      AZURE_COSMOSDB_DB_NAME: process.env.AZURE_COSMOSDB_DB_NAME ? 'SET' : 'NOT SET',
    };
    
    console.log('Environment variables status:', envVars);
    
    // 実際の値（セキュリティのため一部のみ表示）
    const envValues = {
      AZURE_AI_FOUNDRY_ENDPOINT: process.env.AZURE_AI_FOUNDRY_ENDPOINT || null,
      AZURE_AI_FOUNDRY_AGENT_ID: process.env.AZURE_AI_FOUNDRY_AGENT_ID || null,
      AZURE_AI_FOUNDRY_API_KEY: process.env.AZURE_AI_FOUNDRY_API_KEY ? `${process.env.AZURE_AI_FOUNDRY_API_KEY.substring(0, 8)}...` : null,
      AZURE_OPENAI_ENDPOINT: process.env.AZURE_OPENAI_ENDPOINT || null,
      AZURE_OPENAI_API_DEPLOYMENT_NAME: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME || null,
      AZURE_SPEECH_REGION: process.env.AZURE_SPEECH_REGION || null,
      AZURE_COSMOSDB_URI: process.env.AZURE_COSMOSDB_URI || null,
      AZURE_COSMOSDB_DB_NAME: process.env.AZURE_COSMOSDB_DB_NAME || null,
    };
    
    // Managed Identityの確認
    let managedIdentityInfo = null;
    try {
      const { DefaultAzureCredential } = await import("@azure/identity");
      const credential = new DefaultAzureCredential();
      
      // トークンの取得を試行
      const token = await credential.getToken("https://cognitiveservices.azure.com/.default");
      managedIdentityInfo = {
        available: true,
        tokenLength: token?.token?.length || 0,
        expiresOn: token?.expiresOnTimestamp || null
      };
      console.log('Managed Identity is working');
    } catch (error) {
      managedIdentityInfo = {
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      console.error('Managed Identity error:', error);
    }
    
    // システム情報
    const systemInfo = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      environment: process.env.NODE_ENV,
      isAppService: !!process.env.WEBSITE_SITE_NAME,
      websiteSiteName: process.env.WEBSITE_SITE_NAME || null,
      websiteResourceGroup: process.env.WEBSITE_RESOURCE_GROUP || null,
    };
    
    console.log('System info:', systemInfo);
    
    return NextResponse.json({
      success: true,
      authentication: {
        isAuthenticated,
        isAdmin,
        userId: session?.user?.id || null,
        userEmail: session?.user?.email || null
      },
      environment: envVars,
      environmentValues: envValues,
      managedIdentity: managedIdentityInfo,
      system: systemInfo,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('App Service Debug API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : null,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
