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

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'daily';

    const { resources } = await FindAllChat();

    // データを日付でグループ化
    const groupedData: { [key: string]: number } = {};
    
    resources.forEach((thread) => {
      const date = new Date(thread.createdAt);
      let key: string;
      
      if (period === 'daily') {
        key = date.toISOString().split('T')[0];
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
      
      groupedData[key] = (groupedData[key] || 0) + 1;
    });

    // グラフ用データに変換
    const graphData = Object.entries(groupedData)
      .map(([date, count]) => ({
        date: period === 'daily' 
          ? new Date(date).toLocaleDateString('ja-JP')
          : `${date.split('-')[0]}年${date.split('-')[1]}月`,
        count
      }))
      .sort((a, b) => {
        if (period === 'daily') {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        } else {
          return a.date.localeCompare(b.date);
        }
      });

    return NextResponse.json({ data: graphData });
  } catch (error) {
    console.error('Graph API error:', error);
    return NextResponse.json({ error: "グラフデータの取得に失敗しました" }, { status: 500 });
  }
}
