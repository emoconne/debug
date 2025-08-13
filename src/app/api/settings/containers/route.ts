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

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    if (!session.user.isAdmin) {
      return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    }

    const blobServiceClient = getBlobServiceClient();
    const containers: string[] = [];

    // コンテナ一覧を取得
    for await (const container of blobServiceClient.listContainers()) {
      containers.push(container.name);
    }

    return NextResponse.json({
      containers,
      total: containers.length
    });

  } catch (error) {
    console.error("コンテナ一覧取得エラー:", error);
    return NextResponse.json(
      { error: "コンテナ一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
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
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "コンテナ名は必須です" }, { status: 400 });
    }

    const containerName = name.trim().toLowerCase();
    
    // コンテナ名の検証
    if (!/^[a-z0-9-]+$/.test(containerName)) {
      return NextResponse.json({ error: "コンテナ名は英数字とハイフンのみ使用できます" }, { status: 400 });
    }

    const blobServiceClient = getBlobServiceClient();
    const containerClient = blobServiceClient.getContainerClient(containerName);

    // コンテナを作成
    await containerClient.create();

    return NextResponse.json({
      success: true,
      message: `コンテナ「${containerName}」が作成されました`,
      containerName
    });

  } catch (error) {
    console.error("コンテナ作成エラー:", error);
    return NextResponse.json(
      { error: "コンテナの作成に失敗しました" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    if (!session.user.isAdmin) {
      return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');

    if (!name) {
      return NextResponse.json({ error: "コンテナ名が必要です" }, { status: 400 });
    }

    const blobServiceClient = getBlobServiceClient();
    const containerClient = blobServiceClient.getContainerClient(name);

    // コンテナを削除
    await containerClient.delete();

    return NextResponse.json({
      success: true,
      message: `コンテナ「${name}」が削除されました`
    });

  } catch (error) {
    console.error("コンテナ削除エラー:", error);
    return NextResponse.json(
      { error: "コンテナの削除に失敗しました" },
      { status: 500 }
    );
  }
}
