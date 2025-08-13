import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options } from "@/features/auth/auth-api";
import { 
  getAllGPTModels, 
  getDefaultGPTModel, 
  saveGPTModel, 
  updateGPTModel, 
  deleteGPTModel,
  GPTModelData 
} from "@/features/documents/cosmos-db-gpt-model-service";

export async function GET() {
  try {
    const session = await getServerSession(options);
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    }

    const models = await getAllGPTModels();
    const defaultModel = await getDefaultGPTModel();

    return NextResponse.json({
      models: models,
      currentModel: defaultModel?.deploymentName || process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME || "gpt-4o"
    });

  } catch (error) {
    console.error("GPT Models API error:", error);
    return NextResponse.json(
      { error: "GPTモデル設定の取得に失敗しました" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(options);
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    }

    const { selectedModel } = await request.json();

    if (!selectedModel) {
      return NextResponse.json({ error: "モデルが選択されていません" }, { status: 400 });
    }

    // 選択されたモデルを取得
    const models = await getAllGPTModels();
    const selectedModelData = models.find(model => model.id === selectedModel);

    if (!selectedModelData || !selectedModelData.isAvailable) {
      return NextResponse.json({ error: "無効なモデルが選択されました" }, { status: 400 });
    }

    // すべてのモデルのデフォルト設定を解除
    for (const model of models) {
      if (model.isDefault) {
        await updateGPTModel(model.id, { isDefault: false });
      }
    }

    // 選択されたモデルをデフォルトに設定
    await updateGPTModel(selectedModel, { isDefault: true });

    console.log(`GPTモデルが ${selectedModelData.name} (${selectedModelData.deploymentName}) に変更されました`);

    return NextResponse.json({
      success: true,
      message: `GPTモデルが ${selectedModelData.name} に設定されました`,
      selectedModel: selectedModelData.deploymentName
    });

  } catch (error) {
    console.error("GPT Models API error:", error);
    return NextResponse.json(
      { error: "GPTモデル設定の更新に失敗しました" },
      { status: 500 }
    );
  }
}
