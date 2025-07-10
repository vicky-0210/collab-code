"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSocketHandlers = registerSocketHandlers;
const authHandlers_1 = require("./sockets/authHandlers");
const roomHandlers_1 = require("./sockets/roomHandlers");
const fileHandlers_1 = require("./sockets/fileHandlers");
const folderHandlers_1 = require("./sockets/folderHandlers");
const userHandlers_1 = require("./sockets/userHandlers");
function registerSocketHandlers(io) {
    io.on("connection", (socket) => {
        const userId = (0, authHandlers_1.authenticateSocket)(socket);
        if (!userId)
            return;
        (0, roomHandlers_1.registerRoomHandlers)(socket, io, userId);
        (0, fileHandlers_1.registerFileHandlers)(socket, io, userId);
        (0, folderHandlers_1.registerFolderHandlers)(socket, io, userId);
        (0, userHandlers_1.registerUserHandlers)(socket, io, userId);
    });
}
