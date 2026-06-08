import { existsSync } from "node:fs";
import { chromium, type BrowserContext, type Page } from "playwright-core";
import { authedBrowserProfileDir, markAuthedBrowserCaptureFailure, markAuthedBrowserProfileConfirmed, markAuthedBrowserProfileOpened, resolveAuthedBrowserTargetUrl } from "@/domain/self-media/providers";
import { SelfMediaService } from "@/domain/self-media/service";
import type { DouyinAuthedBrowserCaptureRequest, DouyinAuthedBrowserCaptureResult, DouyinAuthedBrowserLoginState, DouyinBrowserVisibleRow, ImportProvenanceMetadata } from "@/domain/self-media/types";

export const runtime = "nodejs";

const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
const blockedInputKeys = ["cookie", "token", "password", "header", "headers", "authorization", "raw", "request", "response", "storage", "storageState", "screenshot", "har", "trace", "credential"];

type DouyinBrowserSession = {
  context: BrowserContext;
  page: Page;
  openedAt: string;
  lastRows: DouyinBrowserVisibleRow[];
};

declare global {
  // eslint-disable-next-line no-var
  var __selfMediaDouyinBrowserSession: DouyinBrowserSession | undefined;
}

const safety = {
  noPasswordSaved: true,
  noCookieTokenHeaderSaved: true,
  noRawRequestSaved: true,
  contentLevelOnly: true,
  accountMetricsExcluded: true
} as const;

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

function chromeExecutablePath() {
  const candidates = [
    process.env.AUTHED_BROWSER_CHROME_PATH,
    process.env.CHROME_PATH,
    process.env.DOUYIN_CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
  ].filter(Boolean) as string[];
  const found = candidates.find((item) => existsSync(item));
  if (!found) throw new Error("未找到 Chrome 或 Edge。请安装浏览器，或设置 CHROME_PATH / DOUYIN_CHROME_PATH。");
  return found;
}

function emptyResult(action: DouyinAuthedBrowserCaptureRequest["action"], overrides: Partial<DouyinAuthedBrowserCaptureResult> = {}): DouyinAuthedBrowserCaptureResult {
  return {
    action,
    ok: false,
    loginState: "not_opened",
    browserOpened: Boolean(globalThis.__selfMediaDouyinBrowserSession),
    rows: [],
    contentCount: 0,
    metricCount: 0,
    message: "抖音浏览器辅助会话尚未打开。",
    warnings: [],
    safety,
    ...overrides
  };
}

async function getPageText(page: Page) {
  return page.locator("body").innerText({ timeout: 3000 }).catch(() => "");
}

async function inferLoginState(page: Page, userConfirmedLogin?: boolean): Promise<DouyinAuthedBrowserLoginState> {
  if (userConfirmedLogin) return "user_confirmed";
  const currentUrl = page.url();
  const bodyText = await getPageText(page);
  if (/passport|login|sso/i.test(currentUrl) || /登录|扫码登录|验证码|请先登录/.test(bodyText)) return "needs_login";
  if (/creator\.douyin\.com/.test(currentUrl) && /作品|视频|内容|播放|数据|创作/.test(bodyText)) return "logged_in_or_accessible";
  return "unknown";
}

async function openSession(target: DouyinAuthedBrowserCaptureRequest["target"] = "works_page") {
  const existing = globalThis.__selfMediaDouyinBrowserSession;
  if (existing && !existing.page.isClosed()) {
    if (target === "works_page") await existing.page.goto(resolveAuthedBrowserTargetUrl("douyin", target), { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => undefined);
    await existing.page.bringToFront().catch(() => undefined);
    return existing;
  }
  const openedStatus = markAuthedBrowserProfileOpened("douyin");
  const context = await chromium.launchPersistentContext(authedBrowserProfileDir("douyin"), {
    executablePath: chromeExecutablePath(),
    headless: false,
    args: ["--no-first-run", "--no-default-browser-check"],
    viewport: { width: 1440, height: 1000 },
    locale: "zh-CN"
  });
  const page = context.pages()[0] ?? await context.newPage();
  await page.goto(resolveAuthedBrowserTargetUrl("douyin", target), { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => undefined);
  const session = { context, page, openedAt: openedStatus.lastOpenedAt ?? new Date().toISOString(), lastRows: [] };
  globalThis.__selfMediaDouyinBrowserSession = session;
  return session;
}

async function closeSession() {
  const session = globalThis.__selfMediaDouyinBrowserSession;
  globalThis.__selfMediaDouyinBrowserSession = undefined;
  if (!session) return;
  await session.context.close().catch(() => undefined);
}

async function extractVisibleRows(page: Page): Promise<DouyinBrowserVisibleRow[]> {
  const capturedAt = new Date().toISOString();
  return page.evaluate((now) => {
    type Row = DouyinBrowserVisibleRow;
    const metricLabels = /(播放|浏览|点赞|评论|收藏|分享|转发|完播|互动)/;
    const accountOnly = /(粉丝画像|账号总览|账号数据|主页访问|净增粉丝|粉丝总数|私信|评论内容)/;
    const rowSelector = "tr,[role='row'],article,li,[class*='table-row'],[class*='TableRow'],[class*='card'],[class*='item']";
    const noisyBlock = /(投稿作品直播场次|投稿分析投稿列表|数据周期内投稿量|全部\s*\d+已发布|审核中未通过)/;
    const actionNoise = /(编辑作品设置权限|作品置顶删除作品|删除作品|设置权限)/g;
    const sourcePageKind = /creator\.douyin\.com$/.test(window.location.hostname) && /creator-micro\/(?:content\/manage|data-center\/content)/.test(window.location.pathname)
      ? "creator_center_owned_works"
      : /douyin\.com$/.test(window.location.hostname) && /user|creator/.test(window.location.pathname)
        ? "public_creator_home"
        : "creator_center_unknown";

    function clean(value: string | null | undefined) {
      return (value ?? "").replace(/\s+/g, " ").trim();
    }

    function hash(value: string) {
      let result = 0;
      for (let index = 0; index < value.length; index += 1) result = Math.imul(31, result) + value.charCodeAt(index) | 0;
      return Math.abs(result).toString(36);
    }

    function numberFrom(value: string) {
      const source = clean(value).replace(/,/g, "");
      const match = source.match(/(-?\d+(?:\.\d+)?)\s*(万|亿|k|K)?/);
      if (!match) return 0;
      const base = Number(match[1]);
      if (!Number.isFinite(base)) return 0;
      const unit = match[2];
      if (unit === "亿") return Math.round(base * 100000000);
      if (unit === "万") return Math.round(base * 10000);
      if (unit === "k" || unit === "K") return Math.round(base * 1000);
      return Math.round(base);
    }

    function metricValue(text: string, labels: string[]) {
      for (const label of labels) {
        const after = text.match(new RegExp(`${label}[^\\d-]{0,8}(-?\\d[\\d,.]*(?:\\.\\d+)?\\s*(?:万|亿|k|K)?)`));
        if (after) return numberFrom(after[1]);
        const before = text.match(new RegExp(`(-?\\d[\\d,.]*(?:\\.\\d+)?\\s*(?:万|亿|k|K)?)\\s*${label}`));
        if (before) return numberFrom(before[1]);
      }
      return 0;
    }

    function publishedDateCount(text: string) {
      return (text.match(/20\d{2}[-/.年]\d{1,2}[-/.月]\d{1,2}/g) ?? []).length;
    }

    function actionNoiseCount(text: string) {
      return (text.match(actionNoise) ?? []).length;
    }

    function hasNestedMetricCandidate(element: Element, text: string) {
      const children = Array.from(element.querySelectorAll(rowSelector));
      return children.some((child) => {
        if (child === element) return false;
        const childText = clean(child.textContent);
        return childText.length >= 12
          && childText.length < text.length - 12
          && metricLabels.test(childText)
          && !accountOnly.test(childText);
      });
    }

    function isLikelyContainerBlock(element: Element, text: string) {
      if (hasNestedMetricCandidate(element, text)) return true;
      if (noisyBlock.test(text)) return true;
      if (publishedDateCount(text) > 1) return true;
      if (actionNoiseCount(text) > 1) return true;
      return false;
    }

    function hasStableNativeId(value: string | undefined) {
      return Boolean(value && !/table|row|card|item|button|container|tab|panel|list|request|response|form|semi/i.test(value));
    }

    function hasCleanTitle(value: string) {
      return !/投稿作品直播场次|投稿分析投稿列表|数据周期内投稿量|编辑作品设置权限|作品置顶删除作品|全部\s*\d+已发布|审核中未通过/.test(value);
    }

    function linkOf(element: Element) {
      const anchor = element.querySelector("a[href*='douyin.com'],a[href*='/video/'],a[href*='modal_id']");
      const href = anchor?.getAttribute("href") ?? "";
      if (!href) return "";
      try {
        return new URL(href, window.location.href).toString().split("?")[0];
      } catch {
        return href.split("?")[0];
      }
    }

    function dataIdOf(element: Element) {
      const candidates = [element, ...Array.from(element.querySelectorAll("[data-id],[data-item-id],[data-aweme-id],[data-e2e],[id]")).slice(0, 60)];
      for (const candidate of candidates) {
        for (const attribute of Array.from(candidate.attributes)) {
          if (!/(^data-(?:item-|aweme-)?id$|^id$|aweme|item)/i.test(attribute.name)) continue;
          const value = clean(attribute.value);
          const match = value.match(/([A-Za-z0-9_-]{6,})/);
          if (match && !/table|row|card|item|button|container|tab|panel|list|request|response|form/i.test(match[1])) return match[1];
        }
      }
      return "";
    }

    function idOf(element: Element, text: string) {
      const href = linkOf(element);
      const fromHref = href.match(/(?:video\/|modal_id=|item_id=|aweme_id=)([A-Za-z0-9_-]{6,})/i)?.[1];
      if (fromHref) return { id: fromHref, nativeId: fromHref, nativeIdConfidence: "stable_platform_id" as const };
      const fromData = dataIdOf(element);
      if (fromData) return { id: fromData, nativeId: fromData, nativeIdConfidence: "stable_platform_id" as const };
      const explicit = text.match(/(?:作品ID|视频ID|item[_\s-]?id|aweme[_\s-]?id)[:：\s]*([A-Za-z0-9_-]{4,})/i)?.[1];
      if (explicit) return { id: explicit, nativeId: explicit, nativeIdConfidence: "visible_platform_id" as const };
      return { id: `dy-browser-${hash(text.slice(0, 260))}`, nativeId: undefined, nativeIdConfidence: "fallback_text_hash" as const };
    }

    function titleOf(element: Element, text: string) {
      const titled = element.querySelector("[title],h1,h2,h3,h4,a,span");
      const fromAttribute = clean(titled?.getAttribute("title"));
      if (fromAttribute && !metricLabels.test(fromAttribute)) return fromAttribute.slice(0, 80);
      const lines = (element.textContent ?? "").split(/\n|\r| {2,}/).map(clean).filter(Boolean);
      const candidate = lines.find((line) => line.length >= 4 && line.length <= 80 && !metricLabels.test(line) && !/编辑|删除|查看|更多|置顶|发布时间/.test(line));
      if (candidate) return candidate;
      return clean(text.replace(/播放|浏览|点赞|评论|收藏|分享|转发/g, " ")).slice(0, 80) || "抖音作品";
    }

    function publishedAtOf(text: string) {
      const match = text.match(/(20\d{2}[-/.年]\d{1,2}[-/.月]\d{1,2}(?:日)?(?:\s+\d{1,2}:\d{2})?)/);
      if (!match) return undefined;
      const normalized = match[1].replace("年", "-").replace("月", "-").replace("日", "").replace(/\//g, "-");
      const parsed = new Date(normalized.includes(":") ? normalized : `${normalized}T00:00:00`);
      return Number.isNaN(parsed.valueOf()) ? undefined : parsed.toISOString();
    }

    const elements = Array.from(document.querySelectorAll(rowSelector));
    const rows: Row[] = [];
    const seen = new Set<string>();
    for (const element of elements) {
      const text = clean(element.textContent);
      if (text.length < 12 || text.length > 1500) continue;
      if (!metricLabels.test(text)) continue;
      if (accountOnly.test(text) && !/作品|视频|标题/.test(text)) continue;
      if (isLikelyContainerBlock(element, text)) continue;
      const title = titleOf(element, text);
      const idInfo = idOf(element, text);
      const id = idInfo.id;
      const key = `${id}|${title}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const row: Row = {
        id,
        nativeId: idInfo.nativeId,
        title,
        publishedAt: publishedAtOf(text),
        capturedAt: now,
        views: metricValue(text, ["播放量", "播放", "浏览量", "浏览"]),
        likes: metricValue(text, ["点赞数", "点赞"]),
        comments: metricValue(text, ["评论数", "评论"]),
        saves: metricValue(text, ["收藏数", "收藏"]),
        shares: metricValue(text, ["分享数", "分享", "转发数", "转发"]),
        followersDelta: 0,
        itemUrl: linkOf(element) || undefined,
        extractionSource: "visible_dom",
        sourcePageKind,
        confidence: sourcePageKind === "creator_center_owned_works" && /作品|视频|标题/.test(text) ? "owned_creator_center_row" : "fallback_visible_card",
        nativeIdConfidence: idInfo.nativeIdConfidence,
        warnings: []
      };
      if (row.views + row.likes + row.comments + row.saves + row.shares === 0) row.warnings.push("no_metric_number_detected");
      if (row.nativeIdConfidence === "fallback_text_hash") row.warnings.push("fallback_id_from_visible_text");
      if (!hasCleanTitle(row.title)) row.warnings.push("noisy_visible_dom_title");
      if (!hasStableNativeId(row.nativeId)) row.warnings.push("unstable_native_id");
      if (row.sourcePageKind !== "creator_center_owned_works") row.warnings.push("not_creator_center_owned_works_page");
      rows.push(row);
      if (rows.length >= 20) break;
    }
    return rows;
  }, capturedAt);
}

function summarizeRows(rows: DouyinBrowserVisibleRow[]) {
  return {
    contentCount: rows.length,
    metricCount: rows.filter((row) => row.views + row.likes + row.comments + row.saves + row.shares > 0).length,
    saveCandidateCount: saveCandidateRows(rows).length
  };
}

function hasStableNativeIdValue(value: string | undefined) {
  return Boolean(value && !/table|row|card|item|button|container|tab|panel|list|request|response|form|semi/i.test(value));
}

function hasCleanVisibleTitle(value: string) {
  return !/投稿作品直播场次|投稿分析投稿列表|数据周期内投稿量|编辑作品设置权限|作品置顶删除作品|全部\s*\d+已发布|审核中未通过/.test(value);
}

function canSaveRow(row: DouyinBrowserVisibleRow) {
  return row.sourcePageKind === "creator_center_owned_works"
    && row.confidence === "owned_creator_center_row"
    && (row.nativeIdConfidence === "stable_platform_id" || row.nativeIdConfidence === "visible_platform_id")
    && hasStableNativeIdValue(row.nativeId)
    && hasCleanVisibleTitle(row.title)
    && row.views + row.likes + row.comments + row.saves + row.shares > 0;
}

function saveCandidateRows(rows: DouyinBrowserVisibleRow[]) {
  return rows.filter(canSaveRow);
}

const browserSaveProvenance: ImportProvenanceMetadata = {
  isTestFixture: false,
  operationKind: "platform_save",
  trustedScopeEligible: true,
  dataDomain: "user_work"
};

export async function POST(request: Request) {
  try {
    if (!isLocalRequest(request)) return Response.json(emptyResult("status", { message: "抖音浏览器辅助只允许本地 runtime 调用。", warnings: ["non_local_request"] }), { status: 403 });
    const body = await request.json() as DouyinAuthedBrowserCaptureRequest;
    if (hasBlockedKey(body)) return Response.json(emptyResult(body.action ?? "status", { message: "浏览器辅助接口不接收 cookie/token/password/header/raw request/storage。", warnings: ["blocked_sensitive_input_key"] }), { status: 400 });
    const action = body.action;
    if (!["open", "status", "capture_preview", "save", "close"].includes(action)) {
      return Response.json(emptyResult("status", { loginState: "error", message: "不支持的抖音浏览器辅助操作。", warnings: ["unsupported_action"] }), { status: 400 });
    }

    if (action === "close") {
      await closeSession();
      return Response.json(emptyResult(action, { ok: true, loginState: "closed", browserOpened: false, message: "已关闭抖音登录抓取窗口；登录会话仅保存在本机 profile，不写入业务数据。" }));
    }

    const session = action === "open" ? await openSession(body.target ?? "works_page") : globalThis.__selfMediaDouyinBrowserSession;
    if (!session || session.page.isClosed()) {
      return Response.json(emptyResult(action, { message: "请先打开抖音后台登录抓取窗口。" }), { status: 400 });
    }

    const loginState = await inferLoginState(session.page, body.userConfirmedLogin);
    if (body.userConfirmedLogin || loginState === "logged_in_or_accessible" || loginState === "user_confirmed") markAuthedBrowserProfileConfirmed("douyin");
    const base = {
      action,
      loginState,
      browserOpened: true,
      pageUrl: session.page.url(),
      openedAt: session.openedAt
    };

    if (action === "open" || action === "status") {
      return Response.json(emptyResult(action, {
        ...base,
        ok: action === "open" || loginState !== "needs_login",
        rows: session.lastRows,
        ...summarizeRows(session.lastRows),
        message: loginState === "needs_login" ? "请在弹出的抖音后台完成登录，再回到本页确认。" : "抖音登录抓取窗口已连接；默认已尝试进入作品管理页，请确认能看到单条作品后读取。"
      }));
    }

    if (loginState === "needs_login" && !body.userConfirmedLogin) {
      return Response.json(emptyResult(action, { ...base, message: "页面仍像登录页；请先完成登录并勾选确认已登录。", warnings: ["needs_login"] }), { status: 400 });
    }

    const rows = await extractVisibleRows(session.page);
    session.lastRows = rows;
    const summary = summarizeRows(rows);
    if (action === "capture_preview") {
      return Response.json(emptyResult(action, {
        ...base,
        ok: rows.length > 0,
        rows,
        ...summary,
        capturedAt: new Date().toISOString(),
        message: rows.length > 0 ? `已从当前抖音页面识别 ${rows.length} 条可见作品级数据，保存前请确认。` : "当前页面未识别到作品级指标行；请进入抖音创作者中心左侧的作品管理，确认列表里有单条作品标题和播放/点赞/评论等指标后重试。",
        warnings: rows.length > 0 ? rows.flatMap((row) => row.warnings) : ["no_visible_content_rows"]
      }), { status: rows.length > 0 ? 200 : 400 });
    }

    if (!body.userConfirmedContentMetrics) {
      return Response.json(emptyResult(action, { ...base, rows, ...summary, message: "保存前需要确认这是本人抖音后台当前页面的内容级作品指标。", warnings: ["missing_user_content_metrics_confirmation"] }), { status: 400 });
    }
    const saveRows = saveCandidateRows(rows);
    if (saveRows.length === 0) {
      return Response.json(emptyResult(action, { ...base, rows, ...summary, message: "没有可保存的抖音作品级数据；请确认页面是本人创作者中心作品管理/内容数据页，并且作品 ID 来自可见链接或平台 ID。", warnings: ["no_creator_center_owned_save_candidates", ...rows.flatMap((row) => row.warnings)] }), { status: 400 });
    }
    const service = new SelfMediaService();
    const result = service.importDouyinBrowserVisibleRows(saveRows, browserSaveProvenance);
    return Response.json(emptyResult(action, {
      ...base,
      ok: result.run.status === "success",
      rows,
      ...summarizeRows(saveRows),
      importRunId: result.run.id,
      dashboardUrl: "/dashboard",
      capturedAt: new Date().toISOString(),
      message: `已保存 ${saveRows.length} 条抖音内容级指标到可信看板；未保存登录材料或账号级指标。`,
      warnings: rows.flatMap((row) => row.warnings)
    }), { status: result.run.status === "success" ? 200 : 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "抖音浏览器辅助失败。";
    markAuthedBrowserCaptureFailure("douyin", message);
    return Response.json(emptyResult("status", { loginState: "error", message, warnings: [message] }), { status: 400 });
  }
}
