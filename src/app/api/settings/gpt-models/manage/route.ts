import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options } from "@/features/auth/auth-api";
import { 
  saveGPTModel, 
  updateGPTModel, 
  deleteGPTModel,
  getGPTModelById 
} from "@/features/documents/cosmos-db-gpt-model-service";

// GPTモデルを追加
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(options);
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    }

    const { name, deploymentName, description, isAvailable, isDefault } = await request.json();

    if (!name || !deploymentName) {
      return NextResponse.json({ error: "モデル名とデプロイ名は必須です" }, { status: 400 });
    }

    const newModel = await saveGPTModel({
      name,
      deploymentName,
      description: description || "",
      isAvailable: isAvailable !== false,
      isDefault: isDefault || false,
    });

    return NextResponse.json({
      success: true,
      message: "GPTモデルが追加されました",
      model: newModel
    });

  } catch (error) {
    console.error("GPT Model Add API error:", error);
    return NextResponse.json(
      { error: "GPTモデルの追加に失敗しました" },
      { status: 500 }
    );
  }
}

// GPTモデルを更新
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(options);
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    }

    const { id, name, deploymentName, description, isAvailable, isDefault } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "モデルIDは必須です" }, { status: 400 });
    }

    const existingModel = await getGPTModelById(id);
    if (!existingModel) {
      return NextResponse.json({ error: "指定されたモデルが見つかりません" }, { status: 404 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (deploymentName !== undefined) updateData.deploymentName = deploymentName;
    if (description !== undefined) updateData.description = description;
    if (isAvailable !== undefined) updateData.isAvailable = isAvailable;
    if (isDefault !== undefined) updateData.isDefault = isDefault;

    const updatedModel = await updateGPTModel(id, updateData);

    return NextResponse.json({
      success: true,
      message: "GPTモデルが更新されました",
      model: updatedModel
    });

  } catch (error) {
    console.error("GPT Model Update API error:", error);
    return NextResponse.json(
      { error: "GPTモデルの更新に失敗しました" },
      { status: 500 }
    );
  }
}

// GPTモデルを削除
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(options);
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "モデルIDは必須です" }, { status: 400 });
    }

    const existingModel = await getGPTModelById(id);
    if (!existingModel) {
      return NextResponse.json({ error: "指定されたモデルが見つかりません" }, { status: 404 });
    }

    if (existingModel.isDefault) {
      return NextResponse.json({ error: "デフォルトモデルは削除できません" }, { status: 400 });
    }

    await deleteGPTModel(id);

    return NextResponse.json({
      success: true,
      message: "GPTモデルが削除されました"
    });

  } catch (error) {
    console.error("GPT Model Delete API error:", error);
    return NextResponse.json(
      { error: "GPTモデルの削除に失敗しました" },
      { status: 500 }
    );
  }
}
