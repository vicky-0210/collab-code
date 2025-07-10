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
exports.registerChatHandlers = registerChatHandlers;
const db_1 = require("./db");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("./config");
function registerChatHandlers(io, socket) {
    // Join chat room
    socket.on('joinChat', (roomId) => __awaiter(this, void 0, void 0, function* () {
        socket.join(`chat:${roomId}`);
        // Optionally send chat history
        const messages = yield db_1.ChatMessage.find({ roomId }).sort({ createdAt: 1 }).limit(100);
        socket.emit('chatHistory', messages);
    }));
    // Handle sending a message
    socket.on('sendMessage', (data) => __awaiter(this, void 0, void 0, function* () {
        try {
            const { token, roomId, message } = data;
            if (!token || !roomId || !message)
                return;
            const decoded = jsonwebtoken_1.default.verify(token, config_1.JWT_PASS);
            const chatMsg = yield db_1.ChatMessage.create({
                roomId,
                userId: decoded.userId,
                username: decoded.username || 'User',
                message,
            });
            io.to(`chat:${roomId}`).emit('newMessage', chatMsg);
        }
        catch (err) {
            // Optionally handle error
        }
    }));
}
