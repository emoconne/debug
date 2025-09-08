import { NextResponse } from 'next/server';
import { DalleImageService } from '@/features/chat/chat-services/dalle-image-service';

export async function GET() {
  try {
    console.log('=== DALL-E Image Generation Test ===');
    
    // 設定の検証
    const configValidation = DalleImageService.validateConfiguration();
    if (!configValidation.isValid) {
      return NextResponse.json({
        status: 'error',
        error: 'DALL-E設定が無効です',
        errors: configValidation.errors
      }, { status: 400 });
    }

    // DALL-Eサービスの初期化テスト
    let dalleService;
    try {
      dalleService = new DalleImageService();
      console.log('DALL-E service initialized successfully');
    } catch (error) {
      console.error('DALL-E service initialization failed:', error);
      return NextResponse.json({
        status: 'error',
        error: 'DALL-Eサービスの初期化に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }

    // 簡単なテストプロンプトで画像生成をテスト
    const testPrompt = 'A simple red circle on white background';
    console.log('Testing with prompt:', testPrompt);

    try {
      const result = await dalleService.generateImage(testPrompt);
      console.log('Image generation successful:', result);
      
      return NextResponse.json({
        status: 'success',
        message: '画像生成が成功しました',
        result: {
          url: result.url,
          revisedPrompt: result.revisedPrompt
        }
      });
      
    } catch (error) {
      console.error('Image generation failed:', error);
      
      return NextResponse.json({
        status: 'error',
        error: '画像生成に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error',
        prompt: testPrompt
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('DALL-E Image Test Error:', error);
    
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
