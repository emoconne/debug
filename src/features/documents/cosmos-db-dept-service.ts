"use server";

import { saveSettingsData, updateSettingsData, deleteSettingsData, getSettingsDataByType, getSettingsDataById, DataType } from "@/features/common/cosmos-settings";

export interface Department {
  id: string;
  name: string;
  description?: string;
  blobContainerName: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

// 部門を保存
export async function saveDepartment(department: Omit<Department, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  // 既存の部門の最大sortOrderを取得
  const existingDepartments = await getAllDepartments();
  const maxSortOrder = existingDepartments.length > 0 
    ? Math.max(...existingDepartments.map(d => d.sortOrder))
    : 0;
  
  const departmentWithSortOrder = {
    ...department,
    sortOrder: maxSortOrder + 1
  };
  
  const id = await saveSettingsData('department', departmentWithSortOrder);
  return id;
}

// 部門を更新
export async function updateDepartment(id: string, updates: Partial<Department>): Promise<void> {
  await updateSettingsData(id, 'department', updates);
}

// 部門を削除
export async function deleteDepartment(id: string): Promise<void> {
  const department = await getDepartment(id);
  if (!department) {
    throw new Error(`Department with id ${id} not found`);
  }

  console.log(`Attempting to delete department: ${department.name} (ID: ${id})`);

  // 関連ドキュメントがあるかチェック（現在は無効化）
  const hasDocuments = await hasRelatedDocuments(department.name);
  if (hasDocuments) {
    throw new Error(`部門「${department.name}」に関連するドキュメントが存在するため削除できません。先に関連ドキュメントを削除してください。`);
  }

  await deleteSettingsData(id, 'department');
  console.log(`Successfully deleted department: ${department.name} (ID: ${id})`);
}

// 全部門を取得
export async function getAllDepartments(): Promise<Department[]> {
  const settingsData = await getSettingsDataByType('department');
  
  return settingsData
    .map(item => ({
      id: item.id,
      ...item.data,
      sortOrder: item.data.sortOrder || 0,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt)
    }))
    .filter(dept => dept.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

// 特定の部門を取得
export async function getDepartment(id: string): Promise<Department | null> {
  const settingsData = await getSettingsDataById(id, 'department');
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

// 部門名で部門を検索
export async function getDepartmentByName(name: string): Promise<Department | null> {
  const allDepartments = await getAllDepartments();
  return allDepartments.find(dept => dept.name === name) || null;
}

// 関連ドキュメントがあるかチェック（現在は無効化）
export async function hasRelatedDocuments(departmentName: string): Promise<boolean> {
  // 現在は常にfalseを返す（関連ドキュメントチェックを無効化）
  return false;
}

// 部門統計を取得
export async function getDepartmentStats(): Promise<{
  total: number;
  active: number;
  inactive: number;
}> {
  const allDepartments = await getAllDepartments();
  const total = allDepartments.length;
  const active = allDepartments.filter(dept => dept.isActive).length;
  
  return {
    total,
    active,
    inactive: total - active,
  };
}

// 部門の並び替えを更新
export async function updateDepartmentSortOrder(departments: Array<{ id: string; sortOrder: number }>): Promise<void> {
  for (const dept of departments) {
    await updateSettingsData(dept.id, 'department', {
      sortOrder: dept.sortOrder,
      updatedAt: new Date()
    });
  }
}
