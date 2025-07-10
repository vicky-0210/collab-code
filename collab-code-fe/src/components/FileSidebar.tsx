import React, { useState, useMemo } from 'react';
import { exportProjectAsZip } from '../utils/exportZip';
import type { FileData, FolderData, TypingUser } from '../types/room.types';
import { CreateFileForm } from './CreateFileForm';
import { CreateFolderForm } from './CreateFolderForm ';
import { FileListItem } from './FileListItem';
import { FolderListItem } from './FolderListItem';

interface FileSidebarProps {
  files: FileData[];
  folders: FolderData[];
  activeFile: FileData | null;
  selectedFolderId: string | null;
  typingUsers: TypingUser[];
  showCreateFile: boolean;
  showCreateFolder: boolean;
  onCreateFile: (name: string, language: string, folderId?: string) => void;
  onCreateFolder: (name: string, parentFolderId?: string) => void;
  onFileSelect: (file: FileData) => void;
  onFolderSelect: (folderId: string | null) => void;
  onDeleteFile: (fileId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onRenameFolder: (folderId: string, newName: string) => void;
  onShowCreateFile: (show: boolean) => void;
  onShowCreateFolder: (show: boolean) => void;
}

export const FileSidebar: React.FC<FileSidebarProps> = ({
  files,
  folders,
  activeFile,
  selectedFolderId,
  typingUsers,
  showCreateFile,
  showCreateFolder,
  onCreateFile,
  onCreateFolder,
  onFileSelect,
  onFolderSelect,
  onDeleteFile,
  onDeleteFolder,
  onRenameFolder,
  onShowCreateFile,
  onShowCreateFolder
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const toggleFolderExpand = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const fileTree = useMemo(() => {
    const buildTree = (parentId: string | null = null, level: number = 0): React.ReactNode[] => {
      const items: React.ReactNode[] = [];

      const foldersAtLevel = folders.filter(folder => folder.parentFolderId === parentId);
      foldersAtLevel.forEach(folder => {
        const isExpanded = expandedFolders.has(folder.id);
        items.push(
          <FolderListItem
            key={`folder-${folder.id}`}
            folder={folder}
            isSelected={selectedFolderId === folder.id}
            isExpanded={isExpanded}
            onSelect={onFolderSelect}
            onToggleExpand={toggleFolderExpand}
            onDelete={onDeleteFolder}
            onRename={onRenameFolder}
            level={level}
          />
        );

        if (isExpanded) {
          const children = buildTree(folder.id, level + 1);
          items.push(...children);
        }
      });

      const filesAtLevel = files.filter(file => file.folderId === parentId);
      filesAtLevel.forEach(file => {
        items.push(
          <FileListItem
            key={`file-${file.id}`}
            file={file}
            isActive={activeFile?.id === file.id}
            typingUsers={typingUsers}
            onSelect={onFileSelect}
            onDelete={onDeleteFile}
            level={level}
          />
        );
      });

      return items;
    };

    return buildTree();
  }, [
    files,
    folders,
    activeFile,
    selectedFolderId,
    typingUsers,
    expandedFolders,
    onFileSelect,
    onFolderSelect,
    onDeleteFile,
    onDeleteFolder,
    onRenameFolder
  ]);

  return (
    <div className="w-80 bg-[#24283b] border-r border-[#3b4261] p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-[#c0caf5]">Explorer</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => onShowCreateFolder(true)}
            className="px-3 py-1 rounded bg-[#9d7cd8] text-[#1a1b26] hover:bg-[#8b6cb8] transition-colors duration-200 text-sm"
            title="New Folder"
          >
            📁+
          </button>
          <button
            onClick={() => onShowCreateFile(true)}
            className="px-3 py-1 rounded bg-[#7aa2f7] text-[#1a1b26] hover:bg-[#6790e1] transition-colors duration-200 text-sm"
            title="New File"
          >
            📄+
          </button>
          <button
            onClick={() => exportProjectAsZip(folders, files)}
            className="px-3 py-1 rounded bg-green-500 text-white hover:bg-green-600 transition-colors duration-200 text-sm"
            title="Export as ZIP"
          >
            ⬇️ Export
          </button>
        </div>
      </div>

      {selectedFolderId && (
        <div className="mb-2 p-2 bg-[#2a2e43] rounded text-xs text-[#a9b1d6]">
          Selected: {folders.find(f => f.id === selectedFolderId)?.name || 'Unknown'}
          <button
            onClick={() => onFolderSelect(null)}
            className="ml-2 text-[#7aa2f7] hover:text-[#6790e1]"
          >
            Clear
          </button>
        </div>
      )}

      {showCreateFolder && (
        <CreateFolderForm
          onCreateFolder={onCreateFolder}
          onCancel={() => onShowCreateFolder(false)}
          parentFolderId={selectedFolderId || undefined}
        />
      )}

      {showCreateFile && (
        <CreateFileForm
          onCreateFile={onCreateFile}
          onCancel={() => onShowCreateFile(false)}
          selectedFolderId={selectedFolderId}
        />
      )}

      <div className="space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto">
        {files.length === 0 && folders.length === 0 ? (
          <p className="text-[#a9b1d6] text-sm text-center py-4">No files or folders yet</p>
        ) : (
          fileTree
        )}
      </div>
    </div>
  );
};