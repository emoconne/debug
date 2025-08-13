import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/features/auth/auth-api";
import { uploadFileToDepartment } from "@/features/documents/document-management-service";

export async function POST(request: NextRequest) {
  console.log('=== UPLOAD ROUTE START ===');
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    if (!session.user.isAdmin) {
      return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    }

    console.log('Debug: Starting file upload process');
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const departmentId = formData.get('departmentId') as string;

    if (!file) {
      console.log('Debug: No file found in form data');
      return NextResponse.json({ error: "ファイルが選択されていません" }, { status: 400 });
    }

    if (!departmentId) {
      console.log('Debug: No department ID found in form data');
      return NextResponse.json({ error: "部門が選択されていません" }, { status: 400 });
    }

    console.log('Debug: File details:', {
      name: file.name,
      type: file.type,
      size: file.size,
      departmentId
    });

    // 新しいアップロード関数を使用
    const result = await uploadFileToDepartment(file, departmentId);
    
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
    console.error("ファイルアップロードエラー:", error);
    return NextResponse.json(
      { error: "ファイルアップロードに失敗しました" },
      { status: 500 }
    );
  }
} 