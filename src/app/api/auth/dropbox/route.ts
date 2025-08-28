import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/features/auth/auth-api";

// Dropbox OAuth2設定
const DROPBOX_APP_KEY = process.env.DROPBOX_APP_KEY || '';
const REDIRECT_URI = 'http://localhost:3000/api/auth/dropbox/callback';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    if (!session.user.isAdmin) {
      return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    }

    if (!DROPBOX_APP_KEY) {
      return NextResponse.json({ error: "Dropbox App Keyが設定されていません" }, { status: 500 });
    }

    // OAuth2認証URLを生成
    const authUrl = `https://www.dropbox.com/oauth2/authorize?` +
      `client_id=${DROPBOX_APP_KEY}&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `token_access_type=offline&` +
      `scope=files.metadata.read,files.content.read`;

    return NextResponse.json({
      authUrl,
      message: "Dropbox認証を開始します"
    });

  } catch (error) {
    console.error("Dropbox OAuth2開始エラー:", error);
    return NextResponse.json(
      { error: "Dropbox認証の開始に失敗しました" },
      { status: 500 }
    );
  }
}
