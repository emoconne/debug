import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/features/auth/auth-api";
import { BlobServiceClient } from "@azure/storage-blob";

// Azure Storage接続文字列を取得
function getBlobServiceClient() {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error("Azure Storage接続文字列が設定されていません");
  }
  return BlobServiceClient.fromConnectionString(connectionString);
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

    const blobServiceClient = getBlobServiceClient();
    
    // 接続テスト: アカウント情報を取得
    const accountInfo = await blobServiceClient.getAccountInfo();
    
    // コンテナ一覧を取得して接続を確認
    const containers: string[] = [];
    for await (const container of blobServiceClient.listContainers()) {
      containers.push(container.name);
    }

    return NextResponse.json({
      success: true,
      message: "接続テストが成功しました",
      accountInfo: {
        name: (accountInfo as any).accountName || 'Unknown',
        skuName: accountInfo.skuName,
        containerCount: containers.length
      }
    });

  } catch (error) {
    console.error("接続テストエラー:", error);
    return NextResponse.json(
      { error: "接続テストに失敗しました: " + (error instanceof Error ? error.message : "不明なエラー") },
      { status: 500 }
    );
  }
}
