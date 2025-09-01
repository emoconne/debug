import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/features/auth/auth-api";
import { getDropboxSettings, refreshDropboxAccessToken } from "@/features/settings/dropbox-settings-service";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    if (!session.user.isAdmin) {
      return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    }

    const settings = await getDropboxSettings();
    
    if (!settings) {
      return NextResponse.json({ error: "Dropbox設定が見つかりません" }, { status: 404 });
    }

    // トークンの有効期限をチェック
    const now = new Date();
    const isTokenExpired = settings.tokenExpiresAt ? now > settings.tokenExpiresAt : false;
    const isTokenExpiringSoon = settings.tokenExpiresAt ? 
      (settings.tokenExpiresAt.getTime() - now.getTime()) < (24 * 60 * 60 * 1000) : false; // 24時間以内

    return NextResponse.json({
      success: true,
      tokens: {
        hasAccessToken: !!settings.accessToken,
        hasRefreshToken: !!settings.refreshToken,
        accessTokenPreview: settings.accessToken ? 
          `${settings.accessToken.substring(0, 10)}...${settings.accessToken.substring(settings.accessToken.length - 4)}` : 
          null,
        refreshTokenPreview: settings.refreshToken ? 
          `${settings.refreshToken.substring(0, 10)}...${settings.refreshToken.substring(settings.refreshToken.length - 4)}` : 
          null,
        expiresIn: settings.expiresIn,
        tokenExpiresAt: settings.tokenExpiresAt,
        isTokenExpired,
        isTokenExpiringSoon,
        timeUntilExpiry: settings.tokenExpiresAt ? 
          Math.max(0, settings.tokenExpiresAt.getTime() - now.getTime()) : 
          null,
      },
      settings: {
        folderPath: settings.folderPath,
        autoSync: settings.autoSync,
        syncInterval: settings.syncInterval,
        isActive: settings.isActive,
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt,
      }
    });

  } catch (error) {
    console.error("Dropboxトークン情報取得エラー:", error);
    return NextResponse.json(
      { error: "Dropboxトークン情報の取得に失敗しました" },
      { status: 500 }
    );
  }
}

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
    const { action } = body;

    if (action === 'refresh') {
      const result = await refreshDropboxAccessToken();
      
      if (result.success) {
        return NextResponse.json({
          success: true,
          message: "アクセストークンが更新されました",
          newAccessToken: result.newAccessToken
        });
      } else {
        return NextResponse.json({
          success: false,
          error: result.error
        }, { status: 400 });
      }
    }

    return NextResponse.json({ error: "無効なアクションです" }, { status: 400 });

  } catch (error) {
    console.error("Dropboxトークン操作エラー:", error);
    return NextResponse.json(
      { error: "Dropboxトークン操作に失敗しました" },
      { status: 500 }
    );
  }
}
