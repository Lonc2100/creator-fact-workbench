#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const TASK = "VIDEO-ACCOUNT-CONTENT-LEVEL-DISCOVERY-086";
const TARGET_URL = "https://channels.weixin.qq.com/platform";
const OUTPUT_DIR = path.join(process.cwd(), ".local", "video-account-content-level-discovery-086");
const CONTENT_FIELD_PATTERNS = {
  id: /(objectId|feedId|feed_id|exportId|postId|post_id|视频ID|作品ID)/i,
  title: /(shortTitle|title|headline|description|desc\.shortTitle|标题|作品名|视频标题)/i,
  publishedAt: /(createTime|publishTime|publish_time|postTime|发表时间|发布时间)/i,
  views: /(readCount|playCount|viewCount|watchCount|播放|浏览|观看|曝光)/i,
  likes: /(likeCount|praiseCount|点赞)/i,
  comments: /(commentCount|replyCount|评论)/i,
  shares: /(forwardCount|forwardAggregationCount|shareCount|转发|分享)/i,
  saves: /(favCount|favoriteCount|collectCount|收藏)/i
};
const SENSITIVE_KEY = /(cookie|token|csrf|xsrf|session|secret|password|passwd|authorization|auth|ticket|captcha|verify|passport|mobile|phone|email|openid|open_id|unionid|uin|wxuin|wxid|user_id|userid|uid|avatar|headimg|nickname|realname|signature|sign|qrcode|login|acct|bizuin|finderusername|finder_user_name|username|encrypt|key)/i;
const LONG_SECRET = /^[A-Za-z0-9+/=_-]{80,}$/;

function parseArgs(argv) {
  const options = {
    target: TARGET_URL,
    durationMs: 120000,
    headless: false,
    maxNetworkSummaries: 80,
    maxDomCandidates: 40
  };
  for (const arg of argv) {
    if (arg.startsWith("--target=")) options.target = arg.slice("--target=".length);
    else if (arg.startsWith("--duration=")) options.durationMs = Number(arg.slice("--duration=".length));
    else if (arg === "--headless") options.headless = true;
  }
  return options;
}

function chromeExecutablePath() {
  const candidates = [
    process.env.CHROME_PATH,
    process.env.VIDEO_ACCOUNT_CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
  ].filter(Boolean);
  const found = candidates.find((item) => existsSync(item));
  if (!found) throw new Error("No Chrome or Edge executable found. Set CHROME_PATH or VIDEO_ACCOUNT_CHROME_PATH.");
  return found;
}

function ensureOutputDir() {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

function sha(value) {
  return createHash("sha1").update(value).digest("hex").slice(0, 12);
}

function safeUrl(value) {
  try {
    const url = new URL(value);
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return String(value).slice(0, 160);
  }
}

function isVideoAccountUrl(value) {
  try {
    const hostname = new URL(value).hostname;
    return hostname === "channels.weixin.qq.com" || hostname.endsWith(".channels.weixin.qq.com") || hostname === "finder.video.qq.com" || hostname.endsWith(".finder.video.qq.com");
  } catch {
    return false;
  }
}

function valueType(value) {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  return typeof value;
}

function collectPaths(value, prefix = "$", paths = new Map(), depth = 0) {
  const current = paths.get(prefix) ?? { path: prefix, types: new Set() };
  current.types.add(valueType(value));
  paths.set(prefix, current);
  if (depth > 9 || value === null || value === undefined || typeof value !== "object") return paths;
  if (Array.isArray(value)) {
    for (const item of value.slice(0, 4)) collectPaths(item, `${prefix}[]`, paths, depth + 1);
    return paths;
  }
  for (const [key, child] of Object.entries(value)) {
    if (SENSITIVE_KEY.test(key)) {
      const redacted = paths.get(`${prefix}.${key}`) ?? { path: `${prefix}.${key}`, types: new Set() };
      redacted.types.add("redacted");
      paths.set(`${prefix}.${key}`, redacted);
      continue;
    }
    collectPaths(child, `${prefix}.${key}`, paths, depth + 1);
  }
  return paths;
}

function networkFieldCoverage(paths) {
  const coverage = {};
  for (const [field, pattern] of Object.entries(CONTENT_FIELD_PATTERNS)) {
    coverage[field] = paths.filter((item) => pattern.test(item.path)).slice(0, 12);
  }
  return coverage;
}

function hasCoreContentFields(coverage) {
  return Boolean(
    coverage.id?.length &&
    coverage.title?.length &&
    coverage.publishedAt?.length &&
    coverage.views?.length &&
    coverage.likes?.length &&
    coverage.comments?.length &&
    coverage.shares?.length
  );
}

function sanitizeNetworkSummary(response, parsed) {
  const paths = [...collectPaths(parsed).values()].map((item) => ({ path: item.path, types: [...item.types] }));
  const coverage = networkFieldCoverage(paths);
  return {
    id: `endpoint-${sha(`${response.request().method()} ${response.url()}`)}`,
    capturedAt: new Date().toISOString(),
    method: response.request().method(),
    url: safeUrl(response.url()),
    status: response.status(),
    contentType: response.headers()["content-type"] ?? "",
    pathCount: paths.length,
    contentFieldCoverage: coverage,
    coreContentFieldsPresent: hasCoreContentFields(coverage),
    rawBodySaved: false,
    headersSaved: false,
    cookiesSaved: false
  };
}

async function collectDomCandidates(page, maxCandidates) {
  const frameResults = [];
  for (const frame of page.frames()) {
    const frameUrl = safeUrl(frame.url());
    if (!isVideoAccountUrl(frameUrl)) continue;
    try {
      const result = await frame.evaluate((limit) => {
        const metricPattern = /(播放|浏览|观看|点赞|评论|转发|分享|收藏|\d+\s*(?:万|亿)?)/;
        const accountOnly = /(账号总览|粉丝画像|私信|直播|主页访问|净增粉丝|新增关注|带货|收入)/;
        const datePattern = /(20\d{2}[-/.年]\d{1,2}[-/.月]\d{1,2}|\d{1,2}月\d{1,2}日|\d{1,2}:\d{2})/;
        const titleLikePattern = /[\u4e00-\u9fa5A-Za-z0-9]{4,}/;
        const selectors = [
          "tr",
          "[role='row']",
          "li",
          "article",
          "[class*='table'] [class*='row']",
          "[class*='Table'] [class*='row']",
          "[class*='card']",
          "[class*='item']"
        ].join(",");

        function clean(value) {
          return (value ?? "").replace(/\s+/g, " ").trim();
        }

        function hash(value) {
          let result = 0;
          for (let index = 0; index < value.length; index += 1) result = Math.imul(31, result) + value.charCodeAt(index) | 0;
          return Math.abs(result).toString(36);
        }

        function labels(text) {
          return {
            titleLike: titleLikePattern.test(text) && !/播放|浏览|点赞|评论|转发|分享|收藏|发表|发布时间|数据|趋势|指标/.test(text),
            publishedAt: datePattern.test(text) || /发表|发布/.test(text),
            views: /播放|浏览|观看/.test(text),
            likes: /点赞/.test(text),
            comments: /评论/.test(text),
            shares: /转发|分享/.test(text),
            saves: /收藏/.test(text)
          };
        }

        const rows = [];
        const nodes = Array.from(document.querySelectorAll(selectors));
        for (const node of nodes) {
          const text = clean(node.textContent);
          if (text.length < 8 || text.length > 1800) continue;
          if (accountOnly.test(text) && !/作品|视频|发表|标题|播放/.test(text)) continue;
          if (!metricPattern.test(text)) continue;
          const found = labels(text);
          const completeness = Object.values(found).filter(Boolean).length;
          if (completeness < 3) continue;
          rows.push({
            textHash: hash(text),
            textLength: text.length,
            tagName: node.tagName.toLowerCase(),
            classHint: clean(node.className).slice(0, 80),
            labels: found,
            completeness,
            rawTextSaved: false
          });
          if (rows.length >= limit) break;
        }
        const bodyText = clean(document.body?.textContent ?? "");
        return {
          url: location.href,
          textLength: bodyText.length,
          hasSingleVideoText: /单篇|单个视频|视频数据|作品数据|发表/.test(bodyText),
          hasExportText: /导出|下载/.test(bodyText),
          candidateRows: rows
        };
      }, maxCandidates);
      frameResults.push({ ...result, url: frameUrl });
    } catch (error) {
      frameResults.push({ url: frameUrl, error: error instanceof Error ? error.message : String(error), candidateRows: [] });
    }
  }
  return frameResults;
}

function inferLoginState(urls, domFrames, networkSummaries) {
  const joined = urls.join(" ");
  if (/login\.html|passport|sso/i.test(joined)) return networkSummaries.length > 0 || domFrames.some((item) => item.textLength > 1000) ? "maybe_login_prompt_visible" : "needs_login";
  if (networkSummaries.length > 0 || domFrames.some((item) => item.candidateRows?.length > 0)) return "logged_in_or_accessible";
  return "unknown";
}

function decideMvpReadiness(domFrames, networkSummaries) {
  const domRows = domFrames.flatMap((frame) => frame.candidateRows ?? []);
  const completeDomRows = domRows.filter((row) => row.labels.titleLike && row.labels.publishedAt && row.labels.views && row.labels.likes && row.labels.comments && row.labels.shares);
  const networkCore = networkSummaries.filter((item) => item.coreContentFieldsPresent);
  if (completeDomRows.length > 0) {
    return {
      status: "ready_for_dom_mvp",
      conclusion: "可进入浏览器辅助 MVP：frame/DOM 中存在同时覆盖作品标题、发布时间、播放、点赞、评论、分享的内容级候选行。",
      confidence: "medium",
      evidence: { completeDomRows: completeDomRows.length, networkCoreEndpoints: networkCore.length }
    };
  }
  if (networkCore.length > 0) {
    return {
      status: "ready_for_network_mvp_with_extra_guardrails",
      conclusion: "可进入网络脱敏映射 MVP，但不建议 DOM-only：network 字段结构覆盖内容级核心字段，DOM 未证明完整作品行。实现必须继续禁止保存请求头、登录材料和原始响应体。",
      confidence: "medium",
      evidence: { completeDomRows: completeDomRows.length, networkCoreEndpoints: networkCore.length }
    };
  }
  const partialRows = domRows.filter((row) => row.completeness >= 4).length;
  return {
    status: "not_ready",
    conclusion: "不能进入内容级登录后抓取 MVP：本次未证明稳定作品表同时包含标题、发布时间、播放、点赞、评论、分享。",
    confidence: "high",
    evidence: { partialDomRows: partialRows, networkCoreEndpoints: networkCore.length }
  };
}

function writeReport(report) {
  writeFileSync(path.join(OUTPUT_DIR, "report.json"), JSON.stringify(report, null, 2));
  const lines = [
    `# ${TASK} Report`,
    "",
    `Generated at: ${report.generatedAt}`,
    `Login state: ${report.loginState}`,
    `MVP readiness: ${report.mvpReadiness.status}`,
    "",
    "## Conclusion",
    "",
    report.mvpReadiness.conclusion,
    "",
    "## Safety",
    "",
    "- Non-persistent browser context only.",
    "- No cookies, tokens, passwords, request headers, browser storage, screenshots, HAR, trace, or raw response bodies are saved.",
    "- DOM candidate rows are saved as hashes and label coverage only, not text.",
    "- Network evidence is saved as endpoint/path coverage only, not payload values.",
    "- Operating DB is not opened or written.",
    "",
    "## Evidence Summary",
    "",
    `- Frames inspected: ${report.frames.length}`,
    `- DOM candidate rows: ${report.frames.reduce((sum, frame) => sum + (frame.candidateRows?.length ?? 0), 0)}`,
    `- Network summaries: ${report.networkSummaries.length}`,
    `- Network core-content endpoints: ${report.networkSummaries.filter((item) => item.coreContentFieldsPresent).length}`,
    "",
    "## Next Step",
    "",
    report.nextStep
  ];
  writeFileSync(path.join(OUTPUT_DIR, "report.md"), `${lines.join("\n")}\n`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  ensureOutputDir();
  const networkSummaries = [];
  const notes = [
    "Navigate manually after login to Video Account works/content management, single video, or post statistic pages.",
    "The script observes structure only and does not save raw platform data."
  ];
  const browser = await chromium.launch({
    executablePath: chromeExecutablePath(),
    headless: options.headless,
    args: ["--no-first-run", "--no-default-browser-check"]
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: "zh-CN" });
  const page = await context.newPage();

  page.on("response", async (response) => {
    try {
      if (networkSummaries.length >= options.maxNetworkSummaries) return;
      const url = response.url();
      if (!isVideoAccountUrl(url)) return;
      const contentType = response.headers()["content-type"] ?? "";
      if (!/json/i.test(contentType) && !/\/(cgi-bin|web|api|finder|channels|platform|stat|data|feed|post|opus)\//i.test(url)) return;
      const text = await response.text().catch(() => "");
      if (!text.trim() || LONG_SECRET.test(text.trim())) return;
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        return;
      }
      networkSummaries.push(sanitizeNetworkSummary(response, parsed));
    } catch {
      // Discovery should keep running when one response is unavailable.
    }
  });

  console.log("A temporary browser is opening. Log in manually, then navigate to works/content/single-video/data pages. No login material will be saved.");
  await page.goto(options.target, { waitUntil: "domcontentloaded", timeout: 60000 }).catch((error) => notes.push(`Initial navigation warning: ${error instanceof Error ? error.message : String(error)}`));
  await page.waitForTimeout(Math.max(1000, options.durationMs));

  const pages = context.pages();
  const urls = pages.map((item) => item.url());
  const activePage = pages.find((item) => item.url().includes("channels.weixin.qq.com")) ?? page;
  const frames = await collectDomCandidates(activePage, options.maxDomCandidates);
  const loginState = inferLoginState(urls, frames, networkSummaries);
  const mvpReadiness = decideMvpReadiness(frames, networkSummaries);
  const report = {
    task: TASK,
    generatedAt: new Date().toISOString(),
    targetUrl: options.target,
    durationMs: options.durationMs,
    loginState,
    urls: urls.map(safeUrl),
    frames,
    networkSummaries,
    mvpReadiness,
    notes,
    safety: {
      persistentProfile: false,
      cookiesSaved: false,
      tokensSaved: false,
      headersSaved: false,
      rawResponsesSaved: false,
      screenshotsSaved: false,
      operatingDbWritten: false
    },
    nextStep: mvpReadiness.status === "not_ready"
      ? "Do not implement Video Account content-level browser capture yet. Re-run after manually opening a known work-list or single-video data table if available."
      : "Implement a preview-only MVP first, then add explicit user confirmation before any trusted save path."
  };
  writeReport(report);
  await context.clearCookies().catch(() => undefined);
  await context.close().catch(() => undefined);
  await browser.close().catch(() => undefined);
  console.log(JSON.stringify({
    ok: mvpReadiness.status !== "not_ready",
    loginState,
    mvpReadiness: mvpReadiness.status,
    reportJson: path.join(OUTPUT_DIR, "report.json"),
    reportMd: path.join(OUTPUT_DIR, "report.md")
  }, null, 2));
}

main().catch((error) => {
  ensureOutputDir();
  const message = error instanceof Error ? error.message : String(error);
  const report = {
    task: TASK,
    generatedAt: new Date().toISOString(),
    loginState: "collector_error",
    frames: [],
    networkSummaries: [],
    mvpReadiness: {
      status: "not_ready",
      conclusion: "Discovery failed before proving content-level fields.",
      confidence: "high",
      evidence: {}
    },
    notes: [message],
    safety: {
      persistentProfile: false,
      cookiesSaved: false,
      tokensSaved: false,
      headersSaved: false,
      rawResponsesSaved: false,
      screenshotsSaved: false,
      operatingDbWritten: false
    },
    nextStep: "Fix the discovery runner before making a Video Account MVP decision."
  };
  writeReport(report);
  console.error(message);
  process.exitCode = 1;
});
