import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/theme.css';
import { io, Socket } from 'socket.io-client';

import { BACKEND_URL } from '../config';

interface Room {
  id: string;
  name: string;
  users: string[];
  createdAt: Date;
}

const Home: React.FC = () => {
  const [roomName, setRoomName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [joinRoomIdentifier, setJoinRoomIdentifier] = useState('');
  const [myRooms, setMyRooms] = useState<Room[]>([]); 
  const navigate = useNavigate();
  const socket = useRef<Socket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const newSocket = io(`${BACKEND_URL}`, {
      auth: { token }
    });
    socket.current = newSocket;

    
    newSocket.on('myRoomsUpdate', (updatedRooms: Room[]) => {
      setMyRooms(updatedRooms);
    });

    newSocket.on('error', (message: string) => {
      alert(message);
    });

    newSocket.on('roomCreated', (room: { id: string; name: string }) => {
      navigate(`/room/${room.id}`);
    });

    newSocket.on('roomJoined', (room: { id: string; name: string }) => {
      navigate(`/room/${room.id}`);
    });

    newSocket.emit('getMyRooms');

    return () => {
      if (socket.current) {
        socket.current.off('myRoomsUpdate');
        socket.current.off('error');
        socket.current.off('roomCreated');
        socket.current.off('roomJoined');
        socket.current.disconnect();
      }
    };
  }, [navigate]);

  const handleCreateRoom = () => {
    if (!roomName.trim()) {
      alert('Please enter a room name');
      return;
    }

    if (!roomId.trim()) {
      alert('Please enter a room ID');
      return;
    }

    if (socket.current) {
      socket.current.emit('createRoom', { name: roomName, id: roomId });
    }
  };

  const handleJoinRoom = (roomId: string) => {
    if (!roomId.trim()) {
      alert('Please enter a room ID');
      return;
    }
    if (socket.current) {
      socket.current.emit('joinRoom', roomId);
    }
  };

  const handleJoinRoomFromList = (roomId: string) => {
    if (socket.current) {
      socket.current.emit('joinRoom', roomId);
    }
  };

  const handleLeaveRoom = (roomId: string) => {
    if (window.confirm('Are you sure you want to leave this room?')) {
      if (socket.current) {
        socket.current.emit('leaveRoom', roomId);
      }
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('token');
    navigate('/signin');
  };

  return (
    <div className="min-h-screen bg-[#1a1b26] p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-[#c0caf5]">Collab Code</h1>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600 transition-colors duration-200 ml-4"
          >
            Sign Out
          </button>
        </div>

        <div className="space-y-12">
          <div className="bg-[#24283b] rounded-lg p-6">
            <h2 className="text-2xl font-semibold text-[#c0caf5] mb-6">Create Room</h2>
            <div className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Room Name (required)"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full px-4 py-2 rounded bg-[#2a2e43] text-[#c0caf5] border border-[#3b4261] focus:outline-none focus:border-[#7aa2f7] transition-colors duration-200"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Room ID (required)"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="w-full px-4 py-2 rounded bg-[#2a2e43] text-[#c0caf5] border border-[#3b4261] focus:outline-none focus:border-[#7aa2f7] transition-colors duration-200"
                />
              </div>
              <button
                onClick={handleCreateRoom}
                className="w-full px-4 py-2 rounded bg-[#7aa2f7] text-[#1a1b26] hover:bg-[#6790e1] transition-colors duration-200"
              >
                Create Room
              </button>
            </div>
          </div>

          <div className="bg-[#24283b] rounded-lg p-6">
            <h2 className="text-2xl font-semibold text-[#c0caf5] mb-6">Join Room</h2>
            <div className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Room ID (required)"
                  value={joinRoomIdentifier}
                  onChange={(e) => setJoinRoomIdentifier(e.target.value)}
                  className="w-full px-4 py-2 rounded bg-[#2a2e43] text-[#c0caf5] border border-[#3b4261] focus:outline-none focus:border-[#7aa2f7] transition-colors duration-200"
                />
              </div>
              <button
                onClick={() => handleJoinRoom(joinRoomIdentifier)}
                className="w-full px-4 py-2 rounded bg-[#7aa2f7] text-[#1a1b26] hover:bg-[#6790e1] transition-colors duration-200"
              >
                Join Room
              </button>
            </div>
          </div>

          <div className="bg-[#24283b] rounded-lg p-6">
            <h2 className="text-2xl font-semibold text-[#c0caf5] mb-6">My Rooms</h2>
            {myRooms.length === 0 ? (
              <p className="text-[#a9b1d6] text-center py-4">You haven't created or joined any rooms yet</p>
            ) : (
              <div className="space-y-2">
                {myRooms.map((room) => (
                  <div
                    key={room.id}
                    className="bg-[#2a2e43] rounded-lg p-4 hover:bg-[#2e3450] transition-colors duration-200"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-[#c0caf5] font-semibold">{room.name}</h3>
                        <p className="text-[#a9b1d6] text-sm">ID: {room.id}</p>
                        <p className="text-[#a9b1d6] text-sm">{room.users.length} member{room.users.length !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleJoinRoomFromList(room.id)}
                          className="px-4 py-2 rounded bg-[#7aa2f7] text-[#1a1b26] hover:bg-[#6790e1] transition-colors duration-200"
                        >
                          Join
                        </button>
                        <button
                          onClick={() => handleLeaveRoom(room.id)}
                          className="px-4 py-2 rounded bg-[#f7768e] text-white hover:bg-[#e06c88] transition-colors duration-200"
                        >
                          Leave
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;