import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/features/auth/auth-api";
import { 
  getAllDepartments, 
  saveDepartment, 
  updateDepartment, 
  deleteDepartment,
  getDepartmentStats,
  getDepartment
} from "@/features/documents/cosmos-db-dept-service";
import { BlobServiceClient } from "@azure/storage-blob";

// Azure Storage接続文字列を取得
function getBlobServiceClient() {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error("Azure Storage接続文字列が設定されていません");
  }
  return BlobServiceClient.fromConnectionString(connectionString);
}

// BLOBコンテナを作成
async function createBlobContainer(containerName: string): Promise<void> {
  const blobServiceClient = getBlobServiceClient();
  const containerClient = blobServiceClient.getContainerClient(containerName);
  
  try {
    await containerClient.create();
    console.log(`BLOBコンテナ「${containerName}」を作成しました`);
  } catch (error: any) {
    // コンテナが既に存在する場合は無視
    if (error.code === 'ContainerAlreadyExists') {
      console.log(`BLOBコンテナ「${containerName}」は既に存在します`);
      return;
    }
    throw error;
  }
}

// BLOBコンテナを削除
async function deleteBlobContainer(containerName: string): Promise<void> {
  const blobServiceClient = getBlobServiceClient();
  const containerClient = blobServiceClient.getContainerClient(containerName);
  await containerClient.delete();
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

    const departments = await getAllDepartments();
    const stats = await getDepartmentStats();
    
    return NextResponse.json({
      departments,
      stats,
      total: departments.length
    });

  } catch (error) {
    console.error("部門一覧取得エラー:", error);
    return NextResponse.json(
      { error: "部門一覧の取得に失敗しました" },
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
    const { name, description, blobContainerName, isActive } = body;

    if (!name || !blobContainerName) {
      return NextResponse.json({ error: "部門名とBLOBコンテナ名は必須です" }, { status: 400 });
    }

    const containerName = blobContainerName.trim().toLowerCase();
    
    // コンテナ名の検証
    if (!/^[a-z0-9-]+$/.test(containerName)) {
      return NextResponse.json({ error: "BLOBコンテナ名は英数字とハイフンのみ使用できます" }, { status: 400 });
    }

    try {
      // BLOBコンテナを作成
      await createBlobContainer(containerName);
      
      // 部門を保存
      const departmentId = await saveDepartment({
        name,
        description: description || '',
        blobContainerName: containerName,
        isActive: isActive !== undefined ? isActive : true,
      });

      return NextResponse.json({
        success: true,
        message: `部門「${name}」とBLOBコンテナ「${containerName}」が作成されました`,
        departmentId
      });
    } catch (error) {
      console.error("部門・コンテナ作成エラー:", error);
      return NextResponse.json(
        { error: "部門またはBLOBコンテナの作成に失敗しました: " + (error instanceof Error ? error.message : "不明なエラー") },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("部門作成エラー:", error);
    return NextResponse.json(
      { error: "部門の作成に失敗しました" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    if (!session.user.isAdmin) {
      return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, description, blobContainerName, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: "部門IDが必要です" }, { status: 400 });
    }

    const containerName = blobContainerName.trim().toLowerCase();
    
    // コンテナ名の検証
    if (!/^[a-z0-9-]+$/.test(containerName)) {
      return NextResponse.json({ error: "BLOBコンテナ名は英数字とハイフンのみ使用できます" }, { status: 400 });
    }

    try {
      // 既存の部門情報を取得
      const existingDepartment = await getDepartment(id);
      if (!existingDepartment) {
        return NextResponse.json({ error: "部門が見つかりません" }, { status: 404 });
      }

      // BLOBコンテナ名が変更された場合
      if (existingDepartment.blobContainerName !== containerName) {
        // 新しいコンテナを作成
        await createBlobContainer(containerName);
        
        // 古いコンテナを削除（オプション）
        try {
          await deleteBlobContainer(existingDepartment.blobContainerName);
        } catch (deleteError) {
          console.warn("古いコンテナの削除に失敗:", deleteError);
          // 古いコンテナの削除に失敗しても処理を続行
        }
      }

      // 部門を更新
      await updateDepartment(id, {
        name,
        description,
        blobContainerName: containerName,
        isActive,
      });

      return NextResponse.json({
        success: true,
        message: `部門「${name}」が更新されました`
      });
    } catch (error) {
      console.error("部門・コンテナ更新エラー:", error);
      return NextResponse.json(
        { error: "部門またはBLOBコンテナの更新に失敗しました: " + (error instanceof Error ? error.message : "不明なエラー") },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("部門更新エラー:", error);
    return NextResponse.json(
      { error: "部門の更新に失敗しました" },
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
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "部門IDが必要です" }, { status: 400 });
    }

    try {
      // 既存の部門情報を取得
      const existingDepartment = await getDepartment(id);
      if (!existingDepartment) {
        return NextResponse.json({ error: "部門が見つかりません" }, { status: 404 });
      }

      // 部門を削除
      await deleteDepartment(id);

      // BLOBコンテナを削除（オプション）
      try {
        await deleteBlobContainer(existingDepartment.blobContainerName);
      } catch (deleteError) {
        console.warn("BLOBコンテナの削除に失敗:", deleteError);
        // コンテナの削除に失敗しても処理を続行
      }

      return NextResponse.json({
        success: true,
        message: `部門「${existingDepartment.name}」が削除されました`
      });
    } catch (error) {
      console.error("部門・コンテナ削除エラー:", error);
      return NextResponse.json(
        { error: "部門の削除に失敗しました: " + (error instanceof Error ? error.message : "不明なエラー") },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("部門削除エラー:", error);
    return NextResponse.json(
      { error: "部門の削除に失敗しました" },
      { status: 500 }
    );
  }
}
