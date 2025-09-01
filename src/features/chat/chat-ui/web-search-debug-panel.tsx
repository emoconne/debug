"use client";

import { FC, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Search, X, ChevronRight, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WebSearchDebugInfo {
  query: string;
  searchResults: Array<{
    name: string;
    snippet: string;
    url: string;
    sortOrder: number;
  }>;
  processedSnippet: string;
  bingResult: string;
  prompt: string;
  assistantResponse: string;
  timestamp: string;
}

interface WebSearchDebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
  debugInfo?: WebSearchDebugInfo;
  className?: string;
}

export const WebSearchDebugPanel: FC<WebSearchDebugPanelProps> = ({
  isOpen,
  onClose,
  debugInfo,
  className
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleExpanded = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const handleOpenUrl = (url: string) => {
    window.open(url, '_blank');
  };

  if (!isOpen || !debugInfo) {
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
          <Search className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Web検索デバッグ</h2>
          <Badge variant="secondary" className="ml-2">
            {debugInfo.searchResults.length}件
          </Badge>
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
        <div className="space-y-4">
          {/* 検索クエリ */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">検索クエリ</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleExpanded('query')}
                  className="h-6 w-6 p-0"
                >
                  <ChevronRight 
                    className={cn(
                      "h-3 w-3 transition-transform",
                      expandedSections.has('query') && "rotate-90"
                    )} 
                  />
                </Button>
              </div>
            </CardHeader>
            {expandedSections.has('query') && (
              <CardContent className="pt-0">
                <div className="text-sm text-muted-foreground">
                  {debugInfo.query}
                </div>
              </CardContent>
            )}
          </Card>

          {/* 検索結果 */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">検索結果（生データ）</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleExpanded('results')}
                  className="h-6 w-6 p-0"
                >
                  <ChevronRight 
                    className={cn(
                      "h-3 w-3 transition-transform",
                      expandedSections.has('results') && "rotate-90"
                    )} 
                  />
                </Button>
              </div>
            </CardHeader>
            {expandedSections.has('results') && (
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {debugInfo.searchResults.map((result, index) => (
                    <div key={index} className="border rounded p-3">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-sm font-medium">{result.name}</h4>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            #{result.sortOrder}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenUrl(result.url)}
                            className="h-6 w-6 p-0"
                            title="URLを開く"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {result.snippet}
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        {result.url}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>

          {/* 処理済みスニペット */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">処理済みスニペット</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleExpanded('snippet')}
                  className="h-6 w-6 p-0"
                >
                  <ChevronRight 
                    className={cn(
                      "h-3 w-3 transition-transform",
                      expandedSections.has('snippet') && "rotate-90"
                    )} 
                  />
                </Button>
              </div>
            </CardHeader>
            {expandedSections.has('snippet') && (
              <CardContent className="pt-0">
                <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {debugInfo.processedSnippet}
                </div>
              </CardContent>
            )}
          </Card>

          {/* BingResult */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">BingResult</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleExpanded('bingResult')}
                  className="h-6 w-6 p-0"
                >
                  <ChevronRight 
                    className={cn(
                      "h-3 w-3 transition-transform",
                      expandedSections.has('bingResult') && "rotate-90"
                    )} 
                  />
                </Button>
              </div>
            </CardHeader>
            {expandedSections.has('bingResult') && (
              <CardContent className="pt-0">
                <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {debugInfo.bingResult}
                </div>
              </CardContent>
            )}
          </Card>

          {/* プロンプト */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Assistantへのプロンプト</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleExpanded('prompt')}
                  className="h-6 w-6 p-0"
                >
                  <ChevronRight 
                    className={cn(
                      "h-3 w-3 transition-transform",
                      expandedSections.has('prompt') && "rotate-90"
                    )} 
                  />
                </Button>
              </div>
            </CardHeader>
            {expandedSections.has('prompt') && (
              <CardContent className="pt-0">
                <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {debugInfo.prompt}
                </div>
              </CardContent>
            )}
          </Card>

          {/* Assistant回答 */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Assistant回答</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleExpanded('response')}
                  className="h-6 w-6 p-0"
                >
                  <ChevronRight 
                    className={cn(
                      "h-3 w-3 transition-transform",
                      expandedSections.has('response') && "rotate-90"
                    )} 
                  />
                </Button>
              </div>
            </CardHeader>
            {expandedSections.has('response') && (
              <CardContent className="pt-0">
                <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {debugInfo.assistantResponse}
                </div>
              </CardContent>
            )}
          </Card>

          {/* 差異分析 */}
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <CardTitle className="text-sm text-orange-800">差異分析</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-sm text-orange-700 space-y-2">
                <div>
                  <strong>検索結果数:</strong> {debugInfo.searchResults.length}件
                </div>
                <div>
                  <strong>処理済みスニペット長:</strong> {debugInfo.processedSnippet.length}文字
                </div>
                <div>
                  <strong>BingResult長:</strong> {debugInfo.bingResult.length}文字
                </div>
                <div>
                  <strong>プロンプト長:</strong> {debugInfo.prompt.length}文字
                </div>
                <div>
                  <strong>回答長:</strong> {debugInfo.assistantResponse.length}文字
                </div>
                <div>
                  <strong>タイムスタンプ:</strong> {debugInfo.timestamp}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
