"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Save, RefreshCw } from "lucide-react";
import { useGlobalMessageContext } from "@/features/global-message/global-message-context";

interface DropboxAppConfig {
  id: string;
  appKey: string;
  appSecret: string;
  createdAt: Date;
  updatedAt: Date;
}

export const DropboxAppConfig = () => {
  const { showSuccess, showError } = useGlobalMessageContext();
  const [config, setConfig] = useState<DropboxAppConfig | null>(null);
  const [appKey, setAppKey] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [showAppSecret, setShowAppSecret] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 設定を読み込み
  const fetchConfig = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/settings/dropbox/app-config');
      
      if (response.ok) {
        const data = await response.json();
        if (data.config) {
          setConfig(data.config);
          setAppKey(data.config.appKey);
          setAppSecret(data.config.appSecret);
        }
      } else {
        const errorData = await response.json();
        showError(errorData.error || 'Dropbox App設定の取得に失敗しました');
      }
    } catch (error) {
      showError('Dropbox App設定の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 設定を保存
  const saveConfig = async () => {
    if (!appKey.trim() || !appSecret.trim()) {
      showError('App KeyとApp Secretを入力してください');
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch('/api/settings/dropbox/app-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appKey: appKey.trim(),
          appSecret: appSecret.trim(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        showSuccess({
          title: '設定保存',
          description: data.message || 'Dropbox App設定が保存されました'
        });
        await fetchConfig(); // 設定を再読み込み
      } else {
        const errorData = await response.json();
        showError(errorData.error || 'Dropbox App設定の保存に失敗しました');
      }
    } catch (error) {
      showError('Dropbox App設定の保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  // 初期化時に設定を読み込み
  useEffect(() => {
    fetchConfig();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5" />
          Dropbox App設定
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="appKey">App Key</Label>
          <Input
            id="appKey"
            type="text"
            placeholder="Dropbox App Keyを入力してください"
            value={appKey}
            onChange={(e) => setAppKey(e.target.value)}
            disabled={isLoading}
          />
          <p className="text-sm text-muted-foreground">
            Dropbox Developer Consoleで取得したApp Keyを入力してください
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="appSecret">App Secret</Label>
          <div className="relative">
            <Input
              id="appSecret"
              type={showAppSecret ? "text" : "password"}
              placeholder="Dropbox App Secretを入力してください"
              value={appSecret}
              onChange={(e) => setAppSecret(e.target.value)}
              disabled={isLoading}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowAppSecret(!showAppSecret)}
              disabled={isLoading}
            >
              {showAppSecret ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Dropbox Developer Consoleで取得したApp Secretを入力してください
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={saveConfig}
            disabled={isLoading || isSaving}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? '保存中...' : '設定を保存'}
          </Button>
          
          <Button
            variant="outline"
            onClick={fetchConfig}
            disabled={isLoading || isSaving}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            再読み込み
          </Button>
        </div>

        {config && (
          <div className="mt-4 p-3 bg-muted rounded-md">
            <p className="text-sm text-muted-foreground">
              <strong>最終更新:</strong> {new Date(config.updatedAt).toLocaleString('ja-JP')}
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>作成日時:</strong> {new Date(config.createdAt).toLocaleString('ja-JP')}
            </p>
          </div>
        )}

        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-md">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
            Dropbox App設定について
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Dropbox Developer Consoleでアプリを作成してください</li>
            <li>• App KeyとApp Secretを取得して入力してください</li>
            <li>• リフレッシュトークンの取得にはこれらの設定が必要です</li>
            <li>• 設定は安全に暗号化して保存されます</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
