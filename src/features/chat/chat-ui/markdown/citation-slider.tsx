"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ExternalLink, FileText } from "lucide-react";

interface CitationSliderProps {
  index: number;
  name: string;
  id: string;
}

export function CitationSlider({ index, name, id }: CitationSliderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [sasUrl, setSasUrl] = useState<string>("");
  const [context, setContext] = useState<string>("");
  const [summary, setSummary] = useState<string>("");

  const openFileViewer = async () => {
    try {
      setIsLoading(true);
      setIsViewerOpen(true);
      
      // SAS URLを取得
      const response = await fetch(`/api/documents/${id}/sas-url`);
      
      if (!response.ok) {
        throw new Error('Failed to get SAS URL');
      }

      const data = await response.json();
      console.log('SAS URL data:', data);

      if (data.sasUrl) {
        setSasUrl(data.sasUrl);
        
        // 要約情報を設定
        if (data.summary) {
          setSummary(data.summary);
        } else {
          setSummary('要約情報が利用できません。');
        }
        
        // コンテキスト情報を設定（デバッグ用のContent）
        if (data.context) {
          setContext(data.context);
        } else {
          setContext('コンテキスト情報が利用できません。');
        }
      } else {
        throw new Error('SAS URL not found');
      }
      
    } catch (error) {
      console.error('Error opening file:', error);
      setSasUrl('');
      setContext('ファイル情報の取得に失敗しました');
      setSummary('要約情報の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const openInOfficeViewer = () => {
    if (sasUrl) {
      const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(sasUrl)}`;
      window.open(officeViewerUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
    }
  };

  return (
    <Sheet open={isViewerOpen} onOpenChange={setIsViewerOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={openFileViewer}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <FileText className="w-4 h-4" />
          <span className="text-xs">{name}</span>
          <span className="text-xs text-gray-500">({index})</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[600px] sm:w-[800px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {name}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          {isLoading ? (
            <div className="text-center p-4">読み込み中...</div>
          ) : (
            <>
              {/* ファイル情報 */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">ファイル情報</h4>
                <div className="text-sm space-y-1">
                  <div><span className="font-medium">ファイル名:</span> {name}</div>
                  <div><span className="font-medium">ID:</span> {id}</div>
                </div>
              </div>

              {/* AI要約 */}
              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-medium text-purple-800 mb-2">AI要約</h4>
                <div className="text-sm text-gray-700 leading-relaxed">
                  {summary}
                </div>
              </div>

              {/* 元のコンテキスト（折りたたみ可能） */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <details className="group">
                  <summary className="font-medium cursor-pointer hover:text-gray-600">
                    元のコンテキスト（クリックで展開）
                  </summary>
                  <div className="mt-2 text-sm text-gray-600 leading-relaxed max-h-40 overflow-y-auto">
                    {context}
                  </div>
                </details>
              </div>

              {/* アクションボタン */}
              {sasUrl && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">ファイルを開く</h4>
                  <div className="space-y-2">
                    <Button
                      onClick={openInOfficeViewer}
                      className="w-full flex items-center gap-2"
                      variant="outline"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Microsoft Office Online Viewerで開く
                    </Button>
                    <div className="text-xs text-gray-600">
                      SAS URL: {sasUrl.substring(0, 50)}...
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
