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
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoomHandlers = registerRoomHandlers;
const db_1 = require("../db");
function registerRoomHandlers(socket, io, userId) {
    socket.on("getMyRooms", () => __awaiter(this, void 0, void 0, function* () {
        try {
            const rooms = yield db_1.RoomModel.find({ users: userId }).lean();
            socket.emit("myRoomsUpdate", rooms);
        }
        catch (err) {
            console.error("Error fetching user rooms:", err);
            socket.emit("error", "Failed to fetch your rooms");
        }
    }));
    socket.on("joinRoom", (identifier) => __awaiter(this, void 0, void 0, function* () {
        try {
            if (!identifier || !identifier.trim()) {
                socket.emit("error", "Room ID is required");
                return;
            }
            const room = yield db_1.RoomModel.findOne({ id: identifier });
            if (!room) {
                socket.emit("error", "Room does not exist");
                return;
            }
            let userJustJoined = false;
            if (!room.users.includes(userId)) {
                room.users.push(userId);
                yield room.save();
                userJustJoined = true;
            }
            socket.join(room.id);
            const [files, folders] = yield Promise.all([
                db_1.FileModel.find({ roomId: room.id }).lean(),
                db_1.FolderModel.find({ roomId: room.id }).lean()
            ]);
            socket.emit("roomJoined", {
                id: room.id,
                name: room.name,
                users: room.users,
                files,
                folders
            });
            if (userJustJoined) {
                socket.to(room.id).emit("userJoined", { userId, roomId: room.id });
            }
            socket.emit("filesUpdate", files);
            socket.emit("foldersUpdate", folders);
            const userObjs = yield Promise.all(room.users.map((uid) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const user = yield db_1.UserModel.findById(uid).lean();
                    return user
                        ? { id: user._id.toString(), username: user.username || uid }
                        : { id: uid, username: uid };
                }
                catch (error) {
                    console.error(`Error fetching user ${uid}:`, error);
                    return { id: uid, username: uid };
                }
            })));
            io.to(room.id).emit("roomUsers", userObjs);
            const userRooms = yield db_1.RoomModel.find({ users: userId }).lean();
            socket.emit("myRoomsUpdate", userRooms);
        }
        catch (err) {
            console.error("Error joining room:", err);
            socket.emit("error", "Failed to join room");
        }
    }));
    socket.on("createRoom", (data) => __awaiter(this, void 0, void 0, function* () {
        try {
            const { name, id } = data;
            if (!name || !name.trim()) {
                socket.emit("error", "Room name is required");
                return;
            }
            if (!id || !id.trim()) {
                socket.emit("error", "Room ID is required");
                return;
            }
            const existingRoom = yield db_1.RoomModel.findOne({ id });
            if (existingRoom) {
                socket.emit("error", "Room ID already exists");
                return;
            }
            const room = new db_1.RoomModel({
                id,
                name,
                users: [userId],
            });
            yield room.save();
            socket.join(id);
            socket.emit("roomCreated", { id, name });
            const userRooms = yield db_1.RoomModel.find({ users: userId }).lean();
            socket.emit("myRoomsUpdate", userRooms);
            const userObjs = yield Promise.all(room.users.map((uid) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const user = yield db_1.UserModel.findById(uid).lean();
                    return user
                        ? { id: user._id.toString(), username: user.username || uid }
                        : { id: uid, username: uid };
                }
                catch (error) {
                    console.error(`Error fetching user ${uid}:`, error);
                    return { id: uid, username: uid };
                }
            })));
            io.to(id).emit("roomUsers", userObjs);
        }
        catch (err) {
            console.error("Error creating room:", err);
            socket.emit("error", "Failed to create room");
        }
    }));
    socket.on("leaveRoom", (roomId) => __awaiter(this, void 0, void 0, function* () {
        try {
            if (!roomId || !roomId.trim()) {
                socket.emit("error", "Room ID is required");
                return;
            }
            const room = yield db_1.RoomModel.findOne({ id: roomId });
            if (!room) {
                socket.emit("error", "Room does not exist");
                return;
            }
            if (!room.users.includes(userId)) {
                socket.emit("error", "You are not a member of this room");
                return;
            }
            room.users = room.users.filter(u => u !== userId);
            socket.leave(roomId);
            socket.to(roomId).emit("userLeft", { userId, roomId });
            if (room.users.length === 0) {
                yield Promise.all([
                    db_1.FileModel.deleteMany({ roomId }),
                    db_1.FolderModel.deleteMany({ roomId }),
                    db_1.RoomModel.deleteOne({ id: roomId })
                ]);
            }
            else {
                yield room.save();
                const userObjs = yield Promise.all(room.users.map((uid) => __awaiter(this, void 0, void 0, function* () {
                    try {
                        const user = yield db_1.UserModel.findById(uid).lean();
                        return user
                            ? { id: user._id.toString(), username: user.username || uid }
                            : { id: uid, username: uid };
                    }
                    catch (error) {
                        console.error(`Error fetching user ${uid}:`, error);
                        return { id: uid, username: uid };
                    }
                })));
                io.to(roomId).emit("roomUsers", userObjs);
            }
            const userRooms = yield db_1.RoomModel.find({ users: userId }).lean();
            socket.emit("myRoomsUpdate", userRooms);
        }
        catch (err) {
            console.error("Error leaving room:", err);
            socket.emit("error", "Failed to leave room");
        }
    }));
}
