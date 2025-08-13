import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/features/auth/auth-api";
import { FindAllChatThreadsForReporting } from "@/features/reporting/reporting-service";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const pageSize = Number(searchParams.get('pageSize')) || 10;
    const pageNumber = Number(searchParams.get('pageNumber')) || 0;

    const { resources } = await FindAllChatThreadsForReporting(pageSize, pageNumber);

    return NextResponse.json({ resources });
  } catch (error) {
    console.error('Reporting API error:', error);
    return NextResponse.json({ error: "レポートの取得に失敗しました" }, { status: 500 });
  }
}
