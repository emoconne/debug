"use client";

import { FC, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CitationItem {
  id: string;
  metadata: string; // 参考資料（ファイル名）
  pageContent: string; // 概要
  sasUrl?: string; // 参照URL（SAS URL）
  score?: number; // 類似度スコア
  deptName?: string; // 部門名
  documentId?: string; // ドキュメントID（原文取得用）
}

interface CitationPanelProps {
  citations: CitationItem[];
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  selectedCitation?: CitationItem | null;
}

export const CitationPanel: FC<CitationPanelProps> = ({
  citations,
  isOpen,
  onClose,
  className,
  selectedCitation
}) => {
  // Citationパネルが開くときにイベントを発火
  useEffect(() => {
    if (isOpen) {
      window.dispatchEvent(new CustomEvent('citation-panel-open', {
        detail: { isOpen: true }
      }));
    }
  }, [isOpen]);

  const handleOpenSasUrl = (sasUrl: string) => {
    window.open(sasUrl, '_blank');
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className={cn(
      "fixed right-0 top-0 h-full w-1/2 bg-background border-l shadow-lg z-50 flex flex-col",
      className
    )}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">参考資料</h2>
          {selectedCitation && (
            <Badge variant="secondary" className="ml-2">
              選択中
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* コンテンツ */}
      <div className="flex-1 p-4 overflow-y-auto">
        {selectedCitation ? (
          <div className="space-y-4">
            <Card className="border-l-4 border-l-primary">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium text-foreground">
                  {selectedCitation.metadata}
                </CardTitle>
                {selectedCitation.deptName && (
                  <Badge variant="outline" className="mt-1">
                    {selectedCitation.deptName}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-2">概要</h4>
                    <div className="text-sm text-muted-foreground leading-relaxed">
                      {selectedCitation.pageContent}
                    </div>
                  </div>
                  
                  {selectedCitation.sasUrl && (
                    <div>
                      <h4 className="text-sm font-medium text-foreground mb-2">参照URL</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenSasUrl(selectedCitation.sasUrl!)}
                        className="text-xs"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        原文を別タブで開く
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground">参考資料を選択してください</div>
          </div>
        )}
      </div>
    </div>
  );
};
