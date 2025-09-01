import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/features/auth/auth-api";
import { getDocument } from "@/features/documents/cosmos-db-document-service";
import { downloadFile } from "@/features/documents/azure-blob-dept-service";
import { DocumentAnalysisClient, AzureKeyCredential } from "@azure/ai-form-recognizer";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { documentId } = await request.json();

    if (!documentId) {
      return NextResponse.json({ error: "ドキュメントIDが必要です" }, { status: 400 });
    }

    // CosmosDBからドキュメント情報を取得
    const document = await getDocument(documentId);
    if (!document) {
      return NextResponse.json({ error: "ドキュメントが見つかりません" }, { status: 404 });
    }

    if (!document.containerName || !document.blobName) {
      return NextResponse.json({ error: "ドキュメントのBLOB情報が不完全です" }, { status: 400 });
    }

    // BLOBからファイルをダウンロード
    const fileData = await downloadFile(document.containerName, document.blobName);
    
    // Document Intelligenceでテキスト抽出
    const endpoint = process.env.AZURE_FORM_RECOGNIZER_ENDPOINT;
    const key = process.env.AZURE_FORM_RECOGNIZER_KEY;
    
    if (!endpoint || !key) {
      return NextResponse.json({ error: "Document Intelligence設定が不完全です" }, { status: 500 });
    }

    const client = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(key));
    
    // ArrayBufferをBlobに変換
    const blob = new Blob([fileData.data], { type: fileData.contentType });
    
    // ファイル形式に応じた処理
    let extractedText = "";
    const fileName = document.fileName || "";
    const fileExtension = fileName.toLowerCase().split('.').pop();
    
    // 参考ソースに基づいてモデル選択を修正
    let modelToUse: string;
    let useContentInsteadOfPages = false;

    if (fileExtension === 'txt') {
      // テキストファイルは prebuilt-read を使用
      modelToUse = "prebuilt-read";
      useContentInsteadOfPages = true;
      console.log('Text file detected, using prebuilt-read model');
    } else {
      // その他のファイルは prebuilt-layout を優先
      modelToUse = "prebuilt-layout";
      console.log(`${fileExtension} file detected, using prebuilt-layout model`);
    }

    try {
      console.log(`Processing file: ${fileName} with model: ${modelToUse}`);
      
      const poller = await client.beginAnalyzeDocument(modelToUse, blob);
      const result = await poller.pollUntilDone();

      if (useContentInsteadOfPages) {
        // テキストファイルの場合、contentを使用
        if (result.content) {
          extractedText = result.content;
        }
      } else {
        // その他のファイルの場合、pagesを使用
        for (const page of result.pages || []) {
          for (const line of page.lines || []) {
            extractedText += line.content + "\n";
          }
        }

        // テーブル情報も追加
        if (result.tables && result.tables.length > 0) {
          console.log(`Found ${result.tables.length} tables`);
          for (const table of result.tables) {
            if (table.cells) {
              const tableText = table.cells.map(cell => cell.content).join(' | ');
              extractedText += `[TABLE] ${tableText}\n`;
            }
          }
        }
      }

      console.log(`Successfully processed with model: ${modelToUse}`);
    } catch (error) {
      console.error(`Model ${modelToUse} failed for file ${fileName}:`, error);
      throw new Error(`Document Intelligence エラー: ${error}`);
    }

    return NextResponse.json({
      success: true,
      text: extractedText,
      documentId: documentId,
      fileName: document.fileName
    });

  } catch (error) {
    console.error("テキスト抽出エラー:", error);
    
    // エラーの詳細情報をログに出力
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    
    return NextResponse.json(
      { 
        error: "テキスト抽出に失敗しました",
        details: error instanceof Error ? error.message : "Unknown error",
        documentId: documentId
      },
      { status: 500 }
    );
  }
}
