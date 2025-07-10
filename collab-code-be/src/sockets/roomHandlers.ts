import { Server, Socket } from "socket.io";
import { RoomModel, FileModel, FolderModel, UserModel } from "../db";

interface UserObject {
  id: string;
  username: string;
}

export function registerRoomHandlers(socket: Socket, io: Server, userId: string) {
  socket.on("getMyRooms", async () => {
    try {
      const rooms = await RoomModel.find({ users: userId }).lean();
      socket.emit("myRoomsUpdate", rooms);
    } catch (err) {
      console.error("Error fetching user rooms:", err);
      socket.emit("error", "Failed to fetch your rooms");
    }
  });

  socket.on("joinRoom", async (identifier: string) => {
    try {
      if (!identifier || !identifier.trim()) {
        socket.emit("error", "Room ID is required");
        return;
      }

      const room = await RoomModel.findOne({ id: identifier });
      if (!room) {
        socket.emit("error", "Room does not exist");
        return;
      }

      let userJustJoined = false;
      if (!room.users.includes(userId)) {
        room.users.push(userId);
        await room.save();
        userJustJoined = true;
      }

      socket.join(room.id);

      const [files, folders] = await Promise.all([
        FileModel.find({ roomId: room.id }).lean(),
        FolderModel.find({ roomId: room.id }).lean()
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

      const userObjs: UserObject[] = await Promise.all(
        room.users.map(async (uid): Promise<UserObject> => {
          try {
            const user = await UserModel.findById(uid).lean();
            return user 
              ? { id: user._id.toString(), username: user.username || uid } 
              : { id: uid, username: uid };
          } catch (error) {
            console.error(`Error fetching user ${uid}:`, error);
            return { id: uid, username: uid };
          }
        })
      );  

      io.to(room.id).emit("roomUsers", userObjs);

      const userRooms = await RoomModel.find({ users: userId }).lean();
      socket.emit("myRoomsUpdate", userRooms);
    } catch (err) {
      console.error("Error joining room:", err);
      socket.emit("error", "Failed to join room");
    }
  });

  socket.on("createRoom", async (data: { name: string; id: string }) => {
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

      const existingRoom = await RoomModel.findOne({ id });
      if (existingRoom) {
        socket.emit("error", "Room ID already exists");
        return;
      }

      const room = new RoomModel({
        id,
        name,
        users: [userId],
      });
      await room.save();

      socket.join(id);
      socket.emit("roomCreated", { id, name });

      const userRooms = await RoomModel.find({ users: userId }).lean();
      socket.emit("myRoomsUpdate", userRooms);

      const userObjs: UserObject[] = await Promise.all(
        room.users.map(async (uid): Promise<UserObject> => {
          try {
            const user = await UserModel.findById(uid).lean();
            return user 
              ? { id: user._id.toString(), username: user.username || uid } 
              : { id: uid, username: uid };
          } catch (error) {
            console.error(`Error fetching user ${uid}:`, error);
            return { id: uid, username: uid };
          }
        })
      );

      io.to(id).emit("roomUsers", userObjs);
    } catch (err) {
      console.error("Error creating room:", err);
      socket.emit("error", "Failed to create room");
    }
  });

  socket.on("leaveRoom", async (roomId: string) => {
    try {
      if (!roomId || !roomId.trim()) {
        socket.emit("error", "Room ID is required");
        return;
      }

      const room = await RoomModel.findOne({ id: roomId });
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
        await Promise.all([
          FileModel.deleteMany({ roomId }),
          FolderModel.deleteMany({ roomId }),
          RoomModel.deleteOne({ id: roomId })
        ]);
      } else {
        await room.save();
        
        const userObjs: UserObject[] = await Promise.all(
          room.users.map(async (uid): Promise<UserObject> => {
            try {
              const user = await UserModel.findById(uid).lean();
              return user 
                ? { id: user._id.toString(), username: user.username || uid } 
                : { id: uid, username: uid };
            } catch (error) {
              console.error(`Error fetching user ${uid}:`, error);
              return { id: uid, username: uid };
            }
          })
        );

        io.to(roomId).emit("roomUsers", userObjs);
      }

      const userRooms = await RoomModel.find({ users: userId }).lean();
      socket.emit("myRoomsUpdate", userRooms);
    } catch (err) {
      console.error("Error leaving room:", err);
      socket.emit("error", "Failed to leave room");
    }
  });
}
