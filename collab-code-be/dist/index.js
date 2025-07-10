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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const db_1 = require("./db");
const config_1 = require("./config");
const room_1 = require("./room");
const privateChat_1 = require("./privateChat");
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: "http://localhost:5173",
    credentials: true,
}));
app.use(express_1.default.json());
const signupSchema = zod_1.z.object({
    username: zod_1.z.string().min(3, "Username must be at least 3 characters"),
    password: zod_1.z.string().min(6).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/)
});
app.post("/api/v1/signup", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const parsedData = signupSchema.safeParse(req.body);
    if (!parsedData.success) {
        return res.status(400).json({
            success: false,
            errors: parsedData.error.errors,
        });
    }
    const { username, password } = parsedData.data;
    const hashedpass = yield bcrypt_1.default.hash(password, 10);
    try {
        const user = yield db_1.UserModel.create({ username, password: hashedpass });
        return res.status(200).json({
            message: "signup successful",
            user: { username: user.username, id: user._id },
        });
    }
    catch (err) {
        if (err instanceof Error) {
            return res.status(500).json({ error: err.message });
        }
        return res.status(500).json({ message: "unknown error" });
    }
}));
app.post("/api/v1/signin", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username, password } = req.body;
        const user = yield db_1.UserModel.findOne({ username });
        if (!user) {
            return res.status(403).json({ message: "user not found" });
        }
        const isPasswordCorrect = yield bcrypt_1.default.compare(password, user.password);
        if (!isPasswordCorrect) {
            return res.status(403).json({ message: "Incorrect credentials" });
        }
        if (!config_1.JWT_PASS) {
            return res.status(500).json({ error: "JWT secret is not configured" });
        }
        const token = jsonwebtoken_1.default.sign({ id: user._id }, config_1.JWT_PASS);
        return res.status(200).json({ token });
    }
    catch (err) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
}));
const server = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
    }
});
(0, room_1.registerSocketHandlers)(io);
io.on('connection', (socket) => {
    (0, privateChat_1.registerPrivateChatHandlers)(io, socket);
});
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
