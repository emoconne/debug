import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/features/auth/auth-api";
import { testAzureSearchConnection, testCreateSearchIndex } from "@/features/test/azure-search-test";
import { testDocumentIntelligenceConnection, getDocumentIntelligenceConfig } from "@/features/test/document-intelligence-test";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    if (!session.user.isAdmin) {
      return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    }

    console.log('=== AZURE SERVICES TEST START ===');

    // 1. Document Intelligence接続テスト
    const diConfig = await getDocumentIntelligenceConfig();
    const diTest = await testDocumentIntelligenceConnection();

    // 2. AI Search接続テスト
    const searchTest = await testAzureSearchConnection();

    // 3. AI Searchインデックス作成テスト
    const searchIndexTest = await testCreateSearchIndex();

    const result = {
      timestamp: new Date().toISOString(),
      documentIntelligence: {
        config: diConfig,
        connectionTest: diTest
      },
      aiSearch: {
        connectionTest: searchTest,
        indexCreationTest: searchIndexTest
      },
      summary: {
        diConfigured: diConfig.isConfigured,
        diConnected: diTest.success,
        searchConfigured: searchTest.details?.hasKey && searchTest.details?.endpoint !== "未設定",
        searchConnected: searchTest.success,
        searchIndexCreated: searchIndexTest.success
      }
    };

    console.log('=== AZURE SERVICES TEST COMPLETED ===');
    console.log('Test result:', result);

    return NextResponse.json(result);

  } catch (error) {
    console.error("Azure services test error:", error);
    return NextResponse.json(
      { error: "テスト実行中にエラーが発生しました" },
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
    const { testType, fileData } = body;

    if (testType === 'documentAnalysis' && fileData) {
      // Base64エンコードされたファイルデータをArrayBufferに変換
      const buffer = Buffer.from(fileData, 'base64');
      const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
      
      const { testDocumentAnalysis } = await import("@/features/test/document-intelligence-test");
      const result = await testDocumentAnalysis(arrayBuffer);
      
      return NextResponse.json({
        testType: 'documentAnalysis',
        result
      });
    }

    return NextResponse.json({ error: "無効なテストタイプです" }, { status: 400 });

  } catch (error) {
    console.error("Azure services test error:", error);
    return NextResponse.json(
      { error: "テスト実行中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

