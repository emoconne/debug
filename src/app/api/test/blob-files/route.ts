import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/features/auth/auth-api";
import { BlobServiceClient } from "@azure/storage-blob";
import { generateSasUrl } from "@/features/documents/azure-blob-service";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const containerName = searchParams.get('container') || 'test';

    console.log('BLOB Files API: Getting files from container:', containerName);

    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error('Azure Storage connection string is not configured');
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    // コンテナの存在確認
    const containerExists = await containerClient.exists();
    if (!containerExists) {
      return NextResponse.json({ files: [] });
    }

    const files = [];
    for await (const blob of containerClient.listBlobsFlat()) {
      try {
        // SAS URLを生成
        const sasUrl = await generateSasUrl(containerName, blob.name);
        
        files.push({
          name: blob.name,
          size: blob.properties.contentLength || 0,
          contentType: blob.properties.contentType || 'application/octet-stream',
          lastModified: blob.properties.lastModified?.toISOString() || new Date().toISOString(),
          sasUrl: sasUrl
        });
      } catch (error) {
        console.error(`Error generating SAS URL for ${blob.name}:`, error);
        // SAS URL生成に失敗した場合でもファイル情報は含める
        files.push({
          name: blob.name,
          size: blob.properties.contentLength || 0,
          contentType: blob.properties.contentType || 'application/octet-stream',
          lastModified: blob.properties.lastModified?.toISOString() || new Date().toISOString(),
          sasUrl: null
        });
      }
    }

    console.log(`BLOB Files API: Found ${files.length} files in container ${containerName}`);

    return NextResponse.json({
      success: true,
      files: files,
      containerName: containerName
    });

  } catch (error) {
    console.error("BLOB Files API Error:", error);
    return NextResponse.json(
      { 
        error: "ファイル一覧の取得に失敗しました",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
