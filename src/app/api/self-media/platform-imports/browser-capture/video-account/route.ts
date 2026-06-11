import { existsSync } from "node:fs";
import { chromium, type BrowserContext, type Frame, type Page } from "playwright-core";
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

type VideoAccountDomCandidateWithGeometry = VideoAccountDomCandidate & {
  hoverPoints: Array<{ x: number; y: number }>;
  shareClickPoints: Array<{ x: number; y: number }>;
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
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: "https://channels.weixin.qq.com" }).catch(() => undefined);
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

async function ensureVideoAccountWorksList(page: Page) {
  await page.bringToFront().catch(() => undefined);
  await page.waitForLoadState("domcontentloaded", { timeout: 8000 }).catch(() => undefined);
  const bodyText = await getPageText(page);
  if (/20\d{2}[-/.年]\d{1,2}[-/.月]\d{1,2}|20\d{2}年\d{1,2}月\d{1,2}日/.test(bodyText)) return;
  const contentManagement = page.getByText("内容管理", { exact: true }).first();
  if (await contentManagement.isVisible().catch(() => false)) {
    await contentManagement.click({ timeout: 2000 }).catch(() => undefined);
    await page.waitForTimeout(300);
  }
  const videoNav = page.getByText("视频", { exact: true }).first();
  if (await videoNav.isVisible().catch(() => false)) {
    await videoNav.click({ timeout: 2000 }).catch(() => undefined);
    await page.waitForLoadState("domcontentloaded", { timeout: 8000 }).catch(() => undefined);
    await page.waitForTimeout(1200);
  }
}

async function frameViewportOffset(page: Page, frame: Frame) {
  if (frame === page.mainFrame()) return { x: 0, y: 0 };
  const element = await frame.frameElement().catch(() => undefined);
  const box = await element?.boundingBox().catch(() => undefined);
  return box ? { x: box.x, y: box.y } : { x: 0, y: 0 };
}

async function extractFrameCandidates(frame: Frame, offset: { x: number; y: number }) {
  return frame.evaluate(({ offsetX, offsetY }) => {
    const rowSelector = "tr,[role='row'],article,li,[class*='table-row'],[class*='TableRow'],[class*='card'],[class*='item'],[class*='list-item'],[class*='ListItem']";
    const datePattern = /20\d{2}[-/.年]\d{1,2}[-/.月]\d{1,2}(?:日)?(?:\s+\d{1,2}:\d{2})?/;

    function clean(value: string | null | undefined) {
      return (value ?? "").replace(/\s+/g, " ").trim();
    }

    function metricNumbersAfterDate(text: string) {
      const dateMatch = text.match(datePattern);
      const source = dateMatch ? text.slice((dateMatch.index ?? 0) + dateMatch[0].length) : text;
      return Array.from(source.matchAll(/-?\d+(?:\.\d+)?\s*(?:万|亿|k|K)?/g));
    }

    function looksLikeUnlabeledWorkText(text: string) {
      return datePattern.test(text) && metricNumbersAfterDate(text).length >= 5;
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
          && (/(播放|曝光|浏览|点赞|评论|收藏|分享|转发|推荐)/.test(childText) || looksLikeUnlabeledWorkText(childText));
      }).length;
    }

    function nestedWorkTextCount(element: Element, text: string) {
      return Array.from(element.children).filter((child) => {
        const childText = clean(child.textContent);
        return visible(child) && childText.length >= 20 && childText.length < text.length - 12 && looksLikeUnlabeledWorkText(childText);
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

    function rowLikeAncestor(element: Element) {
      let current: Element | null = element;
      let best = element;
      while (current && current !== document.body) {
        const rect = current.getBoundingClientRect();
        const text = clean(current.textContent);
        if (
          visible(current)
          && rect.width >= 420
          && rect.height >= 48
          && rect.height <= 260
          && text.length >= 20
          && text.length <= 900
          && looksLikeUnlabeledWorkText(text)
          && nestedWorkTextCount(current, text) <= 1
        ) {
          best = current;
        }
        current = current.parentElement;
      }
      return best;
    }

    function candidateFromElement(element: Element) {
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
      const rect = element.getBoundingClientRect();
      const centerY = Math.round(rect.top + Math.min(rect.height - 12, Math.max(28, rect.height * 0.55)));
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 1440;
      const useViewportActionPoints = datePattern.test(text);
      const hoverPoints = [0.18, 0.38, 0.58, 0.72].map((ratio) => ({
        x: Math.round(offsetX + (useViewportActionPoints ? viewportWidth * ratio : rect.left + rect.width * ratio)),
        y: Math.round(offsetY + centerY)
      }));
      const shareClickPoints = [0.62, 0.66, 0.7, 0.74, 0.78, 0.82].map((ratio) => ({
        x: Math.round(offsetX + (useViewportActionPoints ? viewportWidth * ratio : rect.left + rect.width * ratio)),
        y: Math.round(offsetY + centerY)
      }));
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
        childCandidateCount: childCandidateCount(element, text),
        hoverPoints,
        shareClickPoints
      };
    }

    function visualTextRows() {
      const textElements = Array.from(document.querySelectorAll("body *")).flatMap((element) => {
        if (!visible(element)) return [];
        if (/^(script|style|svg|path|canvas)$/i.test(element.tagName)) return [];
        const rect = element.getBoundingClientRect();
        const text = clean((element as HTMLElement).innerText || element.textContent);
        if (!text || text.length > 180 || rect.width < 4 || rect.height < 4) return [];
        const visibleTextChildren = Array.from(element.children)
          .filter(visible)
          .map((child) => clean((child as HTMLElement).innerText || child.textContent))
          .filter(Boolean);
        if (visibleTextChildren.some((childText) => childText === text || childText.length >= text.length * 0.8)) return [];
        return [{ text, rect }];
      });
      const uniqueTextElements = textElements.filter((item, index, list) => {
        return list.findIndex((other) => other.text === item.text
          && Math.abs(other.rect.left - item.rect.left) < 3
          && Math.abs(other.rect.top - item.rect.top) < 3) === index;
      });
      const dateItems = uniqueTextElements.filter((item) => datePattern.test(item.text));
      return dateItems.map((dateItem) => {
        const dateCenterY = dateItem.rect.top + dateItem.rect.height / 2;
        const rowItems = uniqueTextElements
          .filter((item) => {
            const itemCenterY = item.rect.top + item.rect.height / 2;
            return item.rect.left > 180
              && itemCenterY >= dateCenterY - 72
              && itemCenterY <= dateCenterY + 74;
          })
          .sort((left, right) => {
            const yDelta = left.rect.top - right.rect.top;
            if (Math.abs(yDelta) > 12) return yDelta;
            return left.rect.left - right.rect.left;
          });
        const text = clean(rowItems.map((item) => item.text).join(" "));
        if (!looksLikeUnlabeledWorkText(text) && !/(播放|曝光|浏览|观看|阅读|点赞|评论|分享|转发|推荐)/.test(text)) return undefined;
        const top = Math.min(...rowItems.map((item) => item.rect.top), dateItem.rect.top);
        const bottom = Math.max(...rowItems.map((item) => item.rect.bottom), dateItem.rect.bottom);
        const centerY = Math.round(offsetY + Math.min(bottom - 10, Math.max(top + 32, top + 48)));
        const width = window.innerWidth || document.documentElement.clientWidth || 1440;
        const hoverPoints = [0.24, 0.42, 0.62, 0.78].map((ratio) => ({
          x: Math.round(offsetX + width * ratio),
          y: centerY
        }));
        const shareClickPoints = [0.62, 0.67, 0.72, 0.77, 0.82, 0.87].map((ratio) => ({
          x: Math.round(offsetX + width * ratio),
          y: centerY
        }));
        return {
          text,
          tagName: "visual-row",
          role: "row",
          className: "video-account-visual-row",
          idAttr: undefined,
          titleAttr: rowItems.find((item) => !datePattern.test(item.text) && item.text.length >= 4)?.text,
          hrefs: [] as string[],
          dataValues: [] as string[],
          cells: rowItems.map((item) => item.text),
          columnNames: [] as string[],
          childCandidateCount: 0,
          hoverPoints,
          shareClickPoints
        };
      }).filter(Boolean) as VideoAccountDomCandidateWithGeometry[];
    }

    const explicitElements = Array.from(document.querySelectorAll(rowSelector)).filter(visible);
    const fallbackElements = Array.from(document.querySelectorAll("div,section,[class]"))
      .filter((element) => {
        if (!visible(element)) return false;
        const text = clean(element.textContent);
        const rect = element.getBoundingClientRect();
        return text.length >= 20
          && text.length <= 900
          && rect.height >= 48
          && rect.height <= 260
          && looksLikeUnlabeledWorkText(text)
          && nestedWorkTextCount(element, text) <= 1;
      })
      .map(rowLikeAncestor);
    const elements: Element[] = [];
    const seen = new Set<Element>();
    for (const element of [...explicitElements, ...fallbackElements]) {
      if (seen.has(element) || !visible(element)) continue;
      seen.add(element);
      elements.push(element);
    }
    return [...elements.map(candidateFromElement), ...visualTextRows()];
  }, { offsetX: offset.x, offsetY: offset.y }) as Promise<VideoAccountDomCandidateWithGeometry[]>;
}

async function extractVisibleRows(page: Page): Promise<VideoAccountBrowserVisibleRow[]> {
  const capturedAt = new Date().toISOString();
  await ensureVideoAccountWorksList(page);
  const candidates: VideoAccountDomCandidateWithGeometry[] = [];
  for (const frame of page.frames()) {
    const offset = await frameViewportOffset(page, frame);
    const frameCandidates = await extractFrameCandidates(frame, offset).catch(() => []);
    candidates.push(...frameCandidates);
  }
  await enrichCandidatesFromShareMenu(page, candidates);
  return selectVideoAccountAssistantPageRows(candidates, capturedAt);
}

function hasStableRef(candidate: VideoAccountDomCandidate) {
  const values = [...candidate.hrefs, ...candidate.dataValues, candidate.idAttr ?? ""].filter(Boolean);
  return values.some((value) => /export\/[A-Za-z0-9_-]{20,}|https?:\/\/weixin\.qq\.com\/sph\/[A-Za-z0-9_-]{6,}/.test(value));
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : [];
}

function textValue(item: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = item[key];
    if (value !== undefined && value !== null && String(value) !== "") return String(value);
  }
  return "";
}

function numberValue(item: Record<string, unknown>, ...keys: string[]) {
  const raw = textValue(item, ...keys).replaceAll(",", "");
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function hasValue(item: Record<string, unknown>, ...keys: string[]) {
  return keys.some((key) => item[key] !== undefined && item[key] !== null && String(item[key]) !== "");
}

function isoDateValue(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "number" || /^\d+$/.test(String(value))) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return undefined;
    return new Date((numeric > 1_000_000_000_000 ? numeric : numeric * 1000)).toISOString();
  }
  const parsed = new Date(String(value).trim().replace(" ", "T"));
  return Number.isNaN(parsed.valueOf()) ? undefined : parsed.toISOString();
}

function safeHash(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  return hash.toString(16).padStart(8, "0");
}

function titleFromVideoAccountPost(row: Record<string, unknown>) {
  const desc = asRecord(row.desc);
  const candidates = [desc.shortTitle, desc.title, desc.description, row.title, row.description];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim().slice(0, 140);
    const nested = asRecord(candidate);
    const nestedText = textValue(nested, "shortTitle", "title", "description", "desc", "content", "text");
    if (nestedText) return nestedText.slice(0, 140);
  }
  return "";
}

function rowsFromSanitizedPostListBodies(bodies: unknown[], capturedAt: string): VideoAccountBrowserVisibleRow[] {
  const rows: VideoAccountBrowserVisibleRow[] = [];
  const seen = new Set<string>();
  for (const body of bodies) {
    const list = asRecordArray(asRecord(asRecord(body).data).list);
    for (const item of list) {
      const nativeId = textValue(item, "objectId");
      if (!/^export\/[A-Za-z0-9_-]{20,}/.test(nativeId)) continue;
      const title = titleFromVideoAccountPost(item);
      const publishedAt = isoDateValue(item.createTime);
      const viewsPresent = hasValue(item, "readCount");
      const likesPresent = hasValue(item, "favCount");
      const commentsPresent = hasValue(item, "commentCount");
      const sharesPresent = hasValue(item, "forwardCount", "forwardAggregationCount");
      const missingFields = [
        !title ? "title" : undefined,
        !publishedAt ? "publishedAt" : undefined,
        !nativeId ? "stableIdOrLink" : undefined,
        !viewsPresent ? "views" : undefined,
        !likesPresent ? "likes" : undefined,
        !commentsPresent ? "comments" : undefined,
        !sharesPresent ? "shares" : undefined
      ].filter((field): field is string => Boolean(field));
      const id = `video-account-${safeHash(nativeId)}`;
      if (seen.has(id)) continue;
      seen.add(id);
      rows.push({
        id,
        nativeId,
        title: title || "视频号作品",
        publishedAt,
        capturedAt,
        views: numberValue(item, "readCount"),
        likes: numberValue(item, "favCount"),
        comments: numberValue(item, "commentCount"),
        saves: 0,
        shares: numberValue(item, "forwardCount") || numberValue(item, "forwardAggregationCount"),
        followersDelta: numberValue(item, "followCount"),
        extractionSource: "visible_dom",
        sourcePageKind: "creator_center_owned_works",
        confidence: "owned_creator_center_row",
        nativeIdConfidence: "stable_platform_id",
        canSave: missingFields.length === 0,
        missingFields,
        blockReasons: missingFields,
        warnings: [
          "video_account_sanitized_post_list_preview",
          "video_account_recommendation_not_mapped_to_saves",
          ...missingFields.length > 0 ? [`missing_fields:${missingFields.join(",")}`, "video_account_page_scan_blocked"] : []
        ]
      });
    }
  }
  return rows;
}

async function captureRowsFromPostListResponses(page: Page): Promise<VideoAccountBrowserVisibleRow[]> {
  const capturedAt = new Date().toISOString();
  const bodies: unknown[] = [];
  const listener = async (response: Awaited<ReturnType<Page["waitForResponse"]>>) => {
    const url = response.url();
    if (!/\/micro\/content\/cgi-bin\/mmfinderassistant-bin\/post\/post_list/.test(url)) return;
    const body = await response.json().catch(() => undefined);
    if (body) bodies.push(body);
  };
  page.on("response", listener);
  try {
    await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => undefined);
    await page.waitForTimeout(7000);
  } finally {
    page.off("response", listener);
  }
  return rowsFromSanitizedPostListBodies(bodies, capturedAt);
}

function sanitizedClipboardValue(value: string) {
  const exportMatch = value.match(/export\/[A-Za-z0-9_-]{20,}/);
  if (exportMatch) return exportMatch[0];
  const sphMatch = value.match(/https?:\/\/weixin\.qq\.com\/sph\/[A-Za-z0-9_-]{6,}/);
  if (!sphMatch) return "";
  try {
    const url = new URL(sphMatch[0]);
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return sphMatch[0].split("?")[0];
  }
}

async function copyMenuValue(page: Page, label: "复制视频ID" | "复制视频链接") {
  const item = page.getByText(label, { exact: true });
  if (!await item.isVisible().catch(() => false)) return "";
  await item.click({ timeout: 3000 }).catch(() => undefined);
  await page.waitForTimeout(250);
  const copied = await page.evaluate(() => navigator.clipboard.readText()).catch(() => "");
  return sanitizedClipboardValue(copied);
}

async function reopenShareMenu(page: Page, clickPoints: Array<{ x: number; y: number }>) {
  for (const point of clickPoints) {
    await page.mouse.move(point.x, point.y).catch(() => undefined);
    await page.waitForTimeout(120);
    await page.mouse.click(point.x, point.y).catch(() => undefined);
    await page.waitForTimeout(450);
    const hasMenu = await page.getByText("复制视频ID", { exact: true }).isVisible().catch(() => false)
      || await page.getByText("复制视频链接", { exact: true }).isVisible().catch(() => false);
    if (hasMenu) return true;
  }
  return false;
}

async function hoverCandidateRow(page: Page, candidate: VideoAccountDomCandidateWithGeometry) {
  for (const point of candidate.hoverPoints) {
    await page.mouse.move(point.x, point.y).catch(() => undefined);
    await page.waitForTimeout(250);
  }
}

async function clickVisibleShareControl(page: Page, candidate: VideoAccountDomCandidateWithGeometry) {
  await hoverCandidateRow(page, candidate);
  const explicit = page.getByTitle("分享").or(page.getByText("分享", { exact: true })).or(page.locator("[aria-label*='分享']")).first();
  if (await explicit.isVisible().catch(() => false)) {
    await explicit.hover().catch(() => undefined);
    await explicit.click({ timeout: 3000 }).catch(() => undefined);
    await page.waitForTimeout(450);
    return await page.getByText("复制视频ID", { exact: true }).isVisible().catch(() => false)
      || await page.getByText("复制视频链接", { exact: true }).isVisible().catch(() => false);
  }
  return reopenShareMenu(page, candidate.shareClickPoints);
}

async function enrichCandidatesFromShareMenu(page: Page, candidates: VideoAccountDomCandidateWithGeometry[]) {
  const targets = candidates
    .filter((candidate) => !hasStableRef(candidate) && candidate.shareClickPoints.length > 0 && /播放|曝光|浏览|观看|阅读|点赞|评论|分享|转发|推荐/.test(candidate.text))
    .slice(0, 10);
  if (targets.length === 0) return;
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"], { origin: "https://channels.weixin.qq.com" }).catch(() => undefined);
  for (const candidate of targets) {
    const openedForId = await clickVisibleShareControl(page, candidate);
    if (!openedForId) {
      candidate.dataValues.push("share_menu:not_opened");
      continue;
    }
    const copiedId = await copyMenuValue(page, "复制视频ID");
    if (copiedId) candidate.dataValues.push(copiedId);
    const openedForLink = await clickVisibleShareControl(page, candidate);
    if (openedForLink) {
      const copiedLink = await copyMenuValue(page, "复制视频链接");
      if (copiedLink) candidate.hrefs.push(copiedLink);
    }
    if (copiedId || candidate.hrefs.some((href) => /weixin\.qq\.com\/sph\//.test(href))) candidate.dataValues.push("share_menu:copied_stable_ref");
  }
}

async function extractVisiblePageWarnings(page: Page) {
  const frameDiagnostics = await Promise.all(page.frames().map(async (frame, index) => frame.evaluate((frameIndex) => {
    const clean = (value: string | null | undefined) => (value ?? "").replace(/\s+/g, " ").trim();
    const visible = (element: Element) => {
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
    };
    const rowSelector = "tr,[role='row'],article,li,[class*='table-row'],[class*='TableRow'],[class*='card'],[class*='item'],[class*='list-item'],[class*='ListItem']";
    const bodyText = clean(document.body?.textContent);
    const rows = Array.from(document.querySelectorAll(rowSelector)).filter(visible);
    const metricPattern = /(播放|曝光|浏览|观看|阅读|点赞|评论|收藏|分享|转发|推荐)/;
    const datePattern = /(20\d{2}[-/.年]\d{1,2}|(?:^|\D)\d{1,2}月\d{1,2}日)/;
    const unlabeledWorkLike = Array.from(document.querySelectorAll("div,section,[class]")).filter((element) => {
      if (!visible(element)) return false;
      const text = clean(element.textContent);
      const dateMatch = text.match(/20\d{2}[-/.年]\d{1,2}[-/.月]\d{1,2}(?:日)?(?:\s+\d{1,2}:\d{2})?/);
      const source = dateMatch ? text.slice((dateMatch.index ?? 0) + dateMatch[0].length) : text;
      const numberCount = Array.from(source.matchAll(/-?\d+(?:\.\d+)?\s*(?:万|亿|k|K)?/g)).length;
      return text.length >= 20 && text.length <= 900 && numberCount >= 5 && Boolean(dateMatch);
    });
    const stableAnchors = document.querySelectorAll("a[href*='weixin.qq.com/sph'],a[href*='export/']");
    const exportLikeAttributes = Array.from(document.querySelectorAll("[data-id],[data-object-id],[data-feed-id],[data-export-id],[id]"))
      .filter((element) => Array.from(element.attributes).some((attribute) => /export\//.test(attribute.value)));
    return {
      frameIndex,
      hasMetricWords: metricPattern.test(bodyText),
      hasPublishTime: datePattern.test(bodyText),
      rowCount: rows.length,
      sameRowMetricPublishTimeCount: rows.filter((row) => metricPattern.test(clean(row.textContent)) && datePattern.test(clean(row.textContent))).length,
      unlabeledWorkLikeCount: unlabeledWorkLike.length,
      stableRefCount: stableAnchors.length + exportLikeAttributes.length
    };
  }, index).catch(() => undefined)));
  const diagnostics = frameDiagnostics.filter((item): item is NonNullable<typeof item> => Boolean(item));
  const warnings: string[] = [];
  if (diagnostics.length === 0) return ["video_account_visible_page_hint_unavailable"];
  if (diagnostics.some((item) => item.hasMetricWords && item.rowCount > 0)) warnings.push("video_account_page_has_metric_words_without_work_rows");
  if (!diagnostics.some((item) => item.hasPublishTime)) warnings.push("video_account_no_visible_publish_time");
  if (!diagnostics.some((item) => item.stableRefCount > 0)) warnings.push("video_account_no_visible_stable_link_or_export_id");
  if (!diagnostics.some((item) => item.sameRowMetricPublishTimeCount > 0 || item.unlabeledWorkLikeCount > 0)) warnings.push("video_account_no_same_row_metric_publish_time");
  warnings.push(`video_account_frame_count:${diagnostics.length}`);
  warnings.push(`video_account_frames_with_publish_time:${diagnostics.filter((item) => item.hasPublishTime).length}`);
  warnings.push(`video_account_unlabeled_work_like_elements:${diagnostics.reduce((total, item) => total + item.unlabeledWorkLikeCount, 0)}`);
  warnings.push(`video_account_same_row_metric_publish_time_elements:${diagnostics.reduce((total, item) => total + item.sameRowMetricPublishTimeCount, 0)}`);
  return warnings;
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

    let rows = action === "save" ? session.lastRows : await extractVisibleRows(session.page);
    if (action !== "save" && rows.filter((row) => row.canSave).length === 0) {
      const postListRows = await captureRowsFromPostListResponses(session.page);
      if (postListRows.length > 0) rows = postListRows;
    }
    if (action !== "save") session.lastRows = rows;
    const summary = summarizeRows(rows);
    if (action === "capture_preview") {
      const pageWarnings = summary.saveCandidateCount > 0 ? [] : await extractVisiblePageWarnings(session.page);
      return Response.json(emptyResult(action, {
        ...base,
        ok: rows.length > 0,
        rows,
        ...summary,
        capturedAt: new Date().toISOString(),
        message: rows.length > 0
          ? `已从当前视频号助手页面识别 ${rows.length} 条候选；请先预览，可保存候选仍需你确认。`
          : "当前页面未识别到可靠作品行；请切到视频号助手作品/数据列表页，确认每行有标题、发布时间、观看/点赞/评论/分享和稳定链接后重试。",
        warnings: rows.length > 0 ? [...rows.flatMap((row) => row.warnings), ...pageWarnings] : ["no_visible_video_account_work_rows", ...pageWarnings]
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
