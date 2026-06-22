import type { IncomingMessage, ServerResponse } from "http";

export type ApiRequest = IncomingMessage & { body?: unknown };

export function setCorsHeaders(res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
}

export function json(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

export async function parseBody(req: IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON payload");
  }
}

export function getPathSegments(req: IncomingMessage): string[] {
  const url = new URL(req.url ?? "/", "http://localhost");
  const rawPath = url.pathname.replace(/^\/api\/v1\/?/, "");
  return rawPath.split("/").filter(Boolean);
}

export function getQuery(req: IncomingMessage, name: string): string | undefined {
  const url = new URL(req.url ?? "/", "http://localhost");
  return url.searchParams.get(name) ?? undefined;
}

export function sanitizeText(input: unknown): string {
  if (typeof input !== "string") {
    return "";
  }

  return input.replace(/[<>]/g, "").trim();
}
