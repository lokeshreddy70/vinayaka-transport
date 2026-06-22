import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { createServer } from "http";
import { createClient } from "redis";
import { Server } from "socket.io";

dotenv.config();

const app = express();
app.use(cors({ origin: true, credentials: true }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "vinayaka-realtime", time: new Date().toISOString() });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: true, credentials: true }
});

const redisUrl = process.env.REDIS_URL;
const redisClient = redisUrl ? createClient({ url: redisUrl }) : null;

if (redisClient) {
  redisClient.connect().catch((error) => {
    console.error("Redis connection failed", error);
  });
}

io.on("connection", (socket) => {
  socket.on("join-order", (trackingNumber: string) => {
    socket.join(`order:${trackingNumber}`);
  });

  socket.on("join-branch", (branchId: string) => {
    socket.join(`branch:${branchId}`);
  });

  socket.on("rider-location", async (payload: { riderId: string; latitude: number; longitude: number; branchId: string }) => {
    io.to(`branch:${payload.branchId}`).emit("rider-location", payload);
    if (redisClient?.isOpen) {
      await redisClient.publish("rider-location", JSON.stringify(payload));
    }
  });

  socket.on("order-status", async (payload: { trackingNumber: string; status: string; branchId: string }) => {
    io.to(`order:${payload.trackingNumber}`).emit("order-status", payload);
    io.to(`branch:${payload.branchId}`).emit("order-status", payload);
    if (redisClient?.isOpen) {
      await redisClient.publish("order-status", JSON.stringify(payload));
    }
  });
});

const port = Number(process.env.REALTIME_PORT ?? 4100);
httpServer.listen(port, () => {
  console.log(`Vinayaka Transport realtime running on ${port}`);
});
