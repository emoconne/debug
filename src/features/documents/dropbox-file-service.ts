import { CosmosDBContainer } from '@/features/common/cosmos';

export interface DropboxFileInfo {
  id: string;
  name: string;
  path: string;
  size: string;
  updatedAt: string;
  isFolder: boolean;
  depth: number;
  parentPath: string;
  // Dropbox固有のプロパティ
  accountId?: string;
  rev?: string;
  serverModified?: string;
  sharingInfo?: any;
  propertyGroups?: any[];
  hasExplicitSharedMembers?: boolean;
  contentHash?: string;
  // 追加情報
  version?: string;
  fileLink?: string;
  // メタデータ
  createdAt: string;
  updatedAt: string;
}

const CONTAINER_NAME = 'history';

export class DropboxFileService {
  private static async getContainer() {
    const cosmosInstance = CosmosDBContainer.getInstance();
    return await cosmosInstance.getContainer();
  }

  // ファイル情報を保存
  static async saveFileInfo(fileInfo: DropboxFileInfo): Promise<void> {
    try {
      const container = await this.getContainer();
      
      const document = {
        id: fileInfo.id,
        userId: 'system', // システム用のユーザーID
        ...fileInfo,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        type: 'dropbox-file'
      };

      await container.items.upsert(document);
      console.log(`Dropbox file saved: ${fileInfo.name}`);
    } catch (error) {
      console.error('Error saving Dropbox file info:', error);
      throw error;
    }
  }

  // 複数のファイル情報を一括保存
  static async saveMultipleFiles(files: DropboxFileInfo[]): Promise<void> {
    try {
      const container = await this.getContainer();
      
      const operations = files.map(file => ({
        operationType: 'Upsert',
        resourceBody: {
          id: file.id,
          userId: 'system', // システム用のユーザーID
          ...file,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          type: 'dropbox-file'
        }
      }));

      await container.items.bulk(operations);
      console.log(`Bulk saved ${files.length} Dropbox files`);
    } catch (error) {
      console.error('Error bulk saving Dropbox files:', error);
      throw error;
    }
  }

  // フォルダ内のファイル一覧を取得
  static async getFilesByFolder(folderPath: string): Promise<DropboxFileInfo[]> {
    try {
      const container = await this.getContainer();
      
      const query = `
        SELECT * FROM c 
        WHERE c.type = 'dropbox-file' 
        AND c.parentPath = @folderPath
        AND c.userId = 'system'
        ORDER BY c.isFolder DESC, c.name
      `;

      const { resources } = await container.items.query({
        query,
        parameters: [{ name: '@folderPath', value: folderPath }]
      });

      return resources as DropboxFileInfo[];
    } catch (error) {
      console.error('Error getting files by folder:', error);
      throw error;
    }
  }

  // すべてのファイル情報を取得
  static async getAllFiles(): Promise<DropboxFileInfo[]> {
    try {
      const container = await this.getContainer();
      
      const query = `
        SELECT * FROM c 
        WHERE c.type = 'dropbox-file'
        AND c.userId = 'system'
        ORDER BY c.path, c.name
      `;

      const { resources } = await container.items.query({ query });
      return resources as DropboxFileInfo[];
    } catch (error) {
      console.error('Error getting all files:', error);
      throw error;
    }
  }

  // ファイル情報を更新
  static async updateFileInfo(fileId: string, updates: Partial<DropboxFileInfo>): Promise<void> {
    try {
      const container = await this.getContainer();
      
      const existing = await container.item(fileId, 'system').read();
      const updated = {
        ...existing.resource,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      await container.item(fileId, 'system').replace(updated);
      console.log(`Dropbox file updated: ${fileId}`);
    } catch (error) {
      console.error('Error updating Dropbox file:', error);
      throw error;
    }
  }

  // ファイル情報を削除
  static async deleteFileInfo(fileId: string): Promise<void> {
    try {
      const container = await this.getContainer();
      await container.item(fileId, 'system').delete();
      console.log(`Dropbox file deleted: ${fileId}`);
    } catch (error) {
      console.error('Error deleting Dropbox file:', error);
      throw error;
    }
  }

  // フォルダ内のファイルを削除
  static async deleteFilesByFolder(folderPath: string): Promise<void> {
    try {
      const container = await this.getContainer();
      
      const query = `
        SELECT c.id FROM c 
        WHERE c.type = 'dropbox-file' 
        AND c.parentPath = @folderPath
        AND c.userId = 'system'
      `;

      const { resources } = await container.items.query({
        query,
        parameters: [{ name: '@folderPath', value: folderPath }]
      });

      const operations = resources.map((item: any) => ({
        operationType: 'Delete',
        id: item.id
      }));

      if (operations.length > 0) {
        await container.items.bulk(operations);
        console.log(`Deleted ${operations.length} files from folder: ${folderPath}`);
      }
    } catch (error) {
      console.error('Error deleting files by folder:', error);
      throw error;
    }
  }
}
