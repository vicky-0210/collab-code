import { useEffect, useRef } from 'react';

import type { FileData } from '../../types/room.types';


declare module 'socket.io-client' {
  interface Socket {
    emitContentChange?: (content: string) => void;
  }
}

interface FileCreationData {
  id: string;
  name: string;
  content: string;
  language: string;
  folderId: string | null;
}


interface FileSaveData {
  fileId: string;
  lastEditedBy: string;
  savedAt: Date;
}

interface FileDeleteData {
  fileId: string;
  deletedBy: string;
}

interface FileContentUpdateData {
  fileId: string;
  content: string;
  lastEditedBy: string;
  updatedAt: string;
}

interface FileContentData {
  fileId: string;
  content: string;
  language: string;
  lastEditedBy: string;
  updatedAt: string;
}

interface FileContentUpdateConfirmData {
  fileId: string;
  saved: boolean;
  updatedAt: string;
}

interface FileContentSyncData {
  fileId: string;
  content: string;
  lastEditedBy: string;
  updatedAt: string;
}


interface RealTimeTextChangeData {
  fileId: string;
  content: string;
  cursorPosition?: number;
  userId: string;
  timestamp: number;
}

interface RoomFileHandlersProps {
  socket: any;
  roomId: string;
  activeFile: FileData | null;
  setActiveFile: React.Dispatch<React.SetStateAction<FileData | null>>;
  setFileContent: React.Dispatch<React.SetStateAction<string>>;
  setIsSaved: React.Dispatch<React.SetStateAction<boolean>>;
  setIsReceivingUpdate: React.Dispatch<React.SetStateAction<boolean>>;
  setFiles?: React.Dispatch<React.SetStateAction<FileData[]>>;
}

const RoomFileHandlers = ({ 
  socket,
  roomId,
  activeFile,
  setActiveFile,
  setFileContent,
  setIsSaved,
  setIsReceivingUpdate,
  setFiles
}: RoomFileHandlersProps) => {
  const activeFileRef = useRef<FileData | null>(activeFile);
  const roomIdRef = useRef<string>(roomId);
  const lastEmittedContentRef = useRef<string>('');
  
  useEffect(() => {
    activeFileRef.current = activeFile;
  }, [activeFile]);
  
  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  const emitContentChange = (content: string, fileId: string) => {
    if (!socket || !roomId) return;
    lastEmittedContentRef.current = content;
    const changeData: RealTimeTextChangeData = {
      fileId,
      content,
      userId: socket.id!,
      timestamp: Date.now()
    };
    socket.emit('fileContentChange', {
      roomId,
      ...changeData
    });
  };

  useEffect(() => {
    if (socket && activeFile) {
      socket.emitContentChange = (content: string) => {
        emitContentChange(content, activeFile.id);
      };
    }
  }, [socket, activeFile]);

  useEffect(() => {
    if (!socket) return;

    const handleFileCreated = (file: FileCreationData) => {
      const currentRoomId = roomIdRef.current;
      if (currentRoomId) {
        console.log('[FileHandlers] File created:', file);
        setActiveFile((prev: FileData | null) => {
          if (!prev) return null;
          return {
            ...prev,
            ...file,
            roomId: currentRoomId,
            folderId: file.folderId || null,
            createdBy: socket!.id!,
            lastEditedBy: socket!.id!,
            createdAt: new Date(),
            updatedAt: new Date(),
            language: file.language || 'javascript'
          } as FileData;
        });
        setFileContent(file.content);
        setIsSaved(true);
      }
    };

    const handleFileContent = (data: FileContentData) => {
      console.log('[FileHandlers] File content received:', {
        fileId: data.fileId,
        language: data.language,
        contentLength: data.content?.length || 0
      });

      const currentActiveFile = activeFileRef.current;
      const currentRoomId = roomIdRef.current;

      const file: FileData = {
        id: data.fileId,
        content: data.content,
        language: data.language,
        lastEditedBy: data.lastEditedBy,
        updatedAt: new Date(data.updatedAt),
        name: currentActiveFile?.name || 'Unknown',
        roomId: currentRoomId,
        folderId: currentActiveFile?.folderId || null,
        createdBy: currentActiveFile?.createdBy || data.lastEditedBy,
        createdAt: currentActiveFile?.createdAt || new Date()
      };

      setActiveFile(file);
      setFileContent(data.content);
      setIsSaved(true);
      lastEmittedContentRef.current = data.content;
    };

    const handleFileContentChange = (data: RealTimeTextChangeData) => {
      console.log('[FileHandlers] Real-time content change received:', {
        fileId: data.fileId,
        activeFileId: activeFileRef.current?.id,
        contentLength: data.content?.length || 0,
        fromUserId: data.userId,
        mySocketId: socket.id
      });

      const currentActiveFile = activeFileRef.current;
      if (currentActiveFile && currentActiveFile.id === data.fileId) {
        setIsReceivingUpdate(true);
        setFileContent(data.content);
        setActiveFile((prev: FileData | null) => {
          if (!prev) return null;
          return {
            ...prev,
            content: data.content,
            lastEditedBy: data.userId,
            updatedAt: new Date(data.timestamp)
          };
        });
        if (setFiles) {
          setFiles(prevFiles => prevFiles.map(f =>
            f.id === data.fileId
              ? { ...f, content: data.content, lastEditedBy: data.userId, updatedAt: new Date(data.timestamp) }
              : f
          ));
        }
        lastEmittedContentRef.current = data.content;
        setTimeout(() => {
          setIsReceivingUpdate(false);
          setIsSaved(false); 
        }, 100);
      }
    };

    const handleFileContentUpdate = (data: FileContentUpdateData) => {
      const currentActiveFile = activeFileRef.current;
      if (currentActiveFile && currentActiveFile.id === data.fileId) {
        setIsReceivingUpdate(true);
        setFileContent(data.content);
        setActiveFile((prev: FileData | null) => {
          if (!prev) return null;
          return { 
            ...prev, 
            content: data.content, 
            lastEditedBy: data.lastEditedBy, 
            updatedAt: new Date(data.updatedAt) 
          };
        });
        if (setFiles) {
          setFiles(prevFiles => prevFiles.map(f =>
            f.id === data.fileId
              ? { ...f, content: data.content, lastEditedBy: data.lastEditedBy, updatedAt: new Date(data.updatedAt) }
              : f
          ));
        }
        lastEmittedContentRef.current = data.content;
        setTimeout(() => {
          setIsReceivingUpdate(false);
          setIsSaved(true);
        }, 100);
      }
    };

    const handleFileContentSync = (data: FileContentSyncData) => {
      console.log('[FileHandlers] File content sync received:', {
        fileId: data.fileId,
        activeFileId: activeFileRef.current?.id,
        contentLength: data.content?.length || 0,
        lastEditedBy: data.lastEditedBy,
        mySocketId: socket.id
      });

      const currentActiveFile = activeFileRef.current;
      if (currentActiveFile && currentActiveFile.id === data.fileId && data.lastEditedBy !== socket.id) {
        console.log('[FileHandlers] Applying sync update from another user');
        setIsReceivingUpdate(true);
        setFileContent(data.content);
        setActiveFile((prev: FileData | null) => {
          if (!prev) return null;
          return { 
            ...prev, 
            content: data.content, 
            lastEditedBy: data.lastEditedBy, 
            updatedAt: new Date(data.updatedAt) 
          };
        });
        if (setFiles) {
          setFiles(prevFiles => prevFiles.map(f =>
            f.id === data.fileId
              ? { ...f, content: data.content, lastEditedBy: data.lastEditedBy, updatedAt: new Date(data.updatedAt) }
              : f
          ));
        }
        lastEmittedContentRef.current = data.content;
        setTimeout(() => {
          setIsReceivingUpdate(false);
          setIsSaved(true);
        }, 100);
      }
    };

    const handleFileContentUpdateConfirm = (data: FileContentUpdateConfirmData) => {
      console.log('[FileHandlers] File save confirmed (own change):', data);
      
      const currentActiveFile = activeFileRef.current;
      if (currentActiveFile && currentActiveFile.id === data.fileId && data.saved) {
        setIsSaved(true);
        setActiveFile((prev: FileData | null) => {
          if (!prev) return null;
          return { ...prev, updatedAt: new Date(data.updatedAt) };
        });
      }
    };

    const handleFileSaved = (data: FileSaveData) => {
      console.log('[FileHandlers] File saved explicitly:', data);
      const currentActiveFile = activeFileRef.current;
      if (currentActiveFile && currentActiveFile.id === data.fileId) {
        setIsSaved(true);
        setActiveFile((prev: FileData | null) => {
          if (!prev) return null;
          return { 
            ...prev, 
            lastEditedBy: data.lastEditedBy,
            updatedAt: new Date(data.savedAt)
          };
        });
      }
    };

    const handleFileDeleted = (data: FileDeleteData) => {
      console.log('[FileHandlers] File deleted:', data);
      const currentActiveFile = activeFileRef.current;
      if (currentActiveFile && currentActiveFile.id === data.fileId) {
        setActiveFile(null);
        setFileContent('');
      }
    };

    const handleSocketError = (error: string) => {
      console.error('[FileHandlers] Socket error:', error);
    };

    socket.on('fileCreated', handleFileCreated);
    socket.on('fileContent', handleFileContent);
    socket.on('fileContentChange', handleFileContentChange); 
    socket.on('fileContentUpdate', handleFileContentUpdate); 
    socket.on('fileContentSync', handleFileContentSync); 
    socket.on('fileContentUpdateConfirm', handleFileContentUpdateConfirm); 
    socket.on('fileSaved', handleFileSaved);
    socket.on('fileDeleted', handleFileDeleted);
    socket.on('error', handleSocketError);

    console.log('[FileHandlers] Socket listeners registered');

    return () => {
      console.log('[FileHandlers] Cleaning up socket listeners');
      socket.off('fileCreated', handleFileCreated);
      socket.off('fileContent', handleFileContent);
      socket.off('fileContentChange', handleFileContentChange); 
      socket.off('fileContentUpdate', handleFileContentUpdate);
      socket.off('fileContentSync', handleFileContentSync); 
      socket.off('fileContentUpdateConfirm', handleFileContentUpdateConfirm);
      socket.off('fileSaved', handleFileSaved);
      socket.off('fileDeleted', handleFileDeleted);
      socket.off('error', handleSocketError);
    };
  }, [socket, setActiveFile, setFileContent, setIsSaved, setIsReceivingUpdate]);

  return null;
};

export default RoomFileHandlers as React.FC<RoomFileHandlersProps>;