import React, { useState } from 'react';
import { supportedLanguages } from '../types/room.types';

interface CreateFileFormProps {
  onCreateFile: (name: string, language: string, folderId?: string) => void;
  onCancel: () => void;
  selectedFolderId?: string | null;
}

export const CreateFileForm: React.FC<CreateFileFormProps> = ({
  onCreateFile,
  onCancel,
  selectedFolderId
}) => {
  const [fileName, setFileName] = useState('');
  const [fileLanguage, setFileLanguage] = useState('javascript');

  const handleSubmit = () => {
    if (!fileName.trim()) {
      alert('Please enter a file name');
      return;
    }
    onCreateFile(fileName, fileLanguage.toLowerCase(), selectedFolderId || undefined);
    setFileName('');
    setFileLanguage('javascript');
  };

  return (
    <div className="mb-4 p-3 bg-[#2a2e43] rounded-lg">
      {selectedFolderId && (
        <div className="mb-2 text-xs text-[#a9b1d6]">
          Creating file in selected folder
        </div>
      )}
      <input
        type="text"
        placeholder="File name (e.g., index.js)"
        value={fileName}
        onChange={(e) => setFileName(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
        className="w-full px-3 py-2 mb-2 rounded bg-[#1a1b26] text-[#c0caf5] border border-[#3b4261] focus:outline-none focus:border-[#7aa2f7] text-sm"
      />
      <select
        value={fileLanguage}
        onChange={(e) => setFileLanguage(e.target.value)}
        className="w-full px-3 py-2 mb-2 rounded bg-[#1a1b26] text-[#c0caf5] border border-[#3b4261] focus:outline-none focus:border-[#7aa2f7] text-sm"
      >
        {supportedLanguages.map(lang => (
          <option key={lang.value} value={lang.value}>{lang.label}</option>
        ))}
      </select>
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
