"use server";

import { saveSettingsData, updateSettingsData, deleteSettingsData, getSettingsDataByType, getSettingsDataById } from "@/features/common/cosmos-settings";

import {
    PromptList
  } from "../../chat-services/models";
  
interface Item {
  title: string,
  content: string,
  id: string,
  dept: string,
  usename: string,
  createdAt: Date;
  isDeleted: boolean;
  sortOrder: number;
}

export const AddPrompt = async (newPrompt: Omit<Item, 'id' | 'createdAt'>) => {
  const id = await saveSettingsData('prompt', {
    ...newPrompt,
    createdAt: new Date()
  });
  return id;
};

export async function queryPrompt(dept: string, usename: string) {
  const settingsData = await getSettingsDataByType('prompt');
  
  return settingsData
    .map(item => ({
      id: item.id,
      ...item.data,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt)
    }))
    .filter(prompt => 
      prompt.dept === dept && 
      prompt.usename === usename && 
      !prompt.isDeleted
    )
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function markAsDeleted(id: string) {
  const settingsData = await getSettingsDataById(id, 'prompt');
  
  if (settingsData) {
    await updateSettingsData(id, 'prompt', { isDeleted: true });
    return {
      id: settingsData.id,
      ...settingsData.data,
      isDeleted: true,
      createdAt: new Date(settingsData.createdAt),
      updatedAt: new Date(settingsData.updatedAt)
    };
  } else {
    throw new Error(`Item with id ${id} not found`);
  }
}

// title と content を更新する処理
export async function updateItem(id: string, newTitle: string, newContent: string) {
  const settingsData = await getSettingsDataById(id, 'prompt');
  
  if (settingsData) {
    await updateSettingsData(id, 'prompt', { 
      title: newTitle, 
      content: newContent 
    });
    
    return {
      id: settingsData.id,
      ...settingsData.data,
      title: newTitle,
      content: newContent,
      createdAt: new Date(settingsData.createdAt),
      updatedAt: new Date(settingsData.updatedAt)
    };
  } else {
    throw new Error(`Item with id ${id} not found`);
  }
}

// 会社全体用プロンプト取得
export async function queryPromptCompany(dept: string) {
  const settingsData = await getSettingsDataByType('prompt');
  
  return settingsData
    .map(item => ({
      id: item.id,
      ...item.data,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt)
    }))
    .filter(prompt => 
      prompt.dept === dept && 
      !prompt.isDeleted
    )
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

// 複数プロンプトのsortOrderを一括更新
export async function updateSortOrders(updates: {id: string, sortOrder: number}[]) {
  for (const {id, sortOrder} of updates) {
    await updateSettingsData(id, 'prompt', { sortOrder });
  }
}