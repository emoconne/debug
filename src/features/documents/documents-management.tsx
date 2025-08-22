"use client";

import { useState, useEffect, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Department } from "@/features/documents/cosmos-db-dept-service";
import { 
  Upload, 
  FileText, 
  Trash2, 
  Download, 
  Search,
  AlertCircle,
  CheckCircle,
  Clock,
  Tag,
  FolderOpen,
  BarChart3,
  RefreshCw,
  Filter,
  Grid,
  List,
  FileUp,
  Settings,
  Users,
  Calendar,
  Bug,
  TestTube,
  Cloud,
  Share2,
  Database,
  CalendarDays
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useGlobalMessageContext } from "@/features/global-message/global-message-context";

interface Document {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: string;
  status: 'uploaded' | 'processing' | 'completed' | 'error';
  departmentId: string;
  departmentName: string;
  containerName: string;
  blobName: string;
  blobUrl: string;
}

interface DocumentStats {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  totalSize: number;
  indexStats: { documentCount: number; storageSize: number };
}

export const DocumentsManagement = () => {
  const { data: session } = useSession();
  const { showSuccess, showError } = useGlobalMessageContext();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [showBatchUpload, setShowBatchUpload] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [errorDetails, setErrorDetails] = useState<{[key: string]: any}>({});
  const [showErrorDetails, setShowErrorDetails] = useState<string | null>(null);

  // ドキュメント一覧を取得
  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/documents');
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      } else {
        showError('ドキュメント一覧の取得に失敗しました');
      }
    } catch (error) {
      showError('ドキュメント一覧の取得中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  // ステータスのみを更新（軽量版）
  const updateDocumentStatuses = async () => {
    try {
      const response = await fetch('/api/documents');
      if (response.ok) {
        const data = await response.json();
        const newDocuments = data.documents || [];
        
        setDocuments(prevDocuments => {
          const updatedDocuments = [...prevDocuments];
          
          // 既存のドキュメントのステータスを更新
          updatedDocuments.forEach((prevDoc, index) => {
            const newDoc = newDocuments.find((d: Document) => d.id === prevDoc.id);
            if (newDoc && newDoc.status !== prevDoc.status) {
              // ステータスが変更された場合のみ更新
              updatedDocuments[index] = { ...prevDoc, status: newDoc.status };
            }
          });
          
          // 新しいドキュメントを追加（存在しない場合）
          newDocuments.forEach((newDoc: Document) => {
            const exists = updatedDocuments.some(d => d.id === newDoc.id);
            if (!exists) {
              updatedDocuments.push(newDoc);
            }
          });
          
          return updatedDocuments;
        });
      }
    } catch (error) {
      console.error('Status update error:', error);
    }
  };

  // エラー詳細を取得
  const fetchErrorDetails = async (documentId: string) => {
    try {
      const response = await fetch(`/api/test/document-processing?documentId=${documentId}`);
      if (response.ok) {
        const data = await response.json();
        setErrorDetails(prev => ({
          ...prev,
          [documentId]: data.document
        }));
      } else {
        console.error('Failed to fetch error details');
      }
    } catch (error) {
      console.error('Error fetching error details:', error);
    }
  };

  // ドキュメント処理を再実行
  const retryDocumentProcessing = async (documentId: string) => {
    try {
      const response = await fetch('/api/test/document-processing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentId })
      });

      if (response.ok) {
        const data = await response.json();
        showSuccess({ 
          title: '再処理完了',
          description: 'ドキュメント処理を再開始しました'
        });
        // 5秒後にステータスを更新
        setTimeout(() => {
          updateDocumentStatuses();
        }, 5000);
      } else {
        const errorData = await response.json();
        showError(errorData.error || '再処理に失敗しました');
      }
    } catch (error) {
      showError('再処理中にエラーが発生しました');
    }
  };

  // 部門一覧を取得
  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/settings/departments');
      if (response.ok) {
        const data = await response.json();
        setDepartments(data.departments || []);
      } else {
        showError('部門一覧の取得に失敗しました');
      }
    } catch (error) {
      showError('部門一覧の取得中にエラーが発生しました');
    }
  };

  // ファイルアップロード
  const handleFileUpload = async () => {
    if (!selectedFile || !selectedDepartment) {
      showError('ファイルと部門を選択してください');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('departmentId', selectedDepartment);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        showSuccess({ 
          title: 'アップロード完了',
          description: 'ファイルが正常にアップロードされました'
        });
        setSelectedFile(null);
        setSelectedDepartment('');
        fetchDocuments(); // 一覧を更新
      } else {
        const errorData = await response.json();
        showError(errorData.error || 'アップロードに失敗しました');
      }
    } catch (error) {
      showError('アップロード中にエラーが発生しました');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // ドキュメント削除
  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('このドキュメントを削除しますか？')) {
      return;
    }

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showSuccess({ 
          title: '削除完了',
          description: 'ドキュメントが削除されました'
        });
        fetchDocuments(); // 一覧を更新
      } else {
        showError('削除に失敗しました');
      }
    } catch (error) {
      showError('削除中にエラーが発生しました');
    }
  };

  // ファイルダウンロード
  const handleDownloadDocument = async (document: Document) => {
    try {
      const response = await fetch(`/api/documents/${document.id}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = window.document.createElement('a');
        a.href = url;
        a.download = document.fileName;
        window.document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        window.document.body.removeChild(a);
      } else {
        showError('ダウンロードに失敗しました');
      }
    } catch (error) {
      showError('ダウンロード中にエラーが発生しました');
    }
  };



  // ファイルサイズを人間が読みやすい形式に変換
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // ステータスバッジを取得
  const getStatusBadge = (status: Document['status']) => {
    switch (status) {
      case 'uploaded':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />アップロード済み</Badge>;
      case 'processing':
        return <Badge variant="outline" className="animate-pulse"><RefreshCw className="w-3 h-3 mr-1 animate-spin" />処理中</Badge>;
      case 'completed':
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />完了</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />エラー</Badge>;
      default:
        return <Badge variant="secondary">不明</Badge>;
    }
  };

  // 検索フィルター
  const filteredDocuments = documents.filter(doc =>
    doc.fileName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    fetchDocuments();
    fetchDepartments();
  }, []);

  // 定期的にステータスのみを更新（処理中のドキュメントのステータス変更を反映）
  useEffect(() => {
    const interval = setInterval(() => {
      updateDocumentStatuses();
    }, 5000); // 5秒ごとに更新

    return () => clearInterval(interval);
  }, []);

  // アップロード状態のデバッグ用
  useEffect(() => {
    console.log('Upload state changed:', { isUploading, uploadProgress });
  }, [isUploading, uploadProgress]);

  // メモ化されたテーブル行コンポーネント
  const DocumentRow = memo(({ 
    document, 
    onDownload, 
    onDelete 
  }: { 
    document: Document; 
    onDownload: (doc: Document) => void; 
    onDelete: (id: string) => void; 
  }) => {
    const { showError } = useGlobalMessageContext();
    
    const handleFileClick = async () => {
      if (document.status !== 'completed') return;
      
      try {
        const response = await fetch(`/api/documents/${document.id}/sas-url`);
        if (response.ok) {
          const data = await response.json();
          if (data.sasUrl) {
            window.open(data.sasUrl, '_blank');
          } else {
            showError('ファイルのURLを取得できませんでした');
          }
        } else {
          showError('ファイルの表示に失敗しました');
        }
      } catch (error) {
        showError('ファイルの表示中にエラーが発生しました');
      }
    };
    
    return (
    <TableRow key={document.id}>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <button
            onClick={handleFileClick}
            disabled={document.status !== 'completed'}
            className={`text-left hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded ${
              document.status === 'completed' 
                ? 'text-blue-600 hover:text-blue-800 cursor-pointer' 
                : 'text-gray-500 cursor-not-allowed'
            }`}
          >
            {document.fileName}
          </button>
        </div>
      </TableCell>
      <TableCell>{document.departmentName || '-'}</TableCell>
      <TableCell>{formatFileSize(document.fileSize)}</TableCell>
      <TableCell>
        {new Date(document.uploadedAt).toLocaleDateString('ja-JP')}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {getStatusBadge(document.status)}
          {document.status === 'error' && (
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fetchErrorDetails(document.id)}
                  className="h-6 px-2"
                >
                  <Bug className="w-3 h-3" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Bug className="w-5 h-5" />
                    エラー詳細 - {document.fileName}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {errorDetails[document.id] ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">ファイル名:</span> {errorDetails[document.id].fileName}
                        </div>
                        <div>
                          <span className="font-medium">ステータス:</span> {errorDetails[document.id].status}
                        </div>
                        <div>
                          <span className="font-medium">アップロード日時:</span> {new Date(errorDetails[document.id].uploadedAt).toLocaleString('ja-JP')}
                        </div>
                        <div>
                          <span className="font-medium">部門:</span> {errorDetails[document.id].departmentName || '不明'}
                        </div>
                        <div>
                          <span className="font-medium">ファイルサイズ:</span> {formatFileSize(errorDetails[document.id].fileSize)}
                        </div>
                        <div>
                          <span className="font-medium">ファイルタイプ:</span> {errorDetails[document.id].fileType}
                        </div>
                      </div>
                      
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          このドキュメントの処理中にエラーが発生しました。詳細はサーバーログを確認してください。
                        </AlertDescription>
                      </Alert>
                      
                      <div className="flex gap-2">
                        <Button
                          onClick={() => retryDocumentProcessing(document.id)}
                          className="flex items-center gap-2"
                        >
                          <TestTube className="w-4 h-4" />
                          再処理を実行
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                      <p className="mt-2 text-muted-foreground">エラー詳細を読み込み中...</p>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDownload(document)}
            disabled={document.status !== 'completed'}
          >
            <Download className="w-4 h-4" />
          </Button>

          <Button
            size="sm"
            variant="destructive"
            onClick={() => onDelete(document.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
    );
  });

  DocumentRow.displayName = 'DocumentRow';

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
    <div className="container mx-auto max-w-6xl p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">ドキュメント管理</h1>
        <p className="text-muted-foreground">
          各種サービスからのドキュメント管理を行います
        </p>
      </div>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            ファイルアップロード
          </TabsTrigger>
          <TabsTrigger value="dropbox" className="flex items-center gap-2">
            <Cloud className="w-4 h-4" />
            Dropbox
          </TabsTrigger>
          <TabsTrigger value="sharepoint" className="flex items-center gap-2">
            <Share2 className="w-4 h-4" />
            SharePoint
          </TabsTrigger>
          <TabsTrigger value="kintone" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            kintone
          </TabsTrigger>
          <TabsTrigger value="garoon" className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            Garoon
          </TabsTrigger>
        </TabsList>

        {/* ファイルアップロードタブ */}
        <TabsContent value="upload" className="space-y-6">
          {/* ファイルアップロードセクション */}
          <Card>
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
                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="部門を選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">ファイル選択 *</label>
                  <Input
                    type="file"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    accept=".pdf,.doc,.docx,.txt,.xlsx,.xls,.pptx,.ppt,.jpg,.jpeg,.png,.gif,.webp,.json,.xml"
                    className="mt-1"
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={handleFileUpload}
                    disabled={!selectedFile || !selectedDepartment || isUploading}
                    className="flex items-center gap-2 w-full"
                    title={isUploading ? 'アップロード処理中...' : 'ファイルをアップロード'}
                  >
                    {isUploading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        アップロード中...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        アップロード
                      </>
                    )}
                  </Button>
                </div>
                {isUploading && (
                  <div className="mt-2">
                    <Progress value={uploadProgress} className="w-full" />
                    <p className="text-xs text-muted-foreground mt-1">
                      ファイルをアップロード中... Document Intelligence処理は非同期で実行されます
                    </p>
                    <p className="text-xs text-muted-foreground">
                      プログレス: {uploadProgress}% | 状態: {isUploading ? 'アップロード中' : '完了'}
                    </p>
                  </div>
                )}
              </div>
              {selectedFile && (
                <div className="text-sm text-muted-foreground">
                  選択されたファイル: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </div>
              )}
            </CardContent>
          </Card>

          {/* ドキュメント一覧セクション */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  アップロード済みドキュメント
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="ドキュメントを検索..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Button 
                    onClick={fetchDocuments}
                    disabled={isLoading}
                    variant="outline"
                    size="sm"
                  >
                    更新
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">読み込み中...</p>
                </div>
              ) : filteredDocuments.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {searchTerm ? '検索条件に一致するドキュメントが見つかりません' : 'アップロードされたドキュメントがありません'}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ファイル名</TableHead>
                      <TableHead>部門</TableHead>
                      <TableHead>サイズ</TableHead>
                      <TableHead>アップロード日時</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocuments.map((document) => (
                      <DocumentRow
                        key={document.id}
                        document={document}
                        onDownload={handleDownloadDocument}
                        onDelete={handleDeleteDocument}
                      />
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dropboxタブ */}
        <TabsContent value="dropbox">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="w-5 h-5" />
                Dropbox連携
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Cloud className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">準備中</h3>
                <p className="text-muted-foreground mb-4">
                  Dropboxとの連携機能は現在開発中です。
                </p>
                <p className="text-sm text-muted-foreground">
                  近日中にリリース予定です。
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SharePointタブ */}
        <TabsContent value="sharepoint">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="w-5 h-5" />
                SharePoint連携
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Share2 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">準備中</h3>
                <p className="text-muted-foreground mb-4">
                  SharePointとの連携機能は現在開発中です。
                </p>
                <p className="text-sm text-muted-foreground">
                  近日中にリリース予定です。
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* kintoneタブ */}
        <TabsContent value="kintone">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                kintone連携
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Database className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">準備中</h3>
                <p className="text-muted-foreground mb-4">
                  kintoneとの連携機能は現在開発中です。
                </p>
                <p className="text-sm text-muted-foreground">
                  近日中にリリース予定です。
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Garoonタブ */}
        <TabsContent value="garoon">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5" />
                Garoon連携
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <CalendarDays className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">準備中</h3>
                <p className="text-muted-foreground mb-4">
                  Garoonとの連携機能は現在開発中です。
                </p>
                <p className="text-sm text-muted-foreground">
                  近日中にリリース予定です。
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}; 