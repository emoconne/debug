import { saveSettingsData, updateSettingsData, deleteSettingsData, getSettingsDataByType, getSettingsDataById, getAllSettingsData } from "@/features/common/cosmos-settings";

export interface GPTModelData {
  id: string;
  name: string;
  deploymentName: string;
  description: string;
  isAvailable: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// GPTモデルを保存
export async function saveGPTModel(modelData: Omit<GPTModelData, 'id' | 'createdAt' | 'updatedAt'>): Promise<GPTModelData> {
  const now = new Date().toISOString();
  const data = {
    ...modelData,
    createdAt: now,
    updatedAt: now,
  };
  
  return await saveSettingsData('gpt-model', data);
}

// GPTモデルを更新
export async function updateGPTModel(id: string, modelData: Partial<Omit<GPTModelData, 'id' | 'createdAt'>>): Promise<GPTModelData> {
  const now = new Date().toISOString();
  const data = {
    ...modelData,
    updatedAt: now,
  };
  
  await updateSettingsData(id, 'gpt-model', data);
  
  // 更新後のデータを取得して返す
  const updatedModel = await getGPTModelById(id);
  if (!updatedModel) {
    throw new Error('Updated GPT model not found');
  }
  
  return updatedModel;
}

// GPTモデルを削除
export async function deleteGPTModel(id: string): Promise<void> {
  await deleteSettingsData(id, 'gpt-model');
}

// すべてのGPTモデルを取得
export async function getAllGPTModels(): Promise<GPTModelData[]> {
  const settingsData = await getSettingsDataByType('gpt-model');
  return settingsData.map(item => ({
    id: item.id,
    ...item.data,
  }));
}

// 特定のGPTモデルを取得
export async function getGPTModelById(id: string): Promise<GPTModelData | null> {
  const settingsData = await getSettingsDataById(id, 'gpt-model');
  if (!settingsData) return null;
  
  return {
    id: settingsData.id,
    ...settingsData.data,
  };
}

// デフォルトのGPTモデルを取得
export async function getDefaultGPTModel(): Promise<GPTModelData | null> {
  const models = await getAllGPTModels();
  return models.find(model => model.isDefault) || null;
}

// 利用可能なGPTモデルを取得
export async function getAvailableGPTModels(): Promise<GPTModelData[]> {
  const models = await getAllGPTModels();
  return models.filter(model => model.isAvailable);
}
