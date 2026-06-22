import dotenv from "dotenv";
import { Queue, Worker } from "bullmq";

dotenv.config();

const redisUrl = new URL(process.env.REDIS_URL ?? "redis://localhost:6379");
const connection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || 6379),
  username: redisUrl.username || undefined,
  password: redisUrl.password || undefined,
};

type NotificationJob = {
  channel: "sms" | "whatsapp" | "email" | "in_app";
  recipient: string;
  template: string;
  variables: Record<string, string>;
};

export const notificationQueue = new Queue<NotificationJob>("notification-events", {
  connection
});

const worker = new Worker<NotificationJob>(
  "notification-events",
  async (job) => {
    const payload = job.data;
    console.log("Dispatching notification", payload.channel, payload.recipient, payload.template);
    return { delivered: true, at: new Date().toISOString() };
  },
  { connection }
);

worker.on("completed", (job) => {
  console.log("Notification completed", job.id);
});

worker.on("failed", (job, error) => {
  console.error("Notification failed", job?.id, error);
});

console.log("Vinayaka Transport notifications service is running");
