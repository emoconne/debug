"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, Monitor, FileText, Image, File } from 'lucide-react';

interface BlobViewerProps {
  url: string;
  fileName: string;
  fileType: string;
  onClose: () => void;
}

export function BlobViewer({ url, fileName, fileType, onClose }: BlobViewerProps) {
  const [useGoogleViewer, setUseGoogleViewer] = useState(false);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
  };

  const handleOpenInNewTab = () => {
    window.open(url, '_blank');
  };

  const handleOpenInOfficeViewer = () => {
    const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
    window.open(officeViewerUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
  };

  const handleOpenInGoogleViewer = () => {
    const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
    window.open(googleViewerUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
  };

  // ファイルタイプに基づいて表示方法を決定
  const getFileTypeInfo = () => {
    const officeTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/msword', // .doc
      'application/vnd.ms-powerpoint', // .ppt
      'application/vnd.ms-excel', // .xls
    ];

    const pdfTypes = [
      'application/pdf'
    ];

    const imageTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp'
    ];

    const textTypes = [
      'text/plain',
      'text/html',
      'text/css',
      'text/javascript',
      'application/json',
      'application/xml'
    ];

    if (officeTypes.includes(fileType)) {
      return {
        type: 'office',
        icon: <FileText className="w-6 h-6" />,
        description: 'Office文書',
        canView: true
      };
    } else if (pdfTypes.includes(fileType)) {
      return {
        type: 'pdf',
        icon: <FileText className="w-6 h-6" />,
        description: 'PDF文書',
        canView: true
      };
    } else if (imageTypes.includes(fileType)) {
      return {
        type: 'image',
        icon: <Image className="w-6 h-6" />,
        description: '画像ファイル',
        canView: true
      };
    } else if (textTypes.includes(fileType)) {
      return {
        type: 'text',
        icon: <FileText className="w-6 h-6" />,
        description: 'テキストファイル',
        canView: true
      };
    } else {
      return {
        type: 'other',
        icon: <File className="w-6 h-6" />,
        description: 'その他のファイル',
        canView: false
      };
    }
  };

  const fileInfo = getFileTypeInfo();
  const isOfficeDocument = fileInfo.type === 'office';

  return (
    <div className="space-y-6">
      {/* ファイル情報 */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="text-gray-600">
          {fileInfo.icon}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">{fileName}</h3>
          <p className="text-sm text-gray-600">{fileInfo.description}</p>
          <p className="text-xs text-gray-500">タイプ: {fileType}</p>
        </div>
      </div>

      {/* アクションボタン */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">ファイルの表示方法</h4>
          <Button
            onClick={onClose}
            variant="outline"
            size="sm"
          >
            閉じる
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ダウンロード */}
          <Button
            onClick={handleDownload}
            variant="outline"
            className="flex items-center gap-3 p-4 h-auto"
          >
            <Download className="w-5 h-5" />
            <div className="text-left">
              <div className="font-medium">ダウンロード</div>
              <div className="text-sm text-gray-600">ファイルをローカルに保存</div>
            </div>
          </Button>

          {/* 新しいタブで開く */}
          {fileInfo.canView && (
            <Button
              onClick={handleOpenInNewTab}
              variant="outline"
              className="flex items-center gap-3 p-4 h-auto"
            >
              <ExternalLink className="w-5 h-5" />
              <div className="text-left">
                <div className="font-medium">新しいタブで開く</div>
                <div className="text-sm text-gray-600">ブラウザで直接表示</div>
              </div>
            </Button>
          )}

          {/* Office文書の場合の特別なViewer */}
          {isOfficeDocument && (
            <>
              <Button
                onClick={handleOpenInOfficeViewer}
                variant="outline"
                className="flex items-center gap-3 p-4 h-auto"
              >
                <Monitor className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Microsoft Office Viewer</div>
                  <div className="text-sm text-gray-600">Office Onlineで表示</div>
                </div>
              </Button>

              <Button
                onClick={handleOpenInGoogleViewer}
                variant="outline"
                className="flex items-center gap-3 p-4 h-auto"
              >
                <Monitor className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Google Docs Viewer</div>
                  <div className="text-sm text-gray-600">Google Docsで表示</div>
                </div>
              </Button>
            </>
          )}
        </div>

        {/* ファイル情報 */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2">ファイル詳細</h4>
          <div className="text-sm space-y-1">
            <div><span className="font-medium">ファイル名:</span> {fileName}</div>
            <div><span className="font-medium">タイプ:</span> {fileType}</div>
            <div><span className="font-medium">SAS URL:</span> 
              <div className="mt-1 p-2 bg-white rounded border font-mono text-xs break-all">
                {url}
              </div>
            </div>
          </div>
        </div>

        {/* 注意事項 */}
        {isOfficeDocument && (
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">Office文書の表示について</h4>
            <div className="text-sm text-blue-700 space-y-1">
              <p>• Microsoft Office Online ViewerまたはGoogle Docs Viewerを使用して表示します</p>
              <p>• インターネット接続が必要です</p>
              <p>• 大きなファイルは表示に時間がかかる場合があります</p>
              <p>• プライバシーを重視する場合はダウンロードしてご確認ください</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
