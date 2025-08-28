import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/features/auth/auth-api";
import { Dropbox } from "dropbox";
import { getDropboxSettings } from "@/features/settings/dropbox-settings-service";
import { DropboxFileService, DropboxFileInfo } from "@/features/documents/dropbox-file-service";

// Node.js環境でfetchが利用可能でない場合の対応
let fetchFunction: any;

async function initializeFetch() {
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
}

// 初期化を実行
initializeFetch();

// フォルダを検索する関数（すべてのフォルダを再帰処理）
async function listFolderRecursive(dbx: Dropbox, path: string, maxDepth: number = 3, currentDepth: number = 0): Promise<any[]> {
  if (currentDepth >= maxDepth) {
    return [];
  }

  try {
    const result = await dbx.filesListFolder({
      path: path,
      limit: 100,
      recursive: false
    });

    const files: any[] = [];
    const processedPaths = new Set<string>(); // 重複チェック用

    for (const entry of result.result.entries) {
      const entryPath = (entry as any).path_lower || (entry as any).path_display || "";
      
      // 重複チェック
      if (processedPaths.has(entryPath)) {
        continue;
      }
      processedPaths.add(entryPath);

      const fileInfo: DropboxFileInfo = {
        name: entry.name,
        path: entryPath,
        size: (entry as any).size ? `${((entry as any).size / 1024 / 1024).toFixed(2)} MB` : "0 MB",
        updatedAt: (entry as any).server_modified ? new Date((entry as any).server_modified).toLocaleString('ja-JP') : "",
        isFolder: entry['.tag'] === 'folder',
        id: (entry as any).id,
        depth: currentDepth,
        parentPath: path === "" ? "/" : path,
        // Dropbox固有のプロパティ
        accountId: (entry as any).account_id,
        rev: (entry as any).rev,
        serverModified: (entry as any).server_modified,
        sharingInfo: (entry as any).sharing_info,
        propertyGroups: (entry as any).property_groups,
        hasExplicitSharedMembers: (entry as any).has_explicit_shared_members,
        contentHash: (entry as any).content_hash,
        // バージョン情報とファイルリンク
        version: (entry as any).rev || undefined,
        fileLink: entry['.tag'] === 'file' ? `https://www.dropbox.com/home${entryPath}` : undefined,
        // メタデータ
        createdAt: new Date().toISOString()
      };

      files.push(fileInfo);

      // フォルダの場合は再帰的に検索
      if (entry['.tag'] === 'folder') {
        const subFiles = await listFolderRecursive(dbx, entryPath, maxDepth, currentDepth + 1);
        files.push(...subFiles);
      }
    }

    return files;
  } catch (error) {
    console.error(`Error listing folder ${path}:`, error);
    return [];
  }
}



export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    if (!session.user.isAdmin) {
      return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    }

    // Dropbox設定を取得
    const settings = await getDropboxSettings();
    if (!settings || !settings.isActive) {
      return NextResponse.json({ error: "Dropbox設定が有効ではありません" }, { status: 400 });
    }

    try {
      // Dropbox APIクライアントを初期化
      const dbx = new Dropbox({ 
        accessToken: settings.accessToken,
        fetch: fetchFunction
      });

      // 指定されたフォルダの内容を取得（すべてのフォルダを再帰処理）
      // ルートフォルダの場合は空文字列を使用
      const folderPath = settings.folderPath === "/" ? "" : (settings.folderPath || "");
      
      // すべてのフォルダを再帰的にファイル一覧を取得
      const files = await listFolderRecursive(dbx, folderPath, 3, 0);

      // 重複除去前後の統計
      const uniqueFiles = files.filter((file, index, self) => 
        index === self.findIndex(f => f.id === file.id)
      );
      
      console.log('Retrieved files:', {
        total: files.length,
        unique: uniqueFiles.length,
        duplicates: files.length - uniqueFiles.length
      });

      // 重複を除去したファイルを使用
      const finalFiles = uniqueFiles;

      // CosmosDBにファイル情報を保存
      try {
        await DropboxFileService.saveMultipleFiles(finalFiles);
        console.log(`Saved ${finalFiles.length} files to CosmosDB`);
      } catch (error) {
        console.error('Error saving files to CosmosDB:', error);
        // エラーが発生してもファイル一覧は返す
      }

      return NextResponse.json({
        success: true,
        files: finalFiles,
        totalCount: finalFiles.length,
        folderCount: finalFiles.filter(f => f.isFolder).length,
        fileCount: finalFiles.filter(f => !f.isFolder).length,
        hasMore: false, // 再帰処理ではhasMoreは使用しない
        cursor: null,
      });

    } catch (dropboxError: any) {
      console.error("Dropbox API error:", dropboxError);
      
      // 権限不足エラーの特別処理
      if (dropboxError.status === 400 && dropboxError.error?.includes('files.metadata.read')) {
        return NextResponse.json({
          success: false,
          error: "ファイルアクセス権限が不足しています。Dropboxアプリの設定で 'files.metadata.read' 権限を有効にしてください。",
          files: [],
          hasMore: false,
          cursor: null,
          warning: "権限設定が必要です"
        });
      }
      
      if (dropboxError.status === 401) {
        return NextResponse.json({ 
          error: "アクセストークンが無効です。設定を確認してください。" 
        }, { status: 400 });
      }
      
      if (dropboxError.status === 404) {
        return NextResponse.json({ 
          error: "指定されたフォルダが見つかりません。" 
        }, { status: 400 });
      }

      return NextResponse.json({ 
        error: "Dropboxファイル一覧の取得に失敗しました: " + (dropboxError.message || "不明なエラー") 
      }, { status: 500 });
    }

  } catch (error) {
    console.error("Dropboxファイル一覧取得エラー:", error);
    return NextResponse.json(
      { error: "Dropboxファイル一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}
