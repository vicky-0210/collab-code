"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrivateChat = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const privateChatSchema = new mongoose_1.default.Schema({
    roomId: { type: String, required: true, index: true },
    userA: { type: String, required: true }, // userId
    userB: { type: String, required: true }, // userId
    messages: [
        {
            sender: { type: String, required: true }, // userId
            message: { type: String, required: true },
            createdAt: { type: Date, default: Date.now }
        }
    ]
});
privateChatSchema.index({ roomId: 1, userA: 1, userB: 1 }, { unique: true });
exports.PrivateChat = mongoose_1.default.model('PrivateChat', privateChatSchema);
