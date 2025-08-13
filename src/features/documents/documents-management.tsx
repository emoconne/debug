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
  Eye,
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
  Calendar
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

  // 部門一覧を取得
  const fetchDepartments = async () => {
    try {
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
    }
  };

  // ファイルアップロード
  const handleFileUpload = async () => {
    if (!selectedFile) {
      showError('ファイルを選択してください');
      return;
    }

    if (!selectedDepartment) {
      showError('部門を選択してください');
      return;
    }

    let progressInterval: NodeJS.Timeout | null = null;

    try {
      setIsUploading(true);
      setUploadProgress(0);

      // プログレスバーのシミュレーション
      progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) return prev;
          return prev + 10;
        });
      }, 200);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('departmentId', selectedDepartment);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setUploadProgress(100);
        showSuccess('ファイルが正常にアップロードされました。Document Intelligence処理が開始されました。');
        setSelectedFile(null);
        setSelectedDepartment('');
        fetchDocuments(); // 一覧を更新
      } else {
        const errorData = await response.json();
        showError(errorData.message || 'アップロードに失敗しました');
      }
    } catch (error) {
      console.error('Upload error:', error);
      showError('アップロード中にエラーが発生しました');
    } finally {
      // プログレスバーのクリーンアップ
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      
      // アップロード状態のリセット
      setIsUploading(false);
      setUploadProgress(0);
      
      // 少し遅延を入れてからボタンを有効化（UIの安定性のため）
      setTimeout(() => {
        setIsUploading(false);
      }, 100);
    }
  };

  // ファイル削除
  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('このドキュメントを削除しますか？')) {
      return;
    }

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showSuccess('ドキュメントが削除されました');
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
        const a = document.createElement('a');
        a.href = url;
        a.download = document.fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
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
  }) => (
    <TableRow key={document.id}>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          {document.fileName}
        </div>
      </TableCell>
      <TableCell>{document.departmentName || '-'}</TableCell>
      <TableCell>{formatFileSize(document.fileSize)}</TableCell>
      <TableCell>
        {new Date(document.uploadedAt).toLocaleDateString('ja-JP')}
      </TableCell>
      <TableCell>
        {getStatusBadge(document.status)}
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
  ));

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
          部門別BLOBコンテナにアップロードされたドキュメントの管理を行います
        </p>
      </div>

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
                accept=".pdf,.doc,.docx,.txt,.xlsx,.xls"
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
    </div>
  );
}; 