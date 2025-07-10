import { Socket } from 'socket.io-client';
import type { FileData } from '../../types/room.types';

export interface RoomSocketHandlers {
  socket: Socket | null;
  roomId: string;
  setFiles: React.Dispatch<React.SetStateAction<FileData[]>>;
}

export interface RoomFileHandlersProps {
  socket: Socket | null;
  roomId: string;
  activeFile: FileData | null;
  setActiveFile: React.Dispatch<React.SetStateAction<FileData | null>>;
  setFileContent: React.Dispatch<React.SetStateAction<string>>;
  setIsSaved: React.Dispatch<React.SetStateAction<boolean>>;
  setIsReceivingUpdate: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface RoomFolderHandlers {
  socket: Socket | null;
  activeFile: FileData | null;
  setActiveFile: React.Dispatch<React.SetStateAction<FileData | null>>;
  setFileContent: React.Dispatch<React.SetStateAction<string>>;
  setShowCreateFolder: React.Dispatch<React.SetStateAction<boolean>>;
}
