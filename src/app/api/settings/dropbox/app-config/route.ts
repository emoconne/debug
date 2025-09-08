import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/features/auth/auth-api";
import { saveSettingsData, getSettingsDataByType, updateSettingsData, DataType } from "@/features/common/cosmos-settings";

export interface DropboxAppConfig {
  id: string;
  appKey: string;
  appSecret: string;
  createdAt: Date;
  updatedAt: Date;
}

// Dropbox App設定を保存
export async function saveDropboxAppConfig(config: Omit<DropboxAppConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const configData = {
    appKey: config.appKey,
    appSecret: config.appSecret,
  };
  
  return await saveSettingsData('dropbox-app-config' as DataType, configData);
}

// Dropbox App設定を取得
export async function getDropboxAppConfig(): Promise<DropboxAppConfig | null> {
  try {
    const configs = await getSettingsDataByType('dropbox-app-config' as DataType);
    if (configs && configs.length > 0) {
      const config = configs[0];
      return {
        id: config.id,
        appKey: config.data.appKey,
        appSecret: config.data.appSecret,
        createdAt: new Date(config.createdAt),
        updatedAt: new Date(config.updatedAt),
      };
    }
    return null;
  } catch (error) {
    console.error('Dropbox App設定の取得に失敗しました:', error);
    return null;
  }
}

// Dropbox App設定を更新
export async function updateDropboxAppConfig(id: string, updates: Partial<Omit<DropboxAppConfig, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
  const updateData: any = {};
  if (updates.appKey !== undefined) updateData.appKey = updates.appKey;
  if (updates.appSecret !== undefined) updateData.appSecret = updates.appSecret;
  
  await updateSettingsData(id, 'dropbox-app-config', updateData);
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

    const config = await getDropboxAppConfig();
    
    return NextResponse.json({
      config: config ? {
        id: config.id,
        appKey: config.appKey,
        appSecret: config.appSecret,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      } : null
    });

  } catch (error) {
    console.error("Dropbox App設定取得エラー:", error);
    return NextResponse.json(
      { error: "Dropbox App設定の取得に失敗しました" },
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
    const { appKey, appSecret } = body;

    if (!appKey || !appSecret) {
      return NextResponse.json({ error: "App KeyとApp Secretは必須です" }, { status: 400 });
    }

    // 既存の設定を確認
    const existingConfig = await getDropboxAppConfig();
    
    if (existingConfig) {
      // 既存設定を更新
      await updateDropboxAppConfig(existingConfig.id, {
        appKey,
        appSecret,
      });

      return NextResponse.json({
        success: true,
        message: "Dropbox App設定が更新されました",
        configId: existingConfig.id
      });
    } else {
      // 新規設定を保存
      const configId = await saveDropboxAppConfig({
        appKey,
        appSecret,
      });

      return NextResponse.json({
        success: true,
        message: "Dropbox App設定が保存されました",
        configId
      });
    }

  } catch (error) {
    console.error("Dropbox App設定保存エラー:", error);
    return NextResponse.json(
      { error: "Dropbox App設定の保存に失敗しました" },
      { status: 500 }
    );
  }
}
