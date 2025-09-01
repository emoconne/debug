import { Client } from "@microsoft/microsoft-graph-client";
import { ConfidentialClientApplication } from "@azure/msal-node";

interface EntraUser {
  id: string;
  userPrincipalName: string;
  displayName: string;
  mail?: string;
  jobTitle?: string;
  department?: string;
  accountEnabled: boolean;
}

export class MicrosoftGraphService {
  private msalClient: ConfidentialClientApplication;
  private graphClient: Client;

  constructor() {
    // MSALクライアントの初期化
    this.msalClient = new ConfidentialClientApplication({
      auth: {
        clientId: process.env.AZURE_AD_CLIENT_ID!,
        clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
        authority: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}`,
      },
    });

    // Graphクライアントの初期化
    this.graphClient = Client.init({
      authProvider: async (done) => {
        try {
          const result = await this.msalClient.acquireTokenByClientCredential({
            scopes: ['https://graph.microsoft.com/.default'],
          });
          done(null, result.accessToken);
        } catch (error) {
          done(error as Error, null);
        }
      },
    });
  }

  async getUsers(): Promise<EntraUser[]> {
    try {
      console.log("Microsoft Graph API: ユーザー一覧取得開始");
      
      const response = await this.graphClient
        .api('/users')
        .select('id,userPrincipalName,displayName,mail,jobTitle,department,accountEnabled')
        .filter('accountEnabled eq true')
        .orderBy('displayName')
        .get();

      console.log(`Microsoft Graph API: ${response.value.length}件のユーザーを取得`);

      return response.value.map((user: any) => ({
        id: user.id,
        userPrincipalName: user.userPrincipalName,
        displayName: user.displayName || '名前未設定',
        mail: user.mail,
        jobTitle: user.jobTitle,
        department: user.department,
        accountEnabled: user.accountEnabled,
      }));

    } catch (error) {
      console.error("Microsoft Graph API エラー:", error);
      throw new Error(`ユーザー一覧の取得に失敗しました: ${error}`);
    }
  }

  async getUserById(userId: string): Promise<EntraUser | null> {
    try {
      console.log(`Microsoft Graph API: ユーザー取得開始 (ID: ${userId})`);
      
      const user = await this.graphClient
        .api(`/users/${userId}`)
        .select('id,userPrincipalName,displayName,mail,jobTitle,department,accountEnabled')
        .get();

      return {
        id: user.id,
        userPrincipalName: user.userPrincipalName,
        displayName: user.displayName || '名前未設定',
        mail: user.mail,
        jobTitle: user.jobTitle,
        department: user.department,
        accountEnabled: user.accountEnabled,
      };

    } catch (error) {
      console.error(`Microsoft Graph API エラー (ユーザーID: ${userId}):`, error);
      return null;
    }
  }
}

// シングルトンインスタンス
let graphService: MicrosoftGraphService | null = null;

export function getMicrosoftGraphService(): MicrosoftGraphService {
  if (!graphService) {
    graphService = new MicrosoftGraphService();
  }
  return graphService;
}
