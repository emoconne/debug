import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/features/auth/auth-api";
import { getDocument } from "@/features/documents/cosmos-db-document-service";
import { BlobServiceClient, generateBlobSASQueryParameters, BlobSASPermissions, StorageSharedKeyCredential } from "@azure/storage-blob";
import { similaritySearchVectorWithScore } from "@/features/chat/chat-services/azure-cog-search/azure-cog-vector-store";
import { OpenAIInstance } from "@/features/common/openai";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const documentId = params.id;

    if (!documentId) {
      return NextResponse.json({ error: "ドキュメントIDが必要です" }, { status: 400 });
    }

    // CosmosDBからドキュメント情報を取得
    const document = await getDocument(documentId);
    if (!document) {
      return NextResponse.json({ error: "ドキュメントが見つかりません" }, { status: 404 });
    }

    // containerNameとblobNameの存在確認
    if (!document.containerName || !document.blobName) {
      return NextResponse.json({ error: "ドキュメントのBLOB情報が不完全です" }, { status: 400 });
    }

    // SAS署名付きURLを生成
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      return NextResponse.json({ error: "Azure Storage設定が不完全です" }, { status: 500 });
    }

    // 接続文字列からアカウント名とアカウントキーを抽出
    const accountNameMatch = connectionString.match(/AccountName=([^;]+)/i);
    const accountKeyMatch = connectionString.match(/AccountKey=([^;]+)/i);

    if (!accountNameMatch || !accountKeyMatch) {
      return NextResponse.json({ error: "Azure Storage接続文字列の形式が正しくありません" }, { status: 500 });
    }

    const accountName = accountNameMatch[1];
    const accountKey = accountKeyMatch[1];

    // StorageSharedKeyCredentialを作成
    const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
    const blobServiceClient = new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net`,
      sharedKeyCredential
    );

    const containerClient = blobServiceClient.getContainerClient(document.containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(document.blobName);

    // ファイルの存在確認
    const blobExists = await blockBlobClient.exists();
    if (!blobExists) {
      return NextResponse.json({ error: "ファイルが見つかりません" }, { status: 404 });
    }

    // SAS署名付きURLを生成（1時間有効）
    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: document.containerName,
        blobName: document.blobName,
        permissions: BlobSASPermissions.parse("r"),
        startsOn: new Date(),
        expiresOn: new Date(new Date().valueOf() + 3600 * 1000), // 1時間後
      },
      sharedKeyCredential
    ).toString();

    const sasUrl = `${blockBlobClient.url}?${sasToken}`;

    // ドキュメントのコンテキスト情報を取得
    let context = '';
    let summary = '';
    try {
      const searchResults = await similaritySearchVectorWithScore(document.fileName, 1, {
        filter: `id eq '${documentId}'`
      });
      
      if (searchResults.length > 0) {
        context = searchResults[0].pageContent;
        
        // OpenAIでコンテンツを要約
        try {
          const openAI = OpenAIInstance();
          const summaryResponse = await openAI.chat.completions.create({
            messages: [
              {
                role: "system",
                content: "あなたは文書の要約専門家です。与えられた文書の内容を200文字程度で簡潔に要約してください。重要なポイントを抽出し、読みやすい日本語で要約してください。"
              },
              {
                role: "user",
                content: `以下の文書を要約してください：\n\n${context}`
              }
            ],
            model: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME || "gpt-4o",
            max_tokens: 300,
            temperature: 0.3
          });
          
          summary = summaryResponse.choices[0]?.message?.content || '要約を生成できませんでした。';
        } catch (summaryError) {
          console.log('Summary generation failed:', summaryError);
          summary = context.substring(0, 200) + (context.length > 200 ? '...' : '');
        }
      }
    } catch (error) {
      console.log('Context retrieval failed:', error);
      context = 'コンテキスト情報を取得できませんでした。';
      summary = '要約を生成できませんでした。';
    }

    console.log('SAS URL API: URL generated:', {
      fileName: document.fileName,
      fileType: document.fileType,
      containerName: document.containerName,
      blobName: document.blobName,
      sasUrl: sasUrl.substring(0, 100) + '...',
      contextLength: context.length,
      summaryLength: summary.length
    });

    return NextResponse.json({
      sasUrl: sasUrl,
      fileName: document.fileName,
      fileType: document.fileType,
      context: context,
      summary: summary
    });

  } catch (error) {
    console.error("SAS URL生成エラー:", error);
    return NextResponse.json(
      { 
        error: "SAS URLの生成に失敗しました",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
