import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/features/auth/auth-api";
import { processDocumentAsync } from "@/features/documents/document-intelligence-service";
import { saveDocument, updateDocument } from "@/features/documents/cosmos-db-document-service";
import { userHashedId } from "@/features/auth/helpers";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    if (!session.user.isAdmin) {
      return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    }

    const body = await request.json();
    const { fileData, fileName, fileType, fileSize, departmentName } = body;

    if (!fileData || !fileName) {
      return NextResponse.json({ error: "ファイルデータとファイル名が必要です" }, { status: 400 });
    }

    console.log('=== FULL DOCUMENT PROCESSING TEST START ===');
    console.log('Processing file:', { fileName, fileType, fileSize, departmentName });

    try {
      const userId = await userHashedId();
      console.log('User ID:', userId);

      // Base64エンコードされたファイルデータをArrayBufferに変換
      const buffer = Buffer.from(fileData, 'base64');
      const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
      
      // Fileオブジェクトを作成
      const file = new File([arrayBuffer], fileName, { type: fileType || 'application/octet-stream' });
      console.log('File object created:', { name: file.name, size: file.size, type: file.type });

      // テスト用ドキュメントIDを生成
      const documentId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      console.log('Generated document ID:', documentId);

      // Cosmos DBにテストドキュメントを保存
      console.log('Saving document to Cosmos DB...');
      await saveDocument({
        fileName: fileName,
        fileType: fileType || 'application/octet-stream',
        fileSize: fileSize || file.size,
        uploadedBy: userId,
        uploadedAt: new Date().toISOString(),
        blobUrl: 'test-url',
        blobName: 'test-blob',
        departmentId: 'test-dept',
        departmentName: departmentName || 'Test Department',
        containerName: 'test-container',
        status: 'uploaded',
        isDeleted: false,
        pages: 0, // デフォルト値
        confidence: 0, // デフォルト値
      });
      console.log('Document saved to Cosmos DB');

      // Document Intelligence経由でファイル処理を実行
      console.log('Starting document processing...');
      await processDocumentAsync(file, documentId, departmentName || 'Test Department');
      console.log('Document processing completed');

      // 処理結果を取得
      console.log('Fetching final document status...');
      const finalStatus = await updateDocument(documentId, { status: 'completed' });

      return NextResponse.json({
        success: true,
        message: "Document Intelligence経由でのファイルインデックス化が完了しました",
        documentId: documentId,
        fileName: fileName,
        departmentName: departmentName || 'Test Department',
        status: 'completed'
      });

    } catch (error) {
      console.error('=== FULL DOCUMENT PROCESSING TEST ERROR ===');
      console.error('Error details:', {
        fileName,
        fileType,
        fileSize,
        departmentName,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error
      });

      return NextResponse.json({
        success: false,
        message: "Document Intelligence経由でのファイルインデックス化に失敗しました",
        error: error instanceof Error ? error.message : "Unknown error",
        fileName: fileName,
        departmentName: departmentName || 'Test Department'
      }, { status: 500 });
    }

  } catch (error) {
    console.error("Full document processing test error:", error);
    return NextResponse.json(
      { error: "テスト実行中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
