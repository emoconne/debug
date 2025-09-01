export type UserType = 'executive' | 'manager' | 'general' | 'other';
export type AdminRole = 'admin' | 'user';

export interface UserTypeInfo {
  id: string;
  name: string;
  description: string;
  color: string;
}

export interface AdminRoleInfo {
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

export const ADMIN_ROLES: Record<AdminRole, AdminRoleInfo> = {
  admin: {
    id: 'admin',
    name: '管理者',
    description: 'システム管理者権限',
    color: 'bg-purple-100 text-purple-800'
  },
  user: {
    id: 'user',
    name: '一般ユーザー',
    description: '一般ユーザー権限',
    color: 'bg-gray-100 text-gray-800'
  }
};

export const getUserTypeInfo = (type: UserType): UserTypeInfo => {
  return USER_TYPES[type] || USER_TYPES.other;
};

export const getUserTypeName = (type: UserType): string => {
  return getUserTypeInfo(type).name;
};

export const getAdminRoleInfo = (role: AdminRole): AdminRoleInfo => {
  return ADMIN_ROLES[role] || ADMIN_ROLES.user;
};

export const getAdminRoleName = (role: AdminRole): string => {
  return getAdminRoleInfo(role).name;
};
