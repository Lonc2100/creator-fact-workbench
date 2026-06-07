import {
  confirmAuthedBrowserProfileLogin,
  getAuthedBrowserProfileStatusView,
  openAuthedBrowserProfile
} from "@/domain/self-media/providers";
import type { AuthedBrowserProfileRequest } from "@/domain/self-media/types";

export const runtime = "nodejs";

const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
const blockedInputKeys = ["cookie", "token", "password", "header", "headers", "raw", "request", "storage", "credential"];

function isLocalRequest(request: Request) {
  const url = new URL(request.url);
  return process.env.NODE_ENV !== "production" || localHosts.has(url.hostname);
}

function hasBlockedKey(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => hasBlockedKey(item));
  return Object.entries(value as Record<string, unknown>).some(([key, entry]) => {
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    return blockedInputKeys.some((blocked) => normalized.includes(blocked)) || hasBlockedKey(entry);
  });
}

export async function GET(request: Request) {
  if (!isLocalRequest(request)) return Response.json({ errorMessage: "浏览器抓取状态只允许本地 runtime 调用。" }, { status: 403 });
  return Response.json(getAuthedBrowserProfileStatusView());
}

export async function POST(request: Request) {
  try {
    if (!isLocalRequest(request)) return Response.json({ errorMessage: "浏览器 profile 操作只允许本地 runtime 调用。" }, { status: 403 });
    const body = await request.json() as AuthedBrowserProfileRequest & { action?: "open" | "confirm_login" };
    if (hasBlockedKey(body)) return Response.json({ errorMessage: "浏览器 profile 操作不接收 cookie/token/password/header/raw request/storage。" }, { status: 400 });
    if (body.action === "open") return Response.json(openAuthedBrowserProfile(body.platform));
    if (body.action === "confirm_login") return Response.json(confirmAuthedBrowserProfileLogin(body.platform));
    return Response.json({ errorMessage: "不支持的浏览器 profile 操作。" }, { status: 400 });
  } catch (error) {
    return Response.json({ errorMessage: error instanceof Error ? error.message : "浏览器 profile 操作失败。" }, { status: 400 });
  }
}
