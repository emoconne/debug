import OpenAI from "openai";

export interface DalleImageResponse {
  url: string;
  revisedPrompt?: string;
}

export class DalleImageService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.AZURE_OPENAI_DALLE_API_KEY,
      baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DALLE_DEPLOYMENT_NAME}`,
      defaultQuery: { 'api-version': process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview' },
      defaultHeaders: { 'api-key': process.env.AZURE_OPENAI_DALLE_API_KEY || '' },
    });
  }

  async generateImage(prompt: string): Promise<DalleImageResponse> {
    try {
      console.log('DALL-E: Generating image with prompt:', prompt);

      const response = await this.client.images.generate({
        model: process.env.AZURE_OPENAI_DALLE_DEPLOYMENT_NAME || "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        style: "natural",
      });

      if (response.data && response.data.length > 0) {
        const imageData = response.data[0];
        console.log('DALL-E: Image generated successfully');
        
        return {
          url: imageData.url || '',
          revisedPrompt: imageData.revised_prompt
        };
      } else {
        throw new Error('画像生成に失敗しました');
      }
    } catch (error) {
      console.error('DALL-E: Image generation error:', error);
      throw new Error(`画像生成エラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      }
    }

    // プロンプトをクリーンアップ
    prompt = prompt.replace(/^.*?(draw|illustrate|generate|create|picture|image)/i, '');
    prompt = prompt.trim();

    // デフォルトのスタイル指定を追加
    if (!prompt.includes('style') && !prompt.includes('スタイル')) {
      prompt += ', high quality, detailed';
    }

    return prompt;
  }
}
