import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/features/auth/auth-api';
import { BlobFileManagementService } from '@/src/features/documents/blob-file-management-service';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { data: sessionData }: any = session;
    if (!sessionData?.isAdmin) {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
    }

    const blobService = new BlobFileManagementService();
    await blobService.initializeContainer();

    // すべてのファイルを取得
    const files = await blobService.getFiles();
    console.log(`POST /api/blob-files/update-blob-metadata - Found ${files.length} files to update`);

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // 各ファイルのBLOBストレージメタデータを更新
    for (const file of files) {
      try {
        const success = await blobService.updateBlobMetadata(file.id);
        if (success) {
          successCount++;
          results.push({ fileId: file.id, success: true });
        } else {
          errorCount++;
          results.push({ fileId: file.id, success: false, error: 'メタデータ更新に失敗' });
        }
      } catch (error) {
        errorCount++;
        results.push({ 
          fileId: file.id, 
          success: false, 
          error: error instanceof Error ? error.message : 'エラーが発生しました' 
        });
      }
    }

    console.log(`POST /api/blob-files/update-blob-metadata - Updated ${successCount} files, ${errorCount} errors`);

    return NextResponse.json({
      success: true,
      message: `BLOBストレージのメタデータを更新しました。成功: ${successCount}, エラー: ${errorCount}`,
      results
    });
  } catch (error) {
    console.error('Error updating BLOB metadata:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'BLOBストレージのメタデータ更新に失敗しました'
    }, { status: 500 });
  }
}
