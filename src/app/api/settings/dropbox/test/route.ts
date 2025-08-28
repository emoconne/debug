import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/features/auth/auth-api";
import { Dropbox } from "dropbox";

// Node.js環境でfetchが利用可能でない場合の対応
let fetchFunction: any;
try {
  if (typeof globalThis.fetch !== 'undefined') {
    fetchFunction = globalThis.fetch;
  } else {
    const { default: nodeFetch } = await import('node-fetch');
    fetchFunction = nodeFetch;
  }
} catch (error) {
  console.error('Fetch function initialization error:', error);
  // フォールバック: グローバルfetchを使用
  fetchFunction = globalThis.fetch;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    if (!session.user.isAdmin) {
      return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    }

    const body = await request.json();
    const { accessToken } = body;

    if (!accessToken) {
      return NextResponse.json({ error: "アクセストークンが必要です" }, { status: 400 });
    }

    try {
      // アクセストークンの基本的な形式チェック
      if (!accessToken.startsWith('sl.') && !accessToken.startsWith('Bearer ')) {
        return NextResponse.json({ 
          error: "アクセストークンの形式が正しくありません。Dropboxアクセストークンは 'sl.' で始まる必要があります。" 
        }, { status: 400 });
      }

      // ダミートークンの検出
      const dummyTokens = ['test', 'dummy', 'fake', 'invalid', 'sl.test', 'sl.dummy', 'sl.fake'];
      if (dummyTokens.some(dummy => accessToken.toLowerCase().includes(dummy))) {
        return NextResponse.json({ 
          error: "無効なアクセストークンです。有効なDropboxアクセストークンを入力してください。" 
        }, { status: 400 });
      }

      // トークンを正しい形式に調整
      const cleanToken = accessToken.startsWith('Bearer ') ? accessToken.substring(7) : accessToken;

      // Dropbox APIクライアントを初期化
      const dbx = new Dropbox({ 
        accessToken: cleanToken,
        fetch: fetchFunction
      });

      console.log('Dropbox API接続テスト開始...');

      // 接続テスト: アカウント情報を取得
      console.log('アカウント情報を取得中...');
      const accountInfo = await dbx.usersGetCurrentAccount();
      console.log('アカウント情報取得成功:', accountInfo.result.name.displayName);
      
      // 権限が不足している場合は、アカウント情報のみで接続確認
      try {
        // ルートフォルダの内容を取得して接続を確認
        console.log('フォルダ一覧を取得中...');
        const listFolderResult = await dbx.filesListFolder({
          path: "",
          limit: 1
        });
        console.log('フォルダ一覧取得成功:', listFolderResult.result.entries.length, '件');

        return NextResponse.json({
          success: true,
          message: "Dropboxへの接続が成功しました",
          accountInfo: {
            accountId: accountInfo.result.accountId,
            name: accountInfo.result.name.displayName,
            email: accountInfo.result.email,
            country: accountInfo.result.country,
          },
          folderInfo: {
            entries: listFolderResult.result.entries.length,
            hasMore: listFolderResult.result.hasMore,
          }
        });
      } catch (folderError: any) {
        // フォルダアクセス権限がない場合は、アカウント情報のみを返す
        if (folderError.status === 400 && folderError.error?.includes('files.metadata.read')) {
          return NextResponse.json({
            success: true,
            message: "Dropboxへの接続は成功しましたが、ファイルアクセス権限が不足しています",
            accountInfo: {
              accountId: accountInfo.result.accountId,
              name: accountInfo.result.name.displayName,
              email: accountInfo.result.email,
              country: accountInfo.result.country,
            },
            warning: "Dropboxアプリの設定で 'files.metadata.read' 権限を有効にしてください"
          });
        }
        throw folderError;
      }

    } catch (dropboxError: any) {
      console.error("Dropbox API error:", dropboxError);
      console.error("Error status:", dropboxError.status);
      console.error("Error message:", dropboxError.message);
      console.error("Error details:", dropboxError);
      
      // Dropbox APIのエラーレスポンスを確認
      if (dropboxError.status === 401) {
        return NextResponse.json({ 
          error: "アクセストークンが無効です。正しいトークンを入力してください。" 
        }, { status: 400 });
      }
      
      if (dropboxError.status === 403) {
        return NextResponse.json({ 
          error: "アクセス権限がありません。アプリの権限設定を確認してください。" 
        }, { status: 400 });
      }

      if (dropboxError.status === 400) {
        return NextResponse.json({ 
          error: "リクエストが無効です。アクセストークンを確認してください。" 
        }, { status: 400 });
      }

      // ネットワークエラーやその他のエラー
      if (dropboxError.code === 'ENOTFOUND' || dropboxError.code === 'ECONNREFUSED') {
        return NextResponse.json({ 
          error: "ネットワークエラーが発生しました。インターネット接続を確認してください。" 
        }, { status: 500 });
      }

      // タイムアウトエラー
      if (dropboxError.code === 'ETIMEDOUT') {
        return NextResponse.json({ 
          error: "接続がタイムアウトしました。しばらく時間をおいて再試行してください。" 
        }, { status: 500 });
      }

      return NextResponse.json({ 
        error: "Dropboxへの接続に失敗しました: " + (dropboxError.message || "不明なエラー") 
      }, { status: 500 });
    }

  } catch (error) {
    console.error("Dropbox接続テストエラー:", error);
    return NextResponse.json(
      { error: "Dropbox接続テストに失敗しました" },
      { status: 500 }
    );
  }
}
