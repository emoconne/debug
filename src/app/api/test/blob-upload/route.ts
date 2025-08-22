import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/features/auth/auth-api";
// import 文のパスエラーを修正（相対パスに変更）
import { uploadFileToTestContainer } from "../../../../features/documents/test-document-management-service";

export async function POST(request: NextRequest) {
  console.log('=== TEST UPLOAD ROUTE START ===');
  try {
    const session = await getServerSession(authOptions);
    
    console.log('Debug: Session info:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userEmail: session?.user?.email,
      isAdmin: session?.user?.isAdmin,
      userName: session?.user?.name
    });
    
    if (!session?.user) {
      console.log('Debug: No session or user found');
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    console.log('Debug: Starting file upload process');
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.log('Debug: No file found in form data');
      return NextResponse.json({ error: "ファイルが選択されていません" }, { status: 400 });
    }

    console.log('Debug: File details:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    // テスト用アップロード関数を使用
    const result = await uploadFileToTestContainer(file);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        documentId: result.documentId,
        fileName: file.name,
        fileSize: file.size
      });
    } else {
      return NextResponse.json({
        error: result.message
      }, { status: 400 });
    }

  } catch (error) {
    console.error("テストファイルアップロードエラー:", error);
    return NextResponse.json(
      { error: "ファイルアップロードに失敗しました" },
      { status: 500 }
    );
  }
}


