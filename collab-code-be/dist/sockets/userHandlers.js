"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUserHandlers = registerUserHandlers;
function registerUserHandlers(socket, io, userId) {
    socket.on("typing", ({ fileId, roomId, isTyping }) => {
        try {
            if (!fileId || !roomId) {
                console.warn("Invalid typing event parameters:", { fileId, roomId, userId });
                return;
            }
            socket.to(roomId).emit("userTyping", { userId, fileId, isTyping });
        }
        catch (err) {
            console.error("Error handling typing event:", err);
        }
    });
    socket.on("cursorMove", ({ fileId, roomId, position }) => {
        try {
            if (!fileId || !roomId) {
                console.warn("Invalid cursor move event parameters:", { fileId, roomId, userId });
                return;
            }
            socket.to(roomId).emit("userCursorMoved", { userId, fileId, position });
        }
        catch (err) {
            console.error("Error handling cursor move event:", err);
        }
    });
    socket.on("disconnect", (reason) => {
        try {
            console.log(`User ${userId} disconnected:`, reason);
        }
        catch (err) {
            console.error("Error handling disconnect:", err);
        }
    });
}
