import { useState, useMemo, useEffect } from 'react';
import { FileEditDialog } from '../components/FileEditDialog';
import { getUserIdFromToken } from '../utils/auth';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { useFileEditor } from '../hooks/useFileEditor';
import { RoomHeader } from '../components/RoomHeader';
import { FileSidebar } from '../components/FileSidebar';
import { CodeEditor } from '../components/CodeEditor';
import RoomSocketHandlers from '../components/room/RoomSocketHandlers';
import RoomFileHandlers from '../components/room/RoomFileHandlers';

function Room() {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editMode, setEditMode] = useState<'edit' | 'view'>('edit');

  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const myUserId = useMemo(() => getUserIdFromToken(), []);

  const [showCreateFile, setShowCreateFile] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  const {
    socket,
    isConnected,
    isLoading,
    error,
    roomData,
    connectedUsers,
    files,
    folders,
    typingUsers,
    setFiles,
    setFolders
  } = useSocket(roomId || "");

  const {
    activeFile,
    setActiveFile: setActiveFileFromHook,
    fileContent,
    setFileContent: setFileContentFromHook,
    isTyping,
    isSaved,
    setIsSaved,
    isReceivingUpdate,
    setIsReceivingUpdate,
    handleContentChange,
    handleCursorMove
  } = useFileEditor(socket, roomId || "");

  useEffect(() => {
    if (!socket || !activeFile) return;
    const interval = setInterval(() => {
      socket.emit('getFile', activeFile.id);
    }, 2000);
    return () => clearInterval(interval);
  }, [socket, activeFile]);

  const setActiveFileWrapper = (value: React.SetStateAction<any>) => {
    if (typeof value === 'function') {
      setActiveFileFromHook(value(activeFile));
    } else {
      setActiveFileFromHook(value);
    }
  };

  const setFileContentWrapper = (value: React.SetStateAction<string>) => {
    if (typeof value === 'function') {
      setFileContentFromHook(value(fileContent));
    } else {
      setFileContentFromHook(value);
    }
  };

  useEffect(() => {
    if (error) {
      const timeout = setTimeout(() => navigate('/'), 3000);
      return () => clearTimeout(timeout);
    }
  }, [error, navigate]);

  if (!roomId) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1a1b26]">
        <div className="text-[#c0caf5]">Invalid room. Redirecting...</div>
      </div>
    );
  }

  const handleCreateFile = (name: string, language: string, folderId?: string) => {
    if (socket && roomId) {
      const fileExtension = name.split('.').pop()?.toLowerCase();
      let finalLanguage = language;
      
      if (fileExtension) {
        const extensionToLanguage: { [key: string]: string } = {
          'js': 'javascript',
          'ts': 'typescript',
          'tsx': 'typescript',
          'jsx': 'javascript',
          'cpp': 'cpp',
          'c': 'c',
          'py': 'python',
          'java': 'java',
          'html': 'html',
          'htm': 'html',
          'css': 'css',
          'scss': 'scss',
          'sass': 'sass',
          'json': 'json',
          'xml': 'xml',
          'php': 'php',
          'rb': 'ruby',
          'go': 'go',
          'rs': 'rust',
          'swift': 'swift',
          'kt': 'kotlin',
          'dart': 'dart',
          'sql': 'sql',
          'sh': 'bash',
          'md': 'markdown',
          'yml': 'yaml',
          'yaml': 'yaml',
          'txt': 'text'
        };
        
        if (extensionToLanguage[fileExtension]) {
          finalLanguage = extensionToLanguage[fileExtension];
        }
      }
      
      socket.emit('createFile', { 
        name, 
        language: finalLanguage, 
        roomId,
        folderId: folderId || selectedFolderId || undefined
      });
      setShowCreateFile(false);
    }
  };

  const handleCreateFolder = (name: string, parentFolderId?: string) => {
    if (socket && roomId) {
      socket.emit('createFolder', { 
        name, 
        roomId,
        parentFolderId: parentFolderId || selectedFolderId || undefined
      });
      setShowCreateFolder(false);
    }
  };

  const handleDeleteFile = (fileId: string) => {
    if (socket && roomId) {
      console.log('Deleting file:', { fileId, roomId });
      socket.emit('deleteFile', { fileId, roomId });
      
      if (activeFile && activeFile.id === fileId) {
        setActiveFileFromHook(null);
        setFileContentFromHook('');
      }
    }
  };

  const handleDeleteFolder = (folderId: string) => {
    if (socket && roomId) {
      console.log('Deleting folder:', { folderId, roomId });
      socket.emit('deleteFolder', { folderId, roomId });
      
      if (selectedFolderId === folderId) {
        setSelectedFolderId(null);
      }
    }
  };

  const handleRenameFolder = (folderId: string, name: string) => {
    if (socket && roomId) {
      socket.emit('renameFolder', { folderId, roomId, name });
    }
  };

  const handleLeaveRoom = () => {
    if (socket) {
      socket.emit('leaveRoom', roomId);
    }
    navigate('/');
  };

  const handleFileSelect = (file: any) => {
    const someoneElseTyping = typingUsers.some(
      (user) => user.fileId === file.id && user.isTyping && user.userId !== myUserId
    );
    
    console.log('Selecting file:', { 
      fileId: file.id, 
      fileName: file.name, 
      language: file.language,
      someoneElseTyping 
    });
    
    setActiveFileFromHook(file);
    
    if (someoneElseTyping) {
      setShowEditDialog(true);
      setEditMode('view');
    } else {
      setEditMode('edit');
    }
    
    if (socket) {
      socket.emit('getFile', file.id);
    }
  };

  const handleFolderSelect = (folderId: string | null) => {
    setSelectedFolderId(folderId);
  };

  const handleEditModeChange = (mode: 'edit' | 'view') => {
    setEditMode(mode);
    setShowEditDialog(false);
  };

  const handleContentChangeWrapper = (content: string) => {
    if (editMode === 'edit') {
      handleContentChange(content);
    }
  };

 
  return (
    <div className="flex h-screen">
      <div className="flex flex-col h-full w-full">
        <RoomHeader
          roomData={roomData}
          roomId={roomId || ""}
          isConnected={isConnected}
          connectedUsers={connectedUsers}
          onLeaveRoom={handleLeaveRoom}
        />
        <div className="flex-1 flex flex-col">
          
          {isLoading && (
            <div className="flex items-center justify-center py-2 bg-[#1a1b26] border-b border-[#414868]">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-[#7aa2f7] border-t-transparent rounded-full animate-spin"></div>
                <span className="text-[#c0caf5] text-sm">Loading...</span>
              </div>
            </div>
          )}
          
          <div className="flex-1 flex">
            <FileSidebar
              files={files}
              folders={folders}
              activeFile={activeFile}
              selectedFolderId={selectedFolderId}
              typingUsers={typingUsers}
              showCreateFile={showCreateFile}
              showCreateFolder={showCreateFolder}
              onCreateFile={handleCreateFile}
              onCreateFolder={handleCreateFolder}
              onFileSelect={handleFileSelect}
              onFolderSelect={handleFolderSelect}
              onDeleteFile={handleDeleteFile}
              onDeleteFolder={handleDeleteFolder}
              onRenameFolder={handleRenameFolder}
              onShowCreateFile={setShowCreateFile}
              onShowCreateFolder={setShowCreateFolder}
            />
            <CodeEditor
              activeFile={activeFile}
              fileContent={fileContent}
              typingUsers={typingUsers}
              isTyping={isTyping}
              isSaved={isSaved}
              isReceivingUpdate={isReceivingUpdate}
              onContentChange={handleContentChangeWrapper}
              onCursorMove={handleCursorMove}
              readOnly={editMode === 'view'}
              allFiles={files}
              getFileContentById={(id) => {
                const file = files.find(f => f.id === id);
                return file ? file.content : '';
              }}
            />
            <FileEditDialog
              open={showEditDialog}
              onClose={() => setShowEditDialog(false)}
              onView={() => handleEditModeChange('view')}
              onEdit={() => handleEditModeChange('edit')}
            />
          </div>
        </div>
      </div>
      
      <RoomSocketHandlers 
        socket={socket}
        setFiles={setFiles}
        setFolders={setFolders}
        setActiveFile={setActiveFileWrapper}
        activeFileId={activeFile?.id || null}
      />
      <RoomFileHandlers
        socket={socket}
        roomId={roomId || ""}
        activeFile={activeFile}
        setActiveFile={setActiveFileWrapper}
        setFileContent={setFileContentWrapper}
        setIsSaved={setIsSaved}
        setIsReceivingUpdate={setIsReceivingUpdate}
        setFiles={setFiles}
      />
    </div>
  );
}

export default Room;