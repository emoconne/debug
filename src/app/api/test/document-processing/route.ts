import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/features/auth/auth-api";
import { processDocumentAsync } from "@/features/documents/document-intelligence-service";
import { getDocument, updateDocument } from "@/features/documents/cosmos-db-document-service";

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
    const { documentId } = body;

    if (!documentId) {
      return NextResponse.json({ error: "documentIdが必要です" }, { status: 400 });
    }

    console.log('=== DOCUMENT PROCESSING TEST START ===');
    console.log('Processing document ID:', documentId);

    // ドキュメント情報を取得
    const document = await getDocument(documentId);
    if (!document) {
      return NextResponse.json({ error: "ドキュメントが見つかりません" }, { status: 404 });
    }

    console.log('Document found:', {
      fileName: document.fileName,
      status: document.status,
      departmentName: document.departmentName
    });

    // ドキュメントを再処理
    try {
      // ステータスをリセット
      await updateDocument(documentId, { status: 'uploaded' });
      
      // ファイルオブジェクトを作成（サーバーサイド対応）
      const file = {
        name: document.fileName,
        type: document.fileType,
        size: document.fileSize || 0,
        arrayBuffer: async () => new ArrayBuffer(0) // 空のArrayBuffer
      };
      
      // 非同期処理を開始
      processDocumentAsync(file, documentId, document.departmentName || 'Unknown').catch(error => {
        console.error('Document processing failed:', error);
      });

      return NextResponse.json({
        success: true,
        message: "ドキュメント処理を開始しました",
        documentId: documentId
      });

    } catch (error) {
      console.error('Document processing error:', error);
      return NextResponse.json({
        success: false,
        message: "ドキュメント処理に失敗しました",
        error: error instanceof Error ? error.message : "Unknown error"
      }, { status: 500 });
    }

  } catch (error) {
    console.error("Document processing test error:", error);
    return NextResponse.json(
      { error: "テスト実行中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    if (!session.user.isAdmin) {
      return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json({ error: "documentIdが必要です" }, { status: 400 });
    }

    // ドキュメント情報を取得
    const document = await getDocument(documentId);
    if (!document) {
      return NextResponse.json({ error: "ドキュメントが見つかりません" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        fileName: document.fileName,
        status: document.status,
        uploadedAt: document.uploadedAt,
        departmentName: document.departmentName,
        fileSize: document.fileSize,
        fileType: document.fileType
      }
    });

  } catch (error) {
    console.error("Document status check error:", error);
    return NextResponse.json(
      { error: "ドキュメント状態確認中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
