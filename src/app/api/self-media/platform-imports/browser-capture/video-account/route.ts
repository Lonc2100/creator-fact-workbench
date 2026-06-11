import { existsSync } from "node:fs";
import { chromium, type BrowserContext, type Page } from "playwright-core";
import { authedBrowserProfileDir, markAuthedBrowserCaptureFailure, markAuthedBrowserProfileConfirmed, markAuthedBrowserProfileOpened, resolveAuthedBrowserTargetUrl, selectVideoAccountAssistantPageRows, type VideoAccountDomCandidate } from "@/domain/self-media/providers";
import { SelfMediaService } from "@/domain/self-media/service";
import type { ImportProvenanceMetadata, VideoAccountAuthedBrowserCaptureRequest, VideoAccountAuthedBrowserCaptureResult, VideoAccountAuthedBrowserLoginState, VideoAccountBrowserVisibleRow } from "@/domain/self-media/types";

export const runtime = "nodejs";

const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
const blockedInputKeys = ["cookie", "token", "password", "header", "headers", "authorization", "raw", "request", "response", "storage", "storageState", "screenshot", "har", "trace", "credential"];

type VideoAccountBrowserSession = {
  context: BrowserContext;
  page: Page;
  openedAt: string;
  lastRows: VideoAccountBrowserVisibleRow[];
};

declare global {
  // eslint-disable-next-line no-var
  var __selfMediaVideoAccountBrowserSession: VideoAccountBrowserSession | undefined;
}

const safety = {
  noPasswordSaved: true,
  noCookieTokenHeaderSaved: true,
  noRawRequestSaved: true,
  contentLevelOnly: true,
  recommendationNotMappedToSaves: true
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
    process.env.VIDEO_ACCOUNT_CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
  ].filter(Boolean) as string[];
  const found = candidates.find((item) => existsSync(item));
  if (!found) throw new Error("未找到 Chrome 或 Edge。请安装浏览器，或设置 CHROME_PATH / VIDEO_ACCOUNT_CHROME_PATH。");
  return found;
}

function emptyResult(action: VideoAccountAuthedBrowserCaptureRequest["action"], overrides: Partial<VideoAccountAuthedBrowserCaptureResult> = {}): VideoAccountAuthedBrowserCaptureResult {
  return {
    action,
    ok: false,
    loginState: "not_opened",
    browserOpened: Boolean(globalThis.__selfMediaVideoAccountBrowserSession),
    rows: [],
    contentCount: 0,
    metricCount: 0,
    message: "视频号助手页面扫描会话尚未打开。",
    warnings: [],
    safety,
    ...overrides
  };
}

async function getPageText(page: Page) {
  return page.locator("body").innerText({ timeout: 3000 }).catch(() => "");
}

async function inferLoginState(page: Page, userConfirmedLogin?: boolean): Promise<VideoAccountAuthedBrowserLoginState> {
  const currentUrl = page.url();
  const bodyText = await getPageText(page);
  if (!/channels\.weixin\.qq\.com/.test(currentUrl)) return "wrong_page";
  if (/login|登录|扫码登录|请使用微信扫码|二维码|验证码/.test(`${currentUrl} ${bodyText}`)) return "needs_login";
  if (userConfirmedLogin) return "user_confirmed";
  if (/视频号助手|发表|作品|内容|数据|播放|曝光|浏览|点赞|评论/.test(bodyText)) return "logged_in_or_accessible";
  return "unknown";
}

async function openSession(target: VideoAccountAuthedBrowserCaptureRequest["target"] = "works_page") {
  const existing = globalThis.__selfMediaVideoAccountBrowserSession;
  if (existing && !existing.page.isClosed()) {
    if (target === "works_page" && /\/login\.html|\/platform\/?$/.test(existing.page.url())) {
      await existing.page.goto(resolveAuthedBrowserTargetUrl("video_account", target), { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => undefined);
    }
    await existing.page.bringToFront().catch(() => undefined);
    return existing;
  }
  const openedStatus = markAuthedBrowserProfileOpened("video_account");
  const context = await chromium.launchPersistentContext(authedBrowserProfileDir("video_account"), {
    executablePath: chromeExecutablePath(),
    headless: false,
    args: ["--no-first-run", "--no-default-browser-check"],
    viewport: { width: 1440, height: 1000 },
    locale: "zh-CN"
  });
  const page = context.pages()[0] ?? await context.newPage();
  await page.goto(resolveAuthedBrowserTargetUrl("video_account", target), { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => undefined);
  const session = { context, page, openedAt: openedStatus.lastOpenedAt ?? new Date().toISOString(), lastRows: [] };
  globalThis.__selfMediaVideoAccountBrowserSession = session;
  return session;
}

async function closeSession() {
  const session = globalThis.__selfMediaVideoAccountBrowserSession;
  globalThis.__selfMediaVideoAccountBrowserSession = undefined;
  if (!session) return;
  await session.context.close().catch(() => undefined);
}

async function extractVisibleRows(page: Page): Promise<VideoAccountBrowserVisibleRow[]> {
  const capturedAt = new Date().toISOString();
  const candidates = await page.evaluate(() => {
    const rowSelector = "tr,[role='row'],article,li,[class*='table-row'],[class*='TableRow'],[class*='card'],[class*='item'],[class*='list-item'],[class*='ListItem']";

    function clean(value: string | null | undefined) {
      return (value ?? "").replace(/\s+/g, " ").trim();
    }

    function visible(element: Element) {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width >= 8
        && rect.height >= 8
        && rect.bottom > 0
        && rect.right > 0
        && rect.top < window.innerHeight
        && rect.left < window.innerWidth
        && style.visibility !== "hidden"
        && style.display !== "none";
    }

    function childCandidateCount(element: Element, text: string) {
      const children = Array.from(element.querySelectorAll(rowSelector));
      return children.filter((child) => {
        if (child === element) return false;
        const childText = clean(child.textContent);
        return childText.length >= 12
          && childText.length < text.length - 12
          && /(播放|曝光|浏览|点赞|评论|收藏|分享|转发|推荐)/.test(childText);
      }).length;
    }

    function headersFor(element: Element) {
      const table = element.closest("table");
      if (table) {
        const headers = Array.from(table.querySelectorAll("thead th,thead [role='columnheader'],th,[role='columnheader']"))
          .map((header) => clean(header.textContent))
          .filter(Boolean);
        if (headers.length > 0) return headers;
      }
      const grid = element.closest("[role='grid'],[role='table'],[class*='table'],[class*='Table']");
      if (grid) {
        return Array.from(grid.querySelectorAll("[role='columnheader'],[class*='header'] [class*='cell'],[class*='Header'] [class*='Cell']"))
          .map((header) => clean(header.textContent))
          .filter(Boolean)
          .slice(0, 24);
      }
      return [];
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

    const elements = Array.from(document.querySelectorAll(rowSelector)).filter(visible);
    return elements.map((element) => {
      const text = clean(element.textContent);
      const scoped = [element, ...Array.from(element.querySelectorAll("[data-id],[data-object-id],[data-feed-id],[data-export-id],[id]")).slice(0, 80)];
      const dataValues = scoped.flatMap((item) => Array.from(item.attributes)
        .filter((attribute) => /(^data-(?:object-|feed-|export-)?id$|^id$|object|feed|export)/i.test(attribute.name))
        .map((attribute) => clean(attribute.value)));
      const anchors = Array.from(element.querySelectorAll("a[href*='weixin.qq.com/sph'],a[href*='channels.weixin.qq.com'],a[href*='export/']"));
      const hrefs = anchors.map((anchor) => sanitizedUrl(anchor.getAttribute("href") ?? "")).filter(Boolean);
      dataValues.push(...hrefs);
      const cells = Array.from(element.querySelectorAll("td,th,[role='cell'],[class*='cell'],[class*='Cell'],[class*='metric'],[class*='Metric'],[class*='count'],[class*='Count']"))
        .map((cell) => clean(cell.textContent))
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
        cells,
        columnNames: headersFor(element),
        childCandidateCount: childCandidateCount(element, text)
      };
    });
  }) as VideoAccountDomCandidate[];
  return selectVideoAccountAssistantPageRows(candidates, capturedAt);
}

function summarizeRows(rows: VideoAccountBrowserVisibleRow[]) {
  return {
    contentCount: rows.length,
    metricCount: rows.filter((row) => row.views + row.likes + row.comments + row.saves + row.shares > 0).length,
    saveCandidateCount: rows.filter((row) => row.canSave).length
  };
}

const browserSaveProvenance: ImportProvenanceMetadata = {
  isTestFixture: false,
  operationKind: "platform_save",
  trustedScopeEligible: true,
  dataDomain: "user_work"
};

export async function POST(request: Request) {
  try {
    if (!isLocalRequest(request)) return Response.json(emptyResult("status", { message: "视频号助手页面扫描只允许本地 runtime 调用。", warnings: ["non_local_request"] }), { status: 403 });
    const body = await request.json() as VideoAccountAuthedBrowserCaptureRequest;
    if (hasBlockedKey(body)) return Response.json(emptyResult(body.action ?? "status", { message: "视频号助手页面扫描不接收 cookie/token/password/header/raw request/storage。", warnings: ["blocked_sensitive_input_key"] }), { status: 400 });
    const action = body.action;
    if (!["open", "status", "capture_preview", "save", "close"].includes(action)) {
      return Response.json(emptyResult("status", { loginState: "error", message: "不支持的视频号助手页面扫描操作。", warnings: ["unsupported_action"] }), { status: 400 });
    }

    if (action === "close") {
      await closeSession();
      return Response.json(emptyResult(action, { ok: true, loginState: "closed", browserOpened: false, message: "已关闭视频号助手扫描窗口；登录会话只保存在本机 profile，不写入业务数据。" }));
    }

    const session = action === "open" ? await openSession(body.target ?? "works_page") : globalThis.__selfMediaVideoAccountBrowserSession;
    if (!session || session.page.isClosed()) {
      return Response.json(emptyResult(action, { message: "请先打开视频号助手页面并登录；系统不会在扫描动作里自动打开窗口。", warnings: ["video_account_assistant_not_opened"] }), { status: 400 });
    }

    const loginState = await inferLoginState(session.page, body.userConfirmedLogin);
    if (loginState === "logged_in_or_accessible" || loginState === "user_confirmed") markAuthedBrowserProfileConfirmed("video_account");
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
        ok: action === "open" || (loginState !== "needs_login" && loginState !== "wrong_page"),
        rows: session.lastRows,
        ...summarizeRows(session.lastRows),
        message: loginState === "needs_login"
          ? "请在视频号助手窗口完成扫码登录，再回到本页勾选确认并扫描。"
          : loginState === "wrong_page"
            ? "当前窗口不是视频号助手页面；请切到视频号助手的作品或数据列表页。"
            : "视频号助手窗口已连接；请确认当前页能看到单条作品标题、发布时间和同一行指标后扫描。"
      }), { status: loginState === "wrong_page" ? 400 : 200 });
    }

    if (loginState === "needs_login") {
      return Response.json(emptyResult(action, { ...base, message: "页面仍像登录页；请先完成扫码登录并勾选确认已登录。", warnings: ["needs_login"] }), { status: 400 });
    }
    if (loginState === "wrong_page") {
      return Response.json(emptyResult(action, { ...base, loginState, message: "当前页面不是视频号助手；请切到视频号助手作品/数据列表页后重试。", warnings: ["wrong_video_account_page"] }), { status: 400 });
    }

    const rows = action === "save" ? session.lastRows : await extractVisibleRows(session.page);
    if (action !== "save") session.lastRows = rows;
    const summary = summarizeRows(rows);
    if (action === "capture_preview") {
      return Response.json(emptyResult(action, {
        ...base,
        ok: rows.length > 0,
        rows,
        ...summary,
        capturedAt: new Date().toISOString(),
        message: rows.length > 0
          ? `已从当前视频号助手页面识别 ${rows.length} 条候选；请先预览，可保存候选仍需你确认。`
          : "当前页面未识别到可靠作品行；请切到视频号助手作品/数据列表页，确认每行有标题、发布时间、观看/点赞/评论/分享和稳定链接后重试。",
        warnings: rows.length > 0 ? rows.flatMap((row) => row.warnings) : ["no_visible_video_account_work_rows"]
      }), { status: rows.length > 0 ? 200 : 400 });
    }

    if (!body.userConfirmedContentMetrics) {
      return Response.json(emptyResult(action, { ...base, rows, ...summary, message: "保存前需要确认这是本人视频号助手当前页的内容级作品指标。", warnings: ["missing_user_content_metrics_confirmation"] }), { status: 400 });
    }
    const saveRows = rows.filter((row) => row.canSave);
    if (saveRows.length === 0) {
      return Response.json(emptyResult(action, { ...base, rows, ...summary, message: "没有可保存的视频号候选；请确认稳定链接/export ID、发布时间和同一行指标都已识别。", warnings: ["no_video_account_page_scan_save_candidates", ...rows.flatMap((row) => row.warnings)] }), { status: 400 });
    }
    const service = new SelfMediaService();
    const result = service.importVideoAccountBrowserVisibleRows(saveRows, browserSaveProvenance);
    return Response.json(emptyResult(action, {
      ...base,
      ok: result.run.status === "success",
      rows,
      ...summarizeRows(saveRows),
      importRunId: result.run.id,
      dashboardUrl: "/dashboard",
      capturedAt: new Date().toISOString(),
      message: `已保存 ${saveRows.length} 条视频号内容级指标到可信看板；推荐未映射为收藏，未保存登录材料。`,
      warnings: rows.flatMap((row) => row.warnings)
    }), { status: result.run.status === "success" ? 200 : 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "视频号助手页面扫描失败。";
    markAuthedBrowserCaptureFailure("video_account", message);
    return Response.json(emptyResult("status", { loginState: "error", message, warnings: [message] }), { status: 400 });
  }
}
