import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

function loadEnvFile(file) {
  if (!existsSync(file)) return {};
  const content = readFileSync(file, "utf8");
  return Object.fromEntries(
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      })
  );
}

function mask(value) {
  if (!value) return "";
  if (value.length <= 8) return "***";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

async function publicIp() {
  const endpoints = [
    ["https://api.ipify.org?format=json", async (response) => (await response.json()).ip],
    ["https://icanhazip.com", async (response) => (await response.text()).trim()],
    ["https://ipinfo.io/ip", async (response) => (await response.text()).trim()],
    ["https://ifconfig.me/ip", async (response) => (await response.text()).trim()]
  ];
  for (const [url, parse] of endpoints) {
    try {
      const response = await fetch(url);
      const ip = await parse(response);
      if (ip) return ip;
    } catch {
      // Try the next public IP endpoint; some networks/proxies reset specific providers.
    }
  }
  return undefined;
}

async function main() {
  const root = process.cwd();
  const env = { ...loadEnvFile(path.join(root, ".env.local")), ...process.env };
  const appId = env.WECHAT_APP_ID;
  const appSecret = env.WECHAT_APP_SECRET;
  const allowlist = (env.WECHAT_API_IP_ALLOWLIST ?? "").split(",").map((item) => item.trim()).filter(Boolean);
  if (!appId || !appSecret || appSecret.includes("ROTATE")) throw new Error("WECHAT_APP_ID and WECHAT_APP_SECRET must be set in .env.local.");

  const ip = await publicIp();
  const tokenUrl = new URL("https://api.weixin.qq.com/cgi-bin/token");
  tokenUrl.searchParams.set("grant_type", "client_credential");
  tokenUrl.searchParams.set("appid", appId);
  tokenUrl.searchParams.set("secret", appSecret);
  const response = await fetch(tokenUrl);
  const tokenPayload = await response.json();

  const result = {
    appId: mask(appId),
    publicIp: ip ?? "unknown",
    allowlist,
    allowlistContainsCurrentIp: ip ? allowlist.includes(ip) : false,
    tokenOk: Boolean(tokenPayload.access_token),
    expiresIn: tokenPayload.expires_in,
    errcode: tokenPayload.errcode,
    errmsg: tokenPayload.errmsg
  };
  console.log(JSON.stringify(result, null, 2));
  if (!result.tokenOk) process.exitCode = 1;
}

main().catch((error) => {
  console.error(JSON.stringify({ tokenOk: false, errorMessage: error instanceof Error ? error.message : String(error) }, null, 2));
  process.exitCode = 1;
});
