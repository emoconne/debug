const { CosmosClient } = require('@azure/cosmos');

// 環境変数の読み込み
require('dotenv').config({ path: '.env.local' });

async function createAdminUser() {
  try {
    console.log('管理者ユーザーの作成を開始します...');
    
    // CosmosDBクライアントの初期化
    const client = new CosmosClient({
      endpoint: process.env.AZURE_COSMOSDB_URI,
      key: process.env.AZURE_COSMOSDB_KEY
    });
    
    const database = client.database(process.env.AZURE_COSMOSDB_DB_NAME);
    const container = database.container('settings');
    
    // 管理者ユーザーの設定
    const adminUser = {
      id: `admin-${Date.now()}`,
      type: 'user-settings',
      userId: 'admin-test-user',
      userPrincipalName: 'admin@emoconne.onmicrosoft.com',
      displayName: 'テスト管理者',
      email: 'admin@emoconne.onmicrosoft.com',
      userType: 'executive',
      adminRole: 'admin',
      department: 'IT部門',
      jobTitle: 'システム管理者',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    console.log('管理者ユーザー設定:', adminUser);
    
    // CosmosDBに保存
    const result = await container.items.create(adminUser);
    
    console.log('✅ 管理者ユーザーが正常に作成されました');
    console.log('作成されたユーザーID:', result.resource.id);
    console.log('メールアドレス:', adminUser.email);
    console.log('管理者権限:', adminUser.adminRole);
    console.log('ユーザータイプ:', adminUser.userType);
    
  } catch (error) {
    console.error('❌ 管理者ユーザーの作成に失敗しました:', error);
    
    if (error.code === 409) {
      console.log('⚠️  ユーザーは既に存在します');
    }
  }
}

// スクリプト実行
createAdminUser();
