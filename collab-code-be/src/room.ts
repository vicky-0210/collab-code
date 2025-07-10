import { Server, Socket } from "socket.io";
import { authenticateSocket } from "./sockets/authHandlers";
import { registerRoomHandlers } from "./sockets/roomHandlers";
import { registerFileHandlers } from "./sockets/fileHandlers";
import { registerFolderHandlers } from "./sockets/folderHandlers";
import { registerUserHandlers } from "./sockets/userHandlers";
export function registerSocketHandlers(io: Server) {
  io.on("connection", (socket: Socket) => {
    const userId = authenticateSocket(socket);
    if (!userId) return;
    registerRoomHandlers(socket, io, userId);
    registerFileHandlers(socket, io, userId);
    registerFolderHandlers(socket, io, userId);
    registerUserHandlers(socket, io, userId);
  });
}