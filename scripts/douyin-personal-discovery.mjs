#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright-core";

const TARGET_URL = "https://creator.douyin.com/creator-micro/data-center/operation";
const DEFAULT_CDP = "http://127.0.0.1:9222";
const OUTPUT_DIR = path.join(process.cwd(), ".local", "douyin-personal-v0");
const RAW_DIR = path.join(OUTPUT_DIR, "raw");
const SENSITIVE_KEY = /(cookie|token|csrf|xsrf|session|secret|password|passwd|authorization|auth|ticket|captcha|verify|passport|mobile|phone|email|openid|sec_uid|user_id|uid|avatar|nickname|realname|s_v_web_id|signature|sign)/i;
const LONG_SECRET = /^[A-Za-z0-9+/=_-]{80,}$/;

function parseArgs(argv) {
  const options = {
    target: TARGET_URL,
    cdp: process.env.DOUYIN_CDP_ENDPOINT ?? DEFAULT_CDP,
    durationMs: Number(process.env.DOUYIN_DISCOVERY_DURATION_MS ?? 60000),
    maxCaptures: Number(process.env.DOUYIN_DISCOVERY_MAX_CAPTURES ?? 80),
    maxArrayItems: Number(process.env.DOUYIN_DISCOVERY_MAX_ARRAY_ITEMS ?? 80),
    noLaunch: false
  };
  for (const arg of argv) {
    if (arg.startsWith("--target=")) options.target = arg.slice("--target=".length);
    else if (arg.startsWith("--cdp=")) options.cdp = arg.slice("--cdp=".length);
    else if (arg.startsWith("--duration=")) options.durationMs = Number(arg.slice("--duration=".length));
    else if (arg.startsWith("--max-captures=")) options.maxCaptures = Number(arg.slice("--max-captures=".length));
    else if (arg.startsWith("--max-array-items=")) options.maxArrayItems = Number(arg.slice("--max-array-items=".length));
    else if (arg === "--no-launch") options.noLaunch = true;
  }
  return options;
}

function ensureOutputDirs() {
  mkdirSync(RAW_DIR, { recursive: true });
}

async function canReachCdp(endpoint) {
  try {
    const response = await fetch(new URL("/json/version", endpoint));
    return response.ok;
  } catch {
    return false;
  }
}

function findChromePath() {
  const candidates = [
    process.env.DOUYIN_CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
  ].filter(Boolean);
  return candidates.find((item) => existsSync(item));
}

function portFromCdp(endpoint) {
  try {
    return new URL(endpoint).port || "9222";
  } catch {
    return "9222";
  }
}

async function launchLocalBrowser(options) {
  const chromePath = findChromePath();
  if (!chromePath) return { launched: false, reason: "No Chrome or Edge executable found. Set DOUYIN_CHROME_PATH or start Chrome with remote debugging." };
  const userDataDir = path.join(OUTPUT_DIR, "chrome-profile");
  mkdirSync(userDataDir, { recursive: true });
  const port = portFromCdp(options.cdp);
  const child = spawn(
    chromePath,
    [
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${userDataDir}`,
      "--no-first-run",
      "--no-default-browser-check",
      options.target
    ],
    { detached: true, stdio: "ignore", windowsHide: false }
  );
  child.unref();
  const startedAt = Date.now();
  while (Date.now() - startedAt < 15000) {
    if (await canReachCdp(options.cdp)) return { launched: true };
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return { launched: true, reason: "Browser was launched but CDP endpoint did not become ready within 15s." };
}

function safeUrl(value) {
  try {
    const url = new URL(value);
    for (const key of [...url.searchParams.keys()]) {
      const current = url.searchParams.get(key) ?? "";
      url.searchParams.set(key, SENSITIVE_KEY.test(key) || LONG_SECRET.test(current) ? "[REDACTED]" : current.slice(0, 120));
    }
    return url.toString();
  } catch {
    return value;
  }
}

function isDouyinCreatorUrl(value) {
  try {
    const hostname = new URL(value).hostname;
    return hostname === "creator.douyin.com" || hostname.endsWith(".creator.douyin.com");
  } catch {
    return false;
  }
}

function sanitizeValue(value, key = "", options, depth = 0) {
  if (SENSITIVE_KEY.test(key)) return "[REDACTED]";
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    if (LONG_SECRET.test(value) || /^(Bearer|Basic)\s+/i.test(value)) return "[REDACTED]";
    if (/^https?:\/\//i.test(value)) return safeUrl(value);
    return value.length > 1000 ? `${value.slice(0, 1000)}...[TRUNCATED]` : value;
  }
  if (typeof value !== "object") return value;
  if (depth > 10) return "[DEPTH_TRUNCATED]";
  if (Array.isArray(value)) return value.slice(0, options.maxArrayItems).map((item) => sanitizeValue(item, key, options, depth + 1));
  return Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => [childKey, sanitizeValue(childValue, childKey, options, depth + 1)]));
}

function hash(value) {
  return createHash("sha1").update(value).digest("hex").slice(0, 12);
}

function valueType(value) {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  return typeof value;
}

function collectPaths(value, prefix = "$", paths = new Map(), depth = 0) {
  const current = paths.get(prefix) ?? { path: prefix, types: new Set(), samples: [] };
  current.types.add(valueType(value));
  if (current.samples.length < 2 && ["string", "number", "boolean"].includes(typeof value)) current.samples.push(value);
  paths.set(prefix, current);
  if (depth > 8 || value === null || value === undefined || typeof value !== "object") return paths;
  if (Array.isArray(value)) {
    for (const item of value.slice(0, 5)) collectPaths(item, `${prefix}[]`, paths, depth + 1);
    return paths;
  }
  for (const [key, child] of Object.entries(value)) collectPaths(child, `${prefix}.${key}`, paths, depth + 1);
  return paths;
}

const FIELD_TARGETS = [
  { key: "accountOverview", label: "账号总览", pattern: /(overview|summary|account|author|profile|user|dashboard|core)/i },
  { key: "worksList", label: "作品数据列表", pattern: /(aweme|item|video|work|content|material|list|作品)/i },
  { key: "views", label: "播放 / 浏览", pattern: /(play|view|read|watch|vv|pv|impression|show|播放|浏览|阅读)/i },
  { key: "likes", label: "点赞", pattern: /(like|digg|点赞)/i },
  { key: "comments", label: "评论数", pattern: /(comment|reply|评论)/i },
  { key: "shares", label: "分享", pattern: /(share|forward|repost|分享|转发)/i },
  { key: "followersDelta", label: "粉丝变化", pattern: /(fans|fan|follower|follow|new_fans|increase|delta|粉丝|关注|增量)/i },
  { key: "commentContent", label: "评论内容", pattern: /(comment.*content|comment.*text|reply.*content|reply.*text|text|content|评论内容)/i }
];

function classifyPath(pathName, type) {
  return FIELD_TARGETS.filter((target) => {
    if (!target.pattern.test(pathName)) return false;
    if (target.key === "commentContent") return type.includes("string") || type.includes("array") || type.includes("object");
    return true;
  });
}

function summarizeCapture(capture) {
  const paths = [...collectPaths(capture.body).values()].map((item) => ({
    path: item.path,
    types: [...item.types],
    samples: item.samples
  }));
  const candidates = {};
  for (const item of paths) {
    const typeLabel = item.types.join("|");
    for (const target of classifyPath(item.path, typeLabel)) {
      candidates[target.key] ??= [];
      if (candidates[target.key].length < 12) candidates[target.key].push({ path: item.path, types: item.types, samples: item.samples });
    }
  }
  return { paths, candidates };
}

function mergeEndpoint(endpoints, capture) {
  const key = `${capture.method} ${capture.urlSanitized.split("?")[0]}`;
  const summary = summarizeCapture(capture);
  const endpoint =
    endpoints.get(key) ??
    {
      id: `endpoint-${hash(key)}`,
      method: capture.method,
      url: capture.urlSanitized,
      status: capture.status,
      count: 0,
      captureFiles: [],
      contentTypes: new Set(),
      modules: new Set(),
      candidateFields: {}
    };
  endpoint.count += 1;
  endpoint.captureFiles.push(capture.file);
  endpoint.contentTypes.add(capture.contentType);
  for (const [fieldKey, values] of Object.entries(summary.candidates)) {
    endpoint.candidateFields[fieldKey] ??= [];
    for (const value of values) {
      if (endpoint.candidateFields[fieldKey].length >= 16) break;
      if (!endpoint.candidateFields[fieldKey].some((item) => item.path === value.path)) endpoint.candidateFields[fieldKey].push(value);
    }
    endpoint.modules.add(fieldKey);
  }
  endpoints.set(key, endpoint);
}

async function inferLoginState(page, captureCount) {
  try {
    const currentUrl = page.url();
    const bodyText = await page.locator("body").innerText({ timeout: 3000 }).catch(() => "");
    if (/passport|login|sso/i.test(currentUrl) || /登录|扫码登录|请先登录|验证码/.test(bodyText)) return captureCount > 0 ? "maybe_logged_in_with_login_prompt" : "needs_login";
    return captureCount > 0 ? "logged_in_or_accessible" : "unknown_no_json_captured";
  } catch {
    return captureCount > 0 ? "logged_in_or_accessible" : "unknown_no_json_captured";
  }
}

function writeEndpoints(endpoints) {
  const output = [...endpoints.values()].map((endpoint) => ({
    ...endpoint,
    contentTypes: [...endpoint.contentTypes],
    modules: [...endpoint.modules],
    captureFiles: endpoint.captureFiles.slice(0, 20)
  }));
  writeFileSync(path.join(OUTPUT_DIR, "endpoints.json"), JSON.stringify(output, null, 2));
  return output;
}

function writeFieldReport({ generatedAt, loginState, targetUrl, cdpEndpoint, captures, endpoints, notes }) {
  const targetLabels = Object.fromEntries(FIELD_TARGETS.map((item) => [item.key, item.label]));
  const lines = [
    "# Douyin Personal V0 Field Discovery Report",
    "",
    `Generated at: ${generatedAt}`,
    `Target URL: ${targetUrl}`,
    `CDP endpoint: ${cdpEndpoint}`,
    `Login state: ${loginState}`,
    `JSON captures: ${captures.length}`,
    "",
    "## Safety",
    "",
    "- Request headers, cookies, tokens, and auth values are not saved.",
    "- Raw captures are sanitized and saved only under `.local/douyin-personal-v0/raw/`.",
    "- This collector only observes the user's own logged-in creator center page.",
    "- It does not bypass CAPTCHA, risk control, login challenges, or collect public content in bulk.",
    "",
    "## Notes",
    "",
    ...notes.map((item) => `- ${item}`),
    "",
    "## Endpoint Candidates",
    ""
  ];
  if (endpoints.length === 0) {
    lines.push("- No creator.douyin.com JSON endpoints captured.");
  } else {
    for (const endpoint of endpoints) {
      lines.push(`### ${endpoint.method} ${endpoint.url.split("?")[0]}`);
      lines.push("");
      lines.push(`- endpointId: ${endpoint.id}`);
      lines.push(`- count: ${endpoint.count}`);
      lines.push(`- status: ${endpoint.status}`);
      lines.push(`- modules: ${endpoint.modules.map((item) => targetLabels[item] ?? item).join(", ") || "unclassified"}`);
      lines.push(`- captures: ${endpoint.captureFiles.slice(0, 5).join(", ")}`);
      lines.push("");
      for (const [fieldKey, values] of Object.entries(endpoint.candidateFields)) {
        lines.push(`Candidate ${targetLabels[fieldKey] ?? fieldKey}:`);
        for (const value of values.slice(0, 8)) lines.push(`- \`${value.path}\` (${value.types.join("|")})`);
        lines.push("");
      }
    }
  }
  lines.push("## Target Coverage");
  lines.push("");
  for (const target of FIELD_TARGETS) {
    const matches = endpoints.flatMap((endpoint) => endpoint.candidateFields[target.key] ?? []);
    lines.push(`- ${target.label}: ${matches.length > 0 ? "candidate paths found" : "not confirmed"}`);
  }
  writeFileSync(path.join(OUTPUT_DIR, "field-report.md"), `${lines.join("\n")}\n`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  ensureOutputDirs();
  const notes = [];
  const captures = [];
  const endpoints = new Map();
  let browser;

  if (!(await canReachCdp(options.cdp))) {
    if (options.noLaunch) {
      notes.push("CDP endpoint was not reachable and --no-launch was set. Start Chrome with remote debugging or rerun without --no-launch.");
      const endpointList = writeEndpoints(endpoints);
      writeFieldReport({ generatedAt: new Date().toISOString(), loginState: "not_connected", targetUrl: options.target, cdpEndpoint: options.cdp, captures, endpoints: endpointList, notes });
      console.log(JSON.stringify({ ok: false, loginState: "not_connected", captures: 0, outputDir: OUTPUT_DIR, message: "CDP endpoint not reachable; no browser connected." }, null, 2));
      return;
    }
    const launch = await launchLocalBrowser(options);
    if (launch.reason) notes.push(launch.reason);
  }

  if (!(await canReachCdp(options.cdp))) {
    notes.push("CDP endpoint is still not reachable. No capture was attempted.");
    const endpointList = writeEndpoints(endpoints);
    writeFieldReport({ generatedAt: new Date().toISOString(), loginState: "not_connected", targetUrl: options.target, cdpEndpoint: options.cdp, captures, endpoints: endpointList, notes });
    console.log(JSON.stringify({ ok: false, loginState: "not_connected", captures: 0, outputDir: OUTPUT_DIR, message: "CDP endpoint not reachable." }, null, 2));
    return;
  }

  browser = await chromium.connectOverCDP(options.cdp);
  const context = browser.contexts()[0];
  if (!context) throw new Error("No browser context available from CDP.");
  const attachedPages = new WeakSet();
  const attachPage = (page) => {
    if (attachedPages.has(page)) return;
    attachedPages.add(page);
    page.on("response", async (response) => {
      try {
        if (captures.length >= options.maxCaptures) return;
        const url = response.url();
        if (!isDouyinCreatorUrl(url)) return;
        const contentType = response.headers()["content-type"] ?? "";
        if (!/json/i.test(contentType) && !/[?&](aid|msToken|X-Bogus)=/i.test(url) && !/\/(api|aweme|data|creator)\//i.test(url)) return;
        const text = await response.text().catch(() => "");
        if (!text.trim()) return;
        let parsed;
        try {
          parsed = JSON.parse(text);
        } catch {
          return;
        }
        const request = response.request();
        const sanitized = sanitizeValue(parsed, "body", options);
        const id = hash(`${request.method()} ${url} ${captures.length} ${text.slice(0, 500)}`);
        const fileName = `${String(captures.length + 1).padStart(3, "0")}-${id}.json`;
        const capture = {
          id,
          capturedAt: new Date().toISOString(),
          urlSanitized: safeUrl(url),
          method: request.method(),
          status: response.status(),
          contentType,
          file: `raw/${fileName}`,
          body: sanitized
        };
        writeFileSync(path.join(RAW_DIR, fileName), JSON.stringify(capture, null, 2));
        captures.push(capture);
        mergeEndpoint(endpoints, capture);
      } catch {
        // Discovery should continue even if one response body is unavailable.
      }
    });
  };
  context.pages().forEach(attachPage);
  context.on("page", attachPage);
  let page = context.pages().find((item) => item.url().startsWith("https://creator.douyin.com/")) ?? context.pages()[0];
  if (!page) page = await context.newPage();
  attachPage(page);
  console.log("Douyin discovery collector is running. If the page asks for login or verification, complete it manually in the browser. The script will not bypass challenges.");
  await page.goto(options.target, { waitUntil: "domcontentloaded", timeout: 60000 }).catch((error) => notes.push(`Initial navigation warning: ${error instanceof Error ? error.message : String(error)}`));
  await page.waitForTimeout(Math.max(1000, options.durationMs));

  const loginState = await inferLoginState(page, captures.length);
  if (loginState === "needs_login") notes.push("The page appears to require login. Log in manually and rerun the collector; no fake success is reported.");
  if (captures.length === 0) notes.push("No creator.douyin.com JSON responses were captured during the discovery window. Try refreshing the data-center page or clicking overview/work/comment modules while the collector is running.");
  const endpointList = writeEndpoints(endpoints);
  writeFieldReport({ generatedAt: new Date().toISOString(), loginState, targetUrl: options.target, cdpEndpoint: options.cdp, captures, endpoints: endpointList, notes });
  if (typeof browser.disconnect === "function") browser.disconnect();
  else await browser.close();
  console.log(JSON.stringify({ ok: captures.length > 0, loginState, captures: captures.length, endpoints: endpointList.length, outputDir: OUTPUT_DIR }, null, 2));
}

main().catch((error) => {
  ensureOutputDirs();
  const message = error instanceof Error ? error.message : String(error);
  writeEndpoints(new Map());
  writeFieldReport({ generatedAt: new Date().toISOString(), loginState: "collector_error", targetUrl: TARGET_URL, cdpEndpoint: DEFAULT_CDP, captures: [], endpoints: [], notes: [message] });
  console.error(message);
  process.exitCode = 1;
});
