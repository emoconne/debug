"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TestTube, 
  Database, 
  FileText, 
  Cloud,
  Settings,
  Activity
} from "lucide-react";
import Link from "next/link";

export const TestPage = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <TestTube className="w-6 h-6" />
        <h1 className="text-2xl font-bold">テストメニュー</h1>
      </div>

      <Tabs defaultValue="azure-services" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="azure-services" className="flex items-center gap-2">
            <Cloud className="w-4 h-4" />
            Azure サービス
          </TabsTrigger>
          <TabsTrigger value="document-intelligence" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Document Intelligence
          </TabsTrigger>
          <TabsTrigger value="database" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            データベース
          </TabsTrigger>
        </TabsList>

        <TabsContent value="azure-services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="w-5 h-5" />
                Azure サービステスト
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Azure OpenAI</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Azure OpenAI の接続と動作をテストします
                    </p>
                    <Button asChild>
                      <Link href="/api/test/azure-openai-debug" target="_blank">
                        <Activity className="w-4 h-4 mr-2" />
                        OpenAI テスト
                      </Link>
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Bing Search</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Bing Search の動作をテストします
                    </p>
                    <Button asChild>
                      <Link href="/api/test/bing-search-debug" target="_blank">
                        <Activity className="w-4 h-4 mr-2" />
                        Bing Search テスト
                      </Link>
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Blob Storage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Azure Blob Storage の動作をテストします
                    </p>
                    <Button asChild>
                      <Link href="/api/test/blob-files" target="_blank">
                        <Activity className="w-4 h-4 mr-2" />
                        Blob Storage テスト
                      </Link>
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">AI Search</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Azure AI Search の動作をテストします
                    </p>
                    <Button asChild>
                      <Link href="/api/test/azure-search-debug" target="_blank">
                        <Activity className="w-4 h-4 mr-2" />
                        AI Search テスト
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="document-intelligence" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Document Intelligence テスト
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">文書処理テスト</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Document Intelligence の文書処理機能をテストします
                    </p>
                    <Button asChild>
                      <Link href="/api/test/document-processing" target="_blank">
                        <Activity className="w-4 h-4 mr-2" />
                        文書処理テスト
                      </Link>
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">完全処理テスト</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Document Intelligence の完全な処理フローをテストします
                    </p>
                    <Button asChild>
                      <Link href="/api/test/document-processing-full" target="_blank">
                        <Activity className="w-4 h-4 mr-2" />
                        完全処理テスト
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                データベーステスト
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Azure サービス テスト</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Azure サービスの接続と基本操作をテストします
                    </p>
                    <Button asChild>
                      <Link href="/api/test/azure-services" target="_blank">
                        <Activity className="w-4 h-4 mr-2" />
                        Azure サービス テスト
                      </Link>
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">インデックス作成テスト</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      AI Search インデックスの作成をテストします
                    </p>
                    <Button asChild>
                      <Link href="/api/test/index-creation" target="_blank">
                        <Activity className="w-4 h-4 mr-2" />
                        インデックス作成テスト
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
