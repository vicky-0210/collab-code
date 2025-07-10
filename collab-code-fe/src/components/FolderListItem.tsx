import React, { useState } from 'react';
import type { FolderData } from '../types/room.types';

interface FolderListItemProps {
  folder: FolderData;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: (folderId: string) => void;
  onToggleExpand: (folderId: string) => void;
  onDelete: (folderId: string) => void;
  onRename: (folderId: string, newName: string) => void;
  level: number;
}

export const FolderListItem: React.FC<FolderListItemProps> = ({
  folder,
  isSelected,
  isExpanded,
  onSelect,
  onToggleExpand,
  onDelete,
  onRename,
  level
}) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameName, setRenameName] = useState(folder.name);

  const handleRename = () => {
    if (renameName.trim() && renameName !== folder.name) {
      onRename(folder.id, renameName.trim());
    }
    setIsRenaming(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setRenameName(folder.name);
      setIsRenaming(false);
    }
  };

  return (
    <div
      className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors duration-200 ${
        isSelected
          ? 'bg-[#7aa2f7] text-[#1a1b26]'
          : 'hover:bg-[#2a2e43] text-[#c0caf5]'
      }`}
      style={{ paddingLeft: `${8 + level * 16}px` }}
    >
      <div className="flex items-center flex-1">
        <button
          onClick={() => onToggleExpand(folder.id)}
          className={`mr-2 text-xs ${
            isSelected ? 'text-[#1a1b26]' : 'text-[#a9b1d6]'
          }`}
        >
          {isExpanded ? '▼' : '▶'}
        </button>
        
        <div 
          className="flex items-center flex-1"
          onClick={() => onSelect(folder.id)}
        >
          <span className="mr-2">📁</span>
          {isRenaming ? (
            <input
              type="text"
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={handleKeyPress}
              className="bg-[#1a1b26] text-[#c0caf5] px-2 py-1 rounded text-sm border border-[#3b4261] focus:outline-none focus:border-[#7aa2f7]"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="text-sm font-medium">{folder.name}</span>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsRenaming(true);
          }}
          className={`px-2 py-1 rounded text-xs hover:bg-blue-500 hover:text-white transition-colors duration-200 ${
            isSelected ? 'text-[#1a1b26]' : 'text-[#a9b1d6]'
          }`}
          title="Rename folder"
        >
          ✏️
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm('Are you sure you want to delete this folder and all its files?')) {
              onDelete(folder.id);
            }
          }}
          className={`px-2 py-1 rounded text-xs hover:bg-red-500 hover:text-white transition-colors duration-200 ${
            isSelected ? 'text-[#1a1b26]' : 'text-[#a9b1d6]'
          }`}
          title="Delete folder"
        >
          ×
        </button>
      </div>
    </div>
  );
};