const { CosmosClient } = require('@azure/cosmos');

// 環境変数の読み込み
require('dotenv').config({ path: '.env.local' });

async function debugUserId() {
  try {
    console.log('ユーザーIDのデバッグを開始します...');
    
    // CosmosDBクライアントの初期化
    const client = new CosmosClient({
      endpoint: process.env.AZURE_COSMOSDB_URI,
      key: process.env.AZURE_COSMOSDB_KEY
    });
    
    const database = client.database(process.env.AZURE_COSMOSDB_DB_NAME);
    const container = database.container('settings');
    
    // メールアドレスでユーザーを検索
    const query = "SELECT * FROM c WHERE c.type = 'user-settings' AND c.email = 'admin@emoconne.onmicrosoft.com'";
    const { resources: users } = await container.items.query(query).fetchAll();
    
    console.log('検索結果:', users.length, '件');
    
    users.forEach((user, index) => {
      console.log(`\n--- ユーザー ${index + 1} ---`);
      console.log('ID:', user.id);
      console.log('userId:', user.userId);
      console.log('userPrincipalName:', user.userPrincipalName);
      console.log('email:', user.email);
      console.log('adminRole:', user.adminRole);
      console.log('userType:', user.userType);
      console.log('isActive:', user.isActive);
    });
    
    // すべてのユーザー設定を表示
    console.log('\n=== すべてのユーザー設定 ===');
    const allUsersQuery = "SELECT * FROM c WHERE c.type = 'user-settings'";
    const { resources: allUsers } = await container.items.query(allUsersQuery).fetchAll();
    
    allUsers.forEach((user, index) => {
      console.log(`\n--- 全ユーザー ${index + 1} ---`);
      console.log('ID:', user.id);
      console.log('userId:', user.userId);
      console.log('userPrincipalName:', user.userPrincipalName);
      console.log('email:', user.email);
      console.log('adminRole:', user.adminRole);
      console.log('userType:', user.userType);
      console.log('isActive:', user.isActive);
    });
    
  } catch (error) {
    console.error('❌ デバッグに失敗しました:', error);
  }
}

// スクリプト実行
debugUserId();
