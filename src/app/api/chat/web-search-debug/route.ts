import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/features/auth/auth-api";

export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // デバッグ情報を取得
    const debugInfo = (global as any).lastWebSearchDebugInfo;
    
    if (!debugInfo) {
      return NextResponse.json({ 
        error: "Web検索のデバッグ情報が見つかりません。Web検索を実行してください。" 
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      debugInfo: debugInfo
    });

  } catch (error) {
    console.error("Web Search Debug API error:", error);
    return NextResponse.json({ 
      error: "デバッグ情報の取得に失敗しました" 
    }, { status: 500 });
  }
}
