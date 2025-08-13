import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/features/auth/auth-api";
import { FindAllChat } from "@/features/reporting/reporting-service";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    }

    const { resources } = await FindAllChat();

    // CSVヘッダー
    const csvHeader = "会話日時,ユーザー名,タイトル,チャットタイプ,チャットドキュメント\n";
    
    // CSVデータ
    const csvData = resources.map((thread) => {
      const date = new Date(thread.createdAt).toLocaleDateString("ja-JP");
      const time = new Date(thread.createdAt).toLocaleTimeString();
      return `"${date} ${time}","${thread.useName || ''}","${thread.name || ''}","${thread.chatType || ''}","${thread.chatDoc || ''}"`;
    }).join("\n");

    const csvContent = csvHeader + csvData;

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="chat-report-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('CSV download error:', error);
    return NextResponse.json({ error: "CSVダウンロードに失敗しました" }, { status: 500 });
  }
}
