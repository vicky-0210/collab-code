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
exports.registerFolderHandlers = registerFolderHandlers;
const db_1 = require("../db");
const uuid_1 = require("uuid");
function registerFolderHandlers(socket, io, userId) {
    socket.on("createFolder", (_a) => __awaiter(this, [_a], void 0, function* ({ name, roomId, parentFolderId }) {
        try {
            if (!name || !name.trim() || !roomId || !roomId.trim()) {
                socket.emit("error", "Folder name and roomId are required");
                return;
            }
            const folder = yield db_1.FolderModel.create({
                id: (0, uuid_1.v4)(),
                name: name.trim(),
                roomId,
                parentFolderId: parentFolderId || null,
                createdBy: userId,
                lastEditedBy: userId
            });
            const folders = yield db_1.FolderModel.find({ roomId }).lean();
            io.to(roomId).emit("foldersUpdate", folders);
            socket.emit("folderCreated", folder);
        }
        catch (err) {
            console.error("Error creating folder:", err);
            const message = err instanceof Error ? err.message : 'Unknown error';
            socket.emit("error", "Failed to create folder: " + message);
        }
    }));
    socket.on("deleteFolder", (_a) => __awaiter(this, [_a], void 0, function* ({ folderId, roomId }) {
        try {
            if (!folderId || !folderId.trim() || !roomId || !roomId.trim()) {
                socket.emit("error", "FolderId and roomId are required");
                return;
            }
            const deleteRecursively = (fid) => __awaiter(this, void 0, void 0, function* () {
                const subfolders = yield db_1.FolderModel.find({ parentFolderId: fid, roomId }).lean();
                for (const sub of subfolders) {
                    yield deleteRecursively(sub.id);
                }
                yield db_1.FileModel.deleteMany({ folderId: fid, roomId });
                yield db_1.FolderModel.deleteOne({ id: fid, roomId });
            });
            yield deleteRecursively(folderId);
            const [folders, files] = yield Promise.all([
                db_1.FolderModel.find({ roomId }).lean(),
                db_1.FileModel.find({ roomId }).lean()
            ]);
            io.to(roomId).emit("foldersUpdate", folders);
            io.to(roomId).emit("filesUpdate", files);
            socket.emit("folderDeleted", { folderId });
        }
        catch (err) {
            console.error("Error deleting folder:", err);
            const message = err instanceof Error ? err.message : 'Unknown error';
            socket.emit("error", "Failed to delete folder: " + message);
        }
    }));
    socket.on("renameFolder", (_a) => __awaiter(this, [_a], void 0, function* ({ folderId, roomId, name }) {
        try {
            if (!folderId || !folderId.trim() || !roomId || !roomId.trim() || !name || !name.trim()) {
                socket.emit("error", "folderId, roomId, and name are required");
                return;
            }
            const folder = yield db_1.FolderModel.findOneAndUpdate({ id: folderId, roomId }, { name: name.trim(), lastEditedBy: userId }, { new: true }).lean();
            if (!folder) {
                socket.emit("error", "Folder not found");
                return;
            }
            const folders = yield db_1.FolderModel.find({ roomId }).lean();
            io.to(roomId).emit("foldersUpdate", folders);
            socket.emit("folderRenamed", folder);
        }
        catch (err) {
            console.error("Error renaming folder:", err);
            const message = err instanceof Error ? err.message : 'Unknown error';
            socket.emit("error", "Failed to rename folder: " + message);
        }
    }));
}
