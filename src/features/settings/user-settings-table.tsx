"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { 
  Users, 
  RefreshCw, 
  Save,
  User,
  Building2,
  Briefcase
} from "lucide-react";
import { useGlobalMessageContext } from "@/features/global-message/global-message-context";
import { UserType, USER_TYPES, getUserTypeInfo } from "./user-types";

interface UserData {
  id: string;
  userPrincipalName: string;
  displayName: string;
  mail?: string;
  jobTitle?: string;
  department?: string;
  accountEnabled?: boolean;
  userType: UserType;
  isActive: boolean;
  settingsId?: string;
}

export const UserSettingsTable = () => {
  const { showSuccess, showError } = useGlobalMessageContext();
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [changes, setChanges] = useState<Map<string, { userType?: UserType; isActive?: boolean }>>(new Map());

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/settings/users');
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        setChanges(new Map()); // 変更をリセット
      } else {
        const errorData = await response.json();
        showError(errorData.error || 'ユーザー一覧の取得に失敗しました');
      }
    } catch (error) {
      showError('ユーザー一覧の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const saveChanges = async () => {
    if (changes.size === 0) {
      showError('保存する変更がありません');
      return;
    }

    try {
      setIsSaving(true);
      const promises = Array.from(changes.entries()).map(([userId, changes]) => {
        return fetch('/api/settings/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            userType: changes.userType,
            isActive: changes.isActive,
          }),
        });
      });

      const results = await Promise.all(promises);
      const hasError = results.some(result => !result.ok);

      if (hasError) {
        showError('一部の設定の保存に失敗しました');
      } else {
        showSuccess('ユーザー設定が保存されました');
        setChanges(new Map());
        fetchUsers(); // 一覧を再取得
      }
    } catch (error) {
      showError('設定の保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUserTypeChange = (userId: string, userType: UserType) => {
    const newChanges = new Map(changes);
    const currentChanges = newChanges.get(userId) || {};
    newChanges.set(userId, { ...currentChanges, userType });
    setChanges(newChanges);
  };

  const handleActiveChange = (userId: string, isActive: boolean) => {
    const newChanges = new Map(changes);
    const currentChanges = newChanges.get(userId) || {};
    newChanges.set(userId, { ...currentChanges, isActive });
    setChanges(newChanges);
  };

  const getEffectiveUserType = (user: UserData): UserType => {
    const change = changes.get(user.id);
    return change?.userType || user.userType;
  };

  const getEffectiveIsActive = (user: UserData): boolean => {
    const change = changes.get(user.id);
    return change?.isActive !== undefined ? change.isActive : user.isActive;
  };

  const hasChanges = changes.size > 0;

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            ユーザー設定
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchUsers}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              更新
            </Button>
            <Button
              size="sm"
              onClick={saveChanges}
              disabled={!hasChanges || isSaving}
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span className="ml-2">読み込み中...</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ユーザー名</TableHead>
                    <TableHead>メールアドレス</TableHead>
                    <TableHead>部署</TableHead>
                    <TableHead>役職</TableHead>
                    <TableHead>ユーザータイプ</TableHead>
                    <TableHead>有効</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const effectiveUserType = getEffectiveUserType(user);
                    const effectiveIsActive = getEffectiveIsActive(user);
                    const userTypeInfo = getUserTypeInfo(effectiveUserType);
                    const hasUserChanges = changes.has(user.id);

                    return (
                      <TableRow key={user.id} className={hasUserChanges ? 'bg-yellow-50' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{user.displayName}</div>
                              <div className="text-sm text-muted-foreground">
                                {user.userPrincipalName}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.mail || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-muted-foreground" />
                            {user.department || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Briefcase className="w-3 h-3 text-muted-foreground" />
                            {user.jobTitle || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={effectiveUserType}
                            onValueChange={(value: UserType) => handleUserTypeChange(user.id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(USER_TYPES).map(([key, type]) => (
                                <SelectItem key={key} value={key}>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className={type.color}>
                                      {type.name}
                                    </Badge>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={effectiveIsActive}
                            onCheckedChange={(checked) => handleActiveChange(user.id, checked)}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {users.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                ユーザーが見つかりません
              </div>
            )}

            {hasChanges && (
              <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="text-sm text-yellow-800">
                  {changes.size}件の変更が未保存です
                </div>
                <Button
                  size="sm"
                  onClick={saveChanges}
                  disabled={isSaving}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? '保存中...' : '保存'}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
