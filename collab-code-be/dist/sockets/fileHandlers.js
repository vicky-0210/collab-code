"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.registerFileHandlers = registerFileHandlers;
exports.getActiveUsersInFile = getActiveUsersInFile;
exports.debugFileModel = debugFileModel;
const db_1 = require("../db");
const activeUsers = new Map();
function registerFileHandlers(socket, io, userId) {
    socket.on("fileContentChange", (_a) => __awaiter(this, [_a], void 0, function* ({ fileId, content, roomId, userId: senderId, timestamp, cursorPosition }) {
        try {
            console.log("[fileContentChange] Real-time update:", {
                fileId,
                roomId,
                senderId,
                contentLength: content === null || content === void 0 ? void 0 : content.length,
                timestamp
            });
            if (!fileId || !roomId || content === undefined || !senderId) {
                console.warn("[fileContentChange] Invalid parameters");
                socket.emit("error", "Invalid parameters for real-time update");
                return;
            }
            const updatedFile = yield db_1.FileModel.findOneAndUpdate({ id: fileId, roomId }, {
                content,
                updatedAt: new Date(),
                lastEditedBy: senderId
            }, {
                new: true,
                runValidators: true,
                lean: true
            });
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
            }
            else {
                console.warn("[fileContentChange] File not found:", { fileId, roomId });
                socket.emit("error", "File not found for real-time update");
            }
        }
        catch (err) {
            console.error("[fileContentChange] Error:", err);
            const message = err instanceof Error ? err.message : 'Unknown error';
            socket.emit("error", "Failed to process real-time update: " + message);
        }
    }));
    socket.on("cursorPositionChange", ({ fileId, roomId, cursorPosition, selection }) => {
        try {
            if (!fileId || !roomId)
                return;
            const fileRoom = `file-${fileId}`;
            socket.to(fileRoom).emit("cursorPositionChange", {
                fileId,
                userId,
                cursorPosition,
                selection,
                timestamp: new Date()
            });
        }
        catch (err) {
            console.error("[cursorPositionChange] Error:", err);
        }
    });
    socket.on("saveFile", (_a) => __awaiter(this, [_a], void 0, function* ({ fileId, content, roomId }) {
        try {
            console.log("[saveFile] Manual save:", { fileId, roomId, userId, contentLength: content === null || content === void 0 ? void 0 : content.length });
            if (!fileId || !roomId || content === undefined) {
                socket.emit("error", "Invalid parameters for file save");
                return;
            }
            const updatedFile = yield db_1.FileModel.findOneAndUpdate({ id: fileId, roomId }, {
                content,
                updatedAt: new Date(),
                lastEditedBy: userId
            }, {
                new: true,
                runValidators: true,
                lean: true
            });
            if (updatedFile) {
                socket.emit("fileSaved", {
                    fileId,
                    savedAt: updatedFile.updatedAt,
                    lastEditedBy: userId
                });
                const allFiles = yield db_1.FileModel.find({ roomId }).lean();
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
            }
            else {
                socket.emit("error", "File save failed - file not found");
            }
        }
        catch (err) {
            console.error("[saveFile] Error:", err);
            const message = err instanceof Error ? err.message : 'Unknown error';
            socket.emit("error", "Failed to save file: " + message);
        }
    }));
    socket.on("joinFile", (_a) => __awaiter(this, [_a], void 0, function* ({ fileId, roomId }) {
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
            activeUsers.get(fileRoom).add(userId);
            const file = yield db_1.FileModel.findOne({ id: fileId, roomId }).lean();
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
        }
        catch (err) {
            console.error("[joinFile] Error:", err);
            const message = err instanceof Error ? err.message : 'Unknown error';
            socket.emit("error", "Failed to join file: " + message);
        }
    }));
    socket.on("leaveFile", (_a) => __awaiter(this, [_a], void 0, function* ({ fileId, roomId }) {
        try {
            console.log("[leaveFile] User leaving file:", { fileId, roomId, userId });
            if (!fileId || !roomId)
                return;
            const fileRoom = `file-${fileId}`;
            socket.leave(fileRoom);
            if (activeUsers.has(fileRoom)) {
                activeUsers.get(fileRoom).delete(userId);
                if (activeUsers.get(fileRoom).size === 0) {
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
        }
        catch (err) {
            console.error("[leaveFile] Error:", err);
        }
    }));
    socket.on("getFile", (fileId) => __awaiter(this, void 0, void 0, function* () {
        try {
            console.log("[getFile] Request:", { fileId, userId });
            if (!fileId) {
                socket.emit("error", "File ID is required");
                return;
            }
            const file = yield db_1.FileModel.findOne({ id: fileId }).lean();
            if (file) {
                socket.emit("fileContent", {
                    fileId: file.id,
                    content: file.content,
                    language: file.language,
                    lastEditedBy: file.lastEditedBy,
                    updatedAt: file.updatedAt
                });
            }
            else {
                socket.emit("error", "File not found");
            }
        }
        catch (err) {
            console.error("[getFile] Error:", err);
            const message = err instanceof Error ? err.message : 'Unknown error';
            socket.emit("error", "Failed to get file: " + message);
        }
    }));
    socket.on("createFile", (_a) => __awaiter(this, [_a], void 0, function* ({ name, language, roomId, folderId }) {
        var _b;
        try {
            if (!name || !name.trim() || !roomId) {
                socket.emit("error", "File name and roomId are required");
                return;
            }
            let lang = (language === null || language === void 0 ? void 0 : language.toLowerCase()) || 'javascript';
            const fileExtension = (_b = name.split('.').pop()) === null || _b === void 0 ? void 0 : _b.toLowerCase();
            const extensionToLanguage = {
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
            const { v4: uuidv4 } = yield Promise.resolve().then(() => __importStar(require('uuid')));
            const file = yield db_1.FileModel.create({
                id: uuidv4(),
                name: name.trim(),
                content: '',
                language: lang,
                roomId,
                folderId: folderId || null,
                createdBy: userId,
                lastEditedBy: userId
            });
            const files = yield db_1.FileModel.find({ roomId }).lean();
            io.to(roomId).emit("filesUpdate", files);
            socket.emit("fileCreated", file);
            console.log("[createFile] File created:", { name: file.name, language: file.language });
        }
        catch (err) {
            console.error("[createFile] Error:", err);
            const message = err instanceof Error ? err.message : 'Unknown error';
            socket.emit("error", "Failed to create file: " + message);
        }
    }));
    socket.on("deleteFile", (_a) => __awaiter(this, [_a], void 0, function* ({ fileId, roomId }) {
        try {
            if (!fileId || !roomId) {
                socket.emit("error", "File ID and room ID are required");
                return;
            }
            const deletedFile = yield db_1.FileModel.findOneAndDelete({ id: fileId, roomId });
            if (deletedFile) {
                const files = yield db_1.FileModel.find({ roomId }).lean();
                io.to(roomId).emit("filesUpdate", files);
                io.to(roomId).emit("fileDeleted", { fileId });
                const fileRoom = `file-${fileId}`;
                if (activeUsers.has(fileRoom)) {
                    activeUsers.delete(fileRoom);
                }
                console.log("[deleteFile] File deleted:", { fileId, fileName: deletedFile.name });
            }
            else {
                socket.emit("error", "File not found or already deleted");
            }
        }
        catch (err) {
            console.error("[deleteFile] Error:", err);
            const message = err instanceof Error ? err.message : 'Unknown error';
            socket.emit("error", "Failed to delete file: " + message);
        }
    }));
    socket.on("createFolder", (_a) => __awaiter(this, [_a], void 0, function* ({ name, roomId, parentFolderId }) {
        try {
            if (!name || !name.trim() || !roomId) {
                socket.emit("error", "Folder name and roomId are required");
                return;
            }
            const { v4: uuidv4 } = yield Promise.resolve().then(() => __importStar(require('uuid')));
            const folder = yield db_1.FolderModel.create({
                id: uuidv4(),
                name: name.trim(),
                roomId,
                parentFolderId: parentFolderId || null,
                createdBy: userId
            });
            const folders = yield db_1.FolderModel.find({ roomId }).lean();
            io.to(roomId).emit("foldersUpdate", folders);
            socket.emit("folderCreated", folder);
        }
        catch (err) {
            console.error("[createFolder] Error:", err);
            const message = err instanceof Error ? err.message : 'Unknown error';
            socket.emit("error", "Failed to create folder: " + message);
        }
    }));
    socket.on("deleteFolder", (_a) => __awaiter(this, [_a], void 0, function* ({ folderId, roomId }) {
        try {
            if (!folderId || !roomId) {
                socket.emit("error", "Folder ID and room ID are required");
                return;
            }
            yield db_1.FileModel.deleteMany({ folderId, roomId });
            const deletedFolder = yield db_1.FolderModel.findOneAndDelete({ id: folderId, roomId });
            if (deletedFolder) {
                const files = yield db_1.FileModel.find({ roomId }).lean();
                const folders = yield db_1.FolderModel.find({ roomId }).lean();
                io.to(roomId).emit("filesUpdate", files);
                io.to(roomId).emit("foldersUpdate", folders);
                io.to(roomId).emit("folderDeleted", { folderId });
            }
            else {
                socket.emit("error", "Folder not found or already deleted");
            }
        }
        catch (err) {
            console.error("[deleteFolder] Error:", err);
            const message = err instanceof Error ? err.message : 'Unknown error';
            socket.emit("error", "Failed to delete folder: " + message);
        }
    }));
    socket.on("renameFolder", (_a) => __awaiter(this, [_a], void 0, function* ({ folderId, roomId, name }) {
        try {
            if (!folderId || !roomId || !(name === null || name === void 0 ? void 0 : name.trim())) {
                socket.emit("error", "Folder ID, room ID, and name are required");
                return;
            }
            const updatedFolder = yield db_1.FolderModel.findOneAndUpdate({ id: folderId, roomId }, { name: name.trim(), updatedAt: new Date() }, { new: true, runValidators: true, lean: true });
            if (updatedFolder) {
                const folders = yield db_1.FolderModel.find({ roomId }).lean();
                io.to(roomId).emit("foldersUpdate", folders);
                socket.emit("folderRenamed", { folderId, name: updatedFolder.name });
            }
            else {
                socket.emit("error", "Folder not found");
            }
        }
        catch (err) {
            console.error("[renameFolder] Error:", err);
            const message = err instanceof Error ? err.message : 'Unknown error';
            socket.emit("error", "Failed to rename folder: " + message);
        }
    }));
    socket.on("disconnect", () => {
        console.log("[disconnect] User disconnected:", userId);
        for (const [fileRoom, users] of activeUsers.entries()) {
            if (users.has(userId)) {
                users.delete(userId);
                if (users.size === 0) {
                    activeUsers.delete(fileRoom);
                }
                else {
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
function getActiveUsersInFile(fileId) {
    const fileRoom = `file-${fileId}`;
    return Array.from(activeUsers.get(fileRoom) || []);
}
function debugFileModel() {
    console.log("FileModel schema fields:", Object.keys(db_1.FileModel.schema.paths));
    console.log("FileModel collection name:", db_1.FileModel.collection.name);
    console.log("Active users:", activeUsers);
}
