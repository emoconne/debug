"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings, 
  Building2, 
  Menu, 
  Activity,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Clock,
  FolderOpen,
  RefreshCw,
  BarChart3,
  Download,
  Bot,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import Link from "next/link";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useSession } from "next-auth/react";
import { useGlobalMessageContext } from "@/features/global-message/global-message-context";
import { Department } from "@/features/documents/cosmos-db-dept-service";
import { GPTModelData } from "@/features/documents/cosmos-db-gpt-model-service";


interface DepartmentFormData {
  name: string;
  description: string;
  blobContainerName: string;
  isActive: boolean;
}

export const SettingsManagement = () => {
  const { data: session } = useSession();
  const { showSuccess, showError } = useGlobalMessageContext();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [containers, setContainers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<DepartmentFormData>({
    name: '',
    description: '',
    blobContainerName: '',
    isActive: true,
  });
  
  // BLOBコンテナ管理用の状態
  const [newContainerName, setNewContainerName] = useState('');
  const [isContainerLoading, setIsContainerLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [connectionResult, setConnectionResult] = useState<any>(null);

  // レポート機能用の状態
  const [chatThreads, setChatThreads] = useState<any[]>([]);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [reportPageNumber, setReportPageNumber] = useState(0);
  const [reportPageSize] = useState(10);
  const [hasMoreResults, setHasMoreResults] = useState(false);

  // グラフ機能用の状態
  const [graphData, setGraphData] = useState<any[]>([]);
  const [graphPeriod, setGraphPeriod] = useState<'daily' | 'monthly'>('daily');
  const [isGraphLoading, setIsGraphLoading] = useState(false);

  // GPTモデル設定用の状態
  const [gptModels, setGptModels] = useState<GPTModelData[]>([]);
  const [currentModel, setCurrentModel] = useState<string>('');
  const [isGptModelLoading, setIsGptModelLoading] = useState(false);
  const [editingGptModel, setEditingGptModel] = useState<GPTModelData | null>(null);
  const [isEditingGptModel, setIsEditingGptModel] = useState(false);
  const [gptModelFormData, setGptModelFormData] = useState({
    name: '',
    deploymentName: '',
    description: '',
    isAvailable: true,
    isDefault: false,
  });



  // 部門一覧を取得
  const fetchDepartments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/settings/departments');
      if (response.ok) {
        const data = await response.json();
        setDepartments(data.departments || []);
      } else {
        const errorData = await response.json();
        showError(errorData.error || '部門一覧の取得に失敗しました');
      }
    } catch (error) {
      showError('部門一覧の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // BLOBコンテナ一覧を取得
  const fetchContainers = async () => {
    try {
      const response = await fetch('/api/settings/containers');
      if (response.ok) {
        const data = await response.json();
        setContainers(data.containers || []);
      } else {
        const errorData = await response.json();
        showError(errorData.error || 'コンテナ一覧の取得に失敗しました');
      }
    } catch (error) {
      showError('コンテナ一覧の取得に失敗しました');
    }
  };

  // BLOBコンテナ接続テスト
  const testConnection = async () => {
    try {
      setIsContainerLoading(true);
      setConnectionStatus('testing');
      setConnectionResult(null);
      
      const response = await fetch('/api/settings/containers/test', {
        method: 'POST',
      });
      
      if (response.ok) {
        const data = await response.json();
        setConnectionStatus('success');
        setConnectionResult(data);
        showSuccess({
          title: '接続テスト',
          description: '接続テストが成功しました'
        });
      } else {
        const errorData = await response.json();
        setConnectionStatus('error');
        setConnectionResult(errorData);
        showError(errorData.error || '接続テストに失敗しました');
      }
    } catch (error) {
      setConnectionStatus('error');
      setConnectionResult({ error: '接続テストに失敗しました' });
      showError('接続テストに失敗しました');
    } finally {
      setIsContainerLoading(false);
    }
  };

  // BLOBコンテナを追加
  const addContainer = async () => {
    if (!newContainerName.trim()) {
      showError('コンテナ名を入力してください');
      return;
    }

    try {
      setIsContainerLoading(true);
      
      const response = await fetch('/api/settings/containers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newContainerName.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        showSuccess({
          title: 'コンテナ作成',
          description: data.message || 'コンテナが作成されました'
        });
        setNewContainerName('');
        fetchContainers();
      } else {
        const errorData = await response.json();
        showError(errorData.error || 'コンテナの作成に失敗しました');
      }
    } catch (error) {
      showError('コンテナの作成に失敗しました');
    } finally {
      setIsContainerLoading(false);
    }
  };

  // BLOBコンテナを削除
  const deleteContainer = async (containerName: string) => {
    if (!confirm(`コンテナ「${containerName}」を削除しますか？\n\n注意: この操作は取り消せません。`)) {
      return;
    }

    try {
      setIsContainerLoading(true);
      
      const response = await fetch(`/api/settings/containers?name=${encodeURIComponent(containerName)}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const data = await response.json();
        showSuccess({
          title: 'コンテナ削除',
          description: data.message || 'コンテナが削除されました'
        });
        fetchContainers();
      } else {
        const errorData = await response.json();
        showError(errorData.error || 'コンテナの削除に失敗しました');
      }
    } catch (error) {
      showError('コンテナの削除に失敗しました');
    } finally {
      setIsContainerLoading(false);
    }
  };

  // レポート機能 - チャット履歴を取得
  const fetchChatThreads = async (pageNumber: number = 0) => {
    try {
      setIsReportLoading(true);
      const response = await fetch(`/api/reporting?pageSize=${reportPageSize}&pageNumber=${pageNumber}`);
      if (response.ok) {
        const data = await response.json();
        setChatThreads(data.resources || []);
        setHasMoreResults(data.resources && data.resources.length === reportPageSize);
        setReportPageNumber(pageNumber);
      } else {
        showError('チャット履歴の取得に失敗しました');
      }
    } catch (error) {
      showError('チャット履歴の取得に失敗しました');
    } finally {
      setIsReportLoading(false);
    }
  };

  // グラフ機能 - 利用状況データを取得
  const fetchGraphData = async () => {
    try {
      setIsGraphLoading(true);
      const response = await fetch(`/api/reporting/graph?period=${graphPeriod}`);
      if (response.ok) {
        const data = await response.json();
        setGraphData(data.data || []);
      } else {
        showError('利用状況データの取得に失敗しました');
      }
    } catch (error) {
      showError('利用状況データの取得に失敗しました');
    } finally {
      setIsGraphLoading(false);
    }
  };

  // GPTモデル一覧を取得
  const fetchGptModels = async () => {
    try {
      setIsGptModelLoading(true);
      const response = await fetch('/api/settings/gpt-models');
      if (response.ok) {
        const data = await response.json();
        setGptModels(data.models || []);
        setCurrentModel(data.currentModel || '');
      } else {
        const errorData = await response.json();
        showError(errorData.error || 'GPTモデル一覧の取得に失敗しました');
      }
    } catch (error) {
      showError('GPTモデル一覧の取得に失敗しました');
    } finally {
      setIsGptModelLoading(false);
    }
  };



  // GPTモデルを選択
  const selectGptModel = async (modelId: string) => {
    try {
      setIsGptModelLoading(true);
      const response = await fetch('/api/settings/gpt-models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ selectedModel: modelId }),
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentModel(data.selectedModel);
        showSuccess(data.message || 'GPTモデルが選択されました');
        fetchGptModels(); // 一覧を再取得
      } else {
        const errorData = await response.json();
        showError(errorData.error || 'GPTモデルの選択に失敗しました');
      }
    } catch (error) {
      showError('GPTモデルの選択に失敗しました');
    } finally {
      setIsGptModelLoading(false);
    }
  };

  // GPTモデルを保存
  const handleSaveGptModel = async () => {
    if (!gptModelFormData.name || !gptModelFormData.deploymentName) {
      showError('モデル名とデプロイ名は必須です');
      return;
    }

    try {
      setIsGptModelLoading(true);
      
      const url = '/api/settings/gpt-models/manage';
      const method = editingGptModel ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingGptModel 
          ? { id: editingGptModel.id, ...gptModelFormData }
          : gptModelFormData
        ),
      });

      if (response.ok) {
        const data = await response.json();
        showSuccess({
          title: 'GPTモデル管理',
          description: data.message || (editingGptModel ? 'GPTモデルが更新されました' : 'GPTモデルが作成されました')
        });
        
        setGptModelFormData({
          name: '',
          deploymentName: '',
          description: '',
          isAvailable: true,
          isDefault: false,
        });
        setEditingGptModel(null);
        setIsEditingGptModel(false);
        fetchGptModels();
      } else {
        const errorData = await response.json();
        showError(errorData.error || 'GPTモデルの保存に失敗しました');
      }
    } catch (error) {
      showError('GPTモデルの保存に失敗しました');
    } finally {
      setIsGptModelLoading(false);
    }
  };

  // GPTモデルを削除
  const handleDeleteGptModel = async (modelId: string) => {
    if (!confirm('このGPTモデルを削除しますか？')) {
      return;
    }

    try {
      setIsGptModelLoading(true);
      const response = await fetch(`/api/settings/gpt-models/manage?id=${modelId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const data = await response.json();
        showSuccess({
          title: 'GPTモデル削除',
          description: data.message || 'GPTモデルが削除されました'
        });
        fetchGptModels();
      } else {
        const errorData = await response.json();
        showError(errorData.error || 'GPTモデルの削除に失敗しました');
      }
    } catch (error) {
      console.error('Delete GPT model error:', error);
      showError('GPTモデルの削除に失敗しました');
    } finally {
      setIsGptModelLoading(false);
    }
  };

  // 編集モードを開始
  const handleEditGptModel = (model: GPTModelData) => {
    setEditingGptModel(model);
    setGptModelFormData({
      name: model.name,
      deploymentName: model.deploymentName,
      description: model.description,
      isAvailable: model.isAvailable,
      isDefault: model.isDefault,
    });
    setIsEditingGptModel(true);
  };

  // 編集をキャンセル
  const handleCancelEditGptModel = () => {
    setEditingGptModel(null);
    setGptModelFormData({
      name: '',
      deploymentName: '',
      description: '',
      isAvailable: true,
      isDefault: false,
    });
    setIsEditingGptModel(false);
  };

  // CSVダウンロード
  const downloadCSV = async () => {
    try {
      const response = await fetch('/api/reporting/csv');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-report-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        showError('CSVダウンロードに失敗しました');
      }
    } catch (error) {
      showError('CSVダウンロードに失敗しました');
    }
  };

  // 部門を保存
  const handleSaveDepartment = async () => {
    if (!formData.name || !formData.blobContainerName) {
      showError('部門名とBLOBコンテナ名は必須です');
      return;
    }

    try {
      setIsLoading(true);
      
      const url = editingDepartment 
        ? '/api/settings/departments' 
        : '/api/settings/departments';
      
      const method = editingDepartment ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingDepartment 
          ? { id: editingDepartment.id, ...formData }
          : formData
        ),
      });

      if (response.ok) {
        const data = await response.json();
        showSuccess({
          title: '部門管理',
          description: data.message || (editingDepartment ? '部門が更新されました' : '部門が作成されました')
        });
        
        setFormData({
          name: '',
          description: '',
          blobContainerName: '',
          isActive: true,
        });
        setEditingDepartment(null);
        setIsEditing(false);
        fetchDepartments();
      } else {
        const errorData = await response.json();
        showError(errorData.error || '部門の保存に失敗しました');
      }
    } catch (error) {
      showError('部門の保存に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 部門を削除
  const handleDeleteDepartment = async (departmentId: string) => {
    if (!confirm('この部門を削除しますか？')) {
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/settings/departments?id=${departmentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const data = await response.json();
        showSuccess({
          title: '部門削除',
          description: data.message || '部門が削除されました'
        });
        fetchDepartments();
      } else {
        const errorData = await response.json();
        showError(errorData.error || '部門の削除に失敗しました');
      }
    } catch (error) {
      console.error('Delete department error:', error);
      showError('部門の削除に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 編集モードを開始
  const handleEditDepartment = (department: Department) => {
    setEditingDepartment(department);
    setFormData({
      name: department.name,
      description: department.description || '',
      blobContainerName: department.blobContainerName,
      isActive: department.isActive,
    });
    setIsEditing(true);
  };

  // 編集をキャンセル
  const handleCancelEdit = () => {
    setEditingDepartment(null);
    setFormData({
      name: '',
      description: '',
      blobContainerName: '',
      isActive: true,
    });
    setIsEditing(false);
  };

  useEffect(() => {
    fetchDepartments();
    fetchContainers();
    fetchChatThreads();
    fetchGraphData();
    fetchGptModels();
  }, []);

  useEffect(() => {
    fetchGraphData();
  }, [graphPeriod]);

  if (!session?.user?.isAdmin) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
              <h2 className="text-xl font-semibold mb-2">アクセス権限がありません</h2>
              <p className="text-muted-foreground">この機能は管理者のみが利用できます。</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl p-6 pb-12 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">システム設定</h1>
        <p className="text-muted-foreground">
          システムの各種設定を管理します
        </p>
      </div>

      <Tabs defaultValue="logs" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="logs" className="flex items-center gap-1 text-xs px-2">
            <Activity className="w-3 h-3" />
            利用ログ
          </TabsTrigger>
          <TabsTrigger value="graph" className="flex items-center gap-1 text-xs px-2">
            <BarChart3 className="w-3 h-3" />
            利用状況グラフ
          </TabsTrigger>
          <TabsTrigger value="departments" className="flex items-center gap-1 text-xs px-2">
            <Building2 className="w-3 h-3" />
            部門設定
          </TabsTrigger>
          <TabsTrigger value="menus" className="flex items-center gap-1 text-xs px-2">
            <Menu className="w-3 h-3" />
            メニュー設定
          </TabsTrigger>
          <TabsTrigger value="gpt-models" className="flex items-center gap-1 text-xs px-2">
            <Bot className="w-3 h-3" />
            GPTモデル
          </TabsTrigger>

          {process.env.NODE_ENV === 'development' && (
            <TabsTrigger value="containers" className="flex items-center gap-1 text-xs px-2">
              <FolderOpen className="w-3 h-3" />
              BLOBコンテナ
            </TabsTrigger>
          )}
        </TabsList>

        {/* 部門設定タブ */}
        <TabsContent value="departments" className="space-y-6 pb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  部門設定
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium">
                    有効
                  </label>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 部門追加・編集フォーム */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">部門名 *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="部門名を入力"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">BLOBコンテナ名 *</label>
                  <Input
                    value={formData.blobContainerName}
                    onChange={(e) => setFormData({ ...formData, blobContainerName: e.target.value })}
                    placeholder="コンテナ名を入力"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">説明</label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="部門の説明を入力"
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleSaveDepartment}
                  disabled={isLoading || (!formData.name || !formData.blobContainerName)}
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingDepartment ? '更新' : '追加'}
                </Button>
                {isEditing && (
                  <Button 
                    onClick={handleCancelEdit}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    キャンセル
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 部門一覧 */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">読み込み中...</p>
                </div>
              ) : (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader className="bg-background border-b">
                      <TableRow>
                        <TableHead className="w-32">部門名</TableHead>
                        <TableHead className="w-40">BLOBコンテナ名</TableHead>
                        <TableHead className="w-48">説明</TableHead>
                        <TableHead className="w-24">ステータス</TableHead>
                        <TableHead className="w-32">作成日</TableHead>
                        <TableHead className="w-32">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                  </Table>
                  <div className="max-h-80 overflow-y-auto">
                    <Table>
                      <TableBody>
                        {departments.map((department) => (
                          <TableRow key={department.id}>
                            <TableCell className="font-medium w-32">{department.name}</TableCell>
                            <TableCell className="w-40">{department.blobContainerName}</TableCell>
                            <TableCell className="max-w-48 truncate w-48" title={department.description || '-'}>
                              {department.description || '-'}
                            </TableCell>
                            <TableCell className="w-24">
                              {department.isActive ? (
                                <Badge variant="default">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  有効
                                </Badge>
                              ) : (
                                <Badge variant="secondary">
                                  <Clock className="w-3 h-3 mr-1" />
                                  無効
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="w-32">
                              {new Date(department.createdAt).toLocaleDateString('ja-JP')}
                            </TableCell>
                            <TableCell className="w-32">
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditDepartment(department)}
                                  className="flex items-center gap-1"
                                >
                                  <Edit className="w-3 h-3" />
                                  編集
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteDepartment(department.id)}
                                  className="flex items-center gap-1"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  削除
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* BLOBコンテナタブ */}
        <TabsContent value="containers" className="space-y-6 pb-20">
          {/* 接続テストとコンテナ追加 */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5" />
                BLOBコンテナ管理
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pb-6">
              <div className="flex items-center gap-4">
                <Button 
                  onClick={testConnection}
                  disabled={isContainerLoading}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  {connectionStatus === 'testing' ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  ) : connectionStatus === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : connectionStatus === 'error' ? (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  ) : (
                    <Activity className="w-4 h-4" />
                  )}
                  接続テスト
                </Button>
                <Button 
                  onClick={fetchContainers}
                  disabled={isContainerLoading}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  更新
                </Button>
              </div>
              
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium">新しいコンテナ名</label>
                  <Input
                    value={newContainerName}
                    onChange={(e) => setNewContainerName(e.target.value)}
                    placeholder="コンテナ名を入力"
                    className="mt-1"
                    disabled={isContainerLoading}
                  />
                </div>
                <Button 
                  onClick={addContainer}
                  disabled={isContainerLoading || !newContainerName.trim()}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  追加
                </Button>
              </div>

              {/* 接続テスト結果表示 */}
              {connectionResult && (
                <div className={`p-4 rounded-md border ${
                  connectionStatus === 'success' 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {connectionStatus === 'success' ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span className={`font-medium ${
                      connectionStatus === 'success' ? 'text-green-800' : 'text-red-800'
                    }`}>
                      接続テスト結果
                    </span>
                  </div>
                  {connectionStatus === 'success' && connectionResult.accountInfo ? (
                    <div className="space-y-1 text-sm">
                      <div><span className="font-medium">アカウント名:</span> {connectionResult.accountInfo.name}</div>
                      <div><span className="font-medium">SKU:</span> {connectionResult.accountInfo.skuName}</div>
                      <div><span className="font-medium">コンテナ数:</span> {connectionResult.accountInfo.containerCount}</div>
                    </div>
                  ) : (
                    <div className="text-sm text-red-700">
                      {connectionResult.error || '接続テストに失敗しました'}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* コンテナ一覧 */}
          <Card className="mb-8">
            <CardContent className="p-0">
              {containers.length === 0 ? (
                <p className="text-muted-foreground p-4">コンテナが見つかりません</p>
              ) : (
                <div className="border rounded-md">
                  <div className="relative">
                    {/* 固定ヘッダー */}
                    <div className="sticky top-0 z-10 bg-background border-b">
                      <div className="grid grid-cols-3 gap-4 p-4 font-medium text-sm">
                        <div className="w-64">コンテナ名</div>
                        <div className="w-32">ステータス</div>
                        <div className="w-32">操作</div>
                      </div>
                    </div>
                    
                    {/* スクロール可能なコンテンツ */}
                    <div className="max-h-32 overflow-y-auto">
                        {containers.map((container) => (
                        <div key={container} className="grid grid-cols-3 gap-4 p-4 border-b last:border-b-0 hover:bg-muted/50">
                          <div className="font-medium w-64 truncate">{container}</div>
                          <div className="w-32">
                            <Badge variant="default" className="text-xs">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                存在
                              </Badge>
                          </div>
                          <div className="w-32">
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteContainer(container)}
                                disabled={isContainerLoading}
                              className="flex items-center gap-1 h-7 px-2"
                              >
                                <Trash2 className="w-3 h-3" />
                                削除
                              </Button>
                          </div>
                        </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* メニュー設定タブ */}
        <TabsContent value="menus" className="space-y-6 pb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Menu className="w-5 h-5" />
                メニュー設定
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                メニュー設定機能は現在開発中です。
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 利用ログタブ */}
        <TabsContent value="logs" className="space-y-6 pb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                利用ログ
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button onClick={downloadCSV} variant="outline" size="sm" className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  CSVダウンロード
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isReportLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">読み込み中...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>会話日時</TableHead>
                        <TableHead className="w-[200px]">ユーザー名</TableHead>
                        <TableHead className="w-[300px]">タイトル</TableHead>
                        <TableHead className="w-[150px]">チャットタイプ</TableHead>
                        <TableHead className="w-[200px]">チャットドキュメント</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {chatThreads.map((chatThread) => (
                        <TableRow key={chatThread.id}>
                          <TableCell>
                            <Link href={`/reporting/${chatThread.id}`} className="hover:underline">
                              {new Date(chatThread.createdAt).toLocaleDateString("ja-JP")} {new Date(chatThread.createdAt).toLocaleTimeString()}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Link href={`/reporting/${chatThread.id}`} className="hover:underline">
                              {chatThread.useName}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Link href={`/reporting/${chatThread.id}`} className="hover:underline">
                              {chatThread.name}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Link href={`/reporting/${chatThread.id}`} className="hover:underline">
                              {chatThread.chatType || '-'}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Link href={`/reporting/${chatThread.id}`} className="hover:underline">
                              {chatThread.chatDoc || '-'}
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="flex gap-2 justify-end">
                    {reportPageNumber > 0 && (
                      <Button onClick={() => fetchChatThreads(reportPageNumber - 1)} size="sm" variant="outline">
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                    )}
                    {hasMoreResults && (
                      <Button onClick={() => fetchChatThreads(reportPageNumber + 1)} size="sm" variant="outline">
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* GPTモデル設定タブ */}
        <TabsContent value="gpt-models" className="space-y-6 pb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                GPTモデル設定
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* フォーム */}
              {isEditingGptModel && (
                <Card className="mb-6 border-2 border-dashed">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {editingGptModel ? 'GPTモデルを編集' : 'GPTモデルを追加'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">モデル名 *</label>
                        <Input
                          value={gptModelFormData.name}
                          onChange={(e) => setGptModelFormData({ ...gptModelFormData, name: e.target.value })}
                          placeholder="例: GPT-4o"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">デプロイ名 *</label>
                        <Input
                          value={gptModelFormData.deploymentName}
                          onChange={(e) => setGptModelFormData({ ...gptModelFormData, deploymentName: e.target.value })}
                          placeholder="例: gpt-4o"
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">説明</label>
                      <Textarea
                        value={gptModelFormData.description}
                        onChange={(e) => setGptModelFormData({ ...gptModelFormData, description: e.target.value })}
                        placeholder="モデルの説明を入力"
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="isAvailable"
                          checked={gptModelFormData.isAvailable}
                          onChange={(e) => setGptModelFormData({ ...gptModelFormData, isAvailable: e.target.checked })}
                          className="rounded"
                        />
                        <label htmlFor="isAvailable" className="text-sm font-medium">
                          利用可能
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="isDefault"
                          checked={gptModelFormData.isDefault}
                          onChange={(e) => setGptModelFormData({ ...gptModelFormData, isDefault: e.target.checked })}
                          className="rounded"
                        />
                        <label htmlFor="isDefault" className="text-sm font-medium">
                          デフォルト
                        </label>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleSaveGptModel}
                        disabled={isGptModelLoading || (!gptModelFormData.name || !gptModelFormData.deploymentName)}
                        className="flex-1"
                      >
                        {isGptModelLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            {editingGptModel ? '更新中...' : '保存中...'}
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            {editingGptModel ? '更新' : '保存'}
                          </>
                        )}
                      </Button>
                      <Button 
                        onClick={handleCancelEditGptModel}
                        variant="outline"
                      >
                        <X className="w-4 h-4 mr-2" />
                        キャンセル
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 追加ボタン */}
              {!isEditingGptModel && (
                <div className="mb-6">
                  <Button 
                    onClick={() => setIsEditingGptModel(true)}
                    className="w-full"
                    variant="outline"
                    disabled={isGptModelLoading}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    GPTモデルを追加
                  </Button>
                </div>
              )}

              {/* モデル一覧 */}
              {isGptModelLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">読み込み中...</p>
                </div>
              ) : gptModels.length === 0 ? (
                <div className="text-center py-8">
                  <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">GPTモデルが登録されていません</p>
                  <p className="text-sm text-muted-foreground mt-1">「GPTモデルを追加」ボタンから新しいモデルを追加してください</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">登録済みモデル</h3>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-32">モデル名</TableHead>
                        <TableHead className="w-40">デプロイ名</TableHead>
                        <TableHead className="w-48">説明</TableHead>
                        <TableHead className="w-32">作成日</TableHead>
                        <TableHead className="w-32">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gptModels.map((model) => (
                        <TableRow key={model.id}>
                          <TableCell className="font-medium w-32">{model.name}</TableCell>
                          <TableCell className="w-40">{model.deploymentName}</TableCell>
                          <TableCell className="max-w-48 truncate w-48" title={model.description || '-'}>
                            {model.description || '-'}
                          </TableCell>
                          <TableCell className="w-32">
                            {new Date(model.createdAt).toLocaleDateString('ja-JP')}
                          </TableCell>
                          <TableCell className="w-32">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditGptModel(model)}
                                className="flex items-center gap-1"
                              >
                                <Edit className="w-3 h-3" />
                                編集
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteGptModel(model.id)}
                                disabled={model.isDefault}
                                className="flex items-center gap-1"
                              >
                                <Trash2 className="w-3 h-3" />
                                削除
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>



        {/* 利用状況グラフタブ */}
        <TabsContent value="graph" className="space-y-6 pb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                利用状況グラフ
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={() => setGraphPeriod('daily')} 
                  variant={graphPeriod === 'daily' ? 'default' : 'outline'} 
                  size="sm"
                >
                  日別
                </Button>
                <Button 
                  onClick={() => setGraphPeriod('monthly')} 
                  variant={graphPeriod === 'monthly' ? 'default' : 'outline'} 
                  size="sm"
                >
                  月別
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isGraphLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">読み込み中...</p>
                </div>
              ) : (
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={graphData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
