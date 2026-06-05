import { runSelfMediaPlatformImportOperation } from "@/domain/self-media/runtime";

const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
const blockedInputKeys = ["cookie", "token", "password", "header", "headers", "raw", "rawpayload", "capture", "captures"];

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

export async function POST(request: Request) {
  try {
    if (!isLocalRequest(request)) return Response.json({ errorMessage: "平台导入操作只允许本地开发环境或本地 runtime 调用。" }, { status: 403 });
    const body = await request.json() as Parameters<typeof runSelfMediaPlatformImportOperation>[0];
    if (hasBlockedKey(body)) return Response.json({ errorMessage: "平台导入操作不接收 cookie/token/password/header/raw payload/captures。" }, { status: 400 });
    const result = await runSelfMediaPlatformImportOperation(body);
    return Response.json(result, { status: result.passed ? 200 : 400 });
  } catch (error) {
    return Response.json({ errorMessage: error instanceof Error ? error.message : "平台导入操作失败。" }, { status: 400 });
  }
}
