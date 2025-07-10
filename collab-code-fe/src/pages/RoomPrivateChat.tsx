import React, { useEffect, useRef, useState } from 'react';

import { useParams } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { getUserIdFromToken } from '../utils/auth';
import { RoomHeader } from '../components/RoomHeader';


interface User {
  userId: string;
  username: string;
  online: boolean;
}

interface PrivateMessage {
  _id?: string;
  sender: string;
  message: string;
  createdAt: string;
  username?: string;
}

const RoomPrivateChat: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { socket, connectedUsers, roomData } = useSocket(roomId || '');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<{[userId: string]: number}>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const myUserId = getUserIdFromToken();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!socket) return;
    
    const handleRoomUsers = (userObjs: any[]) => {
      const userList = (userObjs || []).map((user: any) => ({
        userId: user.id,
        username: user.username,
        online: connectedUsers.includes(user.id)
      })).filter((u: User) => u.userId !== myUserId);
      
      setUsers(userList);
      
      if (selectedUser) {
        const updatedSelectedUser = userList.find(u => u.userId === selectedUser.userId);
        if (updatedSelectedUser) {
          setSelectedUser(updatedSelectedUser);
        }
      }
    };
    
    socket.on('roomUsers', handleRoomUsers);
    return () => {
      socket.off('roomUsers', handleRoomUsers);
    };
  }, [socket, connectedUsers, myUserId, selectedUser]);

  useEffect(() => {
    if (socket && roomId && myUserId) {
      socket.emit('joinPrivateChat', { roomId, userId: myUserId });
      
      socket.emit('getUnreadCounts', { roomId, userId: myUserId });
    }
  }, [socket, roomId, myUserId]);

  useEffect(() => {
    if (!socket) return;

    const handleUnreadCounts = (counts: {[userId: string]: number}) => {
      console.log('Received unread counts:', counts);
      setUnreadCounts(counts);
    };

    const handleUnreadCountUpdate = (data: { userId: string; count: number }) => {
      console.log('Received unread count update:', data);
      setUnreadCounts(prev => ({
        ...prev,
        [data.userId]: data.count
      }));
    };

    socket.on('unreadCounts', handleUnreadCounts);
    socket.on('unreadCountUpdate', handleUnreadCountUpdate);

    return () => {
      socket.off('unreadCounts', handleUnreadCounts);
      socket.off('unreadCountUpdate', handleUnreadCountUpdate);
    };
  }, [socket]);

  useEffect(() => {
    if (socket && roomId && selectedUser) {
      setIsLoading(true);
      setError(null);
      
      setMessages([]);
      
      socket.emit('fetchPrivateChat', { roomId, userA: myUserId, userB: selectedUser.userId });
      
      socket.emit('markAsRead', { roomId, userId: myUserId, otherUserId: selectedUser.userId });
      
      const handlePrivateChatHistory = (msgs: PrivateMessage[]) => {
        console.log('Received chat history:', msgs);
        setMessages(msgs);
        setIsLoading(false);
      };
      
      const handleNewPrivateMessage = (msg: PrivateMessage) => {
        console.log('Received new message:', msg);
        setMessages((prev) => {
          const messageExists = prev.some(m => 
            m._id === msg._id || 
            (m.sender === msg.sender && 
             m.message === msg.message && 
             Math.abs(new Date(m.createdAt).getTime() - new Date(msg.createdAt).getTime()) < 5000)
          );
          
          if (!messageExists) {
            const newMessages = [...prev, msg];
            return newMessages.sort((a, b) => 
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
          }
          return prev;
        });

        if (msg.sender === selectedUser.userId) {
          socket.emit('markAsRead', { roomId, userId: myUserId, otherUserId: selectedUser.userId });
        }
      };

      const handleError = (errorData: any) => {
        if (errorData && errorData.message && errorData.message.includes('mark messages as read')) {
          return;
        }
        setError(errorData.message || 'An error occurred');
        setIsLoading(false);
      };

      const handleMessageDelivered = (data: any) => {
        console.log('Message delivered:', data);
      };
      
      socket.on('privateChatHistory', handlePrivateChatHistory);
      socket.on('newPrivateMessage', handleNewPrivateMessage);
      socket.on('error', handleError);
      socket.on('messageDelivered', handleMessageDelivered);
      
      return () => {
        socket.off('privateChatHistory', handlePrivateChatHistory);
        socket.off('newPrivateMessage', handleNewPrivateMessage);
        socket.off('error', handleError);
        socket.off('messageDelivered', handleMessageDelivered);
      };
    }
  }, [socket, roomId, selectedUser, myUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (input.trim() && socket && roomId && selectedUser && token && myUserId) {
      console.log('Sending message:', {
        message: input,
        roomId,
        selectedUser: selectedUser.userId,
        myUserId,
        hasToken: !!token
      });
      setError(null);
      
      const messageData = {
        token,
        roomId,
        toUserId: selectedUser.userId,
        message: input
      };
      
      console.log('Message data being sent:', messageData);
      
      socket.emit('sendPrivateMessage', messageData);
      
      setInput('');
    } else {
      console.log('Cannot send message - missing requirements:', {
        hasInput: !!input.trim(),
        hasSocket: !!socket,
        hasRoomId: !!roomId,
        hasSelectedUser: !!selectedUser,
        hasToken: !!token,
        hasMyUserId: !!myUserId
      });
    }
  };

  useEffect(() => {
    if (!socket) return;

    const handleMarkAsReadSuccess = () => {
      setError(null);
    };
    socket.on('markAsReadSuccess', handleMarkAsReadSuccess);
    return () => {
      socket.off('markAsReadSuccess', handleMarkAsReadSuccess);
    };
  }, [socket]);

  return (
    <div className="flex flex-col h-screen w-full">
      <RoomHeader
        roomData={roomData}
        roomId={roomId || ''}
        isConnected={!!socket}
        connectedUsers={connectedUsers}
        onLeaveRoom={() => { window.location.href = '/'; }}
      />
      
      {error && (
        <div className="bg-red-500 text-white px-4 py-2 text-center">
          {error}
          <button 
            onClick={() => setError(null)}
            className="ml-2 text-red-200 hover:text-white"
          >
            ×
          </button>
        </div>
      )}
      
      <div className="flex flex-1 bg-[#1a1b26]">
        
        <div className="w-64 border-r border-[#3b4261] bg-[#24283b] p-4">
          <h3 className="text-[#c0caf5] text-lg font-semibold mb-4">Users</h3>
          <ul className="space-y-2">
            {users.map((user) => {
              const unreadCount = unreadCounts[user.userId] || 0;
              return (
                <li
                  key={user.userId}
                  className={`p-2 rounded cursor-pointer transition-colors ${
                    selectedUser?.userId === user.userId 
                      ? 'bg-[#7aa2f7] text-[#1a1b26]' 
                      : 'hover:bg-[#3b4261] text-[#c0caf5]'
                  }`}
                  onClick={() => setSelectedUser(user)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="font-medium">{user.username}</span>
                      <span className={`text-xs ${user.online ? 'text-green-400' : 'text-gray-400'}`}>
                        {user.online ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    {unreadCount > 0 && (
                      <div className="flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs rounded-full font-bold">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        
        
        <div className="flex-1 flex flex-col">
          {selectedUser ? (
            <>
              <div className="bg-[#24283b] px-6 py-3 border-b border-[#3b4261]">
                <div className="flex items-center space-x-2">
                  <h2 className="text-[#c0caf5] font-semibold">{selectedUser.username}</h2>
                  <span className={`text-xs px-2 py-1 rounded ${
                    selectedUser.online ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'
                  }`}>
                    {selectedUser.online ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {isLoading ? (
                  <div className="text-center text-[#a9b1d6] py-8">
                    Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-[#a9b1d6] py-8">
                    No messages yet. Start a conversation!
                  </div>
                ) : (
                  <>
                    {messages.map((msg, idx) => (
                      <div key={msg._id || idx} className={`flex ${msg.sender === myUserId ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs px-4 py-2 rounded-lg shadow text-sm ${
                          msg.sender === myUserId 
                            ? 'bg-[#7aa2f7] text-[#1a1b26]' 
                            : 'bg-[#24283b] text-[#c0caf5]'
                        }`}>
                          <div className="font-semibold text-xs mb-1">
                            {msg.username || (msg.sender === myUserId ? 'You' : selectedUser.username)}
                          </div>
                          <div>{msg.message}</div>
                          <div className="text-[10px] text-[#a9b1d6] mt-1 text-right">
                            {new Date(msg.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>
              
              <div className="p-4 border-t border-[#3b4261] bg-[#24283b] flex">
                <input
                  className="flex-1 px-3 py-2 rounded bg-[#1a1b26] text-[#c0caf5] border border-[#3b4261] focus:outline-none focus:border-[#7aa2f7]"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
                  placeholder={`Message ${selectedUser.username}...`}
                />
                <button
                  className="ml-2 px-4 py-2 rounded bg-[#7aa2f7] text-[#1a1b26] font-semibold hover:bg-[#6790e1] transition-colors disabled:opacity-50"
                  onClick={sendMessage}
                  disabled={!input.trim()}
                >
                  Send
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[#a9b1d6]">
              <div className="text-center">
                <h3 className="text-xl mb-2">Select a user to start chatting</h3>
                <p className="text-sm">You can message users even when they're offline</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoomPrivateChat;