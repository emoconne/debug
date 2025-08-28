import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { options as authOptions } from '@/features/auth/auth-api';
import { BlobFileManagementService } from '@/features/documents/blob-file-management-service';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('id');

    if (!fileId) {
      return NextResponse.json({ error: 'ファイルIDが指定されていません' }, { status: 400 });
    }

    const blobService = new BlobFileManagementService();
    
    // コンテナの初期化（存在しない場合は作成）
    await blobService.initializeContainer();
    
    // ファイル情報を取得
    const fileMetadata = await blobService.getFileMetadata(fileId);
    if (!fileMetadata) {
      return NextResponse.json({ error: 'ファイルが見つかりません' }, { status: 404 });
    }

    // SAS URLを生成
    const sasUrl = await blobService.generateSasUrl(fileId);

    return NextResponse.json({ 
      sasUrl,
      fileName: fileMetadata.data.fileName,
      contentType: fileMetadata.data.fileType,
      fileSize: fileMetadata.data.fileSize
    });
  } catch (error) {
    console.error('Error generating SAS URL:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'SAS URLの生成に失敗しました' },
      { status: 500 }
    );
  }
}
