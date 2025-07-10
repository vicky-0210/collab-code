import mongoose, { model, Schema, Document, Model } from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://vivekgupta8106:fTdi6r7FKVUVeyNL@cluster0.8gyrr.mongodb.net/collab-code";

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is not defined');
}

mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4
})
  .then(() => console.log('Connected to MongoDB'))
  .catch((error) => console.error('MongoDB connection error:', error));


mongoose.connection.on('error', (err) => console.error('MongoDB connection error:', err));
mongoose.connection.on('disconnected', () => console.log('MongoDB disconnected'));
mongoose.connection.on('reconnected', () => console.log('MongoDB reconnected'));


const UserSchema = new Schema({
  username: { type: String, unique: true },
  password: { type: String }
});

const RoomSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  users: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

RoomSchema.pre('findOneAndUpdate', function () {
  this.set({ updatedAt: new Date() });
});

const FolderSchema = new Schema({
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
  if (this.isModified() && !this.isNew) this.updatedAt = new Date();
  next();
});

FolderSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function (next) {
  this.set({ updatedAt: new Date() });
  next();
});

const FileSchema = new Schema({
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
  if (this.isModified() && !this.isNew) this.updatedAt = new Date();
  next();
});

FileSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function (next) {
  this.set({ updatedAt: new Date() });
  next();
});

interface IReadBy {
  userId: string;
  readAt: Date;
}

interface ILastReadBy {
  userId: string;
  lastReadAt: Date;
}

interface IMessage {
  _id: string;
  sender: string;
  message: string;
  createdAt: Date;
  username?: string;
  readBy: IReadBy[];
}

interface IPrivateChat {
  roomId: string;
  userA: string;
  userB: string;
  messages: IMessage[];
  lastReadBy: ILastReadBy[];
  createdAt: Date;
  updatedAt: Date;
}


interface IPrivateChatMethods {
  getUnreadCount(userId: string): number;
  markAsRead(userId: string): Promise<IPrivateChatDocument>;
}


interface IPrivateChatStatics {
  findOrCreateChat(roomId: string, userA: string, userB: string): Promise<IPrivateChatDocument>;
}

interface IPrivateChatDocument extends Document, IPrivateChat, IPrivateChatMethods {}


interface IPrivateChatModel extends Model<IPrivateChatDocument>, IPrivateChatStatics {}


const privateChatSchema = new Schema<IPrivateChatDocument, IPrivateChatModel>({
  roomId: { type: String, required: true, index: true },
  userA: { type: String, required: true, index: true },
  userB: { type: String, required: true, index: true },
  messages: [{
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
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


privateChatSchema.statics.findOrCreateChat = async function (roomId: string, userA: string, userB: string): Promise<IPrivateChatDocument> {
  let chat = await this.findOne({
    roomId,
    $or: [
      { userA, userB },
      { userA: userB, userB: userA }
    ]
  });

  if (!chat) {
    chat = new this({ roomId, userA, userB, messages: [], lastReadBy: [] });
    await chat.save();
  }

  return chat;
};


privateChatSchema.methods.getUnreadCount = function(userId: string): number {
  const lastRead = this.lastReadBy.find((entry: ILastReadBy) => entry.userId === userId);
  const lastReadTime = lastRead ? lastRead.lastReadAt : new Date(0);
  
  return this.messages.filter((message: IMessage) => 
    message.sender !== userId && 
    new Date(message.createdAt) > lastReadTime
  ).length;
};


privateChatSchema.methods.markAsRead = function(userId: string): Promise<IPrivateChatDocument> {
  const existingIndex = this.lastReadBy.findIndex((entry: ILastReadBy) => entry.userId === userId);
  const now = new Date();
  
  if (existingIndex >= 0) {
    this.lastReadBy[existingIndex].lastReadAt = now;
  } else {
    this.lastReadBy.push({ userId, lastReadAt: now });
  }
  
  return this.save();
};


export const UserModel = model("Users", UserSchema);
export const RoomModel = model("Rooms", RoomSchema);
export const FolderModel = model("Folders", FolderSchema);
export const FileModel = model("Files", FileSchema);
export const PrivateChat = model<IPrivateChatDocument, IPrivateChatModel>('PrivateChat', privateChatSchema, 'privatechats');


export type { IPrivateChatDocument, IPrivateChatModel, IMessage, IReadBy, ILastReadBy };