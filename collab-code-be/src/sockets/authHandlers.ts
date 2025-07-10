import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
const JWT_PASS = process.env.JWT_PASS;
if (!JWT_PASS) {
  throw new Error("JWT_PASS environment variable is not set");
}

interface JWTPayload {
  id: string;
  [key: string]: any;
}

export function authenticateSocket(socket: Socket): string | null {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      socket.emit("auth_error", "Please Sign In", (response: boolean) => {
        if (response) {
          socket.disconnect();
        }
      });
      return null;
    }
    const decoded = jwt.verify(token, JWT_PASS as string) as unknown as JWTPayload;

    if (!decoded || typeof decoded !== 'object' || !decoded.id) {
      throw new Error('Invalid token payload');
    }

    const userId = decoded.id;
    socket.data.userId = userId;
    return userId;
  } catch (error) {
    console.error('Socket authentication failed:', error);
    socket.emit("auth_error", "Authentication failed");
    socket.disconnect();
    return null;
  }
}