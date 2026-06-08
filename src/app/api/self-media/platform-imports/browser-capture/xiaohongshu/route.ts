import { existsSync } from "node:fs";
import { chromium, type BrowserContext, type Page } from "playwright-core";
import { authedBrowserProfileDir, markAuthedBrowserCaptureFailure, markAuthedBrowserProfileConfirmed, markAuthedBrowserProfileOpened, resolveAuthedBrowserTargetUrl } from "@/domain/self-media/providers";
import { hasTrustedCreatorCenterRowShape, selectXiaohongshuCreatorCenterDataAnalysisTableRows, selectXiaohongshuCreatorCenterDetailRow, selectXiaohongshuCreatorCenterRows, type CreatorCenterDomCandidate } from "@/domain/self-media/providers/creator-center-row-selector";
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

type XiaohongshuDataAnalysisCandidate = CreatorCenterDomCandidate & {
  clickTarget?: { x: number; y: number };
  clickTargets?: Array<{ x: number; y: number }>;
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

function xiaohongshuStableIdFromUrl(value: string) {
  return value.match(/(?:note\/|explore\/|discovery\.|note_id=|noteId=)([A-Za-z0-9_-]{6,})/i)?.[1];
}

async function freshXiaohongshuDataAnalysisClickTargets(page: Page, candidate: XiaohongshuDataAnalysisCandidate) {
  const title = candidate.titleAttr?.trim();
  if (!title) return [];
  await page.keyboard.press("Escape").catch(() => undefined);
  if (!page.url().startsWith("https://creator.xiaohongshu.com/statistics/data-analysis")) {
    await page.goto("https://creator.xiaohongshu.com/statistics/data-analysis", { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => undefined);
    await page.waitForTimeout(900).catch(() => undefined);
  }
  return page.evaluate((targetTitle) => {
    const rowSelector = "tr,[role='row'],[class*='table-row'],[class*='TableRow'],[class*='semi-table-row'],[class*='SemiTableRow'],[class*='grid-row'],[class*='GridRow']";
    const cellSelector = "td,th,[role='cell'],[role='gridcell'],[class*='table-cell'],[class*='TableCell'],[class*='semi-table-row-cell'],[class*='SemiTableRowCell'],[class*='grid-cell'],[class*='GridCell']";
    const dangerous = /(发布|删除|提交|审核|修改|编辑|授权|开通|支付|上传|私信|消息|充值|导出|下载|保存|确认|确定)/;
    function clean(value: string | null | undefined) {
      return (value ?? "").replace(/\s+/g, " ").trim();
    }
    function visible(element: Element) {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width >= 24
        && rect.height >= 12
        && rect.bottom > 0
        && rect.right > 0
        && rect.top < window.innerHeight
        && rect.left < window.innerWidth
        && style.visibility !== "hidden"
        && style.display !== "none"
        && style.pointerEvents !== "none";
    }
    function rowOwner(element: Element) {
      return element.closest(rowSelector);
    }
    function directCells(row: Element) {
      const queried = Array.from(row.querySelectorAll(cellSelector))
        .filter((cell) => rowOwner(cell) === row || !cell.parentElement?.closest(rowSelector));
      if (queried.length >= 2) return queried;
      return Array.from(row.children).filter((child) => clean(child.textContent));
    }
    function clickableCenters(cell: Element) {
      return Array.from(cell.querySelectorAll("a[href],button,[role='button'],[tabindex],span,div"))
        .filter((element) => visible(element))
        .map((element) => {
          const rect = element.getBoundingClientRect();
          const text = clean(`${element.getAttribute("aria-label") ?? ""} ${element.getAttribute("title") ?? ""} ${element.textContent ?? ""}`);
          const href = element.getAttribute("href") ?? "";
          const className = element.getAttribute("class") ?? "";
          const score = (/(详情|数据详情|查看|分析)/.test(text) ? 24 : 0)
            + (/(detail|analysis|analyse|data)/i.test(className) ? 8 : 0)
            + (/(note_id=|noteId=|\/note\/|detail|analysis|analyse|data)/i.test(href) ? 10 : 0)
            - (dangerous.test(`${text} ${href} ${className}`) ? 100 : 0)
            - (/(?:^https?:)?\/\/(?:www\.)?xiaohongshu\.com\/explore\//i.test(href) ? 60 : 0)
            - (text.length > 80 ? 12 : 0);
          return { x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2), score };
        })
        .filter((target) => target.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 4)
        .map(({ x, y }) => ({ x, y }));
    }
    function actionCenters(cells: Element[], titleCellIndex: number) {
      return cells.flatMap((cell, index) => {
        if (index === titleCellIndex) return [];
        const text = clean(cell.textContent);
        const looksAction = /详情|数据详情|查看|分析/.test(text) && !/(曝光|观看|浏览|阅读|播放|封面点击率|点赞|评论|收藏|涨粉|分享|导出|下载|删除|编辑|发布)/.test(text);
        const isTrailingShortCell = index >= cells.length - 2 && text.length > 0 && text.length <= 8 && !/\d/.test(text);
        if (!looksAction && !isTrailingShortCell) return [];
        const clickable = clickableCenters(cell);
        if (clickable.length > 0) return clickable;
        const rect = cell.getBoundingClientRect();
        return [{ x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2) }];
      }).slice(0, 4);
    }
    return Array.from(document.querySelectorAll(rowSelector))
      .filter(visible)
      .map((row) => {
        const cells = directCells(row);
        const cellTexts = cells.map((cell) => clean(cell.textContent));
        const titleCellIndex = Math.max(0, cellTexts.findIndex((text) => text.includes(targetTitle)));
        const rowText = clean(row.textContent);
        const metricWordCount = (rowText.match(/曝光|观看|浏览|阅读|播放|封面点击率|点赞|评论|收藏|涨粉|分享/g) ?? []).length;
        const numericCellCount = cellTexts.filter((text) => /^-?\d[\d,.]*(?:\.\d+)?\s*(?:万|亿|k|K|%)?$/.test(text) || /^[-—–]+$/.test(text)).length;
        const hasPublishDate = cellTexts.some((text) => /20\d{2}[-/.年]\d{1,2}[-/.月]\d{1,2}/.test(text));
        return {
          rowTextLength: rowText.length,
          nestedRows: row.querySelectorAll(rowSelector).length,
          matchesTitle: rowText.includes(targetTitle),
          metricWordCount,
          numericCellCount,
          hasPublishDate,
          targets: actionCenters(cells, titleCellIndex)
        };
      })
      .filter((item) => item.matchesTitle && (item.metricWordCount >= 2 || (item.hasPublishDate && item.numericCellCount >= 4)) && item.targets.length > 0 && item.nestedRows <= 2)
      .sort((a, b) => a.rowTextLength - b.rowTextLength)
      .at(0)?.targets ?? [];
  }, title).catch(() => []);
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

async function enrichXiaohongshuDataAnalysisCandidateIds(page: Page, candidates: XiaohongshuDataAnalysisCandidate[]) {
  const unresolved = candidates
    .filter((candidate) => !candidate.dataValues.some((value) => xiaohongshuStableIdFromUrl(value) || /[A-Za-z0-9_-]{12,}/.test(value))
      && !candidate.hrefs.some((href) => xiaohongshuStableIdFromUrl(href))
      && candidate.clickTarget)
    .slice(0, 12);
  for (const candidate of unresolved) {
    const targets = await freshXiaohongshuDataAnalysisClickTargets(page, candidate);
    if (targets.length === 0 || page.isClosed()) continue;
    for (const target of targets) {
      if (page.isClosed()) break;
      const beforeResourceUrls = await page.evaluate(() => performance.getEntriesByType("resource").map((entry) => entry.name).slice(-500)).catch(() => []);
      const popupPromise = page.context().waitForEvent("page", { timeout: 2500 }).catch(() => undefined);
      await page.mouse.click(target.x, target.y).catch(() => undefined);
      const popup = await popupPromise;
      const activePage = popup ?? page;
      await activePage.waitForLoadState("domcontentloaded", { timeout: 8000 }).catch(() => undefined);
      await activePage.waitForTimeout(1200).catch(() => undefined);
      const id = xiaohongshuStableIdFromUrl(activePage.url()) ?? await activePage.evaluate((beforeNames) => {
        const idPattern = /(?:note\/|explore\/|discovery\.|note_id=|noteId=)([A-Za-z0-9_-]{6,})/i;
        const before = new Set(beforeNames);
        const newResourceMatch = performance.getEntriesByType("resource")
          .map((entry) => entry.name)
          .filter((name) => !before.has(name))
          .map((name) => name.match(idPattern)?.[1])
          .find(Boolean);
        if (newResourceMatch) return newResourceMatch;
        function visible(element: Element) {
          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          return rect.width >= 80
            && rect.height >= 80
            && rect.bottom > 0
            && rect.right > 0
            && rect.top < window.innerHeight
            && rect.left < window.innerWidth
            && style.visibility !== "hidden"
            && style.display !== "none";
        }
        const roots = Array.from(document.querySelectorAll("[role='dialog'],[class*='drawer'],[class*='Drawer'],[class*='modal'],[class*='Modal'],[class*='detail'],[class*='Detail']"))
          .filter(visible)
          .slice(0, 4);
        const attrs = roots.flatMap((root) => Array.from(root.querySelectorAll("[href],[data-id],[data-note-id],[data-noteId],[id]")).slice(0, 120));
        for (const item of attrs) {
          for (const attribute of Array.from(item.attributes)) {
            if (!/href|id|note/i.test(attribute.name)) continue;
            const match = attribute.value.match(idPattern)?.[1];
            if (match) return match;
          }
        }
        return undefined;
      }, beforeResourceUrls).catch(() => undefined);
      if (id) candidate.dataValues.push(id);
      if (popup && !popup.isClosed()) {
        await popup.close().catch(() => undefined);
        await page.bringToFront().catch(() => undefined);
      } else if (!page.isClosed() && !isCreatorUrl(page.url())) {
        await page.goBack({ waitUntil: "domcontentloaded", timeout: 8000 }).catch(() => undefined);
        if (!isCreatorUrl(page.url())) await page.goto("https://creator.xiaohongshu.com/statistics/data-analysis", { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => undefined);
        await page.waitForTimeout(900).catch(() => undefined);
      }
      if (id) break;
    }
  }
}

async function extractContentAnalysisTableRows(page: Page): Promise<XiaohongshuBrowserVisibleRow[]> {
  const capturedAt = new Date().toISOString();
  await prepareXiaohongshuContentAnalysisPage(page);
  await clickVisibleCreatorNavText(page, "笔记数据");

  let candidates: XiaohongshuDataAnalysisCandidate[] = [];
  const accumulatedCandidates: XiaohongshuDataAnalysisCandidate[] = [];
  const seenCandidateKeys = new Set<string>();
  for (let attempt = 0; attempt < 6; attempt += 1) {
    candidates = await page.evaluate(() => {
      if (!window.location.hostname.endsWith("creator.xiaohongshu.com") || window.location.pathname !== "/statistics/data-analysis") return [];

      const rowSelector = "tr,[role='row'],[class*='table-row'],[class*='TableRow'],[class*='semi-table-row'],[class*='SemiTableRow'],[class*='grid-row'],[class*='GridRow']";
      const cellSelector = "td,th,[role='cell'],[role='gridcell'],[class*='table-cell'],[class*='TableCell'],[class*='semi-table-row-cell'],[class*='SemiTableRowCell'],[class*='grid-cell'],[class*='GridCell']";
      const tableSelector = "table,[role='table'],[role='grid'],[role='treegrid'],[class*='table'],[class*='Table'],[class*='grid'],[class*='Grid']";
      const idPattern = /(?:note\/|explore\/|discovery\.|note_id=|noteId=)([A-Za-z0-9_-]{6,})/i;
      const metricColumns = ["exposures", "views", "coverClickRate", "likes", "comments", "saves", "followersDelta", "shares"] as const;
      type MetricKey = typeof metricColumns[number];

      function clean(value: string | null | undefined) {
        return (value ?? "").replace(/\s+/g, " ").trim();
      }
      function visible(element: Element) {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return rect.width >= 24
          && rect.height >= 12
          && rect.bottom > 0
          && rect.right > 0
          && rect.top < window.innerHeight
          && rect.left < window.innerWidth
          && style.visibility !== "hidden"
          && style.display !== "none";
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
      function rowOwner(element: Element) {
        return element.closest(rowSelector);
      }
      function directCells(row: Element) {
        const queried = Array.from(row.querySelectorAll(cellSelector))
          .filter((cell) => rowOwner(cell) === row || !cell.parentElement?.closest(rowSelector));
        if (queried.length >= 2) return queried;
        return Array.from(row.children).filter((child) => clean(child.textContent));
      }
      function tableRoot(row: Element) {
        return row.closest(tableSelector) ?? document.body;
      }
      function headerTexts(row: Element, cellCount: number) {
        const root = tableRoot(row);
        function hasHeaderCoverage(values: string[]) {
          return values.filter((value) => /笔记基础信息|曝光|观看|封面点击率|点赞|评论|收藏|涨粉|分享/.test(value)).length >= 3;
        }
        const explicit = Array.from(root.querySelectorAll("th,[role='columnheader'],[class*='header'] [class*='cell'],[class*='Header'] [class*='Cell'],[class*='semi-table-row-head'] [class*='semi-table-row-cell']"))
          .map((cell) => clean(cell.textContent))
          .filter(Boolean);
        if (explicit.length >= Math.min(4, cellCount) && hasHeaderCoverage(explicit)) return explicit.slice(0, cellCount);
        const firstRow = Array.from(root.querySelectorAll(rowSelector))
          .map((item) => directCells(item).map((cell) => clean(cell.textContent)).filter(Boolean))
          .find((cells) => hasHeaderCoverage(cells));
        if (firstRow && firstRow.length >= Math.min(4, cellCount)) return firstRow.slice(0, cellCount);
        return [];
      }
      function metricKeyFromHeader(header: string, fallbackIndex: number): MetricKey | undefined {
        if (/曝光/.test(header)) return "exposures";
        if (/观看|浏览|阅读|播放/.test(header)) return "views";
        if (/封面.*点击率|点击率/.test(header)) return "coverClickRate";
        if (/点赞/.test(header)) return "likes";
        if (/评论/.test(header)) return "comments";
        if (/收藏/.test(header)) return "saves";
        if (/涨粉|粉丝/.test(header)) return "followersDelta";
        if (/分享/.test(header)) return "shares";
        return metricColumns[fallbackIndex];
      }
      function isMissingMetricCell(value: string) {
        return /^[-—–]+$/.test(clean(value));
      }
      function isDateLike(value: string) {
        return /20\d{2}[-/.年]\d{1,2}[-/.月]\d{1,2}/.test(value);
      }
      function numberFrom(value: string) {
        const source = clean(value).replace(/,/g, "");
        const match = source.match(/(-?\d+(?:\.\d+)?)\s*(万|亿|k|K|%)?/);
        if (!match) return undefined;
        const base = Number(match[1]);
        if (!Number.isFinite(base)) return undefined;
        const unit = match[2];
        if (unit === "亿") return Math.round(base * 100000000);
        if (unit === "万") return Math.round(base * 10000);
        if (unit === "k" || unit === "K") return Math.round(base * 1000);
        return Math.round(base * 100) / 100;
      }
      function metricCellValue(value: string, key: MetricKey) {
        const text = clean(value);
        if (!text || isMissingMetricCell(text) || isDateLike(text)) return undefined;
        const numbers = text.match(/-?\d[\d,.]*(?:\.\d+)?\s*(?:万|亿|k|K|%)?/g) ?? [];
        if (numbers.length !== 1) return undefined;
        if (key !== "coverClickRate" && /%/.test(numbers[0])) return undefined;
        return numberFrom(numbers[0]);
      }
      function publishedAtOf(value: string) {
        const match = value.match(/(20\d{2}[-/.年]\d{1,2}[-/.月]\d{1,2}(?:日)?(?:\s+\d{1,2}:\d{2})?)/);
        return match ? match[1] : "";
      }
      function titleFromInfoCell(cell: Element, text: string) {
        const linked = Array.from(cell.querySelectorAll("a,[title],h1,h2,h3,h4,span,div"))
          .map((item) => clean(item.getAttribute("title")) || clean(item.textContent))
          .filter((line) => line.length >= 4 && line.length <= 140);
        const split = clean(text).split(/\n|\r| {2,}|·|\|/).map(clean).filter(Boolean);
        function stripPublishTime(value: string) {
          return clean(value)
            .replace(/\s*发布于?\s*20\d{2}[-/.年]\d{1,2}[-/.月]\d{1,2}(?:日)?(?:\s+\d{1,2}:\d{2})?.*$/, "")
            .replace(/\s*20\d{2}[-/.年]\d{1,2}[-/.月]\d{1,2}(?:日)?(?:\s+\d{1,2}:\d{2})?.*$/, "");
        }
        const candidates = [...linked, ...split]
          .flatMap((line) => {
            const stripped = stripPublishTime(line);
            return stripped && stripped !== line ? [stripped, line] : [line];
          });
        function badTitleCandidate(line: string) {
          if (/20\d{2}[-/.年]|数据|详情|编辑|删除|发布|已发布|审核|^-?\d/.test(line)) return true;
          if (/^(曝光|观看|浏览|阅读|播放|封面点击率|点赞|评论|收藏|涨粉|分享)$/.test(line)) return true;
          if (/^(曝光|观看|浏览|阅读|播放|封面点击率|点赞|评论|收藏|涨粉|分享)\s*[:：]?\s*-?\d/.test(line)) return true;
          return false;
        }
        return candidates
          .find((line) => !badTitleCandidate(line))
          ?.slice(0, 140) ?? "";
      }
      function clickableCenters(cell: Element) {
        return Array.from(cell.querySelectorAll("a[href],button,[role='button'],[tabindex],img,[class*='cover'],[class*='Cover'],[class*='title'],[class*='Title'],span,div"))
          .filter((element) => visible(element))
          .map((element) => {
            const rect = element.getBoundingClientRect();
            const className = clean(element.getAttribute("class"));
            const tagName = element.tagName.toLowerCase();
            const score = (tagName === "a" ? 20 : 0)
              + (tagName === "img" ? 16 : 0)
              + (/cover|thumb|image|title|name/i.test(className) ? 12 : 0)
              + (/button/.test(element.getAttribute("role") ?? "") ? 8 : 0)
              - (/(删除|编辑|发布|导出|下载|更多)/.test(clean(element.textContent)) ? 100 : 0)
              - (rect.width < 10 || rect.height < 10 ? 20 : 0);
            return { x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2), score };
          })
          .filter((target) => target.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)
          .map(({ x, y }) => ({ x, y }));
      }
      function actionCenters(cells: Element[], titleCellIndex: number) {
        return cells.flatMap((cell, index) => {
          if (index === titleCellIndex) return [];
          const text = clean(cell.textContent);
          const looksAction = /详情|数据详情|查看|分析/.test(text) && !/(曝光|观看|浏览|阅读|播放|封面点击率|点赞|评论|收藏|涨粉|分享|导出|下载|删除|编辑|发布)/.test(text);
          const isTrailingShortCell = index >= cells.length - 2 && text.length > 0 && text.length <= 8 && !/\d/.test(text);
          if (!looksAction && !isTrailingShortCell) return [];
          const clickable = clickableCenters(cell);
          if (clickable.length > 0) return clickable;
          const rect = cell.getBoundingClientRect();
          return [{ x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2) }];
        }).slice(0, 4);
      }

      const pageTableContext = /笔记数据|笔记基础信息|曝光|观看|封面点击率|点赞|评论|收藏|涨粉|分享/.test(clean(document.body.textContent).slice(0, 12000));
      const rows = Array.from(document.querySelectorAll(rowSelector)).filter(visible);
      const candidates = rows.map((row) => {
        const cells = directCells(row);
        const cellTexts = cells.map((cell) => clean(cell.textContent));
        const rowText = clean(row.textContent);
        const headers = headerTexts(row, cells.length);
        const infoIndex = headers.findIndex((header) => /笔记基础信息|笔记信息|作品信息|标题/.test(header));
        const titleCellIndex = infoIndex >= 0 ? infoIndex : 0;
        const infoCell = cells[titleCellIndex] ?? cells[0] ?? row;
        const infoText = clean(infoCell.textContent);
        const title = titleFromInfoCell(infoCell, infoText || rowText);
        const publishedAt = publishedAtOf(infoText) || publishedAtOf(rowText);
        const metricValues: Record<string, number> = {};
        const missingMetricColumns: string[] = [];
        const columnNames: string[] = [];
        let sequentialMetricIndex = 0;
        for (let index = 0; index < cells.length; index += 1) {
          if (index === titleCellIndex) continue;
          const header = headers[index] ?? "";
          const key = metricKeyFromHeader(header, sequentialMetricIndex);
          if (!key) continue;
          sequentialMetricIndex += 1;
          columnNames.push(header || key);
          const value = metricCellValue(cellTexts[index] ?? "", key);
          if (value === undefined) {
            if (isMissingMetricCell(cellTexts[index] ?? "")) missingMetricColumns.push(key);
            continue;
          }
          metricValues[key] = value;
        }
        const anchors = Array.from(row.querySelectorAll("a[href*='xiaohongshu.com'],a[href*='note'],a[href*='note_id'],a[href*='noteId'],a[href*='explore']"));
        const hrefs = anchors.map((anchor) => sanitizedUrl(anchor.getAttribute("href") ?? "")).filter(Boolean);
        const scoped = [row, ...Array.from(row.querySelectorAll("[data-id],[data-note-id],[id]")).slice(0, 80)];
        const dataValues = scoped.flatMap((item) => Array.from(item.attributes)
          .filter((attribute) => /(^data-(?:note-)?id$|^id$|note)/i.test(attribute.name))
          .map((attribute) => clean(attribute.value)));
        dataValues.push(...anchors.map((anchor) => anchor.getAttribute("href")?.match(idPattern)?.[1] ?? "").filter(Boolean));
        const metricCount = Object.keys(metricValues).length;
        const headerText = headers.join(" ");
        const looksLikeNoteTable = pageTableContext || /笔记数据|笔记基础信息|曝光|观看|封面点击率|点赞|评论|收藏|涨粉|分享/.test(`${headerText} ${rowText}`);
        if (!looksLikeNoteTable || metricCount < 2 || !title) return undefined;
        const targetRect = infoCell.getBoundingClientRect();
        const childClickTargets = clickableCenters(infoCell);
        const actionClickTargets = actionCenters(cells, titleCellIndex);
        return {
          text: rowText,
          tagName: row.tagName.toLowerCase(),
          role: row.getAttribute("role") ?? undefined,
          className: clean(row.getAttribute("class")),
          idAttr: clean(row.getAttribute("id")),
          titleAttr: title,
          publishedAtAttr: publishedAt,
          hrefs,
          dataValues,
          cells: cellTexts,
          childCandidateCount: 0,
          sourceHint: "xiaohongshu_data_analysis_table",
          metricValues,
          missingMetricColumns,
          columnNames,
          clickTarget: {
            x: Math.round(targetRect.left + Math.min(targetRect.width * 0.45, 220)),
            y: Math.round(targetRect.top + targetRect.height / 2)
          },
          clickTargets: [
            ...actionClickTargets,
            ...childClickTargets,
            { x: Math.round(targetRect.left + Math.min(44, targetRect.width * 0.18)), y: Math.round(targetRect.top + targetRect.height / 2) },
            { x: Math.round(targetRect.left + Math.min(132, targetRect.width * 0.38)), y: Math.round(targetRect.top + targetRect.height / 2) },
            { x: Math.round(targetRect.left + Math.min(260, targetRect.width * 0.68)), y: Math.round(targetRect.top + targetRect.height / 2) }
          ]
        };
      }).filter(Boolean);
      return candidates;
    }).catch(() => []) as XiaohongshuDataAnalysisCandidate[];
    await enrichXiaohongshuDataAnalysisCandidateIds(page, candidates);
    for (const candidate of candidates) {
      const key = [
        candidate.titleAttr,
        candidate.publishedAtAttr,
        candidate.dataValues.join(","),
        candidate.hrefs.join(","),
        JSON.stringify(candidate.metricValues ?? {})
      ].map((value) => String(value ?? "")).join("|");
      if (seenCandidateKeys.has(key)) continue;
      seenCandidateKeys.add(key);
      accumulatedCandidates.push(candidate);
    }
    await scrollXiaohongshuAnalysisSurface(page);
    await page.waitForTimeout(900).catch(() => undefined);
  }

  return selectXiaohongshuCreatorCenterDataAnalysisTableRows(accumulatedCandidates.length > 0 ? accumulatedCandidates : candidates, capturedAt);
}

async function diagnoseXiaohongshuDataAnalysisTable(page: Page) {
  await prepareXiaohongshuContentAnalysisPage(page);
  await clickVisibleCreatorNavText(page, "笔记数据");
  return page.evaluate(() => {
    const idPattern = /(?:note\/|explore\/|discovery\.|note_id=|noteId=)([A-Za-z0-9_-]{6,})/i;
    const rowSelector = "tr,[role='row'],[class*='table-row'],[class*='TableRow'],[class*='semi-table-row'],[class*='SemiTableRow'],[class*='grid-row'],[class*='GridRow']";
    const cellSelector = "td,th,[role='cell'],[role='gridcell'],[class*='table-cell'],[class*='TableCell'],[class*='semi-table-row-cell'],[class*='SemiTableRowCell'],[class*='grid-cell'],[class*='GridCell']";
    function clean(value: string | null | undefined) {
      return (value ?? "").replace(/\s+/g, " ").trim();
    }
    function visible(element: Element) {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width >= 24
        && rect.height >= 12
        && rect.bottom > 0
        && rect.right > 0
        && rect.top < window.innerHeight
        && rect.left < window.innerWidth
        && style.visibility !== "hidden"
        && style.display !== "none";
    }
    function pathOnly(value: string) {
      try {
        const url = new URL(value, window.location.href);
        return `${url.hostname}${url.pathname}`;
      } catch {
        return value.split("?")[0].slice(0, 120);
      }
    }
    function rowOwner(element: Element) {
      return element.closest(rowSelector);
    }
    function directCells(row: Element) {
      const queried = Array.from(row.querySelectorAll(cellSelector))
        .filter((cell) => rowOwner(cell) === row || !cell.parentElement?.closest(rowSelector));
      if (queried.length >= 2) return queried;
      return Array.from(row.children).filter((child) => clean(child.textContent));
    }
    const rows = Array.from(document.querySelectorAll(rowSelector)).filter(visible).slice(0, 8);
    return {
      pagePath: `${window.location.hostname}${window.location.pathname}`,
      bodyHasTableContext: /笔记数据|笔记基础信息|曝光|观看|封面点击率|点赞|评论|收藏|涨粉|分享/.test(clean(document.body.textContent).slice(0, 12000)),
      rowCount: rows.length,
      rows: rows.map((row) => {
        const rect = row.getBoundingClientRect();
        const cells = directCells(row);
        const anchors = Array.from(row.querySelectorAll("a[href]"));
        const buttons = Array.from(row.querySelectorAll("button,[role='button'],[tabindex],a[href],img,[class*='cover'],[class*='Cover'],[class*='title'],[class*='Title']"));
        const attrs = Array.from(row.attributes).map((attribute) => attribute.name).filter((name) => /id|note|data|href|url|key/i.test(name)).slice(0, 20);
        const scopedAttrs = Array.from(row.querySelectorAll("[data-id],[data-note-id],[data-row-key],[data-key],[id],[href]"))
          .slice(0, 40)
          .flatMap((item) => Array.from(item.attributes)
            .filter((attribute) => /id|note|data|href|url|key/i.test(attribute.name))
            .map((attribute) => ({
              name: attribute.name,
              valueKind: idPattern.test(attribute.value) ? "stable_id_match" : /[A-Za-z0-9_-]{12,}/.test(attribute.value) ? "opaque_long_value" : "short_or_generic",
              path: attribute.name === "href" ? pathOnly(attribute.value) : undefined
            })));
        return {
          cellCount: cells.length,
          cellShape: cells.map((cell) => {
            const text = clean(cell.textContent);
            return {
              chars: text.length,
              hasDate: /20\d{2}[-/.年]\d{1,2}[-/.月]\d{1,2}/.test(text),
              numericCount: (text.match(/-?\d[\d,.]*(?:\.\d+)?\s*(?:万|亿|k|K|%)?/g) ?? []).length,
              hasMetricWord: /曝光|观看|浏览|阅读|播放|封面点击率|点赞|评论|收藏|涨粉|分享/.test(text)
            };
          }),
          rowClassHints: clean(row.getAttribute("class")).split(/\s+/).filter((item) => /row|table|grid|note|work|item|card/i.test(item)).slice(0, 10),
          rowAttrNames: attrs,
          rowBounds: { x: Math.round(rect.left), y: Math.round(rect.top), width: Math.round(rect.width), height: Math.round(rect.height) },
          anchorCount: anchors.length,
          anchorPaths: anchors.map((anchor) => pathOnly(anchor.getAttribute("href") ?? "")).slice(0, 8),
          anchorIdMatchCount: anchors.filter((anchor) => idPattern.test(anchor.getAttribute("href") ?? "")).length,
          clickableCount: buttons.length,
          clickableKinds: buttons.slice(0, 12).map((item) => ({
            tag: item.tagName.toLowerCase(),
            role: item.getAttribute("role") ?? "",
            attrNames: Array.from(item.attributes).map((attribute) => attribute.name).filter((name) => /id|note|data|href|url|key|aria|title/i.test(name)).slice(0, 12),
            hrefPath: item instanceof HTMLAnchorElement ? pathOnly(item.getAttribute("href") ?? "") : undefined,
            hasStableIdInAttrs: Array.from(item.attributes).some((attribute) => idPattern.test(attribute.value))
          })),
          scopedAttrKinds: scopedAttrs.slice(0, 20)
        };
      })
    };
  }).catch((error) => ({
    pagePath: safePageUrl(page.url()),
    bodyHasTableContext: false,
    rowCount: 0,
    rows: [],
    error: error instanceof Error ? error.message : "diagnose_failed"
  }));
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
    const isNoteManager = /\/new\/note-manager\/?$/.test(window.location.pathname);
    if (!isNoteManager && !/(detail|analysis|analyse|note|data|note_id=|noteId=|explore\/)/i.test(window.location.href)) return undefined;

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

    function visible(element: Element) {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width >= 80
        && rect.height >= 80
        && rect.bottom > 0
        && rect.right > 0
        && rect.top < window.innerHeight
        && rect.left < window.innerWidth
        && style.visibility !== "hidden"
        && style.display !== "none";
    }

    const currentUrl = window.location.href;
    const idPattern = /(?:note\/|explore\/|discovery\.|note_id=|noteId=)([A-Za-z0-9_-]{6,})/i;
    const root: ParentNode = isNoteManager
      ? (Array.from(document.querySelectorAll("[role='dialog'],[class*='drawer'],[class*='Drawer'],[class*='modal'],[class*='Modal'],[class*='detail'],[class*='Detail']"))
        .filter(visible)
        .find((element) => {
          const scopedText = clean(element.textContent);
          const scopedLinks = Array.from(element.querySelectorAll("a[href*='xiaohongshu.com'],a[href*='note'],a[href*='note_id'],a[href*='noteId'],a[href*='explore']"));
          const scopedAttrs = Array.from(element.querySelectorAll("[data-id],[data-note-id],[id]")).slice(0, 80);
          return idPattern.test(scopedText)
            || scopedLinks.some((anchor) => idPattern.test(anchor.getAttribute("href") ?? ""))
            || scopedAttrs.some((item) => Array.from(item.attributes).some((attribute) => /(^data-(?:note-)?id$|^id$|note)/i.test(attribute.name) && idPattern.test(attribute.value)));
        }) ?? document)
      : document;
    if (isNoteManager && root === document) return undefined;

    const dataValues = [currentUrl.match(idPattern)?.[1] ?? ""].filter(Boolean);
    const anchors = Array.from(root.querySelectorAll("a[href*='xiaohongshu.com'],a[href*='note'],a[href*='note_id'],a[href*='noteId'],a[href*='explore']"));
    dataValues.push(...anchors.map((anchor) => anchor.getAttribute("href")?.match(idPattern)?.[1] ?? "").filter(Boolean));
    const scoped = Array.from(root.querySelectorAll("[data-id],[data-note-id],[id]")).slice(0, 120);
    dataValues.push(...scoped.flatMap((item) => Array.from(item.attributes)
      .filter((attribute) => /(^data-(?:note-)?id$|^id$|note)/i.test(attribute.name))
      .map((attribute) => clean(attribute.value))));
    const titleCandidates = Array.from(root.querySelectorAll("h1,h2,h3,[class*='title'],[class*='Title'],[data-testid*='title'],[class*='note-name'],[class*='NoteName']"))
      .filter((element) => !element.closest("nav,header,aside,[role='navigation'],[class*='side'],[class*='Side'],[class*='menu'],[class*='Menu']"))
      .map((element) => clean(element.getAttribute("title")) || clean(element.textContent))
      .filter((text) => text.length >= 4 && text.length <= 140 && !/(浏览|阅读|观看|播放|点赞|评论|收藏|分享|曝光|互动|数据详情|笔记数据)/.test(text))
      .slice(0, 12);
    const compactMetricCells = Array.from(root.querySelectorAll("section,article,div,li,span,p,td,[role='cell'],[class*='label'],[class*='Label'],[class*='value'],[class*='Value'],[class*='count'],[class*='Count'],[class*='num'],[class*='Num']"))
      .map((element) => clean(element.textContent))
      .filter((text) => text.length >= 1 && text.length <= 60 && (/(浏览|阅读|观看|播放|点赞|评论|收藏|分享|曝光|互动)/.test(text) || /^-?\d[\d,.]*(?:\.\d+)?\s*(?:万|亿|k|K)?$/.test(text)))
      .slice(0, 160);
    const metricCandidates = Array.from(root.querySelectorAll("section,article,div,li,span,p,td,[role='cell'],[class*='metric'],[class*='Metric'],[class*='data'],[class*='Data']"))
      .map((element) => clean(element.textContent))
      .filter((text) => text.length >= 2 && text.length <= 180 && /\d/.test(text) && /(浏览|阅读|观看|播放|点赞|评论|收藏|分享|曝光|互动)/.test(text))
      .slice(0, 80);
    const hrefs = [sanitizedUrl(currentUrl), ...anchors.map((anchor) => sanitizedUrl(anchor.getAttribute("href") ?? "")).filter(Boolean)];
    const cells = [...titleCandidates, ...compactMetricCells, ...metricCandidates];
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

async function diagnoseCurrentDetailPage(page: Page) {
  return page.evaluate(() => {
    const currentUrl = window.location.href;
    const creatorHost = window.location.hostname.endsWith("creator.xiaohongshu.com");
    const idPattern = /(?:note\/|explore\/|discovery\.|note_id=|noteId=)([A-Za-z0-9_-]{6,})/i;
    function clean(value: string | null | undefined) {
      return (value ?? "").replace(/\s+/g, " ").trim();
    }
    function visible(element: Element) {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width >= 80
        && rect.height >= 80
        && rect.bottom > 0
        && rect.right > 0
        && rect.top < window.innerHeight
        && rect.left < window.innerWidth
        && style.visibility !== "hidden"
        && style.display !== "none";
    }
    const roots = Array.from(document.querySelectorAll("[role='dialog'],[class*='drawer'],[class*='Drawer'],[class*='modal'],[class*='Modal'],[class*='detail'],[class*='Detail']"))
      .filter(visible);
    const rootsWithStableId = roots.filter((element) => {
      const scopedText = clean(element.textContent);
      const scopedLinks = Array.from(element.querySelectorAll("a[href*='xiaohongshu.com'],a[href*='note'],a[href*='note_id'],a[href*='noteId'],a[href*='explore']"));
      const scopedAttrs = Array.from(element.querySelectorAll("[data-id],[data-note-id],[id]")).slice(0, 80);
      return idPattern.test(scopedText)
        || scopedLinks.some((anchor) => idPattern.test(anchor.getAttribute("href") ?? ""))
        || scopedAttrs.some((item) => Array.from(item.attributes).some((attribute) => /(^data-(?:note-)?id$|^id$|note)/i.test(attribute.name) && idPattern.test(attribute.value)));
    });
    const root = rootsWithStableId[0] ?? document;
    const titleCandidateCount = Array.from(root.querySelectorAll("h1,h2,h3,[class*='title'],[class*='Title'],[data-testid*='title'],[class*='note-name'],[class*='NoteName']"))
      .filter((element) => !element.closest("nav,header,aside,[role='navigation'],[class*='side'],[class*='Side'],[class*='menu'],[class*='Menu']"))
      .map((element) => clean(element.getAttribute("title")) || clean(element.textContent))
      .filter((text) => text.length >= 4 && text.length <= 140 && !/(浏览|阅读|观看|播放|点赞|评论|收藏|分享|曝光|互动|数据详情|笔记数据)/.test(text))
      .length;
    const compactMetricCellCount = Array.from(root.querySelectorAll("section,article,div,li,span,p,td,[role='cell'],[class*='label'],[class*='Label'],[class*='value'],[class*='Value'],[class*='count'],[class*='Count'],[class*='num'],[class*='Num']"))
      .map((element) => clean(element.textContent))
      .filter((text) => text.length >= 1 && text.length <= 60 && (/(浏览|阅读|观看|播放|点赞|评论|收藏|分享|曝光|互动)/.test(text) || /^-?\d[\d,.]*(?:\.\d+)?\s*(?:万|亿|k|K)?$/.test(text)))
      .length;
    const labeledMetricBlockCount = Array.from(root.querySelectorAll("section,article,div,li,span,p,td,[role='cell'],[class*='metric'],[class*='Metric'],[class*='data'],[class*='Data']"))
      .map((element) => clean(element.textContent))
      .filter((text) => text.length >= 2 && text.length <= 180 && /\d/.test(text) && /(浏览|阅读|观看|播放|点赞|评论|收藏|分享|曝光|互动)/.test(text))
      .length;
    const urlLooksDetail = creatorHost
      && !/\/new\/note-manager\/?$/.test(window.location.pathname)
      && /(detail|analysis|analyse|note|data|note_id=|noteId=|explore\/)/i.test(currentUrl);
    return {
      urlLooksDetail,
      urlStableIdFound: idPattern.test(currentUrl),
      samePageDetailRootCount: roots.length,
      samePageStableIdRootCount: rootsWithStableId.length,
      titleCandidateCount,
      compactMetricCellCount,
      labeledMetricBlockCount
    };
  }).catch(() => ({
    urlLooksDetail: false,
    urlStableIdFound: false,
    samePageDetailRootCount: 0,
    samePageStableIdRootCount: 0,
    titleCandidateCount: 0,
    compactMetricCellCount: 0,
    labeledMetricBlockCount: 0
  }));
}

type XiaohongshuDetailClickTarget = {
  x: number;
  y: number;
  kind: "action" | "title" | "cover" | "row";
  score: number;
};

async function evaluateCurrentDetailState(page: Page) {
  return page.evaluate(() => {
    const currentUrl = window.location.href;
    const creatorHost = window.location.hostname.endsWith("creator.xiaohongshu.com");
    const idPattern = /(?:note\/|explore\/|discovery\.|note_id=|noteId=)([A-Za-z0-9_-]{6,})/i;
    function clean(value: string | null | undefined) {
      return (value ?? "").replace(/\s+/g, " ").trim();
    }
    function visible(element: Element) {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width >= 80
        && rect.height >= 80
        && rect.bottom > 0
        && rect.right > 0
        && rect.top < window.innerHeight
        && rect.left < window.innerWidth
        && style.visibility !== "hidden"
        && style.display !== "none";
    }
    const urlLooksDetail = creatorHost
      && !/\/new\/note-manager\/?$/.test(window.location.pathname)
      && /(detail|analysis|analyse|note|data|note_id=|noteId=|explore\/)/i.test(currentUrl);
    const rootsWithStableId = Array.from(document.querySelectorAll("[role='dialog'],[class*='drawer'],[class*='Drawer'],[class*='modal'],[class*='Modal'],[class*='detail'],[class*='Detail']"))
      .filter(visible)
      .filter((element) => {
        const scopedText = clean(element.textContent);
        const scopedLinks = Array.from(element.querySelectorAll("a[href*='xiaohongshu.com'],a[href*='note'],a[href*='note_id'],a[href*='noteId'],a[href*='explore']"));
        const scopedAttrs = Array.from(element.querySelectorAll("[data-id],[data-note-id],[id]")).slice(0, 80);
        return idPattern.test(scopedText)
          || scopedLinks.some((anchor) => idPattern.test(anchor.getAttribute("href") ?? ""))
          || scopedAttrs.some((item) => Array.from(item.attributes).some((attribute) => /(^data-(?:note-)?id$|^id$|note)/i.test(attribute.name) && idPattern.test(attribute.value)));
      });
    return {
      urlLooksDetail,
      stableUrlId: creatorHost && idPattern.test(currentUrl),
      stableRootCount: rootsWithStableId.length
    };
  }).catch(() => ({ urlLooksDetail: false, stableUrlId: false, stableRootCount: 0 }));
}

function hasEnteredXiaohongshuDetail(detailState: Awaited<ReturnType<typeof evaluateCurrentDetailState>>) {
  return (detailState.urlLooksDetail && detailState.stableUrlId) || detailState.stableRootCount > 0;
}

async function collectVisibleDetailClickTargets(page: Page): Promise<XiaohongshuDetailClickTarget[]> {
  return page.evaluate(() => {
    if (!window.location.hostname.endsWith("creator.xiaohongshu.com")) return undefined;

    const positive = /(笔记数据|作品数据|笔记分析|数据详情|数据表现|详情|查看数据|查看详情|分析)/;
    const stableHref = /(note_id=|noteId=|\/note\/|detail|analysis|analyse|data)/i;
    const positiveClass = /(detail|analysis|analyse|data|metric|stats|insight)/i;
    const publicNoteHref = /(?:^https?:)?\/\/(?:www\.)?xiaohongshu\.com\/explore\//i;
    const dangerous = /(发布|删除|提交|审核|修改|编辑|授权|开通|支付|上传|私信|消息|充值|导出|下载|复制|关闭|取消|保存|确认|确定)/;
    const selector = "a[href],button,[role='button'],[tabindex]";
    const rowSelector = "tr,[role='row'],article,li,[class*='table-row'],[class*='TableRow'],[class*='note'],[class*='Note'],[class*='card'],[class*='item']";
    const titleSelector = "[class*='title'],[class*='Title'],[class*='name'],[class*='Name'],[data-testid*='title'],h1,h2,h3,h4";
    const coverSelector = "img,[class*='cover'],[class*='Cover'],[class*='thumb'],[class*='Thumb']";

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
        && style.display !== "none"
        && style.pointerEvents !== "none";
    }

    function isSafeElement(element: Element) {
      const text = clean(`${element.getAttribute("aria-label") ?? ""} ${element.getAttribute("title") ?? ""} ${element.textContent ?? ""}`);
      const href = element.getAttribute("href") ?? "";
      const className = element.getAttribute("class") ?? "";
      return visible(element)
        && !dangerous.test(`${text} ${href} ${className}`)
        && !element.closest("[aria-label*='发布'],[aria-label*='删除'],[aria-label*='上传'],[aria-label*='支付']");
    }

    function targetForElement(element: Element, kind: "action" | "title" | "cover" | "row", score: number, xRatio = 0.5) {
      if (!isSafeElement(element)) return undefined;
      const rect = element.getBoundingClientRect();
      return {
        x: Math.round(rect.left + rect.width * xRatio),
        y: Math.round(rect.top + rect.height / 2),
        kind,
        score
      };
    }

    function hasCompactRowShape(element: Element, text: string) {
      const nestedRows = Array.from(element.querySelectorAll(rowSelector)).filter((item) => item !== element).length;
      const hasMetricLabel = /(浏览|阅读|观看|播放|点赞|评论|收藏|分享|曝光|互动)/.test(text);
      const hasNoteLikeChild = Boolean(element.querySelector(`${titleSelector},${coverSelector},a[href],button,[role='button']`));
      return text.length >= 4
        && text.length <= 700
        && nestedRows <= 2
        && !dangerous.test(text)
        && (hasMetricLabel || hasNoteLikeChild);
    }

    const targets: Array<{ x: number; y: number; kind: "action" | "title" | "cover" | "row"; score: number }> = [];
    const seen = new Set<string>();
    function addTarget(target: { x: number; y: number; kind: "action" | "title" | "cover" | "row"; score: number } | undefined) {
      if (!target) return;
      if (target.x < 0 || target.y < 0 || target.x > window.innerWidth || target.y > window.innerHeight) return;
      const key = `${Math.round(target.x / 8)}:${Math.round(target.y / 8)}:${target.kind}`;
      if (seen.has(key)) return;
      seen.add(key);
      targets.push(target);
    }

    for (const element of Array.from(document.querySelectorAll(selector))) {
        const text = clean(`${element.getAttribute("aria-label") ?? ""} ${element.getAttribute("title") ?? ""} ${element.textContent ?? ""}`);
        const href = element.getAttribute("href") ?? "";
        const className = element.getAttribute("class") ?? "";
        const hasStableHref = stableHref.test(href);
        const hasActionText = positive.test(text);
        const hasActionClass = positiveClass.test(className);
        const score = (hasStableHref ? 20 : 0)
          + (hasActionText ? 10 : 0)
          + (hasActionClass ? 5 : 0)
          + (/详情|数据|分析/.test(text) ? 4 : 0)
          + (/(note_id=|noteId=|\/note\/)/i.test(href) ? 6 : 0)
          - (!hasStableHref && !hasActionText && !hasActionClass ? 100 : 0)
          - (dangerous.test(`${text} ${href}`) ? 100 : 0)
          - (publicNoteHref.test(href) ? 80 : 0)
          - (text.length > 120 ? 12 : 0);
        if (score > 0) addTarget(targetForElement(element, "action", score));
    }

    for (const element of Array.from(document.querySelectorAll(rowSelector))) {
        const text = clean(element.textContent);
        if (!hasCompactRowShape(element, text) || !visible(element)) continue;
        const score = (/(浏览|阅读|观看|播放|点赞|评论|收藏|分享|曝光|互动)/.test(text) ? 18 : 0)
          + (/\d/.test(text) ? 8 : 0)
          + (element.querySelector(coverSelector) ? 6 : 0)
          + (element.querySelector(titleSelector) ? 6 : 0)
          - (/(删除|提交审核|修改资料|编辑资料|授权|开通|支付|上传|私信|充值|导出|下载|保存)/.test(text) ? 60 : 0)
          - (text.length > 700 ? 40 : 0);
        if (score <= 0) continue;
        const actionChildren = Array.from(element.querySelectorAll(selector))
          .filter((child) => {
            const href = child.getAttribute("href") ?? "";
            return !publicNoteHref.test(href)
              && (positive.test(clean(`${child.getAttribute("aria-label") ?? ""} ${child.getAttribute("title") ?? ""} ${child.textContent ?? ""}`)) || stableHref.test(href));
          });
        for (const child of actionChildren.slice(0, 4)) addTarget(targetForElement(child, "action", score + 12));
        for (const child of Array.from(element.querySelectorAll(titleSelector)).slice(0, 4)) addTarget(targetForElement(child, "title", score + 8));
        for (const child of Array.from(element.querySelectorAll(coverSelector)).slice(0, 4)) addTarget(targetForElement(child, "cover", score + 6));
        const rect = element.getBoundingClientRect();
        addTarget({
          x: Math.round(rect.left + Math.min(rect.width * 0.28, 260)),
          y: Math.round(rect.top + rect.height / 2),
          kind: "row",
          score
        });
    }

    return targets
      .sort((a, b) => b.score - a.score)
      .slice(0, 16);
  }).then((targets) => targets ?? []);
}

async function resetXiaohongshuWorksPage(page: Page) {
  if (page.isClosed()) return;
  await page.keyboard.press("Escape").catch(() => undefined);
  if (/\/new\/note-manager\/?$/.test(new URL(page.url()).pathname)) return;
  await page.goto(resolveAuthedBrowserTargetUrl("xiaohongshu", "works_page"), { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => undefined);
  await page.waitForTimeout(800).catch(() => undefined);
}

async function clickVisibleCreatorNavText(page: Page, label: string) {
  const target = await page.evaluate((targetLabel) => {
    function clean(value: string | null | undefined) {
      return (value ?? "").replace(/\s+/g, " ").trim();
    }
    function visible(element: Element) {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width >= 20
        && rect.height >= 12
        && rect.bottom > 0
        && rect.right > 0
        && rect.top < window.innerHeight
        && rect.left < window.innerWidth
        && style.visibility !== "hidden"
        && style.display !== "none"
        && style.pointerEvents !== "none";
    }
    const dangerous = /(发布|删除|提交|审核|修改|编辑|授权|开通|支付|上传|私信|消息|充值|导出|下载|保存|确认|确定)/;
    const elements = Array.from(document.querySelectorAll("a,button,[role='button'],[tabindex],div,span,li"));
    const candidates = elements
      .map((element) => {
        const text = clean(element.textContent);
        const rect = element.getBoundingClientRect();
        const isExact = text === targetLabel;
        const isCompactMatch = text.includes(targetLabel) && text.length <= targetLabel.length + 8;
        const isSidebar = rect.left < window.innerWidth * 0.24;
        const score = (isExact ? 24 : 0) + (isCompactMatch ? 8 : 0) + ((isExact || isCompactMatch) && isSidebar ? 8 : 0) - (dangerous.test(text) ? 100 : 0);
        return { element, score, x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2) };
      })
      .filter((item) => item.score > 0 && visible(item.element))
      .sort((a, b) => b.score - a.score);
    return candidates[0] ? { x: candidates[0].x, y: candidates[0].y } : undefined;
  }, label).catch(() => undefined);
  if (!target) return false;
  await page.mouse.click(target.x, target.y).catch(() => undefined);
  await page.waitForTimeout(900).catch(() => undefined);
  return true;
}

async function prepareXiaohongshuContentAnalysisPage(page: Page, secondaryLabel = "内容分析") {
  if (page.isClosed()) return;
  if (!isCreatorUrl(page.url())) {
    await page.goto(resolveAuthedBrowserTargetUrl("xiaohongshu", "works_page"), { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => undefined);
  }
  await page.keyboard.press("Escape").catch(() => undefined);
  await page.waitForTimeout(500).catch(() => undefined);
  await clickVisibleCreatorNavText(page, "数据看板");
  await page.waitForTimeout(600).catch(() => undefined);
  await clickVisibleCreatorNavText(page, secondaryLabel);
  await page.waitForLoadState("domcontentloaded", { timeout: 10000 }).catch(() => undefined);
  await page.waitForTimeout(1600).catch(() => undefined);
}

async function scrollXiaohongshuAnalysisSurface(page: Page) {
  if (page.isClosed()) return false;
  const viewport = page.viewportSize();
  if (viewport) await page.mouse.move(Math.round(viewport.width * 0.68), Math.round(viewport.height * 0.72)).catch(() => undefined);
  await page.mouse.wheel(0, Math.round(1200)).catch(() => undefined);
  await page.keyboard.press("PageDown").catch(() => undefined);
  await page.waitForTimeout(300).catch(() => undefined);
  return page.evaluate(() => {
    const candidates = [
      document.scrollingElement,
      ...Array.from(document.querySelectorAll("body,main,section,article,div,[class*='content'],[class*='Content'],[class*='table'],[class*='Table'],[class*='list'],[class*='List'],[class*='scroll'],[class*='Scroll']"))
        .filter((element) => element.scrollHeight > element.clientHeight + 60)
    ].filter(Boolean) as Element[];
    let moved = false;
    for (const element of candidates) {
      const before = element.scrollTop;
      element.scrollBy({ top: Math.round(window.innerHeight * 0.62), behavior: "instant" });
      if (Math.abs(element.scrollTop - before) > 20) moved = true;
    }
    return moved;
  }).catch(() => false);
}

async function recoverXiaohongshuCreatorPage(page: Page) {
  const context = page.context();
  const existing = context.pages().find((item) => !item.isClosed() && isCreatorUrl(item.url()));
  if (existing) {
    await existing.bringToFront().catch(() => undefined);
    return existing;
  }
  const nextPage = await context.newPage().catch(() => undefined);
  if (!nextPage) return undefined;
  await nextPage.goto(resolveAuthedBrowserTargetUrl("xiaohongshu", "works_page"), { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => undefined);
  await nextPage.waitForTimeout(1200).catch(() => undefined);
  await nextPage.bringToFront().catch(() => undefined);
  return nextPage;
}

async function clickXiaohongshuTarget(page: Page, target: XiaohongshuDetailClickTarget) {
  await page.mouse.click(target.x, target.y).catch(() => undefined);
}

async function revealVisibleXiaohongshuRowActions(page: Page) {
  if (page.isClosed()) return;
  const targets = await page.evaluate(() => {
    const dangerous = /(发布|删除|提交|审核|修改|编辑|授权|开通|支付|上传|私信|消息|充值|导出|下载|保存|确认|确定)/;
    const rowSelector = "tr,[role='row'],article,li,[class*='table-row'],[class*='TableRow'],[class*='note'],[class*='Note'],[class*='card'],[class*='item']";
    function clean(value: string | null | undefined) {
      return (value ?? "").replace(/\s+/g, " ").trim();
    }
    function visible(element: Element) {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width >= 80
        && rect.height >= 40
        && rect.bottom > 0
        && rect.right > 0
        && rect.top < window.innerHeight
        && rect.left < window.innerWidth
        && style.visibility !== "hidden"
        && style.display !== "none";
    }
    return Array.from(document.querySelectorAll(rowSelector))
      .map((element) => {
        const text = clean(element.textContent);
        const rect = element.getBoundingClientRect();
        const score = (/(浏览|阅读|观看|播放|点赞|评论|收藏|分享|曝光|互动)/.test(text) ? 12 : 0)
          + (/\d/.test(text) ? 4 : 0)
          - (dangerous.test(text) ? 80 : 0)
          - (text.length > 700 ? 40 : 0)
          - (element.querySelectorAll(rowSelector).length > 2 ? 20 : 0);
        return { x: Math.round(rect.left + rect.width * 0.72), y: Math.round(rect.top + rect.height / 2), score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }).catch(() => []);
  for (const target of targets) {
    await page.mouse.move(target.x, target.y).catch(() => undefined);
    await page.waitForTimeout(250).catch(() => undefined);
  }
}

async function openFirstVisibleDetail(page: Page) {
  let basePage = !page.isClosed() ? page : await recoverXiaohongshuCreatorPage(page) ?? page;
  const beforeUrl = safePageUrl(basePage.isClosed() ? page.url() : basePage.url());
  const attemptedKeys = new Set<string>();
  let attemptedCount = 0;
  let targetCount = 0;
  let scrollCount = 0;
  let lastWarning = "click_did_not_enter_detail";
  let preparedAnalysisPage = false;
  const targetKindCounts = { action: 0, title: 0, cover: 0, row: 0 };
  while (attemptedCount < 24) {
    if (basePage.isClosed()) {
      const recovered = await recoverXiaohongshuCreatorPage(page);
      if (!recovered) return { ok: false, beforeUrl, afterUrl: beforeUrl, warning: "click_closed_creator_page", targetCount, attemptedCount };
      basePage = recovered;
    }
    if (!preparedAnalysisPage) {
      await prepareXiaohongshuContentAnalysisPage(basePage);
      preparedAnalysisPage = true;
      scrollCount = 0;
    }
    await revealVisibleXiaohongshuRowActions(basePage);
    const targets = await collectVisibleDetailClickTargets(basePage);
    targetCount = Math.max(targetCount, targets.length);
    for (const kind of ["action", "title", "cover", "row"] as const) {
      targetKindCounts[kind] = Math.max(targetKindCounts[kind], targets.filter((item) => item.kind === kind).length);
    }
    const actionTargets = targets.filter((item) => item.kind === "action");
    const target = actionTargets.find((item) => {
      const key = `${item.kind}:${Math.round(item.x / 8)}:${Math.round(item.y / 8)}`;
      return !attemptedKeys.has(key);
    });
    if (!target) {
      await scrollXiaohongshuAnalysisSurface(basePage);
      if (scrollCount < 8) {
        scrollCount += 1;
        await basePage.waitForTimeout(900).catch(() => undefined);
        continue;
      }
      lastWarning = actionTargets.length === 0 ? "no_backend_action_detail_entry" : "click_did_not_enter_detail";
      break;
    }
    attemptedKeys.add(`${target.kind}:${Math.round(target.x / 8)}:${Math.round(target.y / 8)}`);
    attemptedCount += 1;

    const popupPromise = basePage.context().waitForEvent("page", { timeout: 3500 }).catch(() => undefined);
    await clickXiaohongshuTarget(basePage, target);
    const popup = await popupPromise;
    let activePage = popup ?? basePage;
    await activePage.waitForLoadState("domcontentloaded", { timeout: 10000 }).catch(() => undefined);
    await activePage.waitForTimeout(1400).catch(() => undefined);
    if (activePage.isClosed()) {
      const recovered = await recoverXiaohongshuCreatorPage(basePage);
      if (recovered) basePage = recovered;
      preparedAnalysisPage = false;
      continue;
    }
    await activePage.bringToFront().catch(() => undefined);
    const detailState = await evaluateCurrentDetailState(activePage);
    if (hasEnteredXiaohongshuDetail(detailState)) {
      return {
        ok: true,
        beforeUrl,
        afterUrl: safePageUrl(activePage.url()),
        page: activePage,
        warning: undefined,
        targetCount,
        attemptedCount,
        targetKindCounts
      };
    }
    if (basePage.isClosed()) {
      const recovered = await recoverXiaohongshuCreatorPage(activePage);
      if (recovered) basePage = recovered;
    }
    if (!isCreatorUrl(basePage.url())) {
      const recovered = await recoverXiaohongshuCreatorPage(basePage);
      if (recovered) basePage = recovered;
    }
    if (isCreatorUrl(basePage.url())) {
      await scrollXiaohongshuAnalysisSurface(basePage);
      if (scrollCount < 8) {
        scrollCount += 1;
        await basePage.waitForTimeout(900).catch(() => undefined);
      } else {
        lastWarning = "click_did_not_enter_detail";
        break;
      }
    }
  }

  return {
    ok: false,
    beforeUrl,
    afterUrl: safePageUrl(basePage.isClosed() ? beforeUrl : basePage.url()),
    page: basePage.isClosed() ? undefined : basePage,
    warning: lastWarning,
    targetCount,
    attemptedCount,
    scrollCount,
    targetKindCounts
  };
}

function summarizeRows(rows: XiaohongshuBrowserVisibleRow[]) {
  return {
    contentCount: rows.length,
    metricCount: rows.filter((row) => row.views + row.likes + row.comments + row.saves + row.shares > 0).length,
    saveCandidateCount: saveCandidateRows(rows).length
  };
}

function canSaveRow(row: XiaohongshuBrowserVisibleRow) {
  const trustedContext = row.sourcePageKind === "creator_center_data_analysis_table"
    && row.confidence === "owned_creator_center_data_analysis_table";
  const hasRequiredTableFacts = Boolean(row.publishedAt)
    && ((row.views ?? 0) + (row.exposures ?? 0) + row.likes + row.saves > 0)
    && !row.warnings.some((warning) => /missing_publish_time|missing_major_table_metrics|generic_table_row_title/.test(warning));
  return trustedContext
    && hasRequiredTableFacts
    && hasTrustedCreatorCenterRowShape(row, "xiaohongshu");
}

function saveCandidateRows(rows: XiaohongshuBrowserVisibleRow[]) {
  return rows.filter(canSaveRow);
}

function selectedSaveCandidateRows(rows: XiaohongshuBrowserVisibleRow[], selectedNativeIds?: string[]) {
  const saveRows = saveCandidateRows(rows);
  const selected = (selectedNativeIds ?? []).map((value) => value.trim()).filter(Boolean);
  if (selected.length === 0) return saveRows;
  const selectedSet = new Set(selected);
  return saveRows.filter((row) => row.nativeId && selectedSet.has(row.nativeId));
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
    if (!["open", "status", "capture_preview", "open_first_visible_detail", "capture_current_detail_preview", "diagnose_data_analysis_table", "save", "close"].includes(action)) {
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
            : "小红书登录抓取窗口已连接；读取时会进入数据看板的内容分析表格，按每行一条笔记预览。"
      }));
    }

    if (loginState === "wrong_page") {
      return Response.json(emptyResult(action, { ...base, message: "当前页面不是小红书创作服务平台后台；不会读取公开推荐页或非本人内容。", warnings: ["wrong_page_not_creator_center"] }), { status: 400 });
    }
    if (loginState === "needs_login" && !body.userConfirmedLogin) {
      return Response.json(emptyResult(action, { ...base, message: "页面仍像登录页；请先完成登录并勾选确认已登录。", warnings: ["needs_login"] }), { status: 400 });
    }

    if (action === "open_first_visible_detail") {
      const clickResult = await openFirstVisibleDetail(session.page);
      if (clickResult.page) session.page = clickResult.page;
      return Response.json(emptyResult(action, {
        ...base,
        ok: clickResult.ok,
        pageUrl: clickResult.afterUrl,
        rows: session.lastRows,
        ...summarizeRows(session.lastRows),
        message: clickResult.ok
          ? "已用鼠标点开小红书当前页面里的安全笔记数据/详情入口；请继续执行当前笔记详情页预览。"
          : "已尝试小红书当前页面里的安全笔记标题、封面、数据/详情入口，但未进入带稳定笔记 ID 的详情页或抽屉；没有点击发布、删除、上传、授权或支付等按钮。",
        warnings: clickResult.ok
          ? [`safe_click_targets_${clickResult.targetCount ?? 0}`, `safe_click_action_targets_${clickResult.targetKindCounts?.action ?? 0}`, `analysis_scrolls_${clickResult.scrollCount ?? 0}`, `attempted_safe_clicks_${clickResult.attemptedCount ?? 0}`]
          : [clickResult.warning ?? "no_safe_clickable_detail_entry", `safe_click_targets_${clickResult.targetCount ?? 0}`, `safe_click_action_targets_${clickResult.targetKindCounts?.action ?? 0}`, `analysis_scrolls_${clickResult.scrollCount ?? 0}`, `attempted_safe_clicks_${clickResult.attemptedCount ?? 0}`]
      }), { status: clickResult.ok ? 200 : 400 });
    }

    if (action === "diagnose_data_analysis_table") {
      const diagnostics = await diagnoseXiaohongshuDataAnalysisTable(session.page);
      return Response.json(emptyResult(action, {
        ...base,
        ok: true,
        pageUrl: safePageUrl(session.page.url()),
        message: "已生成小红书内容分析表格的脱敏结构诊断；不包含真实标题、DOM、截图、请求、响应或登录材料。",
        warnings: [`data_analysis_rows_${diagnostics.rowCount}`, diagnostics.bodyHasTableContext ? "data_analysis_context_found" : "data_analysis_context_missing", JSON.stringify(diagnostics).slice(0, 8000)]
      }));
    }

    const rows = action === "save"
      ? session.lastRows
      : action === "capture_current_detail_preview"
        ? await extractCurrentDetailRow(session.page)
        : await extractContentAnalysisTableRows(session.page);
    if (action !== "save") session.lastRows = rows;
    const summary = summarizeRows(rows);
    if (action === "capture_preview" || action === "capture_current_detail_preview") {
      const isDetail = action === "capture_current_detail_preview";
      const detailDiagnostics = isDetail && rows.length === 0 ? await diagnoseCurrentDetailPage(session.page) : undefined;
      const detailWarnings = detailDiagnostics ? [
        detailDiagnostics.urlLooksDetail ? "detail_url_gate_passed" : "detail_url_gate_failed",
        detailDiagnostics.urlStableIdFound ? "detail_url_stable_id_found" : "detail_url_stable_id_missing",
        `same_page_detail_roots_${detailDiagnostics.samePageDetailRootCount}`,
        `same_page_stable_id_roots_${detailDiagnostics.samePageStableIdRootCount}`,
        `detail_title_candidates_${detailDiagnostics.titleCandidateCount}`,
        `detail_metric_cells_${detailDiagnostics.compactMetricCellCount}`,
        `detail_labeled_metric_blocks_${detailDiagnostics.labeledMetricBlockCount}`
      ] : [];
      return Response.json(emptyResult(action, {
        ...base,
        ok: rows.length > 0,
        rows,
        ...summary,
        capturedAt: new Date().toISOString(),
        message: rows.length > 0
          ? isDetail
            ? `已从当前小红书笔记详情页识别 ${rows.length} 条本人笔记/作品级数据，保存前请确认。`
            : `已从小红书创作者后台内容分析表格识别 ${rows.length} 条本人笔记数据；每行一条笔记，保存前请人工确认。`
          : isDetail
            ? "当前详情页未识别到可靠笔记 ID、单条笔记标题和同一笔记上下文的指标；请在小红书后台点开具体笔记的数据/详情页后重试。"
            : "当前内容分析页未识别到笔记数据表格行；请确认小红书创作服务平台已打开 数据看板 / 内容分析 / 笔记数据，并且表格中可见笔记基础信息和指标列。",
        warnings: rows.length > 0 ? rows.flatMap((row) => row.warnings) : [isDetail ? "no_visible_detail_note_row" : "no_visible_xiaohongshu_data_analysis_table_rows", ...detailWarnings]
      }), { status: rows.length > 0 ? 200 : 400 });
    }

    if (!body.userConfirmedContentMetrics) {
      return Response.json(emptyResult(action, { ...base, rows, ...summary, message: "保存前需要确认这是本人小红书后台当前页面的内容级笔记/作品指标。", warnings: ["missing_user_content_metrics_confirmation"] }), { status: 400 });
    }
    const requestedNativeIds = (body.selectedNativeIds ?? []).map((value) => value.trim()).filter(Boolean);
    const saveRows = selectedSaveCandidateRows(rows, body.selectedNativeIds);
    if (saveRows.length === 0) {
      return Response.json(emptyResult(action, {
        ...base,
        rows,
        ...summary,
        message: requestedNativeIds.length > 0
          ? "所选小红书笔记 ID 不在当前可保存预览候选中；不会退回保存全部。"
          : "没有可保存的小红书本人笔记/作品级数据；请确认页面是创作服务平台笔记管理/内容数据页，并且笔记 ID 来自可见链接或平台 ID。",
        warnings: [requestedNativeIds.length > 0 ? "selected_native_ids_not_in_save_candidates" : "no_creator_center_owned_save_candidates", ...rows.flatMap((row) => row.warnings)]
      }), { status: 400 });
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
