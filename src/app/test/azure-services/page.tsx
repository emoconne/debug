"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MainMenu } from "@/features/main-menu/menu";
import { BlobViewer } from "@/components/blob-viewer";
import { 
  TestTube, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2,
  RefreshCw,
  FileText,
  Search,
  Settings,
  Info,
  Database,
  Plus,
  Trash2,
  Eye,
  Upload,
  Download,
  Globe
} from "lucide-react";

interface TestResult {
  timestamp: string;
  documentIntelligence: {
    config: {
      endpoint: string;
      hasKey: boolean;
      isConfigured: boolean;
    };
    connectionTest: {
      success: boolean;
      message: string;
      details?: any;
      error?: string;
    };
  };
  aiSearch: {
    connectionTest: {
      success: boolean;
      message: string;
      details?: any;
      error?: string;
    };
    indexCreationTest: {
      success: boolean;
      message: string;
      details?: any;
      error?: string;
    };
  };
  summary: {
    diConfigured: boolean;
    diConnected: boolean;
    searchConfigured: boolean;
    searchConnected: boolean;
    searchIndexCreated: boolean;
  };
}

export default function AzureServicesTestPage() {
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [containers, setContainers] = useState<string[]>([]);
  const [newContainerName, setNewContainerName] = useState("");
  const [containerLoading, setContainerLoading] = useState(false);
  const [indexTestResult, setIndexTestResult] = useState<any>(null);
  const [indexTestLoading, setIndexTestLoading] = useState(false);
  const [fullProcessingResult, setFullProcessingResult] = useState<any>(null);
  const [fullProcessingLoading, setFullProcessingLoading] = useState(false);
  
  // BLOBファイルViewerテスト用の状態
  const [blobFiles, setBlobFiles] = useState<any[]>([]);
  const [blobFilesLoading, setBlobFilesLoading] = useState(false);
  const [selectedBlobFile, setSelectedBlobFile] = useState<any>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [pdfViewerKey, setPdfViewerKey] = useState(0);
  
  // Bing検索テスト用の状態
  const [bingSearchQuery, setBingSearchQuery] = useState("今日の天気");
  const [bingSearchResult, setBingSearchResult] = useState<any>(null);
  const [bingSearchLoading, setBingSearchLoading] = useState(false);

  const runTests = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/test/azure-services');
      if (response.ok) {
        const result = await response.json();
        setTestResult(result);
      } else {
        console.error('Test failed:', response.statusText);
      }
    } catch (error) {
      console.error('Test error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testDocumentAnalysis = async () => {
    if (!selectedFile) {
      console.log('No file selected');
      return;
    }

    console.log('Starting document analysis test with file:', selectedFile.name);
    setIsLoading(true);
    try {
      // ファイルをBase64に変換
      const arrayBuffer = await selectedFile.arrayBuffer();
      const base64 = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(arrayBuffer))));
      console.log('File converted to base64, size:', base64.length);

      const response = await fetch('/api/test/azure-services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testType: 'documentAnalysis',
          fileData: base64
        })
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('Analysis result:', result);
        setAnalysisResult(result);
      } else {
        const errorData = await response.json();
        console.error('Analysis failed:', errorData);
        setAnalysisResult({
          testType: 'documentAnalysis',
          result: {
            success: false,
            message: errorData.error || '分析に失敗しました',
            error: errorData.error
          }
        });
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setAnalysisResult({
        testType: 'documentAnalysis',
        result: {
          success: false,
          message: '分析中にエラーが発生しました',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  // BLOBコンテナ管理関数
  const fetchContainers = async () => {
    setContainerLoading(true);
    try {
      const response = await fetch('/api/settings/containers');
      if (response.ok) {
        const data = await response.json();
        setContainers(data.containers || []);
      } else {
        console.error('Failed to fetch containers');
      }
    } catch (error) {
      console.error('Error fetching containers:', error);
    } finally {
      setContainerLoading(false);
    }
  };

  const createContainer = async () => {
    if (!newContainerName.trim()) return;
    
    setContainerLoading(true);
    try {
      const response = await fetch('/api/settings/containers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newContainerName.trim() })
      });

      if (response.ok) {
        setNewContainerName("");
        await fetchContainers();
      } else {
        console.error('Failed to create container');
      }
    } catch (error) {
      console.error('Error creating container:', error);
    } finally {
      setContainerLoading(false);
    }
  };

  const deleteContainer = async (containerName: string) => {
    setContainerLoading(true);
    try {
      const response = await fetch(`/api/settings/containers?name=${encodeURIComponent(containerName)}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchContainers();
      } else {
        console.error('Failed to delete container');
      }
    } catch (error) {
      console.error('Error deleting container:', error);
    } finally {
      setContainerLoading(false);
    }
  };

  // インデックス作成テスト
  const testIndexCreation = async () => {
    setIndexTestLoading(true);
    try {
      const response = await fetch('/api/test/index-creation');
      if (response.ok) {
        const result = await response.json();
        setIndexTestResult(result);
      } else {
        const errorData = await response.json();
        setIndexTestResult({
          success: false,
          message: errorData.error || 'インデックス作成テストに失敗しました'
        });
      }
    } catch (error) {
      console.error('Index creation test error:', error);
      setIndexTestResult({
        success: false,
        message: 'インデックス作成テスト中にエラーが発生しました'
      });
    } finally {
      setIndexTestLoading(false);
    }
  };

  // 完全なインデックス化処理テスト
  const testFullProcessing = async () => {
    if (!selectedFile) {
      console.log('No file selected for full processing test');
      return;
    }

    console.log('Starting full document processing test with file:', selectedFile.name);
    setFullProcessingLoading(true);
    try {
      // ファイルをBase64に変換
      const arrayBuffer = await selectedFile.arrayBuffer();
      const base64 = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(arrayBuffer))));
      console.log('File converted to base64 for full processing, size:', base64.length);

      const response = await fetch('/api/test/document-processing-full', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileData: base64,
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          fileSize: selectedFile.size,
          departmentName: 'Test Department'
        })
      });

      console.log('Full processing response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('Full processing result:', result);
        setFullProcessingResult(result);
      } else {
        const errorData = await response.json();
        console.error('Full processing failed:', errorData);
        setFullProcessingResult({
          success: false,
          message: errorData.error || '完全なインデックス化処理に失敗しました',
          error: errorData.error
        });
      }
    } catch (error) {
      console.error('Full processing error:', error);
      setFullProcessingResult({
        success: false,
        message: '完全なインデックス化処理中にエラーが発生しました',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setFullProcessingLoading(false);
    }
  };

  // BLOBファイルViewerテスト用の関数
  const fetchBlobFiles = async () => {
    setBlobFilesLoading(true);
    try {
      const response = await fetch('/api/test/blob-files?container=test');
      if (response.ok) {
        const data = await response.json();
        setBlobFiles(data.files || []);
      } else {
        console.error('Failed to fetch blob files');
      }
    } catch (error) {
      console.error('Error fetching blob files:', error);
    } finally {
      setBlobFilesLoading(false);
    }
  };

  const openBlobViewer = (file: any) => {
    setSelectedBlobFile(file);
    if (file.sasUrl) {
      // SAS URLを使用してViewerを開く
      setViewerUrl(file.sasUrl);
      // PDF Viewerのキーを更新して再レンダリング
      setPdfViewerKey(prev => prev + 1);
    } else {
      console.error('SAS URL not available for file:', file.name);
    }
  };

  const uploadToBlob = async () => {
    if (!uploadFile) return;
    
    setUploadLoading(true);
    try {
      console.log('Starting file upload process...');
      console.log('File details:', {
        name: uploadFile.name,
        type: uploadFile.type,
        size: uploadFile.size
      });

      // FormDataを使用してファイルをアップロード（ドキュメント管理と同じ方式）
      const formData = new FormData();
      formData.append('file', uploadFile);

      console.log('Sending upload request...');
      const response = await fetch('/api/test/blob-upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        setUploadResult({
          success: true,
          message: 'ファイルのアップロードが完了しました',
          documentId: result.documentId,
          blobName: result.blobName
        });
        // ファイル一覧を更新
        await fetchBlobFiles();
      } else {
        const errorData = await response.json();
        setUploadResult({
          success: false,
          message: errorData.error || 'ファイルのアップロードに失敗しました',
          error: errorData.error
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadResult({
        success: false,
        message: 'アップロード中にエラーが発生しました',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setUploadLoading(false);
    }
  };

  // Bing検索テスト
  const testBingSearch = async () => {
    if (!bingSearchQuery.trim()) {
      console.log('No search query provided');
      return;
    }

    setBingSearchLoading(true);
    try {
      console.log('Testing Bing search with query:', bingSearchQuery);

      const response = await fetch('/api/test/bing-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          searchQuery: bingSearchQuery
        })
      });

      if (response.ok) {
        const result = await response.json();
        setBingSearchResult(result);
      } else {
        const errorData = await response.json();
        setBingSearchResult({
          success: false,
          message: errorData.error || 'Bing検索テストに失敗しました',
          error: errorData.error
        });
      }
    } catch (error) {
      console.error('Bing search test error:', error);
      setBingSearchResult({
        success: false,
        message: 'Bing検索テスト中にエラーが発生しました',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setBingSearchLoading(false);
    }
  };

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="w-5 h-5 text-green-500" />
    ) : (
      <XCircle className="w-5 h-5 text-red-500" />
    );
  };

  const getStatusBadge = (success: boolean) => {
    return success ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3 mr-1" />
        成功
      </Badge>
    ) : (
      <Badge variant="destructive">
        <XCircle className="w-3 h-3 mr-1" />
        失敗
      </Badge>
    );
  };

  return (
    <div className="flex w-full h-full">
      <MainMenu />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <TestTube className="w-6 h-6 md:w-8 md:h-8" />
              Azure サービス設定テスト
            </h1>
            <Button 
              onClick={runTests} 
              disabled={isLoading}
              className="flex items-center gap-2 w-full sm:w-auto"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              テスト実行
            </Button>
          </div>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-5 mb-4 md:mb-6">
              <TabsTrigger value="overview" className="text-xs md:text-sm">概要</TabsTrigger>
              <TabsTrigger value="document-analysis" className="text-xs md:text-sm">ドキュメント分析</TabsTrigger>
              <TabsTrigger value="blob-management" className="text-xs md:text-sm">BLOB管理</TabsTrigger>
              <TabsTrigger value="blob-viewer" className="text-xs md:text-sm">BLOB Viewer</TabsTrigger>
              <TabsTrigger value="bing-search" className="text-xs md:text-sm">Bing検索</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
              {/* 概要 */}
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="w-5 h-5" />
                    テスト概要
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                    <div className="space-y-2">
                      <h3 className="font-semibold flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Document Intelligence
                      </h3>
                      <p className="text-sm text-gray-600">
                        Document Intelligenceの接続と設定をテストします。
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Search className="w-4 h-4" />
                        AI Search
                      </h3>
                      <p className="text-sm text-gray-600">
                        AI Searchの接続、インデックス存在確認、作成権限をテストします。
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Search className="w-4 h-4" />
                        Bing検索
                      </h3>
                      <p className="text-sm text-gray-600">
                        Azure AI Foundryを使用したBing検索、Webスクレイピング、LLM回答生成をテストします。
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* テスト結果 */}
              {testResult && (
                <div className="space-y-6">
                  {/* サマリー */}
                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle>テスト結果サマリー</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
                        <div className="text-center">
                          <div className="text-sm text-gray-600 mb-1">DI設定</div>
                          {getStatusBadge(testResult.summary.diConfigured)}
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-600 mb-1">DI接続</div>
                          {getStatusBadge(testResult.summary.diConnected)}
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-600 mb-1">Search設定</div>
                          {getStatusBadge(testResult.summary.searchConfigured)}
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-600 mb-1">Search接続</div>
                          {getStatusBadge(testResult.summary.searchConnected)}
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-600 mb-1">インデックス作成</div>
                          {getStatusBadge(testResult.summary.searchIndexCreated)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Document Intelligence詳細 */}
                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Document Intelligence
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* 設定情報 */}
                      <div>
                        <h4 className="font-semibold mb-2">設定情報</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          <div>エンドポイント: {testResult.documentIntelligence.config.endpoint}</div>
                          <div>キー設定: {testResult.documentIntelligence.config.hasKey ? "あり" : "なし"}</div>
                        </div>
                      </div>

                      {/* 接続テスト結果 */}
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          接続テスト
                          {getStatusIcon(testResult.documentIntelligence.connectionTest.success)}
                        </h4>
                        <Alert variant={testResult.documentIntelligence.connectionTest.success ? "default" : "destructive"}>
                          <AlertDescription>
                            {testResult.documentIntelligence.connectionTest.message}
                          </AlertDescription>
                        </Alert>
                        {testResult.documentIntelligence.connectionTest.error && (
                          <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-700">
                            {testResult.documentIntelligence.connectionTest.error}
                          </div>
                        )}
                        {testResult.documentIntelligence.connectionTest.details?.modelList && (
                          <div className="mt-2">
                            <div className="text-sm font-medium mb-1">利用可能なモデル:</div>
                            <div className="flex flex-wrap gap-1">
                              {testResult.documentIntelligence.connectionTest.details.modelList.map((model: string, index: number) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {model}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* AI Search詳細 */}
                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Search className="w-5 h-5" />
                        AI Search
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* 接続テスト結果 */}
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          接続テスト
                          {getStatusIcon(testResult.aiSearch.connectionTest.success)}
                        </h4>
                        <Alert variant={testResult.aiSearch.connectionTest.success ? "default" : "destructive"}>
                          <AlertDescription>
                            {testResult.aiSearch.connectionTest.message}
                          </AlertDescription>
                        </Alert>
                        {testResult.aiSearch.connectionTest.error && (
                          <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-700">
                            {testResult.aiSearch.connectionTest.error}
                          </div>
                        )}
                        {testResult.aiSearch.connectionTest.details && (
                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                            <div>エンドポイント: {testResult.aiSearch.connectionTest.details.endpoint}</div>
                            <div>インデックス名: {testResult.aiSearch.connectionTest.details.indexName}</div>
                            <div>キー設定: {testResult.aiSearch.connectionTest.details.hasKey ? "あり" : "なし"}</div>
                            <div>インデックス存在: {testResult.aiSearch.connectionTest.details.indexExists ? "あり" : "なし"}</div>
                          </div>
                        )}
                      </div>

                      {/* インデックス作成テスト結果 */}
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          インデックス作成テスト
                          {getStatusIcon(testResult.aiSearch.indexCreationTest.success)}
                        </h4>
                        <Alert variant={testResult.aiSearch.indexCreationTest.success ? "default" : "destructive"}>
                          <AlertDescription>
                            {testResult.aiSearch.indexCreationTest.message}
                          </AlertDescription>
                        </Alert>
                        {testResult.aiSearch.indexCreationTest.error && (
                          <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-700">
                            {testResult.aiSearch.indexCreationTest.error}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="document-analysis" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
                              {/* ドキュメント分析テスト */}
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      ドキュメント分析テスト
                    </CardTitle>
                  </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4">
                    <div className="flex-1 min-w-0">
                      <label htmlFor="document-file" className="block text-sm font-medium text-gray-700 mb-1">
                        ファイルを選択
                      </label>
                      <input
                        id="document-file"
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.tiff,.bmp"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        className="w-full"
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      <Button 
                        onClick={testDocumentAnalysis} 
                        disabled={!selectedFile || isLoading}
                        className="flex items-center gap-2"
                      >
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <TestTube className="w-4 h-4" />
                        )}
                        分析テスト
                      </Button>
                      <Button 
                        onClick={testFullProcessing} 
                        disabled={!selectedFile || fullProcessingLoading}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        {fullProcessingLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                        完全インデックス化テスト
                      </Button>
                    </div>
                  </div>
                  
                  {analysisResult && (
                    <div className="mt-4">
                      <h4 className="font-semibold mb-2">分析結果</h4>
                      <Alert variant={analysisResult.result.success ? "default" : "destructive"}>
                        <AlertDescription>
                          {analysisResult.result.message}
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}
                  
                  {fullProcessingResult && (
                    <div className="mt-4">
                      <h4 className="font-semibold mb-2">完全インデックス化結果</h4>
                      <Alert variant={fullProcessingResult.success ? "default" : "destructive"}>
                        <AlertDescription>
                          {fullProcessingResult.message}
                        </AlertDescription>
                      </Alert>
                      {fullProcessingResult.documentId && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                          <div>ドキュメントID: {fullProcessingResult.documentId}</div>
                          <div>ファイル名: {fullProcessingResult.fileName}</div>
                          <div>部門: {fullProcessingResult.departmentName}</div>
                          <div>ステータス: {fullProcessingResult.status}</div>
                        </div>
                      )}
                      {fullProcessingResult.error && (
                        <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-700">
                          エラー詳細: {fullProcessingResult.error}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="blob-management" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
              {/* BLOBコンテナ管理 */}
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    BLOBコンテナ管理
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* コンテナ一覧 */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold">コンテナ一覧</h4>
                      <Button 
                        onClick={fetchContainers} 
                        disabled={containerLoading}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        {containerLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                        更新
                      </Button>
                    </div>
                    
                    {containers.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        コンテナがありません
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {containers.map((container, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <span className="font-mono text-sm">{container}</span>
                            <Button
                              onClick={() => deleteContainer(container)}
                              disabled={containerLoading}
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 新規コンテナ作成 */}
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-3">新規コンテナ作成</h4>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={newContainerName}
                        onChange={(e) => setNewContainerName(e.target.value)}
                        placeholder="コンテナ名を入力"
                        className="flex-1 px-3 py-2 border rounded-md"
                        onKeyPress={(e) => e.key === 'Enter' && createContainer()}
                      />
                      <Button 
                        onClick={createContainer} 
                        disabled={!newContainerName.trim() || containerLoading}
                        className="flex items-center gap-2"
                      >
                        {containerLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                        作成
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* AI Searchインデックス作成テスト */}
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="w-5 h-5" />
                    AI Searchインデックス作成テスト
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      AI Searchのインデックス作成と設定をテストします
                    </p>
                    <Button 
                      onClick={testIndexCreation} 
                      disabled={indexTestLoading}
                      className="flex items-center gap-2"
                    >
                      {indexTestLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <TestTube className="w-4 h-4" />
                      )}
                      インデックス作成テスト
                    </Button>
                  </div>
                  
                  {indexTestResult && (
                    <div className="mt-4">
                      <Alert variant={indexTestResult.success ? "default" : "destructive"}>
                        <AlertDescription>
                          {indexTestResult.message}
                        </AlertDescription>
                      </Alert>
                      
                      {indexTestResult.config && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-md">
                          <h4 className="font-semibold mb-2">設定状況:</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>エンドポイント: {indexTestResult.config.endpoint}</div>
                            <div>キー: {indexTestResult.config.key}</div>
                            <div>インデックス名: {indexTestResult.config.indexName}</div>
                            <div>APIバージョン: {indexTestResult.config.apiVersion}</div>
                          </div>
                        </div>
                      )}
                      
                      {indexTestResult.error && (
                        <div className="mt-3 p-3 bg-red-50 rounded-md">
                          <h4 className="font-semibold mb-2 text-red-800">エラー詳細:</h4>
                          <p className="text-sm text-red-700">{indexTestResult.error}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* BLOB Viewerタブ */}
            <TabsContent value="blob-viewer" className="space-y-6 mt-6">
              {/* ファイルアップロード */}
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    ファイルアップロード
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4">
                    <div className="flex-1 min-w-0">
                      <label htmlFor="upload-file" className="block text-sm font-medium text-gray-700 mb-1">
                        アップロードするファイルを選択
                      </label>
                      <input
                        id="upload-file"
                        type="file"
                        accept=".pdf,.docx,.xlsx,.pptx,.doc,.ppt,.xls,.txt,.json,.xml,.jpg,.jpeg,.png,.gif,.webp"
                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                        className="w-full"
                      />
                    </div>
                    <Button 
                      onClick={uploadToBlob} 
                      disabled={!uploadFile || uploadLoading}
                      className="flex items-center gap-2 w-full sm:w-auto"
                    >
                      {uploadLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      アップロード
                    </Button>
                  </div>
                  
                  {uploadResult && (
                    <div className="mt-4">
                      <Alert variant={uploadResult.success ? "default" : "destructive"}>
                        <AlertDescription>
                          {uploadResult.message}
                        </AlertDescription>
                      </Alert>
                      {uploadResult.documentId && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                          <div>ドキュメントID: {uploadResult.documentId}</div>
                          <div>BLOB名: {uploadResult.blobName}</div>
                        </div>
                      )}
                      {uploadResult.error && (
                        <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-700">
                          エラー詳細: {uploadResult.error}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* BLOBファイル一覧 */}
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    BLOBファイル一覧
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      BLOBストレージに保存されているファイルを表示・閲覧できます
                    </p>
                    <Button 
                      onClick={fetchBlobFiles} 
                      disabled={blobFilesLoading}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      {blobFilesLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      更新
                    </Button>
                  </div>
                  
                  {blobFiles.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      ファイルがありません
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {blobFiles.map((file, index) => (
                        <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{file.name}</div>
                            <div className="text-sm text-gray-500">
                              {file.contentType} • {file.size} bytes • {new Date(file.lastModified).toLocaleString()}
                            </div>
                            {file.sasUrl && (
                              <div className="text-xs text-blue-600 mt-1 break-all">
                                SAS URL: {file.sasUrl}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                            <Button
                              onClick={() => openBlobViewer(file)}
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-2"
                              disabled={!file.sasUrl}
                            >
                              <Eye className="w-4 h-4" />
                              Viewer
                            </Button>
                            <Button
                              onClick={() => file.sasUrl && window.open(file.sasUrl, '_blank')}
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-2"
                              disabled={!file.sasUrl}
                            >
                              <Download className="w-4 h-4" />
                              ダウンロード
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* BLOB Viewer */}
              {viewerUrl && selectedBlobFile && (
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="w-5 h-5" />
                      BLOB Viewer
                      <span className="text-sm font-normal text-gray-500">
                        - {selectedBlobFile.name}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BlobViewer
                      key={pdfViewerKey}
                      url={viewerUrl}
                      fileName={selectedBlobFile.name}
                      fileType={selectedBlobFile.contentType}
                      onClose={() => {
                        setViewerUrl(null);
                        setSelectedBlobFile(null);
                      }}
                    />
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Bing検索タブ */}
            <TabsContent value="bing-search" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="w-5 h-5" />
                    Bing検索テスト
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">検索クエリ</label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={bingSearchQuery}
                        onChange={(e) => setBingSearchQuery(e.target.value)}
                        placeholder="検索クエリを入力してください"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <Button
                        onClick={testBingSearch}
                        disabled={bingSearchLoading || !bingSearchQuery.trim()}
                        className="flex items-center gap-2 w-full sm:w-auto"
                      >
                        {bingSearchLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                        検索テスト
                      </Button>
                    </div>
                  </div>

                  {/* 検索結果 */}
                  {bingSearchResult && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">検索結果</h4>
                        {getStatusIcon(bingSearchResult.success)}
                      </div>
                      
                      <Alert variant={bingSearchResult.success ? "default" : "destructive"}>
                        <AlertDescription>
                          {bingSearchResult.message}
                        </AlertDescription>
                      </Alert>

                      {bingSearchResult.success && bingSearchResult.results && (
                        <div className="space-y-3 md:space-y-4">
                          <div className="text-sm text-gray-600">
                            検索クエリ: "{bingSearchResult.searchQuery}" • 
                            結果数: {bingSearchResult.resultCount}件
                          </div>
                          
                          {/* Webスクレイピング結果 */}
                          {bingSearchResult.scrapedContents && bingSearchResult.scrapedContents.length > 0 && (
                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                              <h5 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                                <Globe className="w-4 h-4" />
                                Webスクレイピング結果 ({bingSearchResult.scrapedContents.filter((c: any) => c.success).length}件成功)
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                {bingSearchResult.scrapedContents.map((scrape: any, index: number) => (
                                  <div key={index} className={`p-3 rounded border ${scrape.success ? 'bg-white shadow-sm' : 'bg-red-50 border-red-200'}`}>
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm text-gray-800">
                                          {scrape.success ? scrape.title : 'スクレイピング失敗'}
                                        </div>
                                        <div className="text-xs text-blue-600 mt-1 break-all hover:underline cursor-pointer"
                                             onClick={() => window.open(scrape.url, '_blank')}>
                                          {scrape.url}
                                        </div>
                                        {scrape.success && (
                                          <div className="text-xs text-gray-600 mt-2 line-clamp-4">
                                            {scrape.content}
                                          </div>
                                        )}
                                        {!scrape.success && scrape.error && (
                                          <div className="text-xs text-red-600 mt-1">
                                            エラー: {scrape.error}
                                          </div>
                                        )}
                                      </div>
                                      <div className="ml-2 text-xs text-gray-400">
                                        #{index + 1}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* LLM回答 */}
                          {bingSearchResult.llmAnswer && (
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                              <h5 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                                <Search className="w-4 h-4" />
                                LLM回答
                              </h5>
                              <div className="text-sm text-gray-700 whitespace-pre-wrap">
                                {bingSearchResult.llmAnswer}
                              </div>
                            </div>
                          )}
                          
                          {/* 検索結果詳細 */}
                          <div>
                            <h5 className="font-semibold mb-2 flex items-center gap-2">
                              <Search className="w-4 h-4" />
                              検索結果詳細
                            </h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                              {bingSearchResult.results.map((result: any, index: number) => (
                                <div key={index} className="p-3 border rounded-lg hover:shadow-md transition-shadow">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium text-blue-600 hover:underline cursor-pointer text-sm line-clamp-2"
                                           onClick={() => window.open(result.url, '_blank')}>
                                        {result.name || 'タイトルなし'}
                                      </div>
                                      <div className="text-xs text-gray-600 mt-1 line-clamp-3">
                                        {result.snippet || '説明なし'}
                                      </div>
                                      <div className="text-xs text-gray-500 mt-1 break-all">
                                        {result.url}
                                      </div>
                                    </div>
                                    <div className="ml-2 text-xs text-gray-400">
                                      #{index + 1}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {bingSearchResult.error && (
                        <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-700">
                          <div className="font-medium">検索エラー詳細:</div>
                          <div>{bingSearchResult.error}</div>
                          {bingSearchResult.details && (
                            <div className="mt-1">
                              <div className="font-medium">詳細情報:</div>
                              <pre className="text-xs mt-1 overflow-auto">
                                {JSON.stringify(bingSearchResult.details, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}

                      {bingSearchResult.scrapingError && (
                        <div className="mt-2 p-2 bg-yellow-50 rounded text-sm text-yellow-700">
                          <div className="font-medium">Webスクレイピングエラー:</div>
                          <div>{bingSearchResult.scrapingError}</div>
                        </div>
                      )}

                      {bingSearchResult.llmError && (
                        <div className="mt-2 p-2 bg-orange-50 rounded text-sm text-orange-700">
                          <div className="font-medium">LLM回答生成エラー:</div>
                          <div>{bingSearchResult.llmError}</div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

