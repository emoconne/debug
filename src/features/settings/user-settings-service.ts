"use server";

import { saveSettingsData, getSettingsDataByType, updateSettingsData, deleteSettingsData, DataType } from "@/features/common/cosmos-settings";
import { UserType, AdminRole } from "./user-types";

export interface UserSettings {
  id: string;
  userId: string;
  userPrincipalName: string;
  displayName: string;
  email: string;
  userType: UserType;
  adminRole: AdminRole;
  department?: string;
  jobTitle?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EntraUser {
  id: string;
  userPrincipalName: string;
  displayName: string;
  mail?: string;
  jobTitle?: string;
  department?: string;
  accountEnabled?: boolean;
}

// ユーザー設定を保存
export async function saveUserSettings(settings: Omit<UserSettings, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const now = new Date();
  
  const settingsData = {
    ...settings,
    createdAt: now,
    updatedAt: now,
  };

  return await saveSettingsData('user-settings' as DataType, settingsData);
}

// ユーザー設定を取得
export async function getUserSettings(): Promise<UserSettings[]> {
  try {
    const settings = await getSettingsDataByType('user-settings' as DataType);
    return settings.map(setting => ({
      id: setting.id,
      userId: setting.data.userId,
      userPrincipalName: setting.data.userPrincipalName,
      displayName: setting.data.displayName,
      email: setting.data.email,
      userType: setting.data.userType,
      adminRole: setting.data.adminRole || 'user',
      department: setting.data.department,
      jobTitle: setting.data.jobTitle,
      isActive: setting.data.isActive,
      createdAt: new Date(setting.createdAt),
      updatedAt: new Date(setting.updatedAt),
    }));
  } catch (error) {
    console.error('ユーザー設定の取得に失敗しました:', error);
    return [];
  }
}

// 特定のユーザー設定を取得
export async function getUserSettingsByUserId(userId: string): Promise<UserSettings | null> {
  try {
    const settings = await getUserSettings();
    return settings.find(setting => setting.userId === userId) || null;
  } catch (error) {
    console.error('ユーザー設定の取得に失敗しました:', error);
    return null;
  }
}

// メールアドレスでユーザー設定を取得
export async function getUserSettingsByEmail(email: string): Promise<UserSettings | null> {
  try {
    const settings = await getUserSettings();
    return settings.find(setting => setting.email === email) || null;
  } catch (error) {
    console.error('ユーザー設定の取得に失敗しました:', error);
    return null;
  }
}

// ユーザー設定を更新
export async function updateUserSettings(id: string, updates: Partial<Omit<UserSettings, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
  const now = new Date();
  
  const updateData = {
    ...updates,
    updatedAt: now,
  };

  await updateSettingsData(id, 'user-settings' as DataType, updateData);
}

// ユーザー設定を削除
export async function deleteUserSettings(id: string): Promise<void> {
  await deleteSettingsData(id, 'user-settings' as DataType);
}

// ユーザータイプ別の統計を取得
export async function getUserTypeStats(): Promise<Record<UserType, number>> {
  try {
    const settings = await getUserSettings();
    const stats: Record<UserType, number> = {
      executive: 0,
      manager: 0,
      general: 0,
      other: 0
    };

    settings.forEach(setting => {
      if (setting.isActive) {
        stats[setting.userType]++;
      }
    });

    return stats;
  } catch (error) {
    console.error('ユーザータイプ統計の取得に失敗しました:', error);
    return {
      executive: 0,
      manager: 0,
      general: 0,
      other: 0
    };
  }
}

// ユーザーが管理者かどうかをチェック
export async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    const userSettings = await getUserSettingsByUserId(userId);
    return userSettings?.adminRole === 'admin';
  } catch (error) {
    console.error('管理者権限チェックに失敗しました:', error);
    return false;
  }
}

// メールアドレスでユーザーが管理者かどうかをチェック
export async function isUserAdminByEmail(email: string): Promise<boolean> {
  try {
    const userSettings = await getUserSettingsByEmail(email);
    return userSettings?.adminRole === 'admin';
  } catch (error) {
    console.error('管理者権限チェックに失敗しました:', error);
    return false;
  }
}

// ユーザーの設定情報を取得（ログイン時用）
export async function getUserProfile(userId: string): Promise<{
  userType: UserType;
  adminRole: AdminRole;
  displayName: string;
  email: string;
  department?: string;
  jobTitle?: string;
} | null> {
  try {
    const userSettings = await getUserSettingsByUserId(userId);
    if (!userSettings) {
      return null;
    }

    return {
      userType: userSettings.userType,
      adminRole: userSettings.adminRole,
      displayName: userSettings.displayName,
      email: userSettings.email,
      department: userSettings.department,
      jobTitle: userSettings.jobTitle,
    };
  } catch (error) {
    console.error('ユーザープロファイルの取得に失敗しました:', error);
    return null;
  }
}

// メールアドレスでユーザーの設定情報を取得（ログイン時用）
export async function getUserProfileByEmail(email: string): Promise<{
  userType: UserType;
  adminRole: AdminRole;
  displayName: string;
  email: string;
  department?: string;
  jobTitle?: string;
} | null> {
  try {
    const userSettings = await getUserSettingsByEmail(email);
    if (!userSettings) {
      return null;
    }

    return {
      userType: userSettings.userType,
      adminRole: userSettings.adminRole,
      displayName: userSettings.displayName,
      email: userSettings.email,
      department: userSettings.department,
      jobTitle: userSettings.jobTitle,
    };
  } catch (error) {
    console.error('ユーザープロファイルの取得に失敗しました:', error);
    return null;
  }
}
