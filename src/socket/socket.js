import { io } from "socket.io-client";

let socket = null;

export const connectSocket = () => {
  const token = localStorage.getItem("token");

  if (!token) {
    return null;
  }

  // Socket бұрын жасалған болса, жаңасын жасамаймыз
  if (socket) {
    return socket;
  }

  const newSocket = io(import.meta.env.VITE_SOCKET_URL, {
    auth: {
      token,
    },
  });

  newSocket.on("connect", () => {
    console.log("Socket connected:", newSocket.id);
  });

  newSocket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", reason);
  });

  newSocket.on("connect_error", (error) => {
    console.error(
      "Socket connection error:",
      error.message,
    );
  });

  socket = newSocket;

  return socket;
};

export const getSocket = () => {
  return socket;
};

export const disconnectSocket = () => {
  if (!socket) {
    return;
  }

  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
};