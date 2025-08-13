import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/features/auth/auth-api";
import { getDocuments, getStats } from "@/features/documents/document-management-service";

export async function GET(request: NextRequest) {
  try {
    console.log('=== API DOCUMENTS GET START ===');
    const startTime = Date.now();
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    if (!session.user.isAdmin) {
      return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    }

    // ドキュメント一覧と統計を並行して取得
    const [documents, stats] = await Promise.all([
      getDocuments(),
      getStats()
    ]);
    
    console.log(`=== API DOCUMENTS GET COMPLETED in ${Date.now() - startTime}ms ===`);
    
    return NextResponse.json({
      documents,
      stats,
      total: documents.length
    });

  } catch (error) {
    console.error("ドキュメント一覧取得エラー:", error);
    return NextResponse.json(
      { error: "ドキュメント一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
} 