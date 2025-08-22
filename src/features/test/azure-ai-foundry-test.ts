// Azure AI Foundry接続テスト
export interface AzureAIFoundryTestResult {
  success: boolean;
  message: string;
  details?: {
    endpoint: string;
    agentId: string;
    hasKey: boolean;
    connectionTest: boolean;
    authenticationTest: boolean;
  };
  error?: string;
}

export async function testAzureAIFoundryConnection(): Promise<AzureAIFoundryTestResult> {
  console.log('=== AZURE AI FOUNDRY CONNECTION TEST START ===');
  
  try {
    const projectEndpoint = process.env.AZURE_AI_FOUNDRY_ENDPOINT;
    const agentId = process.env.AZURE_AI_FOUNDRY_AGENT_ID;
    
    console.log('Environment variables check:');
    console.log('AZURE_AI_FOUNDRY_ENDPOINT:', projectEndpoint ? 'SET' : 'NOT SET');
    console.log('AZURE_AI_FOUNDRY_AGENT_ID:', agentId ? 'SET' : 'NOT SET');

    if (!projectEndpoint || !agentId) {
      return {
        success: false,
        message: "Azure AI Foundry設定が不完全です",
        details: {
          endpoint: projectEndpoint || "未設定",
          agentId: agentId || "未設定",
          hasKey: false,
          connectionTest: false,
          authenticationTest: false
        },
        error: "Missing Azure AI Foundry configuration"
      };
    }

    // 1. 認証テスト
    console.log('Testing authentication...');
    try {
      const { DefaultAzureCredential } = await import("@azure/identity");
      const credential = new DefaultAzureCredential();
      
      // 認証トークンの取得を試行
      const token = await credential.getToken("https://cognitiveservices.azure.com/.default");
      console.log('Authentication successful');
    } catch (authError) {
      console.error('Authentication failed:', authError);
      return {
        success: false,
        message: "Azure認証に失敗しました",
        details: {
          endpoint: projectEndpoint,
          agentId: agentId,
          hasKey: true,
          connectionTest: false,
          authenticationTest: false
        },
        error: `認証エラー: ${authError instanceof Error ? authError.message : '不明なエラー'}`
      };
    }

    // 2. Azure AI Projects SDK接続テスト
    console.log('Testing Azure AI Projects SDK connection...');
    try {
      const { AIProjectClient } = await import("@azure/ai-projects");
      const { DefaultAzureCredential } = await import("@azure/identity");
      
      const project = new AIProjectClient(projectEndpoint, new DefaultAzureCredential());
      
      // プロジェクト情報の取得を試行
      const projectInfo = await project.getProject();
      console.log('Project connection successful:', projectInfo.name);
      
      // エージェントの取得を試行
      const agent = await project.agents.getAgent(agentId);
      console.log('Agent retrieval successful:', agent.name);
      
      return {
        success: true,
        message: "Azure AI Foundry接続テストが成功しました",
        details: {
          endpoint: projectEndpoint,
          agentId: agentId,
          hasKey: true,
          connectionTest: true,
          authenticationTest: true
        }
      };
      
    } catch (connectionError) {
      console.error('Connection test failed:', connectionError);
      return {
        success: false,
        message: "Azure AI Foundry接続テストに失敗しました",
        details: {
          endpoint: projectEndpoint,
          agentId: agentId,
          hasKey: true,
          connectionTest: false,
          authenticationTest: true
        },
        error: `接続エラー: ${connectionError instanceof Error ? connectionError.message : '不明なエラー'}`
      };
    }

  } catch (error) {
    console.error('Azure AI Foundry test error:', error);
    
    const errorMessage = error instanceof Error ? error.message : "不明なエラー";
    
    return {
      success: false,
      message: `Azure AI Foundryテストに失敗しました: ${errorMessage}`,
      details: {
        endpoint: process.env.AZURE_AI_FOUNDRY_ENDPOINT || "未設定",
        agentId: process.env.AZURE_AI_FOUNDRY_AGENT_ID || "未設定",
        hasKey: false,
        connectionTest: false,
        authenticationTest: false
      },
      error: errorMessage
    };
  }
}
