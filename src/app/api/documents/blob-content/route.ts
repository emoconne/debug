import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/features/auth/auth-api";
import { getBlobContent } from "@/features/documents/azure-blob-service";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { containerName, blobName } = await request.json();
    
    if (!containerName || !blobName) {
      return NextResponse.json({ error: "Container name and blob name are required" }, { status: 400 });
    }

    console.log('Getting blob content:', { containerName, blobName });

    // BLOBからコンテンツを取得
    const content = await getBlobContent(containerName, blobName);
    
    if (!content) {
      console.log('Blob content not found:', { containerName, blobName });
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    console.log('Blob content retrieved successfully');

    // ArrayBufferとして返す
    return new NextResponse(content, {
      headers: {
        'Content-Type': 'application/octet-stream',
      },
    });

  } catch (error) {
    console.error('Error getting blob content:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
