"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Mic, Send, X, Upload, HelpCircle } from "lucide-react";
import Link from "next/link";
import { getGpt, updateGpt, GptItem } from "@/features/gpt/gpt-service";
import { useRouter } from "next/navigation";

interface Message {
  id: string;
  type: "gpt" | "user";
  content: string;
  timestamp: Date;
}



export default function EditGptPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"create" | "configure">("create");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "gpt",
      content: "Hi! I'll help you build a new GPT. You can say something like, \"make a creative who helps generate visuals for new products\" or \"make a software engineer who helps format my code.\" What would you like to make?",
      timestamp: new Date()
    },
    {
      id: "2",
      type: "user",
      content: "天気予報を教えてくれる",
      timestamp: new Date()
    },
    {
      id: "3",
      type: "gpt",
      content: "このGPTの名前を決めましょう。提案としては「天気ナビ」はどうでしょうか?それとも別の名前にしたいですか?",
      timestamp: new Date()
    }
  ]);
  
  const [inputMessage, setInputMessage] = useState("");
  const [gptData, setGptData] = useState<GptItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newStarter, setNewStarter] = useState("");

  useEffect(() => {
    loadGptData();
  }, [params.id]);

  const loadGptData = async () => {
    try {
      setLoading(true);
      const data = await getGpt(params.id);
      setGptData(data);
    } catch (error) {
      console.error("GPTデータ読み込みエラー:", error);
      alert("GPTデータの読み込みに失敗しました");
      router.push("/gpt");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      const newMessage: Message = {
        id: Date.now().toString(),
        type: "user",
        content: inputMessage,
        timestamp: new Date()
      };
      setMessages([...messages, newMessage]);
      setInputMessage("");
      
      // GPTの応答をシミュレート
      setTimeout(() => {
        const gptResponse: Message = {
          id: (Date.now() + 1).toString(),
          type: "gpt",
          content: "ありがとうございます。GPTの設定を更新しました。",
          timestamp: new Date()
        };
        setMessages(prev => [...prev, gptResponse]);
      }, 1000);
    }
  };

  const addConversationStarter = () => {
    if (newStarter.trim() && gptData) {
      setGptData({
        ...gptData,
        conversationStarters: [...gptData.conversationStarters, newStarter.trim()]
      });
      setNewStarter("");
    }
  };

  const removeConversationStarter = (index: number) => {
    if (gptData) {
      setGptData({
        ...gptData,
        conversationStarters: gptData.conversationStarters.filter((_, i) => i !== index)
      });
    }
  };

  const updateConversationStarter = (index: number, value: string) => {
    if (gptData) {
      setGptData({
        ...gptData,
        conversationStarters: gptData.conversationStarters.map((starter, i) => 
          i === index ? value : starter
        )
      });
    }
  };

  const handleSaveGpt = async () => {
    if (!gptData) return;
    
    try {
      setSaving(true);
      await updateGpt({
        id: gptData.id,
        name: gptData.name,
        description: gptData.description,
        instructions: gptData.instructions,
        conversationStarters: gptData.conversationStarters
      });
      router.push("/gpt");
    } catch (error) {
      console.error("GPT更新エラー:", error);
      alert("GPTの更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (!gptData) {
    return (
      <div className="min-h-screen bg-white">
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">GPTが見つかりません</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* ヘッダー */}
      <div className="border-b p-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/gpt">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div className="w-8 h-8 rounded-full bg-gray-200"></div>
          <div>
            <h1 className="text-lg font-semibold">{gptData.name}</h1>
            <p className="text-sm text-gray-500">● 下書き</p>
          </div>
        </div>
        
        {/* タブ */}
        <div className="flex gap-2 mt-4">
          <Button
            variant={activeTab === "create" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("create")}
          >
            作成する
          </Button>
          <Button
            variant={activeTab === "configure" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("configure")}
          >
            構成
          </Button>
        </div>
      </div>

      {activeTab === "create" ? (
        <div className="flex flex-col h-[calc(100vh-120px)]">
          {/* チャットエリア */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.type === "user"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
          </div>

          {/* 入力エリア */}
          <div className="border-t p-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">
                <Plus className="w-4 h-4" />
              </Button>
              <Input
                placeholder="質問してみましょう"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                className="flex-1"
              />
              <Button variant="ghost" size="sm">
                <Mic className="w-4 h-4" />
              </Button>
              <Button size="sm" onClick={handleSendMessage}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 space-y-6">
          {/* GPTアイコン */}
          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
          </div>

          {/* 名前 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">名前</label>
            <Input
              placeholder="GPT に名前を付けてください"
              value={gptData.name}
              onChange={(e) => setGptData({ ...gptData, name: e.target.value })}
            />
          </div>

          {/* 説明 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">説明</label>
            <Input
              value={gptData.description}
              onChange={(e) => setGptData({ ...gptData, description: e.target.value })}
            />
          </div>

          {/* 指示 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">指示</label>
            <div className="relative">
              <Textarea
                value={gptData.instructions}
                onChange={(e) => setGptData({ ...gptData, instructions: e.target.value })}
                rows={10}
                className="resize-none"
              />
              <Button variant="ghost" size="sm" className="absolute bottom-2 right-2">
                <HelpCircle className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              GPT との会話に、指定された指示の一部または全部が含まれる場合があります。
            </p>
          </div>

          {/* 会話のきっかけ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">会話のきっかけ</label>
            <div className="space-y-2">
              {gptData.conversationStarters.map((starter, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={starter}
                    onChange={(e) => updateConversationStarter(index, e.target.value)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeConversationStarter(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <Input
                  placeholder="新しい会話のきっかけを追加"
                  value={newStarter}
                  onChange={(e) => setNewStarter(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && addConversationStarter()}
                />
                <Button variant="ghost" size="sm" onClick={addConversationStarter}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* 知識 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">知識</label>
            <p className="text-xs text-gray-500 mb-2">
              GPT との会話に、アップロードしたファイルの一部または全部が表示される場合があります。
            </p>
            <Button variant="outline" className="w-full">
              <Upload className="w-4 h-4 mr-2" />
              ファイルをアップロードする
            </Button>
          </div>

          {/* 推奨モデル */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
              推奨モデル
              <HelpCircle className="w-4 h-4" />
            </label>
            <p className="text-xs text-gray-500 mb-2">
              ユーザーにモデルを推奨します。これは、最良の結果を得るためにデフォルトで使用されます。
            </p>
            <select className="w-full p-2 border border-gray-300 rounded-md" aria-label="推奨モデル選択">
              <option>推奨モデルを使用しない - ユーザーは希望するモデルを使用します</option>
            </select>
          </div>

          {/* 機能 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">機能</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked />
                <span>ウェブ検索</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked />
                <span>Canvas</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked />
                <span>画像生成</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" />
                <span>コード インタープリターとデータ分析</span>
                <HelpCircle className="w-4 h-4" />
              </label>
            </div>
          </div>

          {/* アクション */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">アクション</label>
            <Button variant="outline" className="w-full">
              新しいアクションを作成する
            </Button>
          </div>

          {/* 保存ボタン */}
          <div className="pt-6 border-t">
            <Button 
              onClick={handleSaveGpt} 
              disabled={saving}
              className="w-full"
            >
              {saving ? "保存中..." : "GPTを更新"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
