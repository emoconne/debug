import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/features/auth/auth-api";
import { getSettingsDataByType } from "@/features/common/cosmos-settings";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { documentId } = await request.json();
    
    if (!documentId) {
      return NextResponse.json({ error: "Document ID is required" }, { status: 400 });
    }

    console.log('Getting viewer info for document ID:', documentId);

    // CosmosDBからドキュメント情報を取得
    const documents = await getSettingsDataByType('document');
    const document = documents.find(doc => doc.id === documentId);

    if (!document) {
      console.log('Document not found in CosmosDB:', documentId);
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    console.log('Found document in CosmosDB:', {
      id: document.id,
      fileName: document.data.fileName,
      blobName: document.data.blobName
    });

    // BLOBファイル名を返す
    return NextResponse.json({
      blobFileName: document.data.blobName,
      fileName: document.data.fileName,
      containerName: document.data.containerName
    });

  } catch (error) {
    console.error('Error getting viewer info:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
