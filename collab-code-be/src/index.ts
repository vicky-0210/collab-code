require('dotenv').config();
import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { createServer } from "http";
import { Server as IOServer } from "socket.io";

import { UserModel } from "./db";
import { registerSocketHandlers } from "./room";
import { registerPrivateChatHandlers } from './privateChat';

const JWT_PASS = process.env.JWT_PASS;

const app = express();
app.use(cors({
  origin: "https://collab-code-frontend.onrender.com",
  credentials: true,
}));
app.use(express.json());

const signupSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/)
});

app.post("/api/v1/signup", async (req, res) => {
  const parsedData = signupSchema.safeParse(req.body);
  if (!parsedData.success) {
    return res.status(400).json({
      success: false,
      errors: parsedData.error.errors,
    });
  }

  const { username, password } = parsedData.data;
  const hashedpass = await bcrypt.hash(password, 10);

  try {
    const user = await UserModel.create({ username, password: hashedpass });
    return res.status(200).json({
      message: "signup successful",
      user: { username: user.username, id: user._id },
    });
  } catch (err) {
    if (err instanceof Error) {
      return res.status(500).json({ error: err.message });
    }
    return res.status(500).json({ message: "unknown error" });
  }
});

app.post("/api/v1/signin", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await UserModel.findOne({ username });

    if (!user) {
      return res.status(403).json({ message: "user not found" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password!);

    if (!isPasswordCorrect) {
      return res.status(403).json({ message: "Incorrect credentials" });
    }

    if (!JWT_PASS) {
      return res.status(500).json({ error: "JWT secret is not configured" });
    }
    const token = jwt.sign({ id: user._id }, JWT_PASS);
    return res.status(200).json({ token });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});


const server = createServer(app);
const io = new IOServer(server, {
  cors: {
    origin: "https://collab-code-frontend.onrender.com",
    methods: ["GET", "POST"],
    credentials: true
  }
});

registerSocketHandlers(io);
io.on('connection', (socket) => {
  registerPrivateChatHandlers(io, socket);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
