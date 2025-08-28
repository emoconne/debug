"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Download, FileText, FileImage, FileVideo, FileAudio, FileSpreadsheet, Presentation } from 'lucide-react';
import dynamic from 'next/dynamic';

// react-pdfを動的インポート（SSRを無効化）
const PDFViewer = dynamic(() => import('react-pdf').then(mod => ({ default: mod.Document })), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-8">PDFを読み込み中...</div>
});

const PDFPage = dynamic(() => import('react-pdf').then(mod => ({ default: mod.Page })), {
  ssr: false
});

// PDF.jsワーカーの設定（SSR対応）
let pdfjs: any;
if (typeof window !== 'undefined') {
  pdfjs = require('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
}

// react-pdfのCSSを動的にインポート
const loadReactPdfCSS = async () => {
  if (typeof window === 'undefined') return; // SSR時は実行しない
  
  try {
    // CSSファイルを直接読み込み
    const link1 = document.createElement('link');
    link1.rel = 'stylesheet';
    link1.href = 'https://unpkg.com/react-pdf@10.1.0/dist/esm/Page/AnnotationLayer.css';
    document.head.appendChild(link1);

    const link2 = document.createElement('link');
    link2.rel = 'stylesheet';
    link2.href = 'https://unpkg.com/react-pdf@10.1.0/dist/esm/Page/TextLayer.css';
    document.head.appendChild(link2);
  } catch (error) {
    console.warn('react-pdf CSSの読み込みに失敗しました:', error);
  }
};

interface ViewerData {
  fileName: string;
  fileType: string;
  content: string;
}

interface ViewerProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

interface OfficeDocumentContent {
  html?: string;
  text?: string;
  tables?: any[];
}

export default function DocumentViewer({ searchParams }: ViewerProps) {
  const [viewerData, setViewerData] = useState<ViewerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [officeContent, setOfficeContent] = useState<OfficeDocumentContent | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);

  useEffect(() => {
    // react-pdfのCSSを読み込み
    loadReactPdfCSS();

    // URLパラメータからdocumentIdを取得（非同期）
    const getDocumentId = async () => {
      try {
        const params = await searchParams;
        const docId = params.documentId as string;
        setDocumentId(docId);
        
        console.log('Viewer: Checking URL params for documentId:', docId);

        if (docId) {
          // APIからファイル情報を取得
          const response = await fetch(`/api/documents/${docId}/viewer`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const data = await response.json();
          console.log('Viewer: API data received:', {
            fileName: data.fileName,
            fileType: data.fileType,
            contentLength: data.content?.length
          });
          setViewerData(data);

          // PDFファイルの場合はBlob URLを作成
          if (data.fileType === 'application/pdf') {
            try {
              console.log('Processing PDF data:', {
                contentLength: data.content.length,
                contentPreview: data.content.substring(0, 100)
              });
              
              // Base64デコード
              const binaryString = atob(data.content);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              
              console.log('PDF binary data created:', {
                bytesLength: bytes.length,
                firstBytes: Array.from(bytes.slice(0, 10))
              });
              
              const blob = new Blob([bytes], { type: 'application/pdf' });
              const url = URL.createObjectURL(blob);
              console.log('PDF Blob URL created:', url);
              setPdfUrl(url);
            } catch (error) {
              console.error('PDF Blob creation error:', error);
              setViewerData(null);
            }
          }

          // オフィス文書の場合は内容を解析
          if (data.fileType.includes('wordprocessingml') ||
              data.fileType.includes('spreadsheetml') ||
              data.fileType.includes('presentationml')) {
            processOfficeDocument(data.content, data.fileType);
          }
        } else {
          console.log('Viewer: No documentId found in URL params');
          setViewerData(null);
        }
      } catch (error) {
        console.error('Viewer API error:', error);
        setViewerData(null);
      } finally {
        setIsLoading(false);
      }
    };

    getDocumentId();
  }, [searchParams]);

  const processOfficeDocument = async (content: string, fileType: string) => {
    try {
      // コンテンツをArrayBufferに変換
      let arrayBuffer: ArrayBuffer;
      if (typeof content === 'string') {
        // Base64エンコードされている場合はデコード
        if (content.startsWith('data:')) {
          // Data URLの場合はBase64部分を抽出
          const base64 = content.split(',')[1];
          const binaryString = atob(base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          arrayBuffer = bytes.buffer;
        } else {
          // Base64文字列の場合はデコード
          const binaryString = atob(content);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          arrayBuffer = bytes.buffer;
        }
      } else {
        arrayBuffer = content;
      }

      if (fileType.includes('wordprocessingml')) {
        // DOCXファイルの処理
        const mammoth = await import('mammoth');
        const result = await mammoth.default.convertToHtml({ arrayBuffer: arrayBuffer as ArrayBuffer });
        setOfficeContent({ html: result.value });
      } else if (fileType.includes('spreadsheetml')) {
        // XLSXファイルの処理
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(arrayBuffer as ArrayBuffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        setOfficeContent({ tables: jsonData });
      } else if (fileType.includes('presentationml')) {
        // PPTXファイルの処理（簡易表示）
        setOfficeContent({ text: 'PowerPointファイルは現在テキスト形式で表示されます。' });
      }
    } catch (error) {
      console.error('Office document processing error:', error);
      setOfficeContent({ text: 'オフィス文書の処理中にエラーが発生しました。' });
    }
  };

  const handleClose = () => {
    // PDF URLをクリーンアップ
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
    }
    window.close();
  };

  const handleDownload = () => {
    if (!viewerData) return;
    
    const blob = new Blob([viewerData.content], { type: viewerData.fileType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = viewerData.fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    console.log('PDF loaded successfully:', { numPages });
    setNumPages(numPages);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF load error:', error);
    setViewerData(null);
  };

  const changePage = (offset: number) => {
    setPageNumber(prevPageNumber => prevPageNumber + offset);
  };

  const previousPage = () => {
    changePage(-1);
  };

  const nextPage = () => {
    changePage(1);
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <FileImage className="w-5 h-5" />;
    if (fileType.startsWith('video/')) return <FileVideo className="w-5 h-5" />;
    if (fileType.startsWith('audio/')) return <FileAudio className="w-5 h-5" />;
    if (fileType.includes('spreadsheetml')) return <FileSpreadsheet className="w-5 h-5" />;
    if (fileType.includes('presentationml')) return <Presentation className="w-5 h-5" />;
    return <FileText className="w-5 h-5" />;
  };

  const renderContent = () => {
    if (!viewerData) return null;

    // PDFファイルの場合
    if (viewerData.fileType === 'application/pdf' && pdfUrl) {
      return (
        <div className="flex flex-col items-center">
          <PDFViewer
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            className="max-w-full"
            error="PDFファイルの読み込みに失敗しました"
            loading="PDFを読み込み中..."
          >
            <PDFPage
              pageNumber={pageNumber}
              width={Math.min(window.innerWidth * 0.8, 800)}
              className="shadow-lg"
            />
          </PDFViewer>
          
          {numPages && (
            <div className="flex items-center justify-center gap-4 mt-4">
              <Button
                onClick={previousPage}
                disabled={pageNumber <= 1}
                variant="outline"
                size="sm"
              >
                前のページ
              </Button>
              <span className="text-sm">
                ページ {pageNumber} / {numPages}
              </span>
              <Button
                onClick={nextPage}
                disabled={pageNumber >= numPages}
                variant="outline"
                size="sm"
              >
                次のページ
              </Button>
            </div>
          )}
        </div>
      );
    }

    // オフィス文書の場合
    if (officeContent) {
      if (officeContent.html) {
        return (
          <div className="prose max-w-none">
            <div 
              dangerouslySetInnerHTML={{ __html: officeContent.html }} 
              className="bg-white p-6 rounded-lg border"
            />
          </div>
        );
      }
      
      if (officeContent.tables) {
        return (
          <div className="overflow-auto">
            <table className="min-w-full border-collapse border border-gray-300">
              <tbody>
                {officeContent.tables.map((row: any[], rowIndex: number) => (
                  <tr key={rowIndex}>
                    {row.map((cell: any, cellIndex: number) => (
                      <td key={cellIndex} className="border border-gray-300 px-3 py-2">
                        {cell || ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      
      if (officeContent.text) {
        return (
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm">{officeContent.text}</p>
          </div>
        );
      }
    }

    // テキストファイルの場合
    if (viewerData.fileType.startsWith('text/') || 
        viewerData.fileType === 'application/json' ||
        viewerData.fileType === 'application/xml') {
      return (
        <pre className="whitespace-pre-wrap text-sm font-mono bg-muted p-4 rounded-lg overflow-auto max-h-[70vh]">
          {viewerData.content}
        </pre>
      );
    }

    // その他のファイル形式
    return (
      <div className="text-center py-12">
        {getFileIcon(viewerData.fileType)}
        <p className="text-muted-foreground mt-4">
          このファイル形式はプレビューできません。<br />
          ダウンロードしてご確認ください。
        </p>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-8 h-8 mx-auto mb-4 animate-pulse" />
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!viewerData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-6 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">ファイルが見つかりません</h2>
            <p className="text-muted-foreground mb-4">
              ファイル情報が正しく取得できませんでした。
            </p>
            <Button onClick={handleClose}>
              <X className="w-4 h-4 mr-2" />
              閉じる
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <div className="border-b bg-card">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            {getFileIcon(viewerData.fileType)}
            <div>
              <h1 className="font-semibold">{viewerData.fileName}</h1>
              <p className="text-sm text-muted-foreground">{viewerData.fileType}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              ダウンロード
            </Button>
            <Button variant="outline" size="sm" onClick={handleClose}>
              <X className="w-4 h-4 mr-2" />
              閉じる
            </Button>
          </div>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            {renderContent()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
