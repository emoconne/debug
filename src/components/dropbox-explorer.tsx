import React, { useState, useEffect } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  File,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Code
} from 'lucide-react';
import { DropboxFileInfo } from '@/features/documents/dropbox-file-service';

interface DropboxExplorerProps {
  files: DropboxFileInfo[];
  onFileSelect?: (file: DropboxFileInfo) => void;
  onFolderSelect?: (folder: DropboxFileInfo) => void;
  loading?: boolean;
}

interface FileListProps {
  files: DropboxFileInfo[];
  onFileSelect?: (file: DropboxFileInfo) => void;
  loading?: boolean;
}

// ファイル拡張子に基づいてアイコンを取得
const getFileIcon = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'svg':
    case 'webp':
      return <Image className="w-4 h-4 text-green-500" />;
    case 'mp4':
    case 'avi':
    case 'mov':
    case 'wmv':
    case 'flv':
      return <Video className="w-4 h-4 text-red-500" />;
    case 'mp3':
    case 'wav':
    case 'flac':
    case 'aac':
      return <Music className="w-4 h-4 text-purple-500" />;
    case 'zip':
    case 'rar':
    case '7z':
    case 'tar':
    case 'gz':
      return <Archive className="w-4 h-4 text-orange-500" />;
    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx':
    case 'html':
    case 'css':
    case 'scss':
    case 'json':
    case 'xml':
    case 'py':
    case 'java':
    case 'cpp':
    case 'c':
    case 'php':
    case 'rb':
    case 'go':
    case 'rs':
      return <Code className="w-4 h-4 text-blue-500" />;
    case 'pdf':
    case 'doc':
    case 'docx':
    case 'txt':
    case 'md':
    case 'rtf':
      return <FileText className="w-4 h-4 text-gray-500" />;
    default:
      return <File className="w-4 h-4 text-gray-400" />;
  }
};

// ファイル一覧コンポーネント
const FileList: React.FC<FileListProps> = ({ files, onFileSelect, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">読み込み中...</span>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <Folder className="w-8 h-8 mr-2" />
        <span>ファイルがありません</span>
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-white">
      <div className="p-3 border-b bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-800">ファイル一覧</h3>
        <p className="text-sm text-gray-600 mt-1">
          {files.filter(f => f.isFolder).length}個のフォルダ、{files.filter(f => !f.isFolder).length}個のファイル
        </p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 min-w-[300px]">ファイル名</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 min-w-[100px]">サイズ</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 min-w-[150px]">更新日時</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 min-w-[100px]">バージョン</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file) => (
              <tr 
                key={file.id} 
                className="border-b hover:bg-gray-50 cursor-pointer"
                onClick={() => onFileSelect?.(file)}
              >
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    {file.isFolder ? (
                      <Folder className="w-4 h-4 text-blue-500" />
                    ) : (
                      getFileIcon(file.name)
                    )}
                    <span className="truncate" title={file.name}>
                      {file.name}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-2 text-sm text-gray-600">
                  {!file.isFolder ? file.size : '-'}
                </td>
                <td className="px-4 py-2 text-sm text-gray-600">
                  {file.updatedAt}
                </td>
                <td className="px-4 py-2 text-sm text-gray-600">
                  {file.version || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// フォルダツリーを構築
const buildFolderTree = (files: DropboxFileInfo[]) => {
  const folderMap = new Map<string, any>();
  const rootFolders: any[] = [];

  // フォルダのみを処理
  const folders = files.filter(f => f.isFolder);

  folders.forEach(folder => {
    const treeItem = {
      id: folder.id,
      name: folder.name,
      path: folder.path,
      children: [],
      data: folder
    };

    folderMap.set(folder.id, treeItem);

    if (folder.depth === 0) {
      rootFolders.push(treeItem);
    } else {
      // 親フォルダを探す
      const parentFolder = folders.find(f => f.path === folder.parentPath);
      if (parentFolder) {
        const parentItem = folderMap.get(parentFolder.id);
        if (parentItem) {
          parentItem.children.push(treeItem);
        }
      }
    }
  });

  return rootFolders;
};

// カスタムツリーアイテムコンポーネント
const CustomTreeItem: React.FC<{
  node: any;
  level: number;
  expandedNodes: Set<string>;
  onToggle: (nodeId: string) => void;
  onSelect: (folder: DropboxFileInfo) => void;
}> = ({ node, level, expandedNodes, onToggle, onSelect }) => {
  const isExpanded = expandedNodes.has(node.id);
  const hasChildren = node.children && node.children.length > 0;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(node.id);
  };

  const handleSelect = () => {
    onSelect(node.data);
  };

  // レベルに応じたパディングクラスを生成
  const getPaddingClass = (level: number) => {
    const basePadding = 8; // 8px
    const levelPadding = level * 20; // レベルごとに20px
    const totalPadding = basePadding + levelPadding;
    
    // Tailwind CSSのパディングクラスに変換
    if (totalPadding <= 8) return 'pl-2';
    if (totalPadding <= 12) return 'pl-3';
    if (totalPadding <= 16) return 'pl-4';
    if (totalPadding <= 20) return 'pl-5';
    if (totalPadding <= 24) return 'pl-6';
    if (totalPadding <= 28) return 'pl-7';
    if (totalPadding <= 32) return 'pl-8';
    if (totalPadding <= 36) return 'pl-9';
    if (totalPadding <= 40) return 'pl-10';
    if (totalPadding <= 44) return 'pl-11';
    if (totalPadding <= 48) return 'pl-12';
    return 'pl-12'; // 最大値
  };

  return (
    <div>
      <div 
        className={`flex items-center gap-2 py-1 px-2 rounded hover:bg-gray-100 cursor-pointer ${getPaddingClass(level)}`}
        onClick={handleSelect}
      >
        {hasChildren && (
          <button
            onClick={handleToggle}
            className="flex items-center justify-center w-4 h-4"
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3 text-gray-500" />
            ) : (
              <ChevronRight className="w-3 h-3 text-gray-500" />
            )}
          </button>
        )}
        {!hasChildren && <div className="w-4" />}
        <Folder className="w-4 h-4 text-blue-500" />
        <span className="truncate" title={node.name}>
          {node.name}
        </span>
      </div>
      {isExpanded && hasChildren && (
        <div>
          {node.children.map((child: any) => (
            <CustomTreeItem
              key={child.id}
              node={child}
              level={level + 1}
              expandedNodes={expandedNodes}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const DropboxExplorer: React.FC<DropboxExplorerProps> = ({
  files,
  onFileSelect,
  onFolderSelect,
  loading = false
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedFolder, setSelectedFolder] = useState<DropboxFileInfo | null>(null);
  const [folderFiles, setFolderFiles] = useState<DropboxFileInfo[]>([]);

  const folderTree = buildFolderTree(files);

  const handleToggle = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const handleFolderSelect = (folder: DropboxFileInfo) => {
    setSelectedFolder(folder);
    onFolderSelect?.(folder);
    
    // 選択されたフォルダ内のファイルを取得
    const filesInFolder = files.filter(f => f.parentPath === folder.path);
    setFolderFiles(filesInFolder);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">読み込み中...</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-96">
      {/* フォルダツリー（左側1/3） */}
      <div className="border rounded-lg bg-white">
        <div className="p-3 border-b bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-800">フォルダ構造</h3>
          <p className="text-sm text-gray-600 mt-1">
            {files.filter(f => f.isFolder).length}個のフォルダ
          </p>
        </div>
        
        <div className="p-2 max-h-80 overflow-y-auto">
          {folderTree.map(node => (
            <CustomTreeItem
              key={node.id}
              node={node}
              level={0}
              expandedNodes={expandedNodes}
              onToggle={handleToggle}
              onSelect={handleFolderSelect}
            />
          ))}
        </div>
      </div>

      {/* ファイル一覧（右側2/3） */}
      <div className="lg:col-span-2">
        <FileList
          files={folderFiles}
          onFileSelect={onFileSelect}
          loading={loading}
        />
      </div>
    </div>
  );
};
