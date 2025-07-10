import React, { useEffect } from 'react';
import { Socket } from 'socket.io-client';
import type { FileData, FolderData } from '../../types/room.types';

interface RoomSocketHandlersProps {
  socket: Socket | null;
  setFiles: React.Dispatch<React.SetStateAction<FileData[]>>;
  setFolders: React.Dispatch<React.SetStateAction<FolderData[]>>;
  setActiveFile?: React.Dispatch<React.SetStateAction<FileData | null>>;
  activeFileId?: string | null;
}

const RoomSocketHandlers: React.FC<RoomSocketHandlersProps> = ({ 
  socket, 
  setFiles, 
  setFolders, 
  setActiveFile, 
  activeFileId 
}) => {
  useEffect(() => {
    if (!socket) return;

    const handleFoldersUpdate = (updatedFolders: FolderData[]) => {
      console.log('Folders updated:', updatedFolders);
      setFolders(updatedFolders);
    };

    const handleFilesUpdate = (updatedFiles: FileData[]) => {
      console.log('Files updated:', updatedFiles);
      setFiles(updatedFiles);
      
      if (setActiveFile && activeFileId) {
        const updatedActiveFile = updatedFiles.find(file => file.id === activeFileId);
        if (updatedActiveFile) {
          setActiveFile(updatedActiveFile);
        }
      }
    };

    const handleFileContentUpdate = ({ fileId, content, lastEditedBy, updatedAt }: {
      fileId: string;
      content: string;
      lastEditedBy: string;
      updatedAt: Date;
    }) => {
      console.log('File content updated:', { fileId, contentLength: content.length });
      
      setFiles(prevFiles => 
        prevFiles.map(file => 
          file.id === fileId 
            ? { ...file, content, lastEditedBy, updatedAt }
            : file
        )
      );
      
      if (setActiveFile && activeFileId === fileId) {
        setActiveFile(prevActiveFile => 
          prevActiveFile ? { ...prevActiveFile, content, lastEditedBy, updatedAt } : null
        );
      }
    };

    const handleFileDeleted = ({ fileId }: { fileId: string }) => {
      console.log('File deleted:', fileId);
      
      setFiles(prevFiles => prevFiles.filter(file => file.id !== fileId));
      
      if (setActiveFile && activeFileId === fileId) {
        setActiveFile(null);
      }
    };

    const handleFolderDeleted = ({ folderId }: { folderId: string }) => {
      console.log('Folder deleted:', folderId);
      
      setFolders(prevFolders => prevFolders.filter(folder => folder.id !== folderId));
      
      setFiles(prevFiles => prevFiles.filter(file => file.folderId !== folderId));
      
      if (setActiveFile && activeFileId) {
        setFiles(prevFiles => {
          const activeFile = prevFiles.find(file => file.id === activeFileId);
          if (activeFile && activeFile.folderId === folderId) {
            setActiveFile(null);
          }
          return prevFiles.filter(file => file.folderId !== folderId);
        });
      }
    };

    const handleFileCreated = (newFile: FileData) => {
      console.log('File created:', newFile);
      
      if (setActiveFile) {
        setActiveFile(newFile);
      }
    };

    const handleFolderCreated = (newFolder: FolderData) => {
      console.log('Folder created:', newFolder);

    };

    const handleFolderRenamed = ({ folderId, name }: { folderId: string; name: string }) => {
      console.log('Folder renamed:', { folderId, name });
      
      setFolders(prevFolders => 
        prevFolders.map(folder => 
          folder.id === folderId 
            ? { ...folder, name }
            : folder
        )
      );
    };

    const handleError = (error: string) => {
      console.error('Socket error:', error);
    };

    socket.on('foldersUpdate', handleFoldersUpdate);
    socket.on('filesUpdate', handleFilesUpdate);
    socket.on('fileContentUpdate', handleFileContentUpdate);
    socket.on('fileDeleted', handleFileDeleted);
    socket.on('folderDeleted', handleFolderDeleted);
    socket.on('fileCreated', handleFileCreated);
    socket.on('folderCreated', handleFolderCreated);
    socket.on('folderRenamed', handleFolderRenamed);
    socket.on('error', handleError);

    return () => {
      socket.off('foldersUpdate', handleFoldersUpdate);
      socket.off('filesUpdate', handleFilesUpdate);
      socket.off('fileContentUpdate', handleFileContentUpdate);
      socket.off('fileDeleted', handleFileDeleted);
      socket.off('folderDeleted', handleFolderDeleted);
      socket.off('fileCreated', handleFileCreated);
      socket.off('folderCreated', handleFolderCreated);
      socket.off('folderRenamed', handleFolderRenamed);
      socket.off('error', handleError);
    };
  }, [socket, setFiles, setFolders, setActiveFile, activeFileId]);

  return null;
};

export default RoomSocketHandlers;