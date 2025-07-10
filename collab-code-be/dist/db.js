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
exports.PrivateChat = exports.FileModel = exports.FolderModel = exports.RoomModel = exports.UserModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const config_1 = require("./config");
if (!config_1.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not defined');
}
mongoose_1.default.connect(config_1.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4
})
    .then(() => console.log('Connected to MongoDB'))
    .catch((error) => console.error('MongoDB connection error:', error));
mongoose_1.default.connection.on('error', (err) => console.error('MongoDB connection error:', err));
mongoose_1.default.connection.on('disconnected', () => console.log('MongoDB disconnected'));
mongoose_1.default.connection.on('reconnected', () => console.log('MongoDB reconnected'));
const UserSchema = new mongoose_1.Schema({
    username: { type: String, unique: true },
    password: { type: String }
});
const RoomSchema = new mongoose_1.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    users: [{ type: String }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });
RoomSchema.pre('findOneAndUpdate', function () {
    this.set({ updatedAt: new Date() });
});
const FolderSchema = new mongoose_1.Schema({
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    roomId: { type: String, required: true, index: true },
    parentFolderId: { type: String, default: null, index: true },
    createdBy: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true,
    collection: 'folders'
});
FolderSchema.index({ roomId: 1, parentFolderId: 1 });
FolderSchema.index({ roomId: 1, createdAt: -1 });
FolderSchema.index({ roomId: 1, parentFolderId: 1, name: 1 }, { unique: true });
FolderSchema.pre('save', function (next) {
    if (this.isModified() && !this.isNew)
        this.updatedAt = new Date();
    next();
});
FolderSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function (next) {
    this.set({ updatedAt: new Date() });
    next();
});
const FileSchema = new mongoose_1.Schema({
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    content: { type: String, default: '' },
    language: { type: String, required: true, default: 'javascript' },
    roomId: { type: String, required: true, index: true },
    folderId: { type: String, default: null, index: true },
    createdBy: { type: String, required: true },
    lastEditedBy: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true,
    collection: 'files'
});
FileSchema.index({ roomId: 1, folderId: 1 });
FileSchema.index({ roomId: 1, createdAt: -1 });
FileSchema.index({ roomId: 1, folderId: 1, name: 1 }, { unique: true });
FileSchema.pre('save', function (next) {
    if (this.isModified() && !this.isNew)
        this.updatedAt = new Date();
    next();
});
FileSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function (next) {
    this.set({ updatedAt: new Date() });
    next();
});
const privateChatSchema = new mongoose_1.Schema({
    roomId: { type: String, required: true, index: true },
    userA: { type: String, required: true, index: true },
    userB: { type: String, required: true, index: true },
    messages: [{
            _id: { type: String, default: () => new mongoose_1.default.Types.ObjectId().toString() },
            sender: { type: String, required: true },
            message: { type: String, required: true },
            createdAt: { type: Date, default: Date.now },
            username: { type: String },
            readBy: [{
                    userId: { type: String, required: true },
                    readAt: { type: Date, default: Date.now }
                }]
        }],
    lastReadBy: [{
            userId: { type: String, required: true },
            lastReadAt: { type: Date, default: Date.now }
        }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true,
    collection: 'privatechats'
});
privateChatSchema.index({ roomId: 1, userA: 1, userB: 1 });
privateChatSchema.index({ roomId: 1, userB: 1, userA: 1 });
privateChatSchema.index({ "messages.createdAt": 1 });
privateChatSchema.index({ "lastReadBy.userId": 1 });
privateChatSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});
privateChatSchema.pre('findOneAndUpdate', function () {
    this.set({ updatedAt: new Date() });
});
privateChatSchema.statics.findOrCreateChat = function (roomId, userA, userB) {
    return __awaiter(this, void 0, void 0, function* () {
        let chat = yield this.findOne({
            roomId,
            $or: [
                { userA, userB },
                { userA: userB, userB: userA }
            ]
        });
        if (!chat) {
            chat = new this({ roomId, userA, userB, messages: [], lastReadBy: [] });
            yield chat.save();
        }
        return chat;
    });
};
privateChatSchema.methods.getUnreadCount = function (userId) {
    const lastRead = this.lastReadBy.find((entry) => entry.userId === userId);
    const lastReadTime = lastRead ? lastRead.lastReadAt : new Date(0);
    return this.messages.filter((message) => message.sender !== userId &&
        new Date(message.createdAt) > lastReadTime).length;
};
privateChatSchema.methods.markAsRead = function (userId) {
    const existingIndex = this.lastReadBy.findIndex((entry) => entry.userId === userId);
    const now = new Date();
    if (existingIndex >= 0) {
        this.lastReadBy[existingIndex].lastReadAt = now;
    }
    else {
        this.lastReadBy.push({ userId, lastReadAt: now });
    }
    return this.save();
};
exports.UserModel = (0, mongoose_1.model)("Users", UserSchema);
exports.RoomModel = (0, mongoose_1.model)("Rooms", RoomSchema);
exports.FolderModel = (0, mongoose_1.model)("Folders", FolderSchema);
exports.FileModel = (0, mongoose_1.model)("Files", FileSchema);
exports.PrivateChat = (0, mongoose_1.model)('PrivateChat', privateChatSchema, 'privatechats');
