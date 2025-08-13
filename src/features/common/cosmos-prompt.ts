"use server";

import { saveSettingsData, updateSettingsData, deleteSettingsData, getSettingsDataByType, getSettingsDataById, DataType } from "@/features/common/cosmos-settings";

export interface PromptData {
  id: string;
  userId: string;
  title: string;
  content: string;
  category?: string;
  tags?: string[];
  isPublic: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// プロンプトを保存
export async function savePrompt(prompt: Omit<PromptData, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const id = await saveSettingsData('prompt', prompt);
  return id;
}

// プロンプトを更新
export async function updatePrompt(id: string, updates: Partial<PromptData>): Promise<void> {
  await updateSettingsData(id, 'prompt', updates);
}

// プロンプトを削除
export async function deletePrompt(id: string): Promise<void> {
  await deleteSettingsData(id, 'prompt');
}

// ユーザーのプロンプトを取得
export async function getUserPrompts(userId: string): Promise<PromptData[]> {
  const settingsData = await getSettingsDataByType('prompt');
  
  return settingsData
    .map(item => ({
      id: item.id,
      ...item.data,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt)
    }))
    .filter(prompt => prompt.userId === userId && prompt.isActive);
}

// 公開プロンプトを取得
export async function getPublicPrompts(): Promise<PromptData[]> {
  const settingsData = await getSettingsDataByType('prompt');
  
  return settingsData
    .map(item => ({
      id: item.id,
      ...item.data,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt)
    }))
    .filter(prompt => prompt.isPublic && prompt.isActive);
}

// 特定のプロンプトを取得
export async function getPrompt(id: string): Promise<PromptData | null> {
  const settingsData = await getSettingsDataById(id, 'prompt');
  if (!settingsData) {
    return null;
  }
  
  return {
    id: settingsData.id,
    ...settingsData.data,
    createdAt: new Date(settingsData.createdAt),
    updatedAt: new Date(settingsData.updatedAt)
  };
}

// カテゴリ別プロンプトを取得
export async function getPromptsByCategory(category: string): Promise<PromptData[]> {
  const settingsData = await getSettingsDataByType('prompt');
  
  return settingsData
    .map(item => ({
      id: item.id,
      ...item.data,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt)
    }))
    .filter(prompt => prompt.category === category && prompt.isActive);
}

// タグ別プロンプトを取得
export async function getPromptsByTag(tag: string): Promise<PromptData[]> {
  const settingsData = await getSettingsDataByType('prompt');
  
  return settingsData
    .map(item => ({
      id: item.id,
      ...item.data,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt)
    }))
    .filter(prompt => prompt.tags?.includes(tag) && prompt.isActive);
}
