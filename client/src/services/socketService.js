import { io } from "socket.io-client";

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.token = null;
    this.listeners = new Map();
  }

  connect(token) {
    if (!token) {
      this.disconnect();
      return null;
    }

    if (this.socket && this.token === token) return this.socket;
    if (this.socket) this.disconnect();

    this.token = token;
    const backendRoot = import.meta.env.VITE_API_URL?.replace(/\/+$/, "");

    this.socket = io(backendRoot, {
      transports: ["websocket"],
      autoConnect: true,
      auth: { token },
    });

    this.socket.on("connect", () => {
      this.connected = true;
    });
    this.socket.on("disconnect", () => {
      this.connected = false;
    });
    this.socket.on("connect_error", (error) => {
      console.error("Socket connection failed:", error.message);
    });

    for (const [event, callbacks] of this.listeners) {
      callbacks.forEach((callback) => this.socket.on(event, callback));
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) this.socket.disconnect();
    this.socket = null;
    this.connected = false;
    this.token = null;
  }

  joinChat(chatId) {
    this.socket?.emit("join-chat", chatId);
  }

  leaveChat(chatId) {
    this.socket?.emit("leave-chat", chatId);
  }

  typing(chatId) {
    this.socket?.emit("typing", { chatId });
  }

  stopTyping(chatId) {
    this.socket?.emit("stop-typing", { chatId });
  }

  on(event, callback) {
    if (!callback) return;
    const callbacks = this.listeners.get(event) || new Set();
    if (callbacks.has(callback)) return;
    callbacks.add(callback);
    this.listeners.set(event, callbacks);
    this.socket?.on(event, callback);
  }

  off(event, callback) {
    const callbacks = this.listeners.get(event);
    if (!callbacks) return;

    if (callback) {
      callbacks.delete(callback);
      this.socket?.off(event, callback);
      if (callbacks.size === 0) this.listeners.delete(event);
      return;
    }

    callbacks.forEach((registeredCallback) => this.socket?.off(event, registeredCallback));
    this.listeners.delete(event);
  }

  onReceiveMessage(callback) { this.on("receive-message", callback); }
  onTyping(callback) { this.on("typing", callback); }
  onStopTyping(callback) { this.on("stop-typing", callback); }
  onMessagesSeen(callback) { this.on("messages-seen", callback); }
  onDelivered(callback) { this.on("message-delivered", callback); }
  onNotification(callback) { this.on("new-notification", callback); }
  onRefreshChats(callback) { this.on("refresh-chats", callback); }
  onOnlineUsers(callback) { this.on("online-users", callback); }

  getSocket() { return this.socket; }
  isConnected() { return this.connected; }
}

const socketService = new SocketService();

export default socketService;
