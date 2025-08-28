import { BlobServiceClient, ContainerClient, BlockBlobClient } from '@azure/storage-blob';
import { CosmosClient, Container } from '@azure/cosmos';

export interface BlobFileMetadata {
  id: string;
  dataType: string;
  data: {
    fileName: string;
    originalFileName: string;
    fileType: string;
    fileSize: number;
    uploadedBy: string;
    uploadedAt: string;
    blobUrl: string;
    blobName: string;
    containerName: string;
    status: string;
    isDeleted: boolean;
    updatedAt: string;
    version: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface UploadResult {
  success: boolean;
  fileMetadata?: BlobFileMetadata;
  error?: string;
}

export class BlobFileManagementService {

  private blobServiceClient: BlobServiceClient;
  private cosmosClient: CosmosClient;
  private cosmosContainer: Container;
  private database: any;

  constructor() {
    console.log('BlobFileManagementService constructor - Starting initialization');
    // 環境変数のチェックは実際に使用する時に行う
    console.log('BlobFileManagementService constructor - Initialization completed');
  }

  // コンテナの初期化（存在しない場合は作成）
  async initializeContainer(): Promise<void> {
    try {
      console.log('BlobFileManagementService.initializeContainer - Checking if container exists');
      await this.cosmosContainer.read();
      console.log('BlobFileManagementService.initializeContainer - Container exists');
    } catch (error) {
      console.log('BlobFileManagementService.initializeContainer - Container does not exist, creating...');
      await this.database.containers.createIfNotExists({
        id: 'blob-files',
        partitionKey: {
          paths: ['/containerName'],
        },
      });
      console.log('BlobFileManagementService.initializeContainer - Container created successfully');
    }
  }

  // コンテナ一覧を取得
  async getContainers(): Promise<string[]> {
    try {
      const containers: string[] = [];
      for await (const container of this.blobServiceClient.listContainers()) {
        containers.push(container.name);
      }
      return containers;
    } catch (error) {
      console.error('Error getting containers:', error);
      throw new Error('コンテナ一覧の取得に失敗しました');
    }
  }

  // ファイルをアップロード
  async uploadFile(
    file: any, // サーバーサイドでのFile型の問題を回避
    containerName: string,
    uploadedBy: string
  ): Promise<UploadResult> {
    try {
      // コンテナが存在しない場合は作成
      const containerClient = this.blobServiceClient.getContainerClient(containerName);
      await containerClient.createIfNotExists();

      // 部門名を取得
      let departmentName = containerName; // デフォルトはコンテナ名
      try {
        const response = await fetch('/api/departments');
        if (response.ok) {
          const data = await response.json();
          const department = data.departments?.find((dept: any) => dept.blobContainerName === containerName);
          if (department) {
            departmentName = department.name;
          }
        }
      } catch (error) {
        console.warn('部門名の取得に失敗しました。コンテナ名を使用します:', error);
      }

      // 日本語ファイル名をそのままBLOB名として使用
      const originalFileName = file.name;
      const blobName = originalFileName;

      // BLOBクライアントを取得
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      // 同名ファイルが既に存在するかチェック
      console.log('BlobFileManagementService.uploadFile - Checking for existing file with same name');
      const existingFile = await this.getFileByContainerAndFileName(containerName, originalFileName);
      
      let fileMetadata: BlobFileMetadata;
      const now = new Date().toISOString();
      const blobUrl = blockBlobClient.url;

      if (existingFile) {
        // 既存ファイルの場合は更新
        console.log('BlobFileManagementService.uploadFile - Existing file found, updating');
        
        // 既存のBLOBを削除して新しいファイルをアップロード
        await blockBlobClient.deleteIfExists();
        
        // ファイルをアップロード
        const arrayBuffer = await file.arrayBuffer();
        await blockBlobClient.upload(arrayBuffer, arrayBuffer.byteLength, {
          blobHTTPHeaders: {
            blobContentType: file.type,
          },
        });

        // 既存メタデータを更新
        fileMetadata = {
          ...existingFile,
          data: {
            ...existingFile.data,
            fileName: originalFileName,
            originalFileName: originalFileName, // オリジナルファイル名を保存
            fileType: file.type,
            fileSize: file.size,
            uploadedBy: uploadedBy,
            updatedAt: now,
            version: existingFile.data.version + 1, // バージョンをインクリメント
            containerName: departmentName, // 部門名を保存
          },
          updatedAt: now,
        };

        // BLOBストレージのメタデータを設定
        console.log('BlobFileManagementService.uploadFile - Setting BLOB metadata for existing file');
        await blockBlobClient.setMetadata({
          originalFileName: encodeURIComponent(originalFileName),
          fileType: file.type,
          fileSize: file.size.toString(),
          uploadedBy: uploadedBy,
          uploadedAt: existingFile.data.uploadedAt,
          updatedAt: now,
          version: (existingFile.data.version + 1).toString(),
          containerName: departmentName, // 部門名を保存
        });
        console.log('BlobFileManagementService.uploadFile - BLOB metadata set successfully');

        // CosmosDBのメタデータを更新
        console.log('BlobFileManagementService.uploadFile - Updating existing metadata in CosmosDB');
        await this.cosmosContainer.item(existingFile.id, existingFile.data.containerName).replace(fileMetadata);
        console.log('BlobFileManagementService.uploadFile - Updated existing metadata successfully');
      } else {
        // 新規ファイルの場合は新規作成
        console.log('BlobFileManagementService.uploadFile - New file, creating metadata');
        
        // ファイルをアップロード
        const arrayBuffer = await file.arrayBuffer();
        await blockBlobClient.upload(arrayBuffer, arrayBuffer.byteLength, {
          blobHTTPHeaders: {
            blobContentType: file.type,
          },
        });

        // BLOBストレージのメタデータを設定
        console.log('BlobFileManagementService.uploadFile - Setting BLOB metadata for new file');
        await blockBlobClient.setMetadata({
          originalFileName: encodeURIComponent(originalFileName),
          fileType: file.type,
          fileSize: file.size.toString(),
          uploadedBy: uploadedBy,
          uploadedAt: now,
          updatedAt: now,
          version: "1",
          containerName: departmentName, // 部門名を保存
        });
        console.log('BlobFileManagementService.uploadFile - BLOB metadata set successfully');

        // 新規メタデータを作成
        const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        fileMetadata = {
          id: fileId,
          dataType: "file",
          data: {
            fileName: originalFileName,
            originalFileName: originalFileName, // オリジナルファイル名を保存
            fileType: file.type,
            fileSize: file.size,
            uploadedBy: uploadedBy,
            uploadedAt: now,
            blobUrl: blobUrl,
            blobName: blobName,
            containerName: departmentName, // 部門名を保存
            status: "", // 空文字で初期化、後でバッチ処理で更新
            isDeleted: false,
            updatedAt: now,
            version: 1, // 初期バージョン
          },
          createdAt: now,
          updatedAt: now,
        };

        // CosmosDBに保存
        console.log('BlobFileManagementService.uploadFile - Saving new metadata to CosmosDB');
        await this.cosmosContainer.items.create(fileMetadata);
        console.log('BlobFileManagementService.uploadFile - Saved new metadata successfully');
      }
      
      console.log('BlobFileManagementService.uploadFile - Final fileMetadata:', {
        id: fileMetadata.id,
        dataType: fileMetadata.dataType,
        data: fileMetadata.data,
        createdAt: fileMetadata.createdAt,
        updatedAt: fileMetadata.updatedAt
      });

      return {
        success: true,
        fileMetadata: fileMetadata,
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'ファイルのアップロードに失敗しました',
      };
    }
  }

  // BLOBストレージからメタデータを読み取り
  async getBlobMetadata(containerName: string, blobName: string): Promise<any> {
    try {
      console.log('BlobFileManagementService.getBlobMetadata - Starting');
      
      const containerClient = this.blobServiceClient.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      
      const properties = await blockBlobClient.getProperties();
      const metadata = properties.metadata || {};
      
      // メタデータをデコードして使用
      const decodedMetadata = {
        originalFileName: metadata.originalFileName ? decodeURIComponent(metadata.originalFileName) : '',
        fileType: metadata.fileType || '',
        fileSize: metadata.fileSize || '',
        uploadedBy: metadata.uploadedBy || '',
        uploadedAt: metadata.uploadedAt || '',
        updatedAt: metadata.updatedAt || '',
        version: metadata.version || '1',
        containerName: metadata.containerName || '',
      };
      
      console.log('BlobFileManagementService.getBlobMetadata - Decoded metadata:', decodedMetadata);
      return decodedMetadata;
    } catch (error) {
      console.error('BlobFileManagementService.getBlobMetadata - Error:', error);
      throw error;
    }
  }

  // BLOBストレージのメタデータを更新
  async updateBlobMetadata(fileId: string): Promise<boolean> {
    try {
      console.log('BlobFileManagementService.updateBlobMetadata - Starting with fileId:', fileId);
      
      // ファイルメタデータを取得
      const query = 'SELECT * FROM c WHERE c.id = @fileId AND c.dataType = "file"';
      const { resources } = await this.cosmosContainer.items.query<BlobFileMetadata>(query, {
        parameters: [{ name: '@fileId', value: fileId }],
        enableCrossPartitionQuery: true
      } as any).fetchAll();
      
      if (resources.length === 0) {
        console.error('BlobFileManagementService.updateBlobMetadata - File not found');
        return false;
      }
      
      const fileMetadata = resources[0];
      const { containerName, blobName } = fileMetadata.data;
      
      // BLOBクライアントを取得
      const containerClient = this.blobServiceClient.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      
      // BLOBストレージのメタデータを設定
      await blockBlobClient.setMetadata({
        originalFileName: encodeURIComponent(fileMetadata.data.originalFileName),
        fileType: fileMetadata.data.fileType,
        fileSize: fileMetadata.data.fileSize.toString(),
        uploadedBy: fileMetadata.data.uploadedBy,
        uploadedAt: fileMetadata.data.uploadedAt,
        updatedAt: fileMetadata.data.updatedAt,
        version: fileMetadata.data.version.toString(),
        containerName: fileMetadata.data.containerName,
      });
      
      console.log('BlobFileManagementService.updateBlobMetadata - BLOB metadata updated successfully');
      return true;
    } catch (error) {
      console.error('BlobFileManagementService.updateBlobMetadata - Error:', error);
      return false;
    }
  }

  // コンテナ名とファイル名でファイルを取得
  private async getFileByContainerAndFileName(containerName: string, fileName: string): Promise<BlobFileMetadata | null> {
    try {
      const query = `
        SELECT * FROM c 
        WHERE c.dataType = "file" 
        AND c.data.containerName = @containerName 
        AND c.data.fileName = @fileName 
        AND c.data.isDeleted = false
      `;
      
      const { resources } = await this.cosmosContainer.items.query<BlobFileMetadata>(query, {
        parameters: [
          { name: '@containerName', value: containerName },
          { name: '@fileName', value: fileName }
        ],
        enableCrossPartitionQuery: true
      } as any).fetchAll();
      
      return resources.length > 0 ? resources[0] : null;
    } catch (error) {
      console.error('Error getting file by container and file name:', error);
      return null;
    }
  }

  // ファイル一覧を取得
  async getFiles(containerName?: string): Promise<BlobFileMetadata[]> {
    try {
      console.log('BlobFileManagementService.getFiles - Starting with containerName:', containerName);
      
      // まず、すべてのファイルを取得
      let query = 'SELECT * FROM c WHERE c.dataType = "file"';
      console.log('BlobFileManagementService.getFiles - Initial query:', query);
      
      const { resources: allFiles } = await this.cosmosContainer.items.query<BlobFileMetadata>(query, {
        enableCrossPartitionQuery: true
      } as any).fetchAll();
      
      console.log('BlobFileManagementService.getFiles - All files count:', allFiles.length);
      console.log('BlobFileManagementService.getFiles - All files raw data:', allFiles.map(file => ({
        id: file.id,
        dataType: file.dataType,
        data: file.data,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt
      })));
      
      // フィルタリングをJavaScriptで実行
      let filteredFiles = allFiles.filter(file => !file.data.isDeleted);
      console.log('BlobFileManagementService.getFiles - After isDeleted filter:', filteredFiles.length);
      
      if (containerName) {
        filteredFiles = filteredFiles.filter(file => file.data.containerName === containerName);
        console.log('BlobFileManagementService.getFiles - After containerName filter:', filteredFiles.length);
      }
      
      // 古いデータを新しい形式に変換（互換性のため）
      filteredFiles = filteredFiles.map(file => {
        if (!file.data.originalFileName) {
          file.data.originalFileName = file.data.fileName;
        }
        if (!file.data.version) {
          file.data.version = 1;
        }
        return file;
      });
      
      // 日付順でソート
      filteredFiles.sort((a, b) => new Date(b.data.uploadedAt).getTime() - new Date(a.data.uploadedAt).getTime());
      
      console.log('BlobFileManagementService.getFiles - Final files count:', filteredFiles.length);
      if (filteredFiles.length > 0) {
        console.log('BlobFileManagementService.getFiles - Sample file:', {
          id: filteredFiles[0].id,
          fileName: filteredFiles[0].data.fileName,
          containerName: filteredFiles[0].data.containerName,
          isDeleted: filteredFiles[0].data.isDeleted
        });
      }
      
      return filteredFiles;
    } catch (error) {
      console.error('Error getting files:', error);
      throw new Error('ファイル一覧の取得に失敗しました');
    }
  }

  // ファイルを削除
  async deleteFile(fileId: string): Promise<boolean> {
    try {
      console.log('BlobFileManagementService.deleteFile - Starting with fileId:', fileId);
      
      // まず、ファイルIDでファイルを検索
      const query = `SELECT * FROM c WHERE c.id = "${fileId}" AND c.dataType = "file"`;
      console.log('BlobFileManagementService.deleteFile - Query:', query);
      
      const { resources: files } = await this.cosmosContainer.items.query<BlobFileMetadata>(query, {
        enableCrossPartitionQuery: true
      } as any).fetchAll();
      
      console.log('BlobFileManagementService.deleteFile - Found files count:', files.length);
      
      if (files.length === 0) {
        throw new Error('ファイルが見つかりません');
      }
      
      const fileMetadata = files[0];
      console.log('BlobFileManagementService.deleteFile - Found file:', {
        id: fileMetadata.id,
        containerName: fileMetadata.data.containerName,
        fileName: fileMetadata.data.fileName
      });

      // BLOBから削除
      const containerClient = this.blobServiceClient.getContainerClient(fileMetadata.data.containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(fileMetadata.data.blobName);
      console.log('BlobFileManagementService.deleteFile - Deleting blob:', fileMetadata.data.blobName);
      await blockBlobClient.deleteIfExists().catch(error => {
        console.log('BlobFileManagementService.deleteFile - Blob delete error (ignored):', error);
      });

      // CosmosDBで論理削除（UPDATE文を使用）
      const updateQuery = {
        query: `UPDATE c SET c.data.isDeleted = true, c.data.updatedAt = @updatedAt, c.updatedAt = @updatedAt WHERE c.id = @fileId AND c.dataType = "file"`,
        parameters: [
          { name: '@fileId', value: fileId },
          { name: '@updatedAt', value: new Date().toISOString() }
        ]
      };
      
      console.log('BlobFileManagementService.deleteFile - Update query:', updateQuery);
      
      const { resources: updatedItems } = await this.cosmosContainer.items.query(updateQuery, {
        enableCrossPartitionQuery: true
      } as any).fetchAll();
      
      console.log('BlobFileManagementService.deleteFile - Updated items count:', updatedItems.length);
      
      if (updatedItems.length === 0) {
        console.log('BlobFileManagementService.deleteFile - No items updated, trying direct update');
        
        // 直接更新を試行
        fileMetadata.data.isDeleted = true;
        fileMetadata.data.updatedAt = new Date().toISOString();
        fileMetadata.updatedAt = new Date().toISOString();
        
        try {
          await this.cosmosContainer.item(fileId, fileMetadata.data.containerName).replace(fileMetadata);
          console.log('BlobFileManagementService.deleteFile - Direct update successful');
        } catch (replaceError) {
          console.error('BlobFileManagementService.deleteFile - Direct update failed:', replaceError);
          // 論理削除が失敗しても、BLOBの削除は成功しているので、成功として扱う
          console.log('BlobFileManagementService.deleteFile - Treating as success despite CosmosDB update failure');
        }
      }
      
      console.log('BlobFileManagementService.deleteFile - Successfully processed file deletion');
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error('ファイルの削除に失敗しました');
    }
  }

  // SAS URLを生成
  async generateSasUrl(fileId: string): Promise<string> {
    try {
      // ファイル情報を取得
      const fileMetadata = await this.getFileMetadata(fileId);
      if (!fileMetadata) {
        throw new Error('ファイルが見つかりません');
      }

      const containerClient = this.blobServiceClient.getContainerClient(fileMetadata.data.containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(fileMetadata.data.blobName);

      const sasToken = await blockBlobClient.generateSasUrl({
        permissions: { read: true },
        expiresOn: new Date(Date.now() + 60 * 60 * 1000), // 1時間有効
      } as any);

      return sasToken;
    } catch (error) {
      console.error('Error generating SAS URL:', error);
      throw new Error('SAS URLの生成に失敗しました');
    }
  }

  // ファイル情報を取得
  async getFileMetadata(fileId: string): Promise<BlobFileMetadata | null> {
    try {
      console.log('BlobFileManagementService.getFileMetadata - Starting with fileId:', fileId);
      
      // まず、ファイルIDでファイルを検索（クロスパーティションクエリ）
      const query = `SELECT * FROM c WHERE c.id = "${fileId}" AND c.dataType = "file"`;
      console.log('BlobFileManagementService.getFileMetadata - Query:', query);
      
      const { resources: files } = await this.cosmosContainer.items.query<BlobFileMetadata>(query, {
        enableCrossPartitionQuery: true
      } as any).fetchAll();
      
      console.log('BlobFileManagementService.getFileMetadata - Found files count:', files.length);
      
      if (files.length === 0) {
        console.log('BlobFileManagementService.getFileMetadata - File not found');
        return null;
      }
      
      const fileMetadata = files[0];
      console.log('BlobFileManagementService.getFileMetadata - Found file:', {
        id: fileMetadata.id,
        containerName: fileMetadata.data.containerName,
        fileName: fileMetadata.data.fileName
      });
      
      return fileMetadata;
    } catch (error) {
      console.error('Error getting file metadata:', error);
      return null;
    }
  }
}
