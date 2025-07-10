import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { RoomData, FileData, TypingUser, UserCursor, FolderData } from '../types/room.types';

export const useSocket = (roomId: string) => {
  const socket = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [connectedUsers, setConnectedUsers] = useState<string[]>([]);
  const [files, setFiles] = useState<FileData[]>([]);
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [userCursors, setUserCursors] = useState<UserCursor[]>([]);

  useEffect(() => {
    console.log('useSocket: Setting up socket connection for room:', roomId);

    const token = localStorage.getItem('token');
    console.log('useSocket: Token found:', !!token);

    const newSocket = io('http://localhost:3001', {
      auth: { token },
      timeout: 10000, 
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.current = newSocket;

    newSocket.on('auth_error', (message: string, callback?: () => void) => {
      alert(message || 'Authentication failed. Please sign in again.');
      if (callback) callback(); 
      setTimeout(() => {
        window.location.href = '/signin';
      }, 100);
    });
    const joinTimeout = setTimeout(() => {
      if (isLoading) {
        console.warn('useSocket: Room join timeout after 10 seconds');
        setError('Failed to join room: Connection timeout');
        setIsLoading(false);
      }
    }, 10000);

    newSocket.on('connect', () => {
      console.log('useSocket: Socket connected, attempting to join room:', roomId);
      setIsConnected(true);
      setError(''); 
      newSocket.emit('joinRoom', roomId);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('useSocket: Socket disconnected:', reason);
      setIsConnected(false);
      if (reason !== 'io client disconnect') {
        setError('Connection lost');
      }
    });

    newSocket.on('connect_error', (err) => {
      console.error('useSocket: Connection error:', err);
      setError('Failed to connect to server');
      setIsLoading(false);
      clearTimeout(joinTimeout);
    });

    newSocket.on('roomJoined', (room: RoomData) => {
      console.log('useSocket: Successfully joined room:', room);
      setRoomData(room);
      setError('');
      setIsLoading(false);
      clearTimeout(joinTimeout);
    });

    newSocket.on('error', (message: string) => {
      console.error('useSocket: Room error:', message);
      setError(message);
      setIsLoading(false);
      clearTimeout(joinTimeout);
    });

    newSocket.on('roomNotFound', () => {
      console.error('useSocket: Room not found');
      setError('Room not found');
      setIsLoading(false);
      clearTimeout(joinTimeout);
    });

    newSocket.on('userJoined', (data: { userId: string; roomId: string }) => {
      console.log('useSocket: User joined:', data.userId);
      setConnectedUsers(prev => {
        if (!prev.includes(data.userId)) {
          return [...prev, data.userId];
        }
        return prev;
      });
    });

    newSocket.on('userLeft', (data: { userId: string; roomId: string }) => {
      console.log('useSocket: User left:', data.userId);
      setConnectedUsers(prev => prev.filter(id => id !== data.userId));
      setTypingUsers(prev => prev.filter(user => user.userId !== data.userId));
      setUserCursors(prev => prev.filter(cursor => cursor.userId !== data.userId));
    });

    newSocket.on('roomUsers', (users: { id: string, username: string }[]) => {
      console.log('useSocket: Room users:', users);
      setConnectedUsers(users.map(u => u.id).filter(id => id !== newSocket.id));
    });

    newSocket.on('filesUpdate', (updatedFiles: FileData[]) => {
      console.log('useSocket: Files updated:', updatedFiles);
      setFiles(updatedFiles);
    });

    newSocket.on('foldersUpdate', (updatedFolders: FolderData[]) => {
      console.log('useSocket: Folders updated:', updatedFolders);
      setFolders(updatedFolders);
    });

    newSocket.on('userTyping', (data: { userId: string; fileId: string; isTyping: boolean }) => {
      console.log('useSocket: User typing status:', data);
      setTypingUsers(prev => {
        const filtered = prev.filter(user => user.userId !== data.userId || user.fileId !== data.fileId);
        if (data.isTyping) {
          return [...filtered, data];
        }
        return filtered;
      });
    });

    newSocket.on('userCursorMoved', (data: { userId: string; fileId: string; position: number }) => {
      console.log('useSocket: User cursor moved:', data);
      setUserCursors(prev => {
        const filtered = prev.filter(cursor => cursor.userId !== data.userId || cursor.fileId !== data.fileId);
        return [...filtered, data];
      });
    });

    return () => {
      console.log('useSocket: Cleaning up socket connection');
      clearTimeout(joinTimeout);
      if (socket.current) {
        socket.current.disconnect();
        socket.current = null;
      }
    };
  }, [roomId]); 

  return {
    socket: socket.current,
    isConnected,
    isLoading,
    error,
    roomData,
    connectedUsers,
    files,
    folders,
    typingUsers,
    userCursors,
    setError,
    setFiles,
    setFolders,
    setTypingUsers
  };
};