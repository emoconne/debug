import OpenAI from "openai";

export interface DalleImageResponse {
  url: string;
  revisedPrompt?: string;
}

export class DalleImageService {
  private endpoint: string;
  private apiKey: string;

  constructor() {
    // デバッグ情報を出力
    console.log('DALL-E: Initializing service with configuration:', {
      dalleEndpoint: process.env.AZURE_OPENAI_DALLE_ENDPOINT,
      deploymentName: process.env.AZURE_OPENAI_DALLE_DEPLOYMENT_NAME,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION,
      hasDalleApiKey: !!process.env.AZURE_OPENAI_DALLE_API_KEY
    });

    // DALL-E専用エンドポイントの使用
    const dalleEndpoint = process.env.AZURE_OPENAI_DALLE_ENDPOINT;
    if (!dalleEndpoint) {
      throw new Error('AZURE_OPENAI_DALLE_ENDPOINTが設定されていません');
    }
    
    const apiKey = process.env.AZURE_OPENAI_DALLE_API_KEY;
    if (!apiKey) {
      throw new Error('AZURE_OPENAI_DALLE_API_KEYが設定されていません');
    }

    this.endpoint = dalleEndpoint;
    this.apiKey = apiKey;
    
    console.log('DALL-E: Using configuration:', {
      endpoint: this.endpoint,
      hasApiKey: !!this.apiKey
    });
  }

  async generateImage(prompt: string): Promise<DalleImageResponse> {
    try {
      console.log('DALL-E: Generating image with prompt:', prompt);
      console.log('DALL-E: Using endpoint:', this.endpoint);

      // リクエストボディを構築
      const requestBody = {
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        style: "natural"
      };

      console.log('DALL-E: Request body:', JSON.stringify(requestBody, null, 2));

      // 直接HTTPリクエストを送信
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey
        },
        body: JSON.stringify(requestBody)
      });

      console.log('DALL-E: Response status:', response.status);
      console.log('DALL-E: Response status text:', response.statusText);
      console.log('DALL-E: Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('DALL-E: HTTP error response:', errorText);
        
        // エラーレスポンスをJSONとして解析を試行
        let errorData = null;
        try {
          errorData = JSON.parse(errorText);
        } catch (parseError) {
          console.log('DALL-E: Error response is not JSON');
        }
        
        // より詳細なエラー情報を提供
        let errorMessage = `HTTP ${response.status}: ${errorText}`;
        
        if (errorData && errorData.error) {
          const errorCode = errorData.error.code;
          const errorMsg = errorData.error.message;
          
          if (errorCode === '401') {
            errorMessage = `認証エラー (401): ${errorMsg}\n\n考えられる原因:\n- APIキーが間違っている\n- APIキーが正しいリソースに関連付けられていない\n- リソースが存在しない`;
          } else if (errorCode === '404') {
            errorMessage = `リソースが見つかりません (404): ${errorMsg}\n\n考えられる原因:\n- エンドポイントURLが間違っている\n- DALL-Eデプロイメントが存在しない\n- リソース名が間違っている`;
          } else if (errorCode === '400') {
            errorMessage = `リクエストエラー (400): ${errorMsg}\n\n考えられる原因:\n- プロンプトが不適切\n- パラメータが間違っている`;
          } else {
            errorMessage = `エラー (${errorCode}): ${errorMsg}`;
          }
        }
        
        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      console.log('DALL-E: Response data:', JSON.stringify(responseData, null, 2));

      if (responseData.data && responseData.data.length > 0) {
        const imageData = responseData.data[0];
        console.log('DALL-E: Image generated successfully');
        console.log('DALL-E: Image URL:', imageData.url);
        console.log('DALL-E: Revised prompt:', imageData.revised_prompt);
        
        return {
          url: imageData.url || '',
          revisedPrompt: imageData.revised_prompt
        };
      } else {
        throw new Error('画像生成に失敗しました: レスポンスに画像データが含まれていません');
      }
    } catch (error) {
      console.error('DALL-E: Image generation error:', error);
      
      // エラーメッセージをそのまま返す（既に詳細な情報を含んでいる）
      if (error instanceof Error) {
        throw new Error(`画像生成エラー: ${error.message}`);
      } else {
        throw new Error(`画像生成エラー: ${String(error)}`);
      }
    }
  }

  // 絵を描く指示かどうかを判定
  static isImageGenerationRequest(message: string): boolean {
    const imageKeywords = [
      '絵を描いて', 'イラストを描いて', '画像を生成して', '画像を作って',
      'draw', 'illustrate', 'generate image', 'create image',
      '絵', 'イラスト', '画像', 'picture', 'image'
    ];

    const lowerMessage = message.toLowerCase();
    return imageKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  // プロンプトを画像生成用に最適化
  static optimizePromptForImage(message: string): string {
    console.log('DALL-E: Original message:', message);
    
    // 絵を描く指示の部分を抽出
    let prompt = message;
    
    // 日本語の指示を英語に変換（基本的なもの）
    const translations: { [key: string]: string } = {
      '絵を描いて': 'Draw',
      'イラストを描いて': 'Draw an illustration of',
      '画像を生成して': 'Generate an image of',
      '画像を作って': 'Create an image of',
      '写真を撮って': 'Take a photo of',
      '写真を撮影して': 'Photograph'
    };

    for (const [japanese, english] of Object.entries(translations)) {
      if (prompt.includes(japanese)) {
        prompt = prompt.replace(japanese, english);
        console.log(`DALL-E: Translated "${japanese}" to "${english}"`);
      }
    }

    // プロンプトをクリーンアップ
    const originalPrompt = prompt;
    prompt = prompt.replace(/^.*?(draw|illustrate|generate|create|picture|image)/i, '');
    prompt = prompt.trim();
    
    if (originalPrompt !== prompt) {
      console.log('DALL-E: Cleaned up prompt:', prompt);
    }

    // デフォルトのスタイル指定を追加
    if (!prompt.includes('style') && !prompt.includes('スタイル')) {
      prompt += ', high quality, detailed';
      console.log('DALL-E: Added default style to prompt');
    }

    console.log('DALL-E: Final optimized prompt:', prompt);
    return prompt;
  }

  // 設定の検証
  static validateConfiguration(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!process.env.AZURE_OPENAI_DALLE_ENDPOINT) {
      errors.push('AZURE_OPENAI_DALLE_ENDPOINTが設定されていません');
    }
    
    if (!process.env.AZURE_OPENAI_DALLE_API_KEY) {
      errors.push('AZURE_OPENAI_DALLE_API_KEYが設定されていません');
    }
    
    // 現在の設定状況をログ出力
    console.log('DALL-E Configuration Status:', {
      hasDalleEndpoint: !!process.env.AZURE_OPENAI_DALLE_ENDPOINT,
      hasDalleApiKey: !!process.env.AZURE_OPENAI_DALLE_API_KEY,
      dalleEndpoint: process.env.AZURE_OPENAI_DALLE_ENDPOINT,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION
    });
    
    // 設定が不完全な場合の詳細情報
    if (!process.env.AZURE_OPENAI_DALLE_ENDPOINT) {
      console.warn('DALL-E: AZURE_OPENAI_DALLE_ENDPOINTが設定されていません');
    }
    
    if (!process.env.AZURE_OPENAI_DALLE_API_KEY) {
      console.warn('DALL-E: AZURE_OPENAI_DALLE_API_KEYが設定されていません');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
