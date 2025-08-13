import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/features/auth/auth-api";
import { getAllDepartments } from "@/features/documents/cosmos-db-dept-service";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const departments = await getAllDepartments();
    
    return NextResponse.json({
      departments: departments.map(dept => ({
        id: dept.id,
        name: dept.name,
        blobContainerName: dept.blobContainerName
      }))
    });

  } catch (error) {
    console.error("部門一覧取得エラー:", error);
    return NextResponse.json(
      { error: "部門一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}
