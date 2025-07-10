import React, { useState } from 'react';

interface CreateFolderFormProps {
  onCreateFolder: (name: string, parentFolderId?: string) => void;
  onCancel: () => void;
  parentFolderId?: string;
}

export const CreateFolderForm: React.FC<CreateFolderFormProps> = ({
  onCreateFolder,
  onCancel,
  parentFolderId
}) => {
  const [folderName, setFolderName] = useState('');

  const handleSubmit = () => {
    if (!folderName.trim()) {
      alert('Please enter a folder name');
      return;
    }
    onCreateFolder(folderName, parentFolderId);
    setFolderName('');
  };

  return (
    <div className="mb-4 p-3 bg-[#2a2e43] rounded-lg">
      <input
        type="text"
        placeholder="Folder name (e.g., components)"
        value={folderName}
        onChange={(e) => setFolderName(e.target.value)}
        className="w-full px-3 py-2 mb-2 rounded bg-[#1a1b26] text-[#c0caf5] border border-[#3b4261] focus:outline-none focus:border-[#7aa2f7] text-sm"
        onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
      />
      <div className="flex space-x-2">
        <button
          onClick={handleSubmit}
          className="flex-1 px-3 py-2 rounded bg-[#7aa2f7] text-[#1a1b26] hover:bg-[#6790e1] transition-colors duration-200 text-sm"
        >
          Create
        </button>
        <button
          onClick={onCancel}
          className="flex-1 px-3 py-2 rounded bg-[#414868] text-[#c0caf5] hover:bg-[#4a5374] transition-colors duration-200 text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
