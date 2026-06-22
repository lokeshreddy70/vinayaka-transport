import { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer | null = null;

export const setSocketServer = (server: SocketIOServer): void => {
  io = server;
};

export const getSocketServer = (): SocketIOServer | null => io;

export const emitOrderUpdate = (orderId: string, payload: unknown): void => {
  if (!io) return;
  io.to(`order:${orderId}`).emit('order:update', payload);
};

export const emitRiderLocation = (riderId: string, payload: unknown): void => {
  if (!io) return;
  io.to(`rider:${riderId}`).emit('rider:location', payload);
};
