import { Server, Socket } from "socket.io";
import { FolderModel, FileModel } from "../db";
import { v4 as uuidv4 } from 'uuid';

export function registerFolderHandlers(socket: Socket, io: Server, userId: string) {
  socket.on("createFolder", async ({ name, roomId, parentFolderId }) => {
    try {
      if (!name || !name.trim() || !roomId || !roomId.trim()) {
        socket.emit("error", "Folder name and roomId are required");
        return;
      }

      const folder = await FolderModel.create({
        id: uuidv4(),
        name: name.trim(),
        roomId,
        parentFolderId: parentFolderId || null,
        createdBy: userId,
        lastEditedBy: userId
      });

      const folders = await FolderModel.find({ roomId }).lean();
      io.to(roomId).emit("foldersUpdate", folders);
      socket.emit("folderCreated", folder);
    } catch (err) {
      console.error("Error creating folder:", err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      socket.emit("error", "Failed to create folder: " + message);
    }
  });

  socket.on("deleteFolder", async ({ folderId, roomId }) => {
    try {
      if (!folderId || !folderId.trim() || !roomId || !roomId.trim()) {
        socket.emit("error", "FolderId and roomId are required");
        return;
      }

      const deleteRecursively = async (fid: string): Promise<void> => {
        const subfolders = await FolderModel.find({ parentFolderId: fid, roomId }).lean();
        
        for (const sub of subfolders) {
          await deleteRecursively(sub.id);
        }
        
        await FileModel.deleteMany({ folderId: fid, roomId });
      
        await FolderModel.deleteOne({ id: fid, roomId });
      };

      await deleteRecursively(folderId);

      const [folders, files] = await Promise.all([
        FolderModel.find({ roomId }).lean(),
        FileModel.find({ roomId }).lean()
      ]);

      io.to(roomId).emit("foldersUpdate", folders);
      io.to(roomId).emit("filesUpdate", files);
      socket.emit("folderDeleted", { folderId });
    } catch (err) {
      console.error("Error deleting folder:", err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      socket.emit("error", "Failed to delete folder: " + message);
    }
  });

  socket.on("renameFolder", async ({ folderId, roomId, name }) => {
    try {
      if (!folderId || !folderId.trim() || !roomId || !roomId.trim() || !name || !name.trim()) {
        socket.emit("error", "folderId, roomId, and name are required");
        return;
      }

      const folder = await FolderModel.findOneAndUpdate(
        { id: folderId, roomId },
        { name: name.trim(), lastEditedBy: userId },
        { new: true }
      ).lean();

      if (!folder) {
        socket.emit("error", "Folder not found");
        return;
      }

      const folders = await FolderModel.find({ roomId }).lean();
      io.to(roomId).emit("foldersUpdate", folders);
      socket.emit("folderRenamed", folder);
    } catch (err) {
      console.error("Error renaming folder:", err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      socket.emit("error", "Failed to rename folder: " + message);
    }
  });
}
