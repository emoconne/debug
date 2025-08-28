"use server";

import { saveSettingsData, getSettingsDataByType, updateSettingsData, deleteSettingsData, DataType } from "@/features/common/cosmos-settings";

export interface DropboxSettings {
  id: string;
  accessToken: string;
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
  const settingsData = {
    ...settings,
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
