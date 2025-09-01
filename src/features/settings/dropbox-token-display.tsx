"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Key, 
  RefreshCw, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Eye, 
  EyeOff,
  Copy,
  ExternalLink
} from "lucide-react";
import { useGlobalMessageContext } from "@/features/global-message/global-message-context";

interface TokenInfo {
  hasAccessToken: boolean;
  hasRefreshToken: boolean;
  accessTokenPreview: string | null;
  refreshTokenPreview: string | null;
  expiresIn: number | undefined;
  tokenExpiresAt: Date | undefined;
  isTokenExpired: boolean;
  isTokenExpiringSoon: boolean;
  timeUntilExpiry: number | null;
}

interface SettingsInfo {
  folderPath: string;
  autoSync: boolean;
  syncInterval: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface DropboxTokenDisplayProps {
  onRefresh?: () => void;
}

export const DropboxTokenDisplay: React.FC<DropboxTokenDisplayProps> = ({ onRefresh }) => {
  const { showSuccess, showError } = useGlobalMessageContext();
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [settingsInfo, setSettingsInfo] = useState<SettingsInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showTokens, setShowTokens] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchTokenInfo = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/settings/dropbox/tokens');
      
      if (response.ok) {
        const data = await response.json();
        setTokenInfo(data.tokens);
        setSettingsInfo(data.settings);
      } else {
        const errorData = await response.json();
        showError(errorData.error || 'トークン情報の取得に失敗しました');
      }
    } catch (error) {
      showError('トークン情報の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshToken = async () => {
    try {
      setIsRefreshing(true);
      const response = await fetch('/api/settings/dropbox/tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'refresh' }),
      });

      if (response.ok) {
        const data = await response.json();
        showSuccess('アクセストークンが更新されました');
        fetchTokenInfo(); // 情報を再取得
        if (onRefresh) onRefresh();
      } else {
        const errorData = await response.json();
        showError(errorData.error || 'トークンの更新に失敗しました');
      }
    } catch (error) {
      showError('トークンの更新に失敗しました');
    } finally {
      setIsRefreshing(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showSuccess(`${label}をクリップボードにコピーしました`);
    } catch (error) {
      showError('クリップボードへのコピーに失敗しました');
    }
  };

  const formatTimeRemaining = (milliseconds: number): string => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}日 ${hours % 24}時間`;
    } else if (hours > 0) {
      return `${hours}時間 ${minutes}分`;
    } else {
      return `${minutes}分`;
    }
  };

  useEffect(() => {
    fetchTokenInfo();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Dropboxトークン情報
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span className="ml-2">読み込み中...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!tokenInfo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Dropboxトークン情報
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Dropbox設定が見つかりません。OAuth2認証を実行してください。
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Dropboxトークン情報
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTokens(!showTokens)}
            >
              {showTokens ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showTokens ? '非表示' : '表示'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshToken}
              disabled={isRefreshing || !tokenInfo.hasRefreshToken}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              更新
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* トークン状態 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">アクセストークン:</span>
              {tokenInfo.hasAccessToken ? (
                <Badge variant="outline" className="text-green-600">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  有効
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  未設定
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">リフレッシュトークン:</span>
              {tokenInfo.hasRefreshToken ? (
                <Badge variant="outline" className="text-green-600">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  有効
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  未設定
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">有効期限:</span>
              {tokenInfo.tokenExpiresAt ? (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">
                    {tokenInfo.tokenExpiresAt.toLocaleString('ja-JP')}
                  </span>
                  {tokenInfo.isTokenExpired ? (
                    <Badge variant="destructive">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      期限切れ
                    </Badge>
                  ) : tokenInfo.isTokenExpiringSoon ? (
                    <Badge variant="secondary">
                      <Clock className="w-3 h-3 mr-1" />
                      期限切れ間近
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      有効
                    </Badge>
                  )}
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">不明</span>
              )}
            </div>

            {tokenInfo.timeUntilExpiry !== null && !tokenInfo.isTokenExpired && (
              <div className="text-sm text-muted-foreground">
                残り時間: {formatTimeRemaining(tokenInfo.timeUntilExpiry)}
              </div>
            )}
          </div>
        </div>

        {/* トークンプレビュー */}
        {showTokens && (
          <div className="space-y-3 p-4 bg-muted rounded-lg">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">アクセストークン:</span>
                {tokenInfo.accessTokenPreview && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(tokenInfo.accessTokenPreview!, 'アクセストークン')}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                )}
              </div>
              <div className="text-sm font-mono bg-background p-2 rounded border">
                {tokenInfo.accessTokenPreview || '未設定'}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">リフレッシュトークン:</span>
                {tokenInfo.refreshTokenPreview && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(tokenInfo.refreshTokenPreview!, 'リフレッシュトークン')}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                )}
              </div>
              <div className="text-sm font-mono bg-background p-2 rounded border">
                {tokenInfo.refreshTokenPreview || '未設定'}
              </div>
            </div>
          </div>
        )}

        {/* 設定情報 */}
        {settingsInfo && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">設定情報:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div>フォルダパス: {settingsInfo.folderPath || '/'}</div>
              <div>自動同期: {settingsInfo.autoSync ? '有効' : '無効'}</div>
              <div>同期間隔: {settingsInfo.syncInterval}</div>
              <div>状態: {settingsInfo.isActive ? '有効' : '無効'}</div>
            </div>
          </div>
        )}

        {/* 警告 */}
        {tokenInfo.isTokenExpired && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              アクセストークンの有効期限が切れています。リフレッシュトークンを使用して更新してください。
            </AlertDescription>
          </Alert>
        )}

        {tokenInfo.isTokenExpiringSoon && !tokenInfo.isTokenExpired && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              アクセストークンの有効期限が間もなく切れます。事前に更新することをお勧めします。
            </AlertDescription>
          </Alert>
        )}

        {!tokenInfo.hasRefreshToken && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              リフレッシュトークンが設定されていません。OAuth2認証を再実行してリフレッシュトークンを取得してください。
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
