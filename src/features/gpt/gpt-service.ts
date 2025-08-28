export interface GptItem {
  id: string;
  name: string;
  description: string;
  instructions: string;
  conversationStarters: string[];
  isPrivate: boolean;
  status: "draft" | "published";
  createdAt: string;
  updatedAt: string;
}

export interface CreateGptRequest {
  name?: string;
  description?: string;
  instructions?: string;
  conversationStarters?: string[];
}

export interface UpdateGptRequest {
  id: string;
  name?: string;
  description?: string;
  instructions?: string;
  conversationStarters?: string[];
}

// GPT一覧取得
export async function getGpts(): Promise<GptItem[]> {
  try {
    const response = await fetch("/api/gpt");
    if (!response.ok) {
      throw new Error("GPT一覧の取得に失敗しました");
    }
    const data = await response.json();
    return data.gpts;
  } catch (error) {
    console.error("GPT一覧取得エラー:", error);
    throw error;
  }
}

// 新しいGPT作成
export async function createGpt(request: CreateGptRequest): Promise<GptItem> {
  try {
    const response = await fetch("/api/gpt", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error("GPTの作成に失敗しました");
    }

    const data = await response.json();
    return data.gpt;
  } catch (error) {
    console.error("GPT作成エラー:", error);
    throw error;
  }
}

// GPT更新
export async function updateGpt(request: UpdateGptRequest): Promise<GptItem> {
  try {
    const response = await fetch("/api/gpt", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error("GPTの更新に失敗しました");
    }

    const data = await response.json();
    return data.gpt;
  } catch (error) {
    console.error("GPT更新エラー:", error);
    throw error;
  }
}

// GPT削除
export async function deleteGpt(id: string): Promise<void> {
  try {
    const response = await fetch(`/api/gpt?id=${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("GPTの削除に失敗しました");
    }
  } catch (error) {
    console.error("GPT削除エラー:", error);
    throw error;
  }
}

// 特定のGPT取得
export async function getGpt(id: string): Promise<GptItem> {
  try {
    const gpts = await getGpts();
    const gpt = gpts.find(g => g.id === id);
    if (!gpt) {
      throw new Error("GPTが見つかりません");
    }
    return gpt;
  } catch (error) {
    console.error("GPT取得エラー:", error);
    throw error;
  }
}
