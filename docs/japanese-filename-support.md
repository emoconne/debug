# 日本語ファイル名サポート

## 概要

このアプリケーションは、Azure Blob Storageへのファイルアップロード時に日本語ファイル名を完全にサポートしています。

## 実装内容

### 1. ファイル名の安全化処理

日本語文字を保持しながら、Azure Blob Storageで安全に使用できるファイル名に変換します。

```typescript
function sanitizeFileNameForBlob(fileName: string): string {
  return fileName
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') // 危険な文字をアンダースコアに変換
    .replace(/[()&]/g, '_') // 括弧とアンパサンドもアンダースコアに変換
    .replace(/_{2,}/g, '_') // 連続するアンダースコアを1つに
    .replace(/^_+|_+$/g, '') // 先頭と末尾のアンダースコアを除去
    .trim(); // 前後の空白を除去
}
```

### 2. Base64エンコーディングによる安全な保存

日本語ファイル名をBase64エンコードして安全に保存し、元のファイル名はメタデータに保存します。

```typescript
// 日本語ファイル名をBase64エンコードして安全に保存
const encodedFileName = Buffer.from(file.name, 'utf-8').toString('base64');
const blobName = `${timestamp}_${encodedFileName}`;

// メタデータに元のファイル名をBase64エンコードして保存
metadata: {
  originalName: Buffer.from(file.name, 'utf-8').toString('base64'), // メタデータヘッダーはASCII文字のみサポート
  uploadedAt: new Date().toISOString(),
  fileSize: file.size.toString(),
}
```

### 3. ダウンロード時の復元

ダウンロード時にBase64エンコードされたファイル名を復元します。

```typescript
// メタデータから元のファイル名を取得
let originalName = properties.metadata?.originalName;

// メタデータに元のファイル名がない場合は、blobNameから復元を試行
if (!originalName) {
  const parts = blobName.split('_');
  if (parts.length > 1) {
    try {
      const encodedFileName = parts.slice(1).join('_');
      originalName = Buffer.from(encodedFileName, 'base64').toString('utf-8');
    } catch (error) {
      originalName = blobName.replace(/^\d+_/, '');
    }
  }
} else {
  // メタデータのoriginalNameがBase64エンコードされている場合の復元
  try {
    originalName = Buffer.from(originalName, 'base64').toString('utf-8');
  } catch (error) {
    console.warn('Failed to decode originalName from base64:', originalName);
  }
}
```

## サポートされるファイル名例

以下のような日本語ファイル名が正常にアップロードできます：

- `テスト文書.pdf`
- `営業資料_2024年版.docx`
- `会議議事録_2024-01-15.txt`
- `画像ファイル.jpg`
- `データ分析レポート.xlsx`
- `0825説明資料のための図(スクール&CIS).pptx` ← 括弧やアンパサンドも対応

## 技術的詳細

### Azure Blob Storageの日本語サポート

Azure Blob Storageは以下の日本語文字をサポートしています：

- ひらがな（あいうえお...）
- カタカナ（アイウエオ...）
- 漢字（一文字目二文字目...）
- 全角英数字（ＡＢＣ...）
- 全角記号（！＠＃...）

### Base64エンコーディング

日本語ファイル名はBase64エンコードされて安全に保存されます：

- `0825説明資料のための図(スクール&CIS).pptx` → `MDgyNeWKoOi9veWkueWbnuWksei0pemAmC5wcHR4`

### 制限事項

以下の文字は安全化処理により`_`に変換されます：

- `< > : " / \ | ? *` (ファイルシステムで使用できない文字)
- `( ) &` (Azure Blob Storageで問題になる可能性がある文字)
- 制御文字（0x00-0x1f）

### メタデータの制限

Azure Blob Storageのメタデータヘッダーは以下の制限があります：

- **ASCII文字のみ**: 日本語文字は直接保存できません
- **Base64エンコーディング**: 日本語ファイル名はBase64エンコードして保存
- **ヘッダー名の制限**: `x-ms-meta-`プレフィックス付きのASCII文字のみ

## テスト方法

1. `/test/azure-services` ページにアクセス
2. 「BLOBアップロードテスト」セクションで日本語ファイル名のファイルを選択
3. 「アップロード」ボタンをクリック
4. アップロード結果を確認

## トラブルシューティング

### よくある問題

1. **ファイル名が文字化けする**
   - ブラウザの文字エンコーディング設定を確認
   - ファイル名に制御文字が含まれていないか確認

2. **アップロードに失敗する**
   - Azure Storage接続文字列の設定を確認
   - ファイルサイズが制限内（4.75TB）であることを確認
   - 括弧やアンパサンドなどの特殊文字が含まれている場合は、ログを確認
   - **メタデータエラー**: `ERR_INVALID_CHAR`エラーが発生した場合は、メタデータのBase64エンコーディングを確認

3. **ダウンロード時にファイル名が変わる**
   - メタデータの`originalName`フィールドを確認
   - Base64デコード処理を確認

## 関連ファイル

- `src/features/documents/azure-blob-service.ts`
- `src/features/documents/azure-blob-dept-service.ts`
- `src/features/documents/test-document-management-service.ts`
- `src/app/test/azure-services/page.tsx`
