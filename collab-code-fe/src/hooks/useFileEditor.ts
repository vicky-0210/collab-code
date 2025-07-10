import { useRef, useState, useCallback, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import type { FileData } from '../types/room.types';

export const useFileEditor = (socket: Socket | null, roomId: string) => {
  const [activeFile, setActiveFile] = useState<FileData | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSaved, setIsSaved] = useState(true);
  const [isReceivingUpdate, setIsReceivingUpdate] = useState(false);

  const updateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const realTimeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastContentRef = useRef<string>('');
  const isReceivingUpdateRef = useRef(false);

  
  const canEmitEvent = useCallback((content?: string) => {
    const hasSocket = !!socket;
    const hasRoomId = !!roomId;
    const hasActiveFile = !!activeFile;
    const hasFileId = !!activeFile?.id;
    const hasContent = content !== undefined;
    
    return hasSocket && hasRoomId && hasActiveFile && hasFileId && hasContent;
  }, [socket, roomId, activeFile]);

  
  useEffect(() => {
    return () => {
      if (realTimeTimerRef.current) clearTimeout(realTimeTimerRef.current);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
    };
  }, [activeFile?.id]);

 
  useEffect(() => {
    isReceivingUpdateRef.current = isReceivingUpdate;
  }, [isReceivingUpdate]);

  const handleContentChange = useCallback((content: string) => {
    
    if (isReceivingUpdateRef.current || content === lastContentRef.current) {
      console.log('[handleContentChange] Skipping - receiving update or no change');
      return;
    }
    
    console.log('[handleContentChange] Processing change:', {
      contentLength: content?.length,
      activeFileId: activeFile?.id,
      isReceivingUpdate: isReceivingUpdateRef.current
    });
    
    
    lastContentRef.current = content;
    setFileContent(content);
    setIsTyping(true);
    setIsSaved(false);

   
    if (activeFile) {
      setActiveFile(prev => prev ? { ...prev, content } : null);
    }

   
    if (realTimeTimerRef.current) clearTimeout(realTimeTimerRef.current);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    if (updateTimerRef.current) clearTimeout(updateTimerRef.current);

    
    realTimeTimerRef.current = setTimeout(() => {
      if (canEmitEvent(content)) {
        console.log('[handleContentChange] Emitting fileContentChange:', { 
          fileId: activeFile!.id, 
          roomId,
          contentLength: content.length 
        });
        socket!.emit('fileContentChange', {
          roomId,
          fileId: activeFile!.id,
          content,
          userId: socket!.id,
          timestamp: Date.now()
        });
      } else {
        console.warn('[handleContentChange] Cannot emit fileContentChange - validation failed');
      }
    }, 100);

    
    if (socket && activeFile?.id && roomId) {
      socket.emit('typing', {
        fileId: activeFile.id,
        roomId,
        isTyping: true
      });
    }

    
    typingTimerRef.current = setTimeout(() => {
      if (socket && activeFile?.id && roomId) {
        socket.emit('typing', {
          fileId: activeFile.id,
          roomId,
          isTyping: false
        });
      }
      setIsTyping(false);
    }, 1000);

   
    updateTimerRef.current = setTimeout(() => {
      if (canEmitEvent(content)) {
        console.log('[handleContentChange] Emitting updateFile:', { 
          fileId: activeFile!.id, 
          roomId,
          contentLength: content.length 
        });
        socket!.emit('updateFile', {
          fileId: activeFile!.id,
          content,
          roomId
        });
      } else {
        console.warn('[handleContentChange] Cannot emit updateFile - validation failed');
      }
    }, 2000);
  }, [socket, activeFile, roomId, canEmitEvent]);

  const handleCursorMove = useCallback(() => {
    if (socket && activeFile?.id && roomId) {
      socket.emit('cursorMove', {
        fileId: activeFile.id,
        roomId,
        position: 0
      });
    }
  }, [socket, activeFile, roomId]);


  const updateFileContent = useCallback((newContent: string) => {
    console.log('[updateFileContent] External update:', { 
      length: newContent.length,
      activeFileId: activeFile?.id 
    });
    
    setIsReceivingUpdate(true);
    lastContentRef.current = newContent;
    setFileContent(newContent);
    
    
    if (activeFile) {
      setActiveFile(prev => prev ? { ...prev, content: newContent } : null);
    }
    
  
    setTimeout(() => {
      setIsReceivingUpdate(false);
    }, 100);
  }, [activeFile]);


  const clearAllTimers = useCallback(() => {
    if (realTimeTimerRef.current) {
      clearTimeout(realTimeTimerRef.current);
      realTimeTimerRef.current = null;
    }
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
      updateTimerRef.current = null;
    }
  }, []);


  const setActiveFileEnhanced = useCallback((file: FileData | null) => {
    console.log('[setActiveFile] Changing active file:', { 
      from: activeFile?.id,
      to: file?.id,
      fileName: file?.name
    });
    
    
    clearAllTimers();
    
    
    setActiveFile(file);
    
  
    const newContent = file?.content || '';
    lastContentRef.current = newContent;
    setFileContent(newContent);
    setIsTyping(false);
    setIsSaved(true);
    setIsReceivingUpdate(false);
  }, [activeFile?.id, clearAllTimers]);


  return {
    activeFile,
    setActiveFile: setActiveFileEnhanced,
    fileContent,
    setFileContent: updateFileContent,
    isTyping,
    isSaved,
    setIsSaved,
    isReceivingUpdate,
    setIsReceivingUpdate,
    handleContentChange,
    handleCursorMove,
    clearAllTimers
  };
};