"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerPrivateChatHandlers = registerPrivateChatHandlers;
const db_1 = require("./db");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_PASS = process.env.JWT_PASS;
if (!JWT_PASS) {
    console.error('JWT_PASS environment variable is not defined');
    throw new Error('JWT_PASS environment variable is not defined');
}
function registerPrivateChatHandlers(io, socket) {
    socket.on('joinPrivateChat', ({ roomId, userId }) => {
        const roomKey = `privatechat:${roomId}:${userId}`;
        socket.join(roomKey);
        console.log(`[joinPrivateChat] User ${userId} joined room ${roomKey}`);
    });
    socket.on('getUnreadCounts', (_a) => __awaiter(this, [_a], void 0, function* ({ roomId, userId }) {
        console.log('[getUnreadCounts] called', { roomId, userId });
        try {
            const chats = yield db_1.PrivateChat.find({
                roomId,
                $or: [
                    { userA: userId },
                    { userB: userId }
                ]
            });
            const unreadCounts = {};
            for (const chat of chats) {
                const otherUserId = chat.userA === userId ? chat.userB : chat.userA;
                const unreadCount = chat.getUnreadCount(userId);
                if (unreadCount > 0) {
                    unreadCounts[otherUserId] = unreadCount;
                }
            }
            socket.emit('unreadCounts', unreadCounts);
        }
        catch (error) {
            console.error('[getUnreadCounts] error:', error);
            socket.emit('error', { message: 'Failed to get unread counts' });
        }
    }));
    socket.on('markAsRead', (_a) => __awaiter(this, [_a], void 0, function* ({ roomId, userId, otherUserId }) {
        console.log('[markAsRead] called', { roomId, userId, otherUserId });
        try {
            const [userA, userB] = userId < otherUserId ? [userId, otherUserId] : [otherUserId, userId];
            const chat = yield db_1.PrivateChat.findOne({
                roomId,
                userA,
                userB
            });
            if (chat) {
                yield chat.markAsRead(userId);
                const unreadCountForCurrentUser = chat.getUnreadCount(userId);
                const unreadCountForOtherUser = chat.getUnreadCount(otherUserId);
                io.to(`privatechat:${roomId}:${userId}`).emit('unreadCountUpdate', {
                    userId: otherUserId,
                    count: unreadCountForCurrentUser
                });
                io.to(`privatechat:${roomId}:${otherUserId}`).emit('unreadCountUpdate', {
                    userId: userId,
                    count: unreadCountForOtherUser
                });
                socket.emit('markAsReadSuccess', { roomId, userId, otherUserId });
            }
            else {
                socket.emit('unreadCountUpdate', { userId: otherUserId, count: 0 });
                socket.emit('markAsReadSuccess', { roomId, userId, otherUserId });
            }
        }
        catch (error) {
            console.error('[markAsRead] error:', error);
            socket.emit('error', { message: 'Failed to mark messages as read' });
        }
    }));
    socket.on('fetchPrivateChat', (_a) => __awaiter(this, [_a], void 0, function* ({ roomId, userA, userB }) {
        console.log('[fetchPrivateChat] called', { roomId, userA, userB });
        try {
            const [orderedA, orderedB] = userA < userB ? [userA, userB] : [userB, userA];
            const chat = yield db_1.PrivateChat.findOne({
                roomId,
                userA: orderedA,
                userB: orderedB
            }).sort({ updatedAt: -1 });
            if (chat) {
                console.log('[fetchPrivateChat] found chat', chat._id, 'messages:', chat.messages.length);
                const sortedMessages = chat.messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                socket.emit('privateChatHistory', sortedMessages);
                yield chat.markAsRead(userA);
                const unreadCount = chat.getUnreadCount(userA);
                socket.emit('unreadCountUpdate', {
                    userId: userB,
                    count: unreadCount
                });
            }
            else {
                console.log('[fetchPrivateChat] no chat found');
                socket.emit('privateChatHistory', []);
            }
        }
        catch (error) {
            console.error('[fetchPrivateChat] error:', error);
            socket.emit('privateChatHistory', []);
            socket.emit('error', { message: 'Failed to fetch chat history' });
        }
    }));
    socket.on('sendPrivateMessage', (data) => __awaiter(this, void 0, void 0, function* () {
        console.log('[sendPrivateMessage] Starting message send process...');
        try {
            const { token, roomId, toUserId, message } = data;
            console.log('[sendPrivateMessage] received data:', {
                hasToken: !!token,
                roomId,
                toUserId,
                messageLength: message === null || message === void 0 ? void 0 : message.length,
                message: (message === null || message === void 0 ? void 0 : message.substring(0, 50)) + ((message === null || message === void 0 ? void 0 : message.length) > 50 ? '...' : '')
            });
            if (!token || !roomId || !toUserId || !message || message.trim() === '') {
                console.log('[sendPrivateMessage] Validation failed - missing required fields:', {
                    hasToken: !!token,
                    hasRoomId: !!roomId,
                    hasToUserId: !!toUserId,
                    hasMessage: !!message,
                    messageNotEmpty: message && message.trim() !== ''
                });
                socket.emit('error', { message: 'Missing required fields' });
                return;
            }
            let decoded;
            try {
                decoded = jsonwebtoken_1.default.verify(token, JWT_PASS);
                console.log('[sendPrivateMessage] JWT decoded successfully:', { userId: decoded.userId, username: decoded.username });
            }
            catch (err) {
                console.error('[sendPrivateMessage] JWT verification failed:', err);
                socket.emit('error', { message: 'Invalid token' });
                return;
            }
            const fromUserId = decoded.userId || decoded.id || decoded._id || decoded.sub;
            const username = decoded.username || decoded.name || 'User';
            console.log('[sendPrivateMessage] JWT field extraction:', {
                'decoded.userId': decoded.userId,
                'decoded.id': decoded.id,
                'decoded._id': decoded._id,
                'decoded.sub': decoded.sub,
                'final fromUserId': fromUserId
            });
            if (!fromUserId || !toUserId) {
                console.log('[sendPrivateMessage] User ID validation failed:', {
                    fromUserId,
                    toUserId,
                    decodedKeys: Object.keys(decoded)
                });
                socket.emit('error', { message: 'Invalid user IDs' });
                return;
            }
            const fromUserIdStr = String(fromUserId);
            const toUserIdStr = String(toUserId);
            const messageTimestamp = new Date();
            const [userA, userB] = fromUserIdStr < toUserIdStr ? [fromUserIdStr, toUserIdStr] : [toUserIdStr, fromUserIdStr];
            console.log('[sendPrivateMessage] Processing message from:', fromUserIdStr, 'to:', toUserIdStr);
            console.log('[sendPrivateMessage] Ordered userA/userB:', { userA, userB });
            try {
                yield db_1.PrivateChat.findOne({}).limit(1);
                console.log('[sendPrivateMessage] Database connection test passed');
            }
            catch (dbErr) {
                console.error('[sendPrivateMessage] Database connection test failed:', dbErr);
                socket.emit('error', { message: 'Database connection error' });
                return;
            }
            const newMessage = {
                _id: messageTimestamp.getTime().toString(),
                sender: fromUserIdStr,
                message: message.trim(),
                createdAt: messageTimestamp,
                readBy: [{ userId: fromUserIdStr, readAt: messageTimestamp }]
            };
            console.log('[sendPrivateMessage] New message object:', newMessage);
            console.log('[sendPrivateMessage] Attempting to find or create chat...');
            let chat = yield db_1.PrivateChat.findOne({
                roomId,
                userA,
                userB
            });
            if (chat) {
                console.log('[sendPrivateMessage] Found existing chat:', chat._id);
                chat.messages.push(newMessage);
                chat.updatedAt = messageTimestamp;
                try {
                    yield chat.save();
                    console.log('[sendPrivateMessage] Message added to existing chat successfully');
                }
                catch (saveErr) {
                    console.error('[sendPrivateMessage] Error saving to existing chat:', saveErr);
                    console.error('[sendPrivateMessage] Save error details:', JSON.stringify(saveErr, null, 2));
                    throw saveErr;
                }
            }
            else {
                console.log('[sendPrivateMessage] No existing chat found, creating new one...');
                console.log('[sendPrivateMessage] Creating chat with:', {
                    roomId,
                    userA,
                    userB,
                    messageCount: 1,
                    firstMessageSender: newMessage.sender
                });
                chat = new db_1.PrivateChat({
                    roomId: roomId,
                    userA: userA,
                    userB: userB,
                    messages: [newMessage],
                    lastReadBy: [{ userId: fromUserIdStr, lastReadAt: messageTimestamp }],
                    createdAt: messageTimestamp,
                    updatedAt: messageTimestamp
                });
                const validationError = chat.validateSync();
                if (validationError) {
                    console.error('[sendPrivateMessage] Validation error before save:', validationError);
                    socket.emit('error', {
                        message: 'Validation failed',
                        error: validationError.message
                    });
                    return;
                }
                try {
                    yield chat.save();
                    console.log('[sendPrivateMessage] New chat created successfully:', chat._id);
                }
                catch (saveErr) {
                    console.error('[sendPrivateMessage] Error creating new chat:', saveErr);
                    console.error('[sendPrivateMessage] Save error details:', JSON.stringify(saveErr, null, 2));
                    throw saveErr;
                }
            }
            console.log('[sendPrivateMessage] Message saved to database successfully');
            const messageToEmit = {
                sender: fromUserIdStr,
                message: message.trim(),
                createdAt: messageTimestamp.toISOString(),
                username,
                _id: messageTimestamp.getTime().toString()
            };
            console.log('[sendPrivateMessage] Emitting message to both users...');
            io.to(`privatechat:${roomId}:${fromUserIdStr}`).emit('newPrivateMessage', messageToEmit);
            io.to(`privatechat:${roomId}:${toUserIdStr}`).emit('newPrivateMessage', messageToEmit);
            const unreadCountForReceiver = chat.getUnreadCount(toUserIdStr);
            const unreadCountForSender = chat.getUnreadCount(fromUserIdStr);
            io.to(`privatechat:${roomId}:${toUserIdStr}`).emit('unreadCountUpdate', {
                userId: fromUserIdStr,
                count: unreadCountForReceiver
            });
            io.to(`privatechat:${roomId}:${fromUserIdStr}`).emit('unreadCountUpdate', {
                userId: toUserIdStr,
                count: unreadCountForSender
            });
            console.log('[sendPrivateMessage] Message sent successfully to both users');
            socket.emit('messageDelivered', {
                messageId: messageToEmit._id,
                delivered: true
            });
        }
        catch (err) {
            console.error('[sendPrivateMessage] Unexpected error:', err);
            console.error('[sendPrivateMessage] Error stack:', err instanceof Error ? err.stack : 'No stack trace');
            socket.emit('error', {
                message: 'Failed to send message',
                error: err,
                details: process.env.NODE_ENV === 'development' ? (err instanceof Error ? err.message : String(err)) : undefined
            });
        }
    }));
    socket.on('disconnect', () => {
        console.log('[disconnect] User disconnected from private chat');
    });
}
