import { Server, Socket } from "socket.io";
import { FileModel, FolderModel } from "../db";

const activeUsers = new Map<string, Set<string>>();

export function registerFileHandlers(socket: Socket, io: Server, userId: string) {
  
  socket.on("fileContentChange", async ({ fileId, content, roomId, userId: senderId, timestamp, cursorPosition }) => {
    try {
      console.log("[fileContentChange] Real-time update:", { 
        fileId, 
        roomId, 
        senderId, 
        contentLength: content?.length,
        timestamp 
      });
      
      if (!fileId || !roomId || content === undefined || !senderId) {
        console.warn("[fileContentChange] Invalid parameters");
        socket.emit("error", "Invalid parameters for real-time update");
        return;
      }

      const updatedFile = await FileModel.findOneAndUpdate(
        { id: fileId, roomId },
        { 
          content, 
          updatedAt: new Date(), 
          lastEditedBy: senderId 
        },
        { 
          new: true,
          runValidators: true,
          lean: true
        }
      );

      if (updatedFile) {
        const fileRoom = `file-${fileId}`;

        socket.to(fileRoom).emit("fileContentChange", {
          fileId,
          content,
          userId: senderId,
          timestamp,
          cursorPosition,
          lastEditedBy: senderId,
          updatedAt: updatedFile.updatedAt
        });
        

        socket.emit("fileContentChangeConfirm", {
          fileId,
          timestamp,
          saved: true,
          updatedAt: updatedFile.updatedAt
        });
        
        console.log("[fileContentChange] Broadcasted to room:", fileRoom);
      } else {
        console.warn("[fileContentChange] File not found:", { fileId, roomId });
        socket.emit("error", "File not found for real-time update");
      }
    } catch (err) {
      console.error("[fileContentChange] Error:", err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      socket.emit("error", "Failed to process real-time update: " + message);
    }
  });

  socket.on("cursorPositionChange", ({ fileId, roomId, cursorPosition, selection }) => {
    try {
      if (!fileId || !roomId) return;
      
      const fileRoom = `file-${fileId}`;
      
      socket.to(fileRoom).emit("cursorPositionChange", {
        fileId,
        userId,
        cursorPosition,
        selection,
        timestamp: new Date()
      });
    } catch (err) {
      console.error("[cursorPositionChange] Error:", err);
    }
  });
  socket.on("saveFile", async ({ fileId, content, roomId }) => {
    try {
      console.log("[saveFile] Manual save:", { fileId, roomId, userId, contentLength: content?.length });
      
      if (!fileId || !roomId || content === undefined) {
        socket.emit("error", "Invalid parameters for file save");
        return;
      }
      
      const updatedFile = await FileModel.findOneAndUpdate(
        { id: fileId, roomId },
        { 
          content, 
          updatedAt: new Date(), 
          lastEditedBy: userId 
        },
        { 
          new: true,
          runValidators: true,
          lean: true
        }
      );

      if (updatedFile) {
      
        socket.emit("fileSaved", { 
          fileId, 
          savedAt: updatedFile.updatedAt,
          lastEditedBy: userId 
        });
        
      
        const allFiles = await FileModel.find({ roomId }).lean();
        io.to(roomId).emit("filesUpdate", allFiles);
        
      
        const fileRoom = `file-${fileId}`;
        socket.to(fileRoom).emit("fileContentSync", {
          fileId,
          content,
          lastEditedBy: userId,
          updatedAt: updatedFile.updatedAt,
          savedManually: true
        });
        
        console.log("[saveFile] File saved and broadcasted");
      } else {
        socket.emit("error", "File save failed - file not found");
      }
    } catch (err) {
      console.error("[saveFile] Error:", err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      socket.emit("error", "Failed to save file: " + message);
    }
  });


  socket.on("joinFile", async ({ fileId, roomId }) => {
    try {
      console.log("[joinFile] User joining file:", { fileId, roomId, userId });
      
      if (!fileId || !roomId) {
        socket.emit("error", "File ID and room ID are required");
        return;
      }
      
      
      const fileRoom = `file-${fileId}`;
      socket.join(fileRoom);
      
     
      if (!activeUsers.has(fileRoom)) {
        activeUsers.set(fileRoom, new Set());
      }
      activeUsers.get(fileRoom)!.add(userId);
      
      
      const file = await FileModel.findOne({ id: fileId, roomId }).lean();
      if (file) {
        socket.emit("fileContent", {
          fileId: file.id,
          content: file.content,
          language: file.language,
          lastEditedBy: file.lastEditedBy,
          updatedAt: file.updatedAt
        });
      }
      
    
      socket.to(fileRoom).emit("userJoinedFile", {
        fileId,
        userId,
        joinedAt: new Date(),
        activeUsers: Array.from(activeUsers.get(fileRoom) || [])
      });
      
      
      socket.emit("activeUsersInFile", {
        fileId,
        activeUsers: Array.from(activeUsers.get(fileRoom) || [])
      });
      
      console.log("[joinFile] User joined file room:", { fileRoom, userId });
    } catch (err) {
      console.error("[joinFile] Error:", err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      socket.emit("error", "Failed to join file: " + message);
    }
  });

  
  socket.on("leaveFile", async ({ fileId, roomId }) => {
    try {
      console.log("[leaveFile] User leaving file:", { fileId, roomId, userId });
      
      if (!fileId || !roomId) return;
      
      const fileRoom = `file-${fileId}`;
      socket.leave(fileRoom);
      
      
      if (activeUsers.has(fileRoom)) {
        activeUsers.get(fileRoom)!.delete(userId);
        if (activeUsers.get(fileRoom)!.size === 0) {
          activeUsers.delete(fileRoom);
        }
      }
      
      
      socket.to(fileRoom).emit("userLeftFile", {
        fileId,
        userId,
        leftAt: new Date(),
        activeUsers: Array.from(activeUsers.get(fileRoom) || [])
      });
      
      console.log("[leaveFile] User left file room:", { fileRoom, userId });
    } catch (err) {
      console.error("[leaveFile] Error:", err);
    }
  });

 
  socket.on("getFile", async (fileId: string) => {
    try {
      console.log("[getFile] Request:", { fileId, userId });
      
      if (!fileId) {
        socket.emit("error", "File ID is required");
        return;
      }
      
      const file = await FileModel.findOne({ id: fileId }).lean();
      if (file) {
        socket.emit("fileContent", {
          fileId: file.id,
          content: file.content,
          language: file.language,
          lastEditedBy: file.lastEditedBy,
          updatedAt: file.updatedAt
        });
      } else {
        socket.emit("error", "File not found");
      }
    } catch (err) {
      console.error("[getFile] Error:", err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      socket.emit("error", "Failed to get file: " + message);
    }
  });

 
  socket.on("createFile", async ({ name, language, roomId, folderId }: { name: string, language: string, roomId: string, folderId?: string }) => {
    try {
      if (!name || !name.trim() || !roomId) {
        socket.emit("error", "File name and roomId are required");
        return;
      }
      
      let lang = language?.toLowerCase() || 'javascript';
      const fileExtension = name.split('.').pop()?.toLowerCase();
      
      const extensionToLanguage: { [key: string]: string } = {
        'js': 'javascript', 'ts': 'typescript', 'tsx': 'typescript', 'jsx': 'javascript',
        'cpp': 'cpp', 'c': 'c', 'py': 'python', 'java': 'java', 'html': 'html',
        'htm': 'html', 'css': 'css', 'scss': 'scss', 'sass': 'sass', 'json': 'json',
        'xml': 'xml', 'php': 'php', 'rb': 'ruby', 'go': 'go', 'rs': 'rust',
        'swift': 'swift', 'kt': 'kotlin', 'dart': 'dart', 'sql': 'sql',
        'sh': 'bash', 'md': 'markdown', 'yml': 'yaml', 'yaml': 'yaml', 'txt': 'text'
      };
      
      if (fileExtension && extensionToLanguage[fileExtension]) {
        lang = extensionToLanguage[fileExtension];
      }
      
      const { v4: uuidv4 } = await import('uuid');
      const file = await FileModel.create({
        id: uuidv4(),
        name: name.trim(),
        content: '',
        language: lang,
        roomId,
        folderId: folderId || null,
        createdBy: userId,
        lastEditedBy: userId
      });
      
      const files = await FileModel.find({ roomId }).lean();
      io.to(roomId).emit("filesUpdate", files);
      socket.emit("fileCreated", file);
      
      console.log("[createFile] File created:", { name: file.name, language: file.language });
    } catch (err) {
      console.error("[createFile] Error:", err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      socket.emit("error", "Failed to create file: " + message);
    }
  });

  
  socket.on("deleteFile", async ({ fileId, roomId }: { fileId: string, roomId: string }) => {
    try {
      if (!fileId || !roomId) {
        socket.emit("error", "File ID and room ID are required");
        return;
      }
      
      const deletedFile = await FileModel.findOneAndDelete({ id: fileId, roomId });
      
      if (deletedFile) {
        const files = await FileModel.find({ roomId }).lean();
        io.to(roomId).emit("filesUpdate", files);
        io.to(roomId).emit("fileDeleted", { fileId });
        
        
        const fileRoom = `file-${fileId}`;
        if (activeUsers.has(fileRoom)) {
          activeUsers.delete(fileRoom);
        }
        
        console.log("[deleteFile] File deleted:", { fileId, fileName: deletedFile.name });
      } else {
        socket.emit("error", "File not found or already deleted");
      }
    } catch (err) {
      console.error("[deleteFile] Error:", err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      socket.emit("error", "Failed to delete file: " + message);
    }
  });

  
  socket.on("createFolder", async ({ name, roomId, parentFolderId }: { name: string, roomId: string, parentFolderId?: string }) => {
    try {
      if (!name || !name.trim() || !roomId) {
        socket.emit("error", "Folder name and roomId are required");
        return;
      }
      
      const { v4: uuidv4 } = await import('uuid');
      const folder = await FolderModel.create({
        id: uuidv4(),
        name: name.trim(),
        roomId,
        parentFolderId: parentFolderId || null,
        createdBy: userId
      });
      
      const folders = await FolderModel.find({ roomId }).lean();
      io.to(roomId).emit("foldersUpdate", folders);
      socket.emit("folderCreated", folder);
    } catch (err) {
      console.error("[createFolder] Error:", err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      socket.emit("error", "Failed to create folder: " + message);
    }
  });

  socket.on("deleteFolder", async ({ folderId, roomId }: { folderId: string, roomId: string }) => {
    try {
      if (!folderId || !roomId) {
        socket.emit("error", "Folder ID and room ID are required");
        return;
      }
      
      await FileModel.deleteMany({ folderId, roomId });
      const deletedFolder = await FolderModel.findOneAndDelete({ id: folderId, roomId });
      
      if (deletedFolder) {
        const files = await FileModel.find({ roomId }).lean();
        const folders = await FolderModel.find({ roomId }).lean();
        
        io.to(roomId).emit("filesUpdate", files);
        io.to(roomId).emit("foldersUpdate", folders);
        io.to(roomId).emit("folderDeleted", { folderId });
      } else {
        socket.emit("error", "Folder not found or already deleted");
      }
    } catch (err) {
      console.error("[deleteFolder] Error:", err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      socket.emit("error", "Failed to delete folder: " + message);
    }
  });

  socket.on("renameFolder", async ({ folderId, roomId, name }: { folderId: string, roomId: string, name: string }) => {
    try {
      if (!folderId || !roomId || !name?.trim()) {
        socket.emit("error", "Folder ID, room ID, and name are required");
        return;
      }
      
      const updatedFolder = await FolderModel.findOneAndUpdate(
        { id: folderId, roomId },
        { name: name.trim(), updatedAt: new Date() },
        { new: true, runValidators: true, lean: true }
      );
      
      if (updatedFolder) {
        const folders = await FolderModel.find({ roomId }).lean();
        io.to(roomId).emit("foldersUpdate", folders);
        socket.emit("folderRenamed", { folderId, name: updatedFolder.name });
      } else {
        socket.emit("error", "Folder not found");
      }
    } catch (err) {
      console.error("[renameFolder] Error:", err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      socket.emit("error", "Failed to rename folder: " + message);
    }
  });

  
  socket.on("disconnect", () => {
    console.log("[disconnect] User disconnected:", userId);
    
    for (const [fileRoom, users] of activeUsers.entries()) {
      if (users.has(userId)) {
        users.delete(userId);
        if (users.size === 0) {
          activeUsers.delete(fileRoom);
        } else {
          const fileId = fileRoom.replace('file-', '');
          socket.to(fileRoom).emit("userLeftFile", {
            fileId,
            userId,
            leftAt: new Date(),
            activeUsers: Array.from(users)
          });
        }
      }
    }
  });
}

export function getActiveUsersInFile(fileId: string): string[] {
  const fileRoom = `file-${fileId}`;
  return Array.from(activeUsers.get(fileRoom) || []);
}

export function debugFileModel() {
  console.log("FileModel schema fields:", Object.keys(FileModel.schema.paths));
  console.log("FileModel collection name:", FileModel.collection.name);
  console.log("Active users:", activeUsers);
}