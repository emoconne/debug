"use server";

import { Container, CosmosClient } from "@azure/cosmos";

// 統合されたCosmos DB設定
const DB_NAME = process.env.AZURE_COSMOSDB_DB_NAME || "chat";
const CONTAINER_NAME = "storage"; // storageコンテナを使用

// データタイプの定義
export type DataType = 'prompt' | 'document' | 'department' | 'user' | 'dropbox-settings';

export interface SettingsData {
  id: string;
  dataType: DataType; // データタイプを識別
  data: any; // 実際のデータ
  createdAt: Date;
  updatedAt: Date;
}

// 統合されたCosmos DBコンテナクラス
class SettingsCosmosDBContainer {
  private static instance: SettingsCosmosDBContainer;
  private container: Promise<Container>;

  private constructor() {
    const endpoint = process.env.AZURE_COSMOSDB_URI;
    const key = process.env.AZURE_COSMOSDB_KEY;

    if (!endpoint || !key) {
      throw new Error("AZURE_COSMOSDB_URI and AZURE_COSMOSDB_KEY environment variables are required");
    }

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
                paths: ["/dataType"],
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

  public static getInstance(): SettingsCosmosDBContainer {
    if (!SettingsCosmosDBContainer.instance) {
      SettingsCosmosDBContainer.instance = new SettingsCosmosDBContainer();
    }

    return SettingsCosmosDBContainer.instance;
  }

  public async getContainer(): Promise<Container> {
    return await this.container;
  }
}

// コンテナインスタンスを取得するヘルパー関数
async function getContainer() {
  return await SettingsCosmosDBContainer.getInstance().getContainer();
}

// データを保存
export async function saveSettingsData(dataType: DataType, data: any): Promise<string> {
  const container = await getContainer();
  
  const id = `${dataType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date();
  
  const settingsData: SettingsData = {
    id,
    dataType,
    data,
    createdAt: now,
    updatedAt: now,
  };

  await container.items.create(settingsData);
  return id;
}

// データを更新
export async function updateSettingsData(id: string, dataType: DataType, updates: any): Promise<void> {
  const container = await getContainer();
  
  const { resource: existingData } = await container.item(id, dataType).read();
  if (!existingData) {
    throw new Error(`Settings data with id ${id} not found`);
  }

  const updatedData: SettingsData = {
    ...existingData,
    data: { ...existingData.data, ...updates },
    updatedAt: new Date(),
  };

  await container.item(id, dataType).replace(updatedData);
}

// データを削除
export async function deleteSettingsData(id: string, dataType: DataType): Promise<void> {
  const container = await getContainer();
  await container.item(id, dataType).delete();
}

// 特定のデータタイプのデータを取得
export async function getSettingsDataByType(dataType: DataType): Promise<SettingsData[]> {
  const container = await getContainer();
  
  const querySpec = {
    query: "SELECT * FROM c WHERE c.dataType = @dataType ORDER BY c.updatedAt DESC",
    parameters: [
      {
        name: "@dataType",
        value: dataType,
      },
    ],
  };

  const { resources } = await container.items.query(querySpec).fetchAll();
  return resources;
}

// 特定のIDのデータを取得
export async function getSettingsDataById(id: string, dataType: DataType): Promise<SettingsData | null> {
  const container = await getContainer();
  
  try {
    const { resource } = await container.item(id, dataType).read();
    return resource;
  } catch (error) {
    return null;
  }
}

// 全データを取得
export async function getAllSettingsData(): Promise<SettingsData[]> {
  const container = await getContainer();
  
  const querySpec = {
    query: "SELECT * FROM c ORDER BY c.updatedAt DESC",
  };

  const { resources } = await container.items.query(querySpec).fetchAll();
  return resources;
}

// コンテナの初期化（初回アクセス時に自動実行）
export async function initializeSettingsContainer(): Promise<void> {
  try {
    await getContainer();
    console.log('Settings container initialized successfully');
  } catch (error) {
    console.error('Failed to initialize settings container:', error);
    throw error;
  }
}
