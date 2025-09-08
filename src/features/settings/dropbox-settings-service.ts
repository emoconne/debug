"use server";

import { saveSettingsData, getSettingsDataByType, updateSettingsData, deleteSettingsData, DataType } from "@/features/common/cosmos-settings";

export interface DropboxSettings {
  id: string;
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenExpiresAt?: Date;
  folderPath: string;
  autoSync: boolean;
  syncInterval: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Dropbox設定を保存
export async function saveDropboxSettings(settings: Omit<DropboxSettings, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const now = new Date();
  
  // トークンの有効期限を計算
  const tokenExpiresAt = settings.expiresIn ? new Date(now.getTime() + settings.expiresIn * 1000) : undefined;
  
  const settingsData = {
    ...settings,
    tokenExpiresAt,
    createdAt: now,
    updatedAt: now,
  };

  return await saveSettingsData('dropbox-settings' as DataType, settingsData);
}

// Dropbox設定を取得
export async function getDropboxSettings(): Promise<DropboxSettings | null> {
  try {
    const settings = await getSettingsDataByType('dropbox-settings' as DataType);
    if (settings && settings.length > 0) {
      const setting = settings[0];
      return {
        id: setting.id,
        accessToken: setting.data.accessToken,
        refreshToken: setting.data.refreshToken,
        expiresIn: setting.data.expiresIn,
        tokenExpiresAt: setting.data.tokenExpiresAt ? new Date(setting.data.tokenExpiresAt) : undefined,
        folderPath: setting.data.folderPath,
        autoSync: setting.data.autoSync,
        syncInterval: setting.data.syncInterval,
        isActive: setting.data.isActive,
        createdAt: new Date(setting.createdAt),
        updatedAt: new Date(setting.updatedAt),
      };
    }
    return null;
  } catch (error) {
    console.error('Dropbox設定の取得に失敗しました:', error);
    return null;
  }
}

// Dropbox設定を更新
export async function updateDropboxSettings(id: string, updates: Partial<Omit<DropboxSettings, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
  const now = new Date();
  const updateData = {
    ...updates,
    updatedAt: now,
  };

  await updateSettingsData(id, 'dropbox-settings' as DataType, updateData);
}

// Dropbox設定を削除
export async function deleteDropboxSettings(id: string): Promise<void> {
  await deleteSettingsData(id, 'dropbox-settings' as DataType);
}

// アクセストークンをリフレッシュ
export async function refreshDropboxAccessToken(): Promise<{ success: boolean; newAccessToken?: string; error?: string }> {
  try {
    const settings = await getDropboxSettings();
    if (!settings || !settings.refreshToken) {
      return { success: false, error: 'リフレッシュトークンが設定されていません' };
    }

    // 保存されたApp設定を取得
    const { getDropboxAppConfig } = await import('@/app/api/settings/dropbox/app-config/route');
    const appConfig = await getDropboxAppConfig();

    if (!appConfig || !appConfig.appKey || !appConfig.appSecret) {
      return { success: false, error: 'Dropbox App設定が不完全です' };
    }

    // リフレッシュトークンを使用して新しいアクセストークンを取得
    const tokenResponse = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: settings.refreshToken,
        client_id: appConfig.appKey,
        client_secret: appConfig.appSecret,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Dropbox token refresh error:', errorText);
      return { success: false, error: 'トークンの更新に失敗しました' };
    }

    const tokenData = await tokenResponse.json();
    const newAccessToken = tokenData.access_token;
    const newExpiresIn = tokenData.expires_in;

    // 設定を更新
    await updateDropboxSettings(settings.id, {
      accessToken: newAccessToken,
      expiresIn: newExpiresIn,
    });

    return { success: true, newAccessToken };
  } catch (error) {
    console.error('Dropbox token refresh error:', error);
    return { success: false, error: 'トークンの更新中にエラーが発生しました' };
  }
}
