import dotenv from "dotenv";
import http from "http";

dotenv.config();

const basePort = Number(process.env.API_PORT ?? 4000);
const maxPortAttempts = 10;

const server = http.createServer(async (req, res) => {
  try {
    const { default: handler } = require("../api/[...all]");
    await handler(req, res);
  } catch (error: any) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(
      JSON.stringify({
        error: error?.message ?? "Internal server error",
      })
    );
  }
});

function startServer(port: number, attempt = 0) {
  server.removeAllListeners("error");
  server.removeAllListeners("listening");

  server.once("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE" && attempt < maxPortAttempts) {
      const nextPort = port + 1;
      console.warn(`Port ${port} is already in use. Retrying on ${nextPort}...`);
      startServer(nextPort, attempt + 1);
      return;
    }

    console.error("Failed to start local API server", error);
    process.exit(1);
  });

  server.once("listening", () => {
    const address = server.address();
    const actualPort = typeof address === "object" && address ? address.port : port;
    console.log(`Vinayaka API (local serverless runtime) listening on ${actualPort}`);
  });

  server.listen(port);
}

startServer(basePort);
