import { NextRequest, NextResponse } from "next/server";

// 仮のデータストア（実際のアプリケーションではデータベースを使用）
let gpts = [
  {
    id: "1",
    name: "天気ナビ",
    description: "天気予報をわかりやすく教えるアシスタント",
    instructions: "あなたは天気予報アシスタントです。",
    conversationStarters: [
      "東京の明日の天気を教えて",
      "今日の名古屋の気温は?",
      "あああ"
    ],
    isPrivate: true,
    status: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "2",
    name: "Untitled",
    description: "天気予報をわかりやすく教えるアシスタント",
    instructions: "あなたは天気予報アシスタントです。",
    conversationStarters: [
      "東京の明日の天気を教えて",
      "今日の名古屋の気温は?"
    ],
    isPrivate: true,
    status: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// GET: GPT一覧取得
export async function GET() {
  try {
    return NextResponse.json({ gpts });
  } catch (error) {
    return NextResponse.json(
      { error: "GPT一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// POST: 新しいGPT作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, instructions, conversationStarters } = body;

    const newGpt = {
      id: Date.now().toString(),
      name: name || "Untitled",
      description: description || "",
      instructions: instructions || "",
      conversationStarters: conversationStarters || [],
      isPrivate: true,
      status: "draft" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    gpts.push(newGpt);

    return NextResponse.json({ gpt: newGpt }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "GPTの作成に失敗しました" },
      { status: 500 }
    );
  }
}

// PUT: GPT更新
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, description, instructions, conversationStarters } = body;

    const gptIndex = gpts.findIndex(gpt => gpt.id === id);
    if (gptIndex === -1) {
      return NextResponse.json(
        { error: "GPTが見つかりません" },
        { status: 404 }
      );
    }

    gpts[gptIndex] = {
      ...gpts[gptIndex],
      name: name || gpts[gptIndex].name,
      description: description || gpts[gptIndex].description,
      instructions: instructions || gpts[gptIndex].instructions,
      conversationStarters: conversationStarters || gpts[gptIndex].conversationStarters,
      updatedAt: new Date().toISOString()
    };

    return NextResponse.json({ gpt: gpts[gptIndex] });
  } catch (error) {
    return NextResponse.json(
      { error: "GPTの更新に失敗しました" },
      { status: 500 }
    );
  }
}

// DELETE: GPT削除
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "GPT IDが必要です" },
        { status: 400 }
      );
    }

    const gptIndex = gpts.findIndex(gpt => gpt.id === id);
    if (gptIndex === -1) {
      return NextResponse.json(
        { error: "GPTが見つかりません" },
        { status: 404 }
      );
    }

    const deletedGpt = gpts.splice(gptIndex, 1)[0];

    return NextResponse.json({ message: "GPTが削除されました", gpt: deletedGpt });
  } catch (error) {
    return NextResponse.json(
      { error: "GPTの削除に失敗しました" },
      { status: 500 }
    );
  }
}
