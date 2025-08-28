"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Upload, 
  Trash2, 
  Eye, 
  Download,
  FileText,
  Image,
  File,
  AlertCircle,
  CheckCircle,
  Clock,
  Database,
  Search,
  RefreshCw,
  Building2
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useGlobalMessageContext } from "@/features/global-message/global-message-context";
import { BlobFileMetadata } from "./blob-file-management-service";

interface Department {
  id: string;
  name: string;
  blobContainerName: string;
}

export const BlobFileManagement = () => {
  const { data: session } = useSession();
  const { showSuccess, showError } = useGlobalMessageContext();
  const [files, setFiles] = useState<BlobFileMetadata[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedContainer, setSelectedContainer] = useState<string>('');
  const [uploadContainer, setUploadContainer] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // ファイル一覧を取得（全コンテナ対象）
  const fetchFiles = async () => {
    try {
      setIsLoading(true);
      console.log('fetchFiles - Starting (all containers)');
      
      const response = await fetch('/api/blob-files');
      console.log('fetchFiles - Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('fetchFiles - Response data:', data);
        console.log('fetchFiles - Files count:', data.files?.length || 0);
        console.log('fetchFiles - Files raw data count:', data.files?.length || 0);
        setFiles(data.files || []);
      } else {
        const errorData = await response.json();
        console.error('fetchFiles - Error response:', errorData);
        showError(errorData.error || 'ファイル一覧の取得に失敗しました');
      }
    } catch (error) {
      console.error('fetchFiles - Exception:', error);
      showError('ファイル一覧の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 検索フィルタリング
  console.log('filteredFiles - Original files count:', files.length);
  console.log('filteredFiles - Search term:', searchTerm);
  console.log('filteredFiles - Original files:', files.map(f => ({ id: f.id, fileName: f.data.fileName, containerName: f.data.containerName })));
  
  const filteredFiles = files.filter(file => {
    const fullPath = `${file.data.containerName}/${file.data.fileName}`.toLowerCase();
    return fullPath.includes(searchTerm.toLowerCase()) ||
           file.data.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           file.data.containerName.toLowerCase().includes(searchTerm.toLowerCase());
  });
  
  console.log('filteredFiles - Filtered files count:', filteredFiles.length);
  console.log('filteredFiles - Filtered files:', filteredFiles.map(f => ({ id: f.id, fileName: f.data.fileName, containerName: f.data.containerName })));

  // 部門一覧を取得
  const fetchDepartments = async () => {
    try {
      console.log('fetchDepartments - Starting');
      const response = await fetch('/api/departments');
      console.log('fetchDepartments - Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('fetchDepartments - Response data:', data);
        setDepartments(data.departments || []);
        
        if (data.departments && data.departments.length > 0) {
          const firstDepartment = data.departments[0];
          console.log('fetchDepartments - Setting upload container:', firstDepartment.blobContainerName);
          setUploadContainer(firstDepartment.blobContainerName);
          
          // 全ファイルを取得
          setTimeout(() => {
            fetchFiles();
          }, 100);
        } else {
          // 部門が存在しない場合も、全ファイルを取得
          console.log('fetchDepartments - No departments found, fetching all files');
          setTimeout(() => {
            fetchFiles();
          }, 100);
        }
      } else {
        const errorData = await response.json();
        console.error('fetchDepartments - Error response:', errorData);
        showError(errorData.error || '部門一覧の取得に失敗しました');
      }
    } catch (error) {
      console.error('fetchDepartments - Exception:', error);
      showError('部門一覧の取得に失敗しました');
    }
  };

  // CosmosDBコンテナを初期化
  const initializeContainer = async () => {
    try {
      setIsInitializing(true);
      const response = await fetch('/api/blob-files/init', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        showSuccess({
          title: '初期化完了',
          description: data.message || 'CosmosDBコンテナが初期化されました'
        });
      } else {
        const errorData = await response.json();
        showError(errorData.error || 'コンテナの初期化に失敗しました');
      }
    } catch (error) {
      showError('コンテナの初期化に失敗しました');
    } finally {
      setIsInitializing(false);
    }
  };

  // ファイルをアップロード
  const handleUpload = async () => {
    if (!selectedFile) {
      showError('ファイルを選択してください');
      return;
    }

    if (!uploadContainer) {
      showError('コンテナを選択してください');
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('containerName', uploadContainer);

      const response = await fetch('/api/blob-files', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        showSuccess({
          title: 'アップロード完了',
          description: data.message || 'ファイルがアップロードされました'
        });
        setSelectedFile(null);
        fetchFiles();
      } else {
        const errorData = await response.json();
        showError(errorData.error || 'ファイルのアップロードに失敗しました');
      }
    } catch (error) {
      showError('ファイルのアップロードに失敗しました');
    } finally {
      setIsUploading(false);
    }
  };

  // ファイルを削除
  const handleDelete = async (fileId: string, fileName: string) => {
    if (!confirm(`ファイル「${fileName}」を削除しますか？\n\n注意: この操作は取り消せません。`)) {
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/blob-files?id=${encodeURIComponent(fileId)}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const data = await response.json();
        showSuccess({
          title: '削除完了',
          description: data.message || 'ファイルが削除されました'
        });
        fetchFiles();
      } else {
        const errorData = await response.json();
        showError(errorData.error || 'ファイルの削除に失敗しました');
      }
    } catch (error) {
      showError('ファイルの削除に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // ファイルを表示
  const handleView = async (fileId: string) => {
    try {
      const response = await fetch(`/api/blob-files/sas-url?id=${encodeURIComponent(fileId)}`);
      if (response.ok) {
        const data = await response.json();
        window.open(data.sasUrl, '_blank');
      } else {
        const errorData = await response.json();
        showError(errorData.error || 'ファイルの表示に失敗しました');
      }
    } catch (error) {
      showError('ファイルの表示に失敗しました');
    }
  };



  // BLOBストレージメタデータ更新処理
  const handleUpdateBlobMetadata = async () => {
    if (!confirm('すべてのファイルのBLOBストレージメタデータを更新しますか？')) {
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/blob-files/update-blob-metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        showSuccess({
          title: '更新完了',
          description: data.message || 'BLOBストレージのメタデータを更新しました'
        });
      } else {
        const errorData = await response.json();
        showError(errorData.error || 'BLOBストレージのメタデータ更新に失敗しました');
      }
    } catch (error) {
      showError('BLOBストレージのメタデータ更新に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // ファイルアイコンを取得
  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith('image/')) {
      return <Image className="w-4 h-4" />;
    } else if (contentType.includes('pdf')) {
      return <FileText className="w-4 h-4" />;
    } else {
      return <File className="w-4 h-4" />;
    }
  };

  // ファイルサイズをフォーマット
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // ファイルリンクコンポーネント
  const FileLink = ({ fileId, fileName }: { fileId: string; fileName: string }) => {
    const [sasUrl, setSasUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleClick = async () => {
      if (sasUrl) {
        window.open(sasUrl, '_blank');
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch(`/api/blob-files/sas-url?id=${encodeURIComponent(fileId)}`);
        if (response.ok) {
          const data = await response.json();
          setSasUrl(data.sasUrl);
          window.open(data.sasUrl, '_blank');
        } else {
          const errorData = await response.json();
          showError(errorData.error || 'ファイルの表示に失敗しました');
        }
      } catch (error) {
        showError('ファイルの表示に失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <button
        onClick={handleClick}
        disabled={isLoading}
        className="block truncate text-left hover:text-blue-600 hover:underline focus:outline-none focus:text-blue-600"
        title={fileName}
      >
        {isLoading ? (
          <span className="flex items-center gap-1">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
            読み込み中...
          </span>
        ) : (
          fileName
        )}
      </button>
    );
  };

  // ステータス表示を取得
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case null:
      case '':
        return {
          icon: <CheckCircle className="w-4 h-4 text-green-500" />,
          text: 'アップロード済み',
          color: 'text-green-600'
        };
      case 'processed':
        return {
          icon: <Clock className="w-4 h-4 text-blue-500" />,
          text: '処理中',
          color: 'text-blue-600'
        };
      case 'deleted':
        return {
          icon: <Trash2 className="w-4 h-4 text-gray-500" />,
          text: '削除済み',
          color: 'text-gray-600'
        };
      case 'indexed':
        return {
          icon: <CheckCircle className="w-4 h-4 text-green-600" />,
          text: '完了',
          color: 'text-green-700'
        };
      case 'errors':
        return {
          icon: <AlertCircle className="w-4 h-4 text-red-500" />,
          text: 'エラー',
          color: 'text-red-600'
        };
      default:
        return {
          icon: <CheckCircle className="w-4 h-4 text-green-500" />,
          text: 'アップロード済み',
          color: 'text-green-600'
        };
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    // コンテナが変更されても全ファイルを取得
    console.log('useEffect - selectedContainer changed:', selectedContainer);
    fetchFiles();
  }, [selectedContainer]);

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
    <div className="space-y-6 w-full">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold mb-2">Dropboxファイル一覧</h1>
          <p className="text-muted-foreground">
            Dropboxファイルの管理を行います
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={initializeContainer}
            disabled={isInitializing}
            variant="outline"
            className="flex items-center gap-2"
          >
            {isInitializing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                初期化中...
              </>
            ) : (
              <>
                <Database className="w-4 h-4" />
                CosmosDB初期化
              </>
            )}
          </Button>
          <Button 
                          onClick={() => fetchFiles()}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            ファイル一覧更新
          </Button>
        </div>
      </div>

      {/* ファイルアップロード */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            ファイルアップロード
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">部門選択 *</label>
              <Select value={uploadContainer} onValueChange={setUploadContainer}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="部門を選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={department.blobContainerName}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">ファイル選択 *</label>
              <div className="mt-1">
                <Input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="mt-1"
                  accept="*/*"
                />
                {selectedFile ? (
                  <p className="text-sm text-muted-foreground mt-1 break-all">
                    選択されたファイル: {selectedFile.name}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">
                    ファイルが選択されていません
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-end">
              <Button 
                onClick={handleUpload}
                disabled={isUploading || !selectedFile || !uploadContainer}
                className="w-full h-10"
              >
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    アップロード中...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    アップロード
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* アップロード済みドキュメント */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            アップロード済みドキュメント
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="部門名/ファイル名で検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              onClick={() => fetchFiles()}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              更新
            </Button>
            <Button
              onClick={handleUpdateBlobMetadata}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Database className="w-4 h-4" />
              BLOBメタデータ更新
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">読み込み中...</p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">ファイルがありません</p>
              <p className="text-sm text-muted-foreground mt-1">ファイルをアップロードしてください</p>
              <div className="mt-4 text-xs text-muted-foreground bg-gray-50 p-3 rounded border">
                <h4 className="font-medium mb-2">デバッグ情報</h4>
                <div className="space-y-1">
                  <p><span className="font-medium">総ファイル数:</span> {files.length}</p>
                  <p><span className="font-medium">フィルタ後ファイル数:</span> {filteredFiles.length}</p>
                  <p><span className="font-medium">アップロード用コンテナ:</span> {uploadContainer || 'なし'}</p>
                  <p><span className="font-medium">検索語:</span> {searchTerm || 'なし'}</p>
                </div>
                {files.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <h5 className="font-medium mb-2">取得されたファイル詳細</h5>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {files.map((file, index) => (
                        <div key={index} className="bg-white p-2 rounded border text-xs">
                          <p><span className="font-medium">ID:</span> {file.id}</p>
                          <p><span className="font-medium">ファイル名:</span> {file.data.fileName}</p>
                          <p><span className="font-medium">オリジナル名:</span> {file.data.originalFileName}</p>
                          <p><span className="font-medium">コンテナ:</span> {file.data.containerName}</p>
                          <p><span className="font-medium">バージョン:</span> {file.data.version}</p>
                          <p><span className="font-medium">アップロード日:</span> {new Date(file.data.uploadedAt).toLocaleString('ja-JP')}</p>
                          <p><span className="font-medium">更新日:</span> {new Date(file.data.updatedAt).toLocaleString('ja-JP')}</p>
                          <p><span className="font-medium">削除フラグ:</span> {file.data.isDeleted ? 'true' : 'false'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/3">ファイル名</TableHead>
                  <TableHead className="w-1/6">部門</TableHead>
                  <TableHead className="w-1/8">バージョン</TableHead>
                  <TableHead className="w-1/6">ステータス</TableHead>
                  <TableHead className="w-1/6">更新日時</TableHead>
                  <TableHead className="w-1/6">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFiles.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {getFileIcon(file.data.fileType)}
                        <div className="min-w-0 flex-1">
                          <FileLink fileId={file.id} fileName={file.data.fileName} />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{file.data.containerName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        v{file.data.version}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const statusDisplay = getStatusDisplay(file.data.status);
                        return (
                          <div className="flex items-center gap-2">
                            {statusDisplay.icon}
                            <span className={`text-sm ${statusDisplay.color}`}>
                              {statusDisplay.text}
                            </span>
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{new Date(file.data.updatedAt).toLocaleDateString('ja-JP')}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(file.data.updatedAt).toLocaleTimeString('ja-JP')}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(file.id, file.data.fileName)}
                          className="flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
