import React, { useEffect } from 'react';
import type { RoomFolderHandlers as RoomFolderHandlersType } from './types';

interface FolderCreatedData {
  id: string;
  name: string;
  parentFolderId?: string;
}

interface FolderDeletedData {
  folderId: string;
  deletedBy: string;
}

interface FolderRenamedData {
  folderId: string;
  newName: string;
}

export const RoomFolderHandlers: React.FC<RoomFolderHandlersType> = ({ 
  socket, 
  activeFile, 
  setActiveFile,
  setFileContent,
  setShowCreateFolder 
}: RoomFolderHandlersType) => {
  useEffect(() => {
    if (!socket) return;

    const handleFolderCreated = (folder: FolderCreatedData) => {
      setShowCreateFolder(false);
      console.log('[RoomFolderHandlers] Folder created:', folder);
    };

    const handleFolderDeleted = (data: FolderDeletedData) => {
      if (activeFile && activeFile.folderId === data.folderId) {
        setActiveFile(null);
        setFileContent('');
      }
    };

    const handleFolderRenamed = (data: FolderRenamedData) => {
      if (activeFile && activeFile.folderId === data.folderId) {
        setActiveFile(prev => prev ? { ...prev, folderName: data.newName } : null);
      }
    };

    socket.on('folderCreated', handleFolderCreated);
    socket.on('folderDeleted', handleFolderDeleted);
    socket.on('folderRenamed', handleFolderRenamed);

    return () => {
      socket.off('folderCreated', handleFolderCreated);
      socket.off('folderDeleted', handleFolderDeleted);
      socket.off('folderRenamed', handleFolderRenamed);
    };
  }, [socket, activeFile?.folderId, setActiveFile, setFileContent, setShowCreateFolder]);

  return null;
};
