import { existsSync } from "node:fs";
import { chromium, type BrowserContext, type Page } from "playwright-core";
import { authedBrowserProfileDir, markAuthedBrowserCaptureFailure, markAuthedBrowserProfileConfirmed, markAuthedBrowserProfileOpened, resolveAuthedBrowserTargetUrl } from "@/domain/self-media/providers";
import { SelfMediaService } from "@/domain/self-media/service";
import type { ImportProvenanceMetadata, XiaohongshuAuthedBrowserCaptureRequest, XiaohongshuAuthedBrowserCaptureResult, XiaohongshuAuthedBrowserLoginState, XiaohongshuBrowserVisibleRow } from "@/domain/self-media/types";

export const runtime = "nodejs";

const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
const blockedInputKeys = ["cookie", "token", "password", "header", "headers", "authorization", "raw", "request", "response", "storage", "storageState", "screenshot", "har", "trace", "credential"];

type XiaohongshuBrowserSession = {
  context: BrowserContext;
  page: Page;
  openedAt: string;
  lastRows: XiaohongshuBrowserVisibleRow[];
};

declare global {
  // eslint-disable-next-line no-var
  var __selfMediaXiaohongshuBrowserSession: XiaohongshuBrowserSession | undefined;
}

const safety = {
  noPasswordSaved: true,
  noCookieTokenHeaderSaved: true,
  noRawRequestSaved: true,
  contentLevelOnly: true,
  publicRecommendationExcluded: true
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
    process.env.XIAOHONGSHU_CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
  ].filter(Boolean) as string[];
  const found = candidates.find((item) => existsSync(item));
  if (!found) throw new Error("未找到 Chrome 或 Edge。请安装浏览器，或设置 CHROME_PATH / XIAOHONGSHU_CHROME_PATH。");
  return found;
}

function emptyResult(action: XiaohongshuAuthedBrowserCaptureRequest["action"], overrides: Partial<XiaohongshuAuthedBrowserCaptureResult> = {}): XiaohongshuAuthedBrowserCaptureResult {
  return {
    action,
    ok: false,
    loginState: "not_opened",
    browserOpened: Boolean(globalThis.__selfMediaXiaohongshuBrowserSession),
    rows: [],
    contentCount: 0,
    metricCount: 0,
    message: "小红书浏览器辅助会话尚未打开。",
    warnings: [],
    safety,
    ...overrides
  };
}

function safePageUrl(value: string) {
  try {
    const url = new URL(value);
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return value.split("?")[0].slice(0, 200);
  }
}

function isCreatorUrl(value: string) {
  try {
    return new URL(value).hostname.endsWith("creator.xiaohongshu.com");
  } catch {
    return false;
  }
}

async function getPageText(page: Page) {
  return page.locator("body").innerText({ timeout: 3000 }).catch(() => "");
}

async function inferLoginState(page: Page, userConfirmedLogin?: boolean): Promise<XiaohongshuAuthedBrowserLoginState> {
  if (userConfirmedLogin) return "user_confirmed";
  const currentUrl = page.url();
  const bodyText = await getPageText(page);
  if (/login|passport|sso/i.test(currentUrl) || /登录|扫码登录|验证码|请先登录/.test(bodyText)) return "needs_login";
  if (!isCreatorUrl(currentUrl)) return "wrong_page";
  if (/笔记|作品|数据|创作|发布|浏览|点赞|收藏/.test(bodyText)) return "logged_in_or_accessible";
  return "unknown";
}

async function openSession(target: XiaohongshuAuthedBrowserCaptureRequest["target"] = "works_page") {
  const existing = globalThis.__selfMediaXiaohongshuBrowserSession;
  if (existing && !existing.page.isClosed()) {
    if (target === "works_page") await existing.page.goto(resolveAuthedBrowserTargetUrl("xiaohongshu", target), { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => undefined);
    await existing.page.bringToFront().catch(() => undefined);
    return existing;
  }
  const openedStatus = markAuthedBrowserProfileOpened("xiaohongshu");
  const context = await chromium.launchPersistentContext(authedBrowserProfileDir("xiaohongshu"), {
    executablePath: chromeExecutablePath(),
    headless: false,
    args: ["--no-first-run", "--no-default-browser-check"],
    viewport: { width: 1440, height: 1000 },
    locale: "zh-CN"
  });
  const page = context.pages()[0] ?? await context.newPage();
  await page.goto(resolveAuthedBrowserTargetUrl("xiaohongshu", target), { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => undefined);
  const session = { context, page, openedAt: openedStatus.lastOpenedAt ?? new Date().toISOString(), lastRows: [] };
  globalThis.__selfMediaXiaohongshuBrowserSession = session;
  return session;
}

async function closeSession() {
  const session = globalThis.__selfMediaXiaohongshuBrowserSession;
  globalThis.__selfMediaXiaohongshuBrowserSession = undefined;
  if (!session) return;
  await session.context.close().catch(() => undefined);
}

async function extractVisibleRows(page: Page): Promise<XiaohongshuBrowserVisibleRow[]> {
  const capturedAt = new Date().toISOString();
  return page.evaluate((now) => {
    type Row = XiaohongshuBrowserVisibleRow;
    const creatorHost = window.location.hostname.endsWith("creator.xiaohongshu.com");
    if (!creatorHost) return [];
    const sourcePageKind = /\/new\/note-manager|\/creator\/(?:note|content)|\/data/.test(window.location.pathname)
      ? "creator_center_owned_works"
      : "creator_center_unknown";

    const metricLabels = /(浏览|阅读|观看|播放|点赞|评论|收藏|分享|曝光|互动)/;
    const creatorContentWords = /(笔记|作品|标题|发布|浏览|点赞|收藏|数据)/;
    const publicRecommendation = /(发现|探索|搜索|推荐|热门|话题|灵感|种草|精选|达人|榜单)/;
    const privateOrAccountOnly = /(私信|评论正文|用户画像|粉丝画像|账号总览|粉丝总数|粉丝分析|关注用户|手机号|邮箱)/;
    const rowSelector = "tr,[role='row'],article,li,[class*='table-row'],[class*='TableRow'],[class*='note'],[class*='Note'],[class*='card'],[class*='item']";
    const noisyBlock = /(全部\s*\d+已发布|审核中未通过|投稿作品直播场次|投稿分析投稿列表|数据周期内投稿量)/;
    const actionNoise = /(编辑作品设置权限|作品置顶删除作品|删除作品|设置权限|立即发布)/g;

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
          && !privateOrAccountOnly.test(childText);
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
      return Boolean(value && !/table|row|card|item|button|container|tab|panel|list|request|response|form|manager/i.test(value));
    }

    function hasCleanTitle(value: string) {
      return !/全部\s*\d+已发布|审核中未通过|编辑作品设置权限|作品置顶删除作品|投稿作品直播场次|投稿分析投稿列表|数据周期内投稿量/.test(value);
    }

    function linkOf(element: Element) {
      const anchor = element.querySelector("a[href*='xiaohongshu.com'],a[href*='note']");
      const href = anchor?.getAttribute("href") ?? "";
      if (!href) return "";
      try {
        const url = new URL(href, window.location.href);
        url.search = "";
        url.hash = "";
        return url.toString();
      } catch {
        return href.split("?")[0];
      }
    }

    function dataIdOf(element: Element) {
      const candidates = [element, ...Array.from(element.querySelectorAll("[data-id],[data-note-id],[id]")).slice(0, 60)];
      for (const candidate of candidates) {
        for (const attribute of Array.from(candidate.attributes)) {
          if (!/(^data-(?:note-)?id$|^id$|note)/i.test(attribute.name)) continue;
          const value = clean(attribute.value);
          const match = value.match(/([A-Za-z0-9_-]{6,})/);
          if (match && !/table|row|card|item|button|container|tab|panel|list|request|response|form/i.test(match[1])) return match[1];
        }
      }
      return "";
    }

    function idOf(element: Element, text: string) {
      const href = linkOf(element);
      const fromHref = href.match(/(?:note\/|note_id=|noteId=)([A-Za-z0-9_-]{6,})/i)?.[1];
      if (fromHref) return { id: fromHref, nativeId: fromHref, nativeIdConfidence: "stable_platform_id" as const };
      const fromData = dataIdOf(element);
      if (fromData) return { id: fromData, nativeId: fromData, nativeIdConfidence: "stable_platform_id" as const };
      const explicit = text.match(/(?:笔记ID|note[_\s-]?id|作品ID)[:：\s]*([A-Za-z0-9_-]{4,})/i)?.[1];
      if (explicit) return { id: explicit, nativeId: explicit, nativeIdConfidence: "visible_platform_id" as const };
      return { id: `xhs-browser-${hash(text.slice(0, 260))}`, nativeId: undefined, nativeIdConfidence: "fallback_text_hash" as const };
    }

    function titleOf(element: Element, text: string) {
      const titled = element.querySelector("[title],h1,h2,h3,h4,a,span");
      const fromAttribute = clean(titled?.getAttribute("title"));
      if (fromAttribute && !metricLabels.test(fromAttribute) && !publicRecommendation.test(fromAttribute)) return fromAttribute.slice(0, 80);
      const lines = (element.textContent ?? "").split(/\n|\r| {2,}/).map(clean).filter(Boolean);
      const candidate = lines.find((line) => line.length >= 4 && line.length <= 80 && !metricLabels.test(line) && !/编辑|删除|查看|更多|置顶|发布时间|立即发布/.test(line));
      if (candidate) return candidate;
      return clean(text.replace(/浏览|阅读|观看|播放|点赞|评论|收藏|分享|曝光|互动/g, " ")).slice(0, 80) || "小红书笔记";
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
      if (privateOrAccountOnly.test(text)) continue;
      if (publicRecommendation.test(text) && !creatorContentWords.test(text)) continue;
      if (!creatorContentWords.test(text)) continue;
      if (isLikelyContainerBlock(element, text)) continue;
      const title = titleOf(element, text);
      if (publicRecommendation.test(title)) continue;
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
        views: metricValue(text, ["浏览量", "浏览", "阅读量", "阅读", "观看量", "观看", "播放量", "播放"]),
        likes: metricValue(text, ["点赞数", "点赞"]),
        comments: metricValue(text, ["评论数", "评论"]),
        saves: metricValue(text, ["收藏数", "收藏"]),
        shares: metricValue(text, ["分享数", "分享"]),
        followersDelta: 0,
        noteUrl: linkOf(element) || undefined,
        format: /视频|播放/.test(text) ? "short_video" : "image_text",
        extractionSource: "visible_dom",
        sourcePageKind,
        confidence: sourcePageKind === "creator_center_owned_works" && /笔记|作品|标题/.test(text) ? "owned_creator_center_row" : "fallback_visible_card",
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

function summarizeRows(rows: XiaohongshuBrowserVisibleRow[]) {
  return {
    contentCount: rows.length,
    metricCount: rows.filter((row) => row.views + row.likes + row.comments + row.saves + row.shares > 0).length,
    saveCandidateCount: saveCandidateRows(rows).length
  };
}

function hasStableNativeIdValue(value: string | undefined) {
  return Boolean(value && !/table|row|card|item|button|container|tab|panel|list|request|response|form|manager/i.test(value));
}

function hasCleanVisibleTitle(value: string) {
  return !/全部\s*\d+已发布|审核中未通过|编辑作品设置权限|作品置顶删除作品|投稿作品直播场次|投稿分析投稿列表|数据周期内投稿量/.test(value);
}

function canSaveRow(row: XiaohongshuBrowserVisibleRow) {
  return row.sourcePageKind === "creator_center_owned_works"
    && row.confidence === "owned_creator_center_row"
    && (row.nativeIdConfidence === "stable_platform_id" || row.nativeIdConfidence === "visible_platform_id")
    && hasStableNativeIdValue(row.nativeId)
    && hasCleanVisibleTitle(row.title)
    && row.views + row.likes + row.comments + row.saves + row.shares > 0;
}

function saveCandidateRows(rows: XiaohongshuBrowserVisibleRow[]) {
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
    if (!isLocalRequest(request)) return Response.json(emptyResult("status", { message: "小红书浏览器辅助只允许本地 runtime 调用。", warnings: ["non_local_request"] }), { status: 403 });
    const body = await request.json() as XiaohongshuAuthedBrowserCaptureRequest;
    if (hasBlockedKey(body)) return Response.json(emptyResult(body.action ?? "status", { message: "浏览器辅助接口不接收 cookie/token/password/header/raw request/storage。", warnings: ["blocked_sensitive_input_key"] }), { status: 400 });
    const action = body.action;
    if (!["open", "status", "capture_preview", "save", "close"].includes(action)) {
      return Response.json(emptyResult("status", { loginState: "error", message: "不支持的小红书浏览器辅助操作。", warnings: ["unsupported_action"] }), { status: 400 });
    }

    if (action === "close") {
      await closeSession();
      return Response.json(emptyResult(action, { ok: true, loginState: "closed", browserOpened: false, message: "已关闭小红书登录抓取窗口；登录会话仅保存在本机 profile，不写入业务数据。" }));
    }

    const session = action === "open" ? await openSession(body.target ?? "works_page") : globalThis.__selfMediaXiaohongshuBrowserSession;
    if (!session || session.page.isClosed()) {
      return Response.json(emptyResult(action, { message: "请先打开小红书后台登录抓取窗口。" }), { status: 400 });
    }

    const loginState = await inferLoginState(session.page, body.userConfirmedLogin);
    if (body.userConfirmedLogin || loginState === "logged_in_or_accessible" || loginState === "user_confirmed") markAuthedBrowserProfileConfirmed("xiaohongshu");
    const base = {
      action,
      loginState,
      browserOpened: true,
      pageUrl: safePageUrl(session.page.url()),
      openedAt: session.openedAt
    };

    if (action === "open" || action === "status") {
      return Response.json(emptyResult(action, {
        ...base,
        ok: action === "open" || (loginState !== "needs_login" && loginState !== "wrong_page"),
        rows: session.lastRows,
        ...summarizeRows(session.lastRows),
        message: loginState === "needs_login"
          ? "请在弹出的小红书创作服务平台完成登录，再回到本页确认。"
          : loginState === "wrong_page"
            ? "当前不是小红书创作服务平台后台页面；请切回 creator.xiaohongshu.com。"
            : "小红书登录抓取窗口已连接；默认已尝试进入笔记管理页，请确认能看到本人笔记列表后读取。"
      }));
    }

    if (loginState === "wrong_page") {
      return Response.json(emptyResult(action, { ...base, message: "当前页面不是小红书创作服务平台后台；不会读取公开推荐页或非本人内容。", warnings: ["wrong_page_not_creator_center"] }), { status: 400 });
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
        message: rows.length > 0 ? `已从当前小红书后台页面识别 ${rows.length} 条可见本人笔记/作品级数据，保存前请确认。` : "当前页面未识别到本人笔记/作品级指标行；请进入小红书创作服务平台的笔记管理，确认列表里有单条笔记标题和浏览/点赞/评论/收藏等指标后重试。",
        warnings: rows.length > 0 ? rows.flatMap((row) => row.warnings) : ["no_visible_creator_note_rows"]
      }), { status: rows.length > 0 ? 200 : 400 });
    }

    if (!body.userConfirmedContentMetrics) {
      return Response.json(emptyResult(action, { ...base, rows, ...summary, message: "保存前需要确认这是本人小红书后台当前页面的内容级笔记/作品指标。", warnings: ["missing_user_content_metrics_confirmation"] }), { status: 400 });
    }
    const saveRows = saveCandidateRows(rows);
    if (saveRows.length === 0) {
      return Response.json(emptyResult(action, { ...base, rows, ...summary, message: "没有可保存的小红书本人笔记/作品级数据；请确认页面是创作服务平台笔记管理/内容数据页，并且笔记 ID 来自可见链接或平台 ID。", warnings: ["no_creator_center_owned_save_candidates", ...rows.flatMap((row) => row.warnings)] }), { status: 400 });
    }
    const service = new SelfMediaService();
    const result = service.importXiaohongshuBrowserVisibleRows(saveRows, browserSaveProvenance);
    return Response.json(emptyResult(action, {
      ...base,
      ok: result.run.status === "success",
      rows,
      ...summarizeRows(saveRows),
      importRunId: result.run.id,
      dashboardUrl: "/dashboard",
      capturedAt: new Date().toISOString(),
      message: `已保存 ${saveRows.length} 条小红书内容级指标到可信看板；未保存登录材料、公开推荐页或非本人内容。`,
      warnings: rows.flatMap((row) => row.warnings)
    }), { status: result.run.status === "success" ? 200 : 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "小红书浏览器辅助失败。";
    markAuthedBrowserCaptureFailure("xiaohongshu", message);
    return Response.json(emptyResult("status", { loginState: "error", message, warnings: [message] }), { status: 400 });
  }
}
