import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/features/auth/auth-api";
import { saveDropboxSettings } from "@/features/settings/dropbox-settings-service";

// Dropbox OAuth2設定
const DROPBOX_APP_KEY = process.env.DROPBOX_APP_KEY || '';
const DROPBOX_APP_SECRET = process.env.DROPBOX_APP_SECRET || '';
const REDIRECT_URI = 'http://localhost:3000/api/auth/dropbox/callback';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }

    if (!session.user.isAdmin) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      console.error("Dropbox OAuth2 error:", error);
      return NextResponse.redirect(new URL('/settings?dropbox_error=' + encodeURIComponent(error), request.url));
    }

    if (!code) {
      return NextResponse.redirect(new URL('/settings?dropbox_error=no_code', request.url));
    }

    if (!DROPBOX_APP_KEY || !DROPBOX_APP_SECRET) {
      return NextResponse.redirect(new URL('/settings?dropbox_error=missing_config', request.url));
    }

    try {
      // アクセストークンを取得
      const tokenResponse = await fetch('https://api.dropboxapi.com/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code: code,
          grant_type: 'authorization_code',
          client_id: DROPBOX_APP_KEY,
          client_secret: DROPBOX_APP_SECRET,
          redirect_uri: REDIRECT_URI,
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error("Dropbox token exchange error:", errorText);
        return NextResponse.redirect(new URL('/settings?dropbox_error=token_exchange_failed', request.url));
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;
      const refreshToken = tokenData.refresh_token;
      const expiresIn = tokenData.expires_in;
      
      console.log('Dropbox token data received:', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        expiresIn: expiresIn
      });

      // アカウント情報を取得
      const accountResponse = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!accountResponse.ok) {
        return NextResponse.redirect(new URL('/settings?dropbox_error=account_info_failed', request.url));
      }

      const accountData = await accountResponse.json();

      // 設定を保存（リフレッシュトークンも含む）
      await saveDropboxSettings({
        accessToken,
        refreshToken,
        expiresIn,
        folderPath: '', // ルートフォルダは空文字列で指定
        autoSync: false,
        syncInterval: '15分',
        isActive: true,
      });

      // 成功時に設定ページにリダイレクト
      return NextResponse.redirect(new URL('/settings?dropbox_success=true&account_name=' + encodeURIComponent(accountData.name.display_name), request.url));

    } catch (tokenError) {
      console.error("Dropbox token exchange error:", tokenError);
      return NextResponse.redirect(new URL('/settings?dropbox_error=token_exchange_exception', request.url));
    }

  } catch (error) {
    console.error("Dropbox OAuth2 callback error:", error);
    return NextResponse.redirect(new URL('/settings?dropbox_error=callback_exception', request.url));
  }
}
