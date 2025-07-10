"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateSocket = authenticateSocket;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
function authenticateSocket(socket) {
    var _a;
    try {
        const token = (_a = socket.handshake.auth) === null || _a === void 0 ? void 0 : _a.token;
        if (!token) {
            socket.emit("auth_error", "Please Sign In", (response) => {
                if (response) {
                    socket.disconnect();
                }
            });
            return null;
        }
        const decoded = jsonwebtoken_1.default.verify(token, config_1.JWT_PASS);
        if (!decoded || typeof decoded !== 'object' || !decoded.id) {
            throw new Error('Invalid token payload');
        }
        const userId = decoded.id;
        socket.data.userId = userId;
        return userId;
    }
    catch (error) {
        console.error('Socket authentication failed:', error);
        socket.emit("auth_error", "Authentication failed");
        socket.disconnect();
        return null;
    }
}
