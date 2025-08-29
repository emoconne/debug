"use server";

import { Container, CosmosClient } from "@azure/cosmos";
import { saveSettingsData, updateSettingsData, deleteSettingsData, getSettingsDataByType, getSettingsDataById, DataType } from "@/features/common/cosmos-settings";

// Read Cosmos DB_NAME and CONTAINER_NAME from .env
const DB_NAME = process.env.AZURE_COSMOSDB_DB_NAME || "chat";
const CONTAINER_NAME = process.env.AZURE_COSMOSDB_CONTAINER_NAME || "history";

export class CosmosDBContainer {
  private static instance: CosmosDBContainer;
  private container: Promise<Container>;

  private constructor() {
    const endpoint = process.env.AZURE_COSMOSDB_URI;
    const key = process.env.AZURE_COSMOSDB_KEY;

    const client = new CosmosClient({ endpoint, key });

    this.container = new Promise((resolve, reject) => {
      client.databases
        .createIfNotExists({
          id: DB_NAME,
        })
        .then((databaseResponse) => {
          databaseResponse.database.containers
            .createIfNotExists({
              id: CONTAINER_NAME,
              partitionKey: {
                paths: ["/userId"],
              }
            })
            .then((containerResponse) => {
              resolve(containerResponse.container);
            });
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  public static getInstance(): CosmosDBContainer {
    if (!CosmosDBContainer.instance) {
      CosmosDBContainer.instance = new CosmosDBContainer();
    }

    return CosmosDBContainer.instance;
  }

  public async getContainer(): Promise<Container> {
    return await this.container;
  }
}

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
