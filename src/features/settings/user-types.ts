export type UserType = 'executive' | 'manager' | 'general' | 'other';

export interface UserTypeInfo {
  id: string;
  name: string;
  description: string;
  color: string;
}

export const USER_TYPES: Record<UserType, UserTypeInfo> = {
  executive: {
    id: 'executive',
    name: '役員',
    description: '取締役、監査役等の役員',
    color: 'bg-red-100 text-red-800'
  },
  manager: {
    id: 'manager',
    name: '管理職',
    description: '部長、課長等の管理職',
    color: 'bg-blue-100 text-blue-800'
  },
  general: {
    id: 'general',
    name: '一般',
    description: '一般社員',
    color: 'bg-green-100 text-green-800'
  },
  other: {
    id: 'other',
    name: 'その他',
    description: 'その他のユーザー',
    color: 'bg-gray-100 text-gray-800'
  }
};

export const getUserTypeInfo = (type: UserType): UserTypeInfo => {
  return USER_TYPES[type] || USER_TYPES.other;
};

export const getUserTypeName = (type: UserType): string => {
  return getUserTypeInfo(type).name;
};
