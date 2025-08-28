"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Edit, MoreHorizontal, Lock, Cube } from "lucide-react";
import Link from "next/link";
import { getGpts, deleteGpt, GptItem } from "@/features/gpt/gpt-service";

export default function GptPage() {
  const [gpts, setGpts] = useState<GptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGpts();
  }, []);

  const loadGpts = async () => {
    try {
      setLoading(true);
      const data = await getGpts();
      setGpts(data);
    } catch (err) {
      setError("GPT一覧の読み込みに失敗しました");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGpt = async (id: string) => {
    try {
      await deleteGpt(id);
      setGpts(gpts.filter(gpt => gpt.id !== id));
    } catch (err) {
      setError("GPTの削除に失敗しました");
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={loadGpts}>再試行</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">マイ GPT</h1>
        
        {/* GPT作成セクション */}
        <div className="flex items-center gap-4 mb-8 p-4 border-b">
          <div className="w-12 h-12 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center">
            <Plus className="w-6 h-6 text-gray-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">GPT を作成する</h2>
            <p className="text-sm text-gray-600">Customize a version of ChatGPT for a specific purpose</p>
          </div>
          <Button asChild>
            <Link href="/gpt/create">GPT を作成する</Link>
          </Button>
        </div>

        {/* GPT一覧 */}
        <div className="space-y-4">
          {gpts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">まだGPTが作成されていません</p>
              <Button asChild>
                <Link href="/gpt/create">最初のGPTを作成する</Link>
              </Button>
            </div>
          ) : (
            gpts.map((gpt) => (
              <Card key={gpt.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <Cube className="w-5 h-5 text-gray-600" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{gpt.name}</span>
                        <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 text-gray-500">
                        <Lock className="w-4 h-4" />
                        <span className="text-sm">自分だけ</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/gpt/edit/${gpt.id}`}>
                            <Edit className="w-4 h-4" />
                          </Link>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteGpt(gpt.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
