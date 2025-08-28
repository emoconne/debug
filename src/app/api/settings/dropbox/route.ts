import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/features/auth/auth-api";
import { saveDropboxSettings, getDropboxSettings, updateDropboxSettings } from "@/features/settings/dropbox-settings-service";

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
    
    return NextResponse.json({
      settings: settings ? {
        id: settings.id,
        accessToken: settings.accessToken,
        folderPath: settings.folderPath,
        autoSync: settings.autoSync,
        syncInterval: settings.syncInterval,
        isActive: settings.isActive,
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt,
      } : null
    });

  } catch (error) {
    console.error("Dropbox設定取得エラー:", error);
    return NextResponse.json(
      { error: "Dropbox設定の取得に失敗しました" },
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
    const { accessToken, folderPath, autoSync, syncInterval } = body;

    if (!accessToken) {
      return NextResponse.json({ error: "アクセストークンは必須です" }, { status: 400 });
    }

    // 既存の設定を確認
    const existingSettings = await getDropboxSettings();
    
    if (existingSettings) {
      // 既存設定を更新
      await updateDropboxSettings(existingSettings.id, {
        accessToken,
        folderPath: folderPath || existingSettings.folderPath,
        autoSync: autoSync !== undefined ? autoSync : existingSettings.autoSync,
        syncInterval: syncInterval || existingSettings.syncInterval,
        isActive: true,
      });

      return NextResponse.json({
        success: true,
        message: "Dropbox設定が更新されました",
        settingsId: existingSettings.id
      });
    } else {
      // 新規設定を保存
      const settingsId = await saveDropboxSettings({
        accessToken,
        folderPath: folderPath || "/",
        autoSync: autoSync !== undefined ? autoSync : false,
        syncInterval: syncInterval || "15分",
        isActive: true,
      });

      return NextResponse.json({
        success: true,
        message: "Dropbox設定が保存されました",
        settingsId
      });
    }

  } catch (error) {
    console.error("Dropbox設定保存エラー:", error);
    return NextResponse.json(
      { error: "Dropbox設定の保存に失敗しました" },
      { status: 500 }
    );
  }
}
