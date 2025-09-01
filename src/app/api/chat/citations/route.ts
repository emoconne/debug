import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/features/auth/auth-api";
import { CitationItem } from "@/features/chat/chat-ui/citation-panel";
import { FindAllChatsInThread } from "@/features/reporting/reporting-service";
import { similaritySearchVectorWithScore } from "@/features/chat/chat-services/azure-cog-search/azure-cog-vector-store";
import { getDepartment } from "@/features/documents/cosmos-db-dept-service";

// Citationデータを取得するAPIエンドポイント
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const chatThreadId = searchParams.get('chatThreadId');

    if (!chatThreadId) {
      return NextResponse.json({ error: "チャットスレッドIDが必要です" }, { status: 400 });
    }

    // チャット履歴から最後のメッセージを取得
    const chats = await FindAllChatsInThread(chatThreadId);
    if (chats.length === 0) {
      return NextResponse.json({ citations: [] });
    }

    const lastMessage = chats[chats.length - 1];
    if (lastMessage.role !== 'user') {
      return NextResponse.json({ citations: [] });
    }

    // チャットタイプに応じて検索を実行
    let citations: CitationItem[] = [];
    
    // チャットスレッドの情報からタイプを判定（簡易的な実装）
    // 実際の実装では、チャットスレッドのメタデータから判定する必要があります
    const isDocChat = chatThreadId.includes('doc') || lastMessage.content.includes('社内');
    
    if (isDocChat) {
      // 社内FAQ検索
      const relevantDocuments = await similaritySearchVectorWithScore(lastMessage.content, 10, {
        filter: `chatType eq 'doc'`,
      });
      
      citations = relevantDocuments.map((doc) => ({
        id: doc.id,
        metadata: doc.metadata || doc.fileName || '不明なファイル',
        pageContent: doc.pageContent || '',
        sasUrl: doc.sasUrl,
        score: doc['@search.score'],
        deptName: doc.deptName,
        documentId: doc.chatThreadId,
      }));
    } else {
      // ファイル読み込み検索
      const relevantDocuments = await similaritySearchVectorWithScore(lastMessage.content, 10, {
        filter: `user eq '${session.user.id}' and chatThreadId eq '${chatThreadId}' and chatType eq 'data'`,
      });
      
      citations = relevantDocuments.map((doc) => ({
        id: doc.id,
        metadata: doc.metadata || doc.fileName || '不明なファイル',
        pageContent: doc.pageContent || '',
        sasUrl: doc.sasUrl,
        score: doc['@search.score'],
        deptName: doc.deptName,
        documentId: doc.chatThreadId,
      }));
    }

    return NextResponse.json({
      success: true,
      citations: citations
    });

  } catch (error) {
    console.error("Citation取得エラー:", error);
    return NextResponse.json(
      { error: "Citationデータの取得に失敗しました" },
      { status: 500 }
    );
  }
}

// Citationデータを設定するAPIエンドポイント（既存）
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { citations, chatThreadId } = await request.json();

    if (!Array.isArray(citations)) {
      return NextResponse.json({ error: "Citationデータが不正です" }, { status: 400 });
    }

    // ここでCitationデータを保存またはキャッシュする処理を実装
    // 現在は単純にレスポンスを返す
    console.log('Setting citations for chat thread:', chatThreadId);
    console.log('Citations count:', citations.length);

    return NextResponse.json({
      success: true,
      message: "Citationデータが設定されました",
      citations: citations
    });

  } catch (error) {
    console.error("Citation設定エラー:", error);
    return NextResponse.json(
      { error: "Citationデータの設定に失敗しました" },
      { status: 500 }
    );
  }
}
