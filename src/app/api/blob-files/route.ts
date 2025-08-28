import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { options as authOptions } from '@/features/auth/auth-api';
import { BlobFileManagementService } from '@/features/documents/blob-file-management-service';

// ファイル一覧を取得
export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/blob-files - Starting file list retrieval');
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      console.log('GET /api/blob-files - Authentication failed');
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 常に全ファイルを取得（コンテナフィルタリングなし）
    console.log('GET /api/blob-files - Always getting all files (no container filtering)');

    const blobService = new BlobFileManagementService();
    console.log('GET /api/blob-files - BlobFileManagementService created');
    
    // コンテナの初期化（存在しない場合は作成）
    await blobService.initializeContainer();
    console.log('GET /api/blob-files - Container initialized');
    
    const files = await blobService.getFiles(undefined); // 全ファイルを取得
    console.log('GET /api/blob-files - Files retrieved:', files.length);
    console.log('GET /api/blob-files - Files data count:', files.length);

    return NextResponse.json({ files });
  } catch (error) {
    console.error('Error getting files:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'ファイル一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}

// ファイルをアップロード
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const formData = await request.formData();
    const fileData = formData.get('file');
    const containerName = formData.get('containerName') as string;

    if (!fileData) {
      return NextResponse.json({ error: 'ファイルが選択されていません' }, { status: 400 });
    }

    // サーバーサイドではFileオブジェクトの型チェックを避ける
    const file = fileData as any;

    if (!containerName) {
      return NextResponse.json({ error: 'コンテナ名が指定されていません' }, { status: 400 });
    }

    const blobService = new BlobFileManagementService();
    
    // コンテナの初期化（存在しない場合は作成）
    await blobService.initializeContainer();
    
    const result = await blobService.uploadFile(file, containerName, session.user.email || 'unknown');

    if (result.success && result.fileMetadata) {
      return NextResponse.json({ 
        success: true, 
        fileMetadata: result.fileMetadata,
        message: 'ファイルがアップロードされました'
      });
    } else {
      return NextResponse.json(
        { error: result.error || 'ファイルのアップロードに失敗しました' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'ファイルのアップロードに失敗しました' },
      { status: 500 }
    );
  }
}

// ファイルを削除
export async function DELETE(request: NextRequest) {
  try {
    console.log('DELETE /api/blob-files - Starting file deletion');
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      console.log('DELETE /api/blob-files - Authentication failed');
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('id');
    console.log('DELETE /api/blob-files - File ID:', fileId);

    if (!fileId) {
      console.log('DELETE /api/blob-files - File ID not provided');
      return NextResponse.json({ error: 'ファイルIDが指定されていません' }, { status: 400 });
    }

    const blobService = new BlobFileManagementService();
    console.log('DELETE /api/blob-files - BlobFileManagementService created');
    
    // コンテナの初期化（存在しない場合は作成）
    await blobService.initializeContainer();
    console.log('DELETE /api/blob-files - Container initialized');
    
    console.log('DELETE /api/blob-files - Calling deleteFile...');
    await blobService.deleteFile(fileId);
    console.log('DELETE /api/blob-files - File deleted successfully');

    return NextResponse.json({ 
      success: true,
      message: 'ファイルが削除されました'
    });
  } catch (error) {
    console.error('DELETE /api/blob-files - Error deleting file:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'ファイルの削除に失敗しました' },
      { status: 500 }
    );
  }
}
