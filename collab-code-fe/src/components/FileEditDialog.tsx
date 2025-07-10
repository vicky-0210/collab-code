import React from 'react';

interface FileEditDialogProps {
  open: boolean;
  onClose: () => void;
  onView: () => void;
  onEdit: () => void;
}

export const FileEditDialog: React.FC<FileEditDialogProps> = ({ open, onClose, onView, onEdit }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-[#24283b] rounded-lg p-6 shadow-lg w-80">
        <h2 className="text-lg font-semibold text-[#c0caf5] mb-4">File is being edited</h2>
        <p className="text-[#a9b1d6] mb-6">Someone else is currently editing this file. What would you like to do?</p>
        <div className="flex justify-end space-x-2">
          <button
            className="px-4 py-2 rounded bg-[#7aa2f7] text-[#1a1b26] hover:bg-[#6790e1]"
            onClick={() => { onView(); onClose(); }}
          >
            View Only
          </button>
          <button
            className="px-4 py-2 rounded bg-[#f7768e] text-white hover:bg-[#e06c88]"
            onClick={() => { onEdit(); onClose(); }}
          >
            Edit Anyway
          </button>
        </div>
      </div>
    </div>
  );
};
