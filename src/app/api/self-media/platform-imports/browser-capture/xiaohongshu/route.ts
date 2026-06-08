import { existsSync } from "node:fs";
import { chromium, type BrowserContext, type Page } from "playwright-core";
import { authedBrowserProfileDir, markAuthedBrowserCaptureFailure, markAuthedBrowserProfileConfirmed, markAuthedBrowserProfileOpened, resolveAuthedBrowserTargetUrl } from "@/domain/self-media/providers";
import { hasTrustedCreatorCenterRowShape, selectXiaohongshuCreatorCenterDetailRow, selectXiaohongshuCreatorCenterRows, type CreatorCenterDomCandidate } from "@/domain/self-media/providers/creator-center-row-selector";
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
  const candidates = await page.evaluate(() => {
    const creatorHost = window.location.hostname.endsWith("creator.xiaohongshu.com");
    if (!creatorHost) return [];

    const metricLabels = /(浏览|阅读|观看|播放|点赞|评论|收藏|分享|曝光|互动)/;
    const rowSelector = "tr,[role='row'],article,li,[class*='table-row'],[class*='TableRow'],[class*='note'],[class*='Note'],[class*='card'],[class*='item']";

    function clean(value: string | null | undefined) {
      return (value ?? "").replace(/\s+/g, " ").trim();
    }

    function childCandidateCount(element: Element, text: string) {
      const children = Array.from(element.querySelectorAll(rowSelector));
      return children.filter((child) => {
        if (child === element) return false;
        const childText = clean(child.textContent);
        return childText.length >= 12
          && childText.length < text.length - 12
          && metricLabels.test(childText);
      }).length;
    }

    const elements = Array.from(document.querySelectorAll(rowSelector));
    return elements.map((element) => {
      const text = clean(element.textContent);
      const scoped = [element, ...Array.from(element.querySelectorAll("[data-id],[data-note-id],[id]")).slice(0, 60)];
      const dataValues = scoped.flatMap((item) => Array.from(item.attributes)
        .filter((attribute) => /(^data-(?:note-)?id$|^id$|note)/i.test(attribute.name))
        .map((attribute) => clean(attribute.value)));
      const anchors = Array.from(element.querySelectorAll("a[href*='xiaohongshu.com'],a[href*='note'],a[href*='note_id'],a[href*='noteId'],a[href*='explore']"));
      dataValues.push(...anchors.map((anchor) => anchor.getAttribute("href")?.match(/(?:note\/|explore\/|discovery\.|note_id=|noteId=)([A-Za-z0-9_-]{6,})/i)?.[1] ?? "").filter(Boolean));
      const hrefs = anchors.map((anchor) => {
        const href = anchor.getAttribute("href") ?? "";
          try {
            const url = new URL(href, window.location.href);
            url.search = "";
            url.hash = "";
            return url.toString();
          } catch {
            return href.split("?")[0];
          }
        })
        .filter(Boolean);
      return {
        text,
        tagName: element.tagName.toLowerCase(),
        role: element.getAttribute("role") ?? undefined,
        className: clean(element.getAttribute("class")),
        idAttr: clean(element.getAttribute("id")),
        titleAttr: clean(element.querySelector("[title],h1,h2,h3,h4,a,span")?.getAttribute("title")),
        hrefs,
        dataValues,
        cells: Array.from(element.querySelectorAll("td,[role='cell'],[class*='cell'],[class*='Cell'],[class*='metric'],[class*='Metric']")).map((cell) => clean(cell.textContent)).filter(Boolean),
        childCandidateCount: childCandidateCount(element, text)
      };
    });
  }) as CreatorCenterDomCandidate[];
  return selectXiaohongshuCreatorCenterRows(candidates, capturedAt);
}

async function extractCurrentDetailRow(page: Page): Promise<XiaohongshuBrowserVisibleRow[]> {
  const capturedAt = new Date().toISOString();
  const candidate = await page.evaluate(() => {
    if (!window.location.hostname.endsWith("creator.xiaohongshu.com")) return undefined;
    if (/\/new\/note-manager\/?$/.test(window.location.pathname)) return undefined;
    if (!/(detail|analysis|analyse|note|data|note_id=|noteId=|explore\/)/i.test(window.location.href)) return undefined;

    function clean(value: string | null | undefined) {
      return (value ?? "").replace(/\s+/g, " ").trim();
    }

    function sanitizedUrl(value: string) {
      try {
        const url = new URL(value, window.location.href);
        url.search = "";
        url.hash = "";
        return url.toString();
      } catch {
        return value.split("?")[0];
      }
    }

    const currentUrl = window.location.href;
    const idPattern = /(?:note\/|explore\/|discovery\.|note_id=|noteId=)([A-Za-z0-9_-]{6,})/i;
    const dataValues = [currentUrl.match(idPattern)?.[1] ?? ""].filter(Boolean);
    const anchors = Array.from(document.querySelectorAll("a[href*='xiaohongshu.com'],a[href*='note'],a[href*='note_id'],a[href*='noteId'],a[href*='explore']"));
    dataValues.push(...anchors.map((anchor) => anchor.getAttribute("href")?.match(idPattern)?.[1] ?? "").filter(Boolean));
    const scoped = Array.from(document.querySelectorAll("[data-id],[data-note-id],[id]")).slice(0, 120);
    dataValues.push(...scoped.flatMap((item) => Array.from(item.attributes)
      .filter((attribute) => /(^data-(?:note-)?id$|^id$|note)/i.test(attribute.name))
      .map((attribute) => clean(attribute.value))));
    const titleCandidates = Array.from(document.querySelectorAll("h1,h2,h3,[class*='title'],[class*='Title'],[data-testid*='title'],[class*='note-name'],[class*='NoteName']"))
      .map((element) => clean(element.getAttribute("title")) || clean(element.textContent))
      .filter((text) => text.length >= 4 && text.length <= 140 && !/(浏览|阅读|观看|播放|点赞|评论|收藏|分享|曝光|互动|数据详情|笔记数据)/.test(text))
      .slice(0, 12);
    const metricCandidates = Array.from(document.querySelectorAll("section,article,div,li,span,p,td,[role='cell'],[class*='metric'],[class*='Metric'],[class*='data'],[class*='Data']"))
      .map((element) => clean(element.textContent))
      .filter((text) => text.length >= 2 && text.length <= 180 && /\d/.test(text) && /(浏览|阅读|观看|播放|点赞|评论|收藏|分享|曝光|互动)/.test(text))
      .slice(0, 80);
    const hrefs = [sanitizedUrl(currentUrl), ...anchors.map((anchor) => sanitizedUrl(anchor.getAttribute("href") ?? "")).filter(Boolean)];
    const cells = [...titleCandidates, ...metricCandidates];
    return {
      text: cells.join(" "),
      tagName: "page",
      role: "document",
      className: "creator-center-detail",
      idAttr: "",
      titleAttr: titleCandidates[0],
      hrefs,
      dataValues,
      cells,
      childCandidateCount: 0
    };
  }) as CreatorCenterDomCandidate | undefined;
  return selectXiaohongshuCreatorCenterDetailRow(candidate, capturedAt);
}

function summarizeRows(rows: XiaohongshuBrowserVisibleRow[]) {
  return {
    contentCount: rows.length,
    metricCount: rows.filter((row) => row.views + row.likes + row.comments + row.saves + row.shares > 0).length,
    saveCandidateCount: saveCandidateRows(rows).length
  };
}

function canSaveRow(row: XiaohongshuBrowserVisibleRow) {
  const trustedContext = (row.sourcePageKind === "creator_center_owned_works" && row.confidence === "owned_creator_center_row")
    || (row.sourcePageKind === "creator_center_owned_detail" && row.confidence === "owned_creator_center_detail");
  return trustedContext
    && hasTrustedCreatorCenterRowShape(row, "xiaohongshu");
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
    if (!["open", "status", "capture_preview", "capture_current_detail_preview", "save", "close"].includes(action)) {
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

    const rows = action === "save"
      ? session.lastRows
      : action === "capture_current_detail_preview"
        ? await extractCurrentDetailRow(session.page)
        : await extractVisibleRows(session.page);
    if (action !== "save") session.lastRows = rows;
    const summary = summarizeRows(rows);
    if (action === "capture_preview" || action === "capture_current_detail_preview") {
      const isDetail = action === "capture_current_detail_preview";
      return Response.json(emptyResult(action, {
        ...base,
        ok: rows.length > 0,
        rows,
        ...summary,
        capturedAt: new Date().toISOString(),
        message: rows.length > 0
          ? `已从当前小红书${isDetail ? "笔记详情页" : "后台页面"}识别 ${rows.length} 条本人笔记/作品级数据，保存前请确认。`
          : isDetail
            ? "当前详情页未识别到可靠笔记 ID、单条笔记标题和同一笔记上下文的指标；请在小红书后台点开具体笔记的数据/详情页后重试。"
            : "当前页面未识别到本人笔记/作品级指标行；请进入小红书创作服务平台的笔记管理，确认列表里有单条笔记标题和浏览/点赞/评论/收藏等指标后重试。",
        warnings: rows.length > 0 ? rows.flatMap((row) => row.warnings) : [isDetail ? "no_visible_detail_note_row" : "no_visible_creator_note_rows"]
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
