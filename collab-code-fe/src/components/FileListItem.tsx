import React from 'react';
import type { FileData, TypingUser } from '../types/room.types';

interface FileListItemProps {
  file: FileData;
  isActive: boolean;
  typingUsers: TypingUser[];
  onSelect: (file: FileData) => void;
  onDelete: (fileId: string) => void;
  level: number;
}

export const FileListItem: React.FC<FileListItemProps> = ({
  file,
  isActive,
  typingUsers,
  onSelect,
  onDelete,
  level
}) => {
  const fileTypingUsers = typingUsers.filter(user => user.fileId === file.id && user.isTyping);

  return (
    <div
      className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors duration-200 ${
        isActive
          ? 'bg-[#7aa2f7] text-[#1a1b26]'
          : 'hover:bg-[#2a2e43] text-[#c0caf5]'
      }`}
      style={{ paddingLeft: `${8 + level * 16}px` }}
      onClick={() => onSelect(file)}
    >
      <div className="flex-1">
        <div className="text-sm font-medium flex items-center">
          <span className="mr-2">📄</span>
          {file.name}
          {fileTypingUsers.length > 0 && (
            <span className={`ml-2 text-xs px-1 rounded ${
              isActive ? 'bg-[#1a1b26] text-[#7aa2f7]' : 'bg-[#7aa2f7] text-[#1a1b26]'
            }`}>
              {fileTypingUsers.length} typing...
            </span>
          )}
        </div>
        <div className={`text-xs ${
          isActive ? 'text-[#1a1b26]' : 'text-[#a9b1d6]'
        }`}>
          {file.language}
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (window.confirm('Are you sure you want to delete this file?')) {
            onDelete(file.id);
          }
        }}
        className={`ml-2 px-2 py-1 rounded text-xs hover:bg-red-500 hover:text-white transition-colors duration-200 ${
          isActive ? 'text-[#1a1b26]' : 'text-[#a9b1d6]'
        }`}
        title="Delete file"
      >
        ×
      </button>
    </div>
  );
};