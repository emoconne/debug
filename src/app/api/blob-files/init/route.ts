import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { options as authOptions } from '@/features/auth/auth-api';
import { CosmosClient } from '@azure/cosmos';

export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/blob-files/init - Starting initialization');
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      console.log('POST /api/blob-files/init - Admin permission required');
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
    }

    const cosmosUrl = process.env.AZURE_COSMOSDB_URI;
    const cosmosKey = process.env.AZURE_COSMOSDB_KEY;
    const databaseName = process.env.AZURE_COSMOSDB_DB_NAME || 'chat';

    console.log('POST /api/blob-files/init - Environment variables:', {
      cosmosUrl: cosmosUrl ? '設定済み' : '未設定',
      cosmosKey: cosmosKey ? '設定済み' : '未設定',
      databaseName
    });

    if (!cosmosUrl || !cosmosKey) {
      console.log('POST /api/blob-files/init - Missing environment variables');
      return NextResponse.json(
        { error: 'AZURE_COSMOSDB_URI or AZURE_COSMOSDB_KEY is not configured' },
        { status: 500 }
      );
    }

    console.log('POST /api/blob-files/init - Creating CosmosClient');
    const client = new CosmosClient({
      endpoint: cosmosUrl,
      key: cosmosKey,
    });

    // データベースを作成（存在しない場合）
    console.log('POST /api/blob-files/init - Creating database:', databaseName);
    const { database } = await client.databases.createIfNotExists({
      id: databaseName,
    });

    // blob-filesコンテナを作成（存在しない場合）
    console.log('POST /api/blob-files/init - Creating container: blob-files');
    const { container } = await database.containers.createIfNotExists({
      id: 'blob-files',
      partitionKey: {
        paths: ['/containerName'],
      },
    });

    console.log('POST /api/blob-files/init - Initialization completed successfully');
    return NextResponse.json({ 
      success: true,
      message: 'BLOBファイル管理用のCosmosDBコンテナが初期化されました',
      databaseName,
      containerName: 'blob-files'
    });
  } catch (error) {
    console.error('Error initializing blob-files container:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'コンテナの初期化に失敗しました' },
      { status: 500 }
    );
  }
}
