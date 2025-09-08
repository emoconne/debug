import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    console.log('=== Speech Configuration Debug API ===');
    
    const speechEndpoint = process.env.AZURE_SPEECH_ENDPOINT;
    const speechRegion = process.env.AZURE_SPEECH_REGION;
    const speechKey = process.env.AZURE_SPEECH_KEY;
    
    console.log('Environment variables:');
    console.log('AZURE_SPEECH_ENDPOINT:', speechEndpoint ? 'SET' : 'NOT SET');
    console.log('AZURE_SPEECH_REGION:', speechRegion ? 'SET' : 'NOT SET');
    console.log('AZURE_SPEECH_KEY:', speechKey ? 'SET' : 'NOT SET');
    
    if (speechEndpoint) {
      console.log('AZURE_SPEECH_ENDPOINT value:', speechEndpoint);
    }
    if (speechRegion) {
      console.log('AZURE_SPEECH_REGION value:', speechRegion);
    }
    if (speechKey) {
      console.log('AZURE_SPEECH_KEY length:', speechKey.length);
    }
    
    // 設定の検証
    const config = {
      endpoint: speechEndpoint || null,
      region: speechRegion || null,
      hasKey: !!speechKey,
      keyLength: speechKey ? speechKey.length : 0,
      isValid: !!(speechKey && (speechEndpoint || speechRegion))
    };
    
    console.log('Configuration validation:', config);
    
    // 推奨設定の提案
    const recommendations = [];
    if (!speechKey) {
      recommendations.push('AZURE_SPEECH_KEYを設定してください');
    }
    if (!speechEndpoint && !speechRegion) {
      recommendations.push('AZURE_SPEECH_ENDPOINTまたはAZURE_SPEECH_REGIONのいずれかを設定してください');
    }
    if (speechEndpoint && speechRegion) {
      recommendations.push('AZURE_SPEECH_ENDPOINTとAZURE_SPEECH_REGIONの両方が設定されています。AZURE_SPEECH_ENDPOINTが優先されます');
    }
    
    return NextResponse.json({
      success: true,
      environment: {
        endpoint: speechEndpoint ? 'SET' : 'NOT SET',
        region: speechRegion ? 'SET' : 'NOT SET',
        hasKey: !!speechKey,
        keyLength: speechKey ? speechKey.length : 0
      },
      config,
      recommendations,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Speech Configuration Debug API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
