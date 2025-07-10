import React from 'react';
import { Link } from 'react-router-dom';
import type { RoomData } from '../types/room.types';

interface RoomHeaderProps {
  roomData: RoomData | null;
  roomId: string;
  isConnected: boolean;
  connectedUsers: string[];
  onLeaveRoom: () => void;
}

export const RoomHeader: React.FC<RoomHeaderProps> = ({
  roomData,
  roomId,
  isConnected,
  onLeaveRoom
}) => {
  return (
    <div className="bg-[#24283b] p-4 border-b border-[#3b4261]">
      <div className="flex justify-between items-center">
        
        <div className="flex flex-col min-w-[180px]">
          <h1 className="text-2xl font-bold text-[#c0caf5] truncate">
            {roomData?.name || 'Loading...'}
          </h1>
          <p className="text-[#a9b1d6] text-sm truncate">Room ID: {roomId}</p>
        </div>
        
        <div className="flex-1 flex justify-center items-center space-x-8">
          <Link to="/" className="text-[#7aa2f7] hover:underline font-semibold">Home</Link>
          <Link to={`/room/${roomId}/private-chat`} className="text-[#7aa2f7] hover:underline font-semibold">Chat</Link>
          <Link to={`/room/${roomId}`} className="text-[#c0caf5] font-semibold">Room</Link>
        </div>
        
        <div className="flex items-center space-x-4 min-w-[120px] justify-end">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-[#a9b1d6] text-sm">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <button
            onClick={onLeaveRoom}
            className="px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600 transition-colors duration-200"
          >
            Leave Room
          </button>
        </div>
      </div>
    </div>
  );
};