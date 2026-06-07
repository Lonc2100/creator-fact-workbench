import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { authedBrowserProfileConfigs } from "../config";
import type {
  AuthedBrowserPlatform,
  AuthedBrowserCaptureTarget,
  AuthedBrowserProfileActionResult,
  AuthedBrowserProfileConfig,
  AuthedBrowserProfileState,
  AuthedBrowserProfileStatus,
  AuthedBrowserProfileStatusView,
  PlatformImportOperationPlatform
} from "../types";

const baseDirRef = ".local/browser-profiles" as const;
const metaFileName = "session-meta.json";
const sensitiveKeyPattern = /cookie|token|password|header|headers|raw|request|storage|credential|authorization/i;
const worksPageTargets: Partial<Record<AuthedBrowserPlatform, string>> = {
  douyin: "https://creator.douyin.com/creator-micro/content/manage",
  xiaohongshu: "https://creator.xiaohongshu.com/new/note-manager"
};

type SafeProfileMeta = {
  platform: AuthedBrowserPlatform;
  lastOpenedAt?: string;
  lastUserConfirmedLoginAt?: string;
  lastCaptureFailureAt?: string;
  failureMessage?: string;
  updatedAt: string;
};

function nowIso() {
  return new Date().toISOString();
}

function normalizePlatform(value: AuthedBrowserPlatform | PlatformImportOperationPlatform): AuthedBrowserPlatform {
  if (value === "video-account") return "video_account";
  if (value === "douyin" || value === "xiaohongshu" || value === "video_account" || value === "bilibili") return value;
  throw new Error("不支持的浏览器 profile 平台。");
}

export function getAuthedBrowserProfileConfig(value: AuthedBrowserPlatform | PlatformImportOperationPlatform): AuthedBrowserProfileConfig {
  const platform = normalizePlatform(value);
  const config = authedBrowserProfileConfigs.find((item) => item.platform === platform);
  if (!config) throw new Error("未配置该平台的本地浏览器 profile。");
  return config;
}

export function authedBrowserProfileDir(value: AuthedBrowserPlatform | PlatformImportOperationPlatform) {
  return path.join(process.cwd(), baseDirRef, normalizePlatform(value));
}

export function resolveAuthedBrowserTargetUrl(value: AuthedBrowserPlatform | PlatformImportOperationPlatform, target: AuthedBrowserCaptureTarget = "default") {
  const config = getAuthedBrowserProfileConfig(value);
  if (target === "works_page") return worksPageTargets[config.platform] ?? config.startUrl;
  return config.startUrl;
}

function metaPath(value: AuthedBrowserPlatform | PlatformImportOperationPlatform) {
  return path.join(authedBrowserProfileDir(value), metaFileName);
}

function readMeta(value: AuthedBrowserPlatform | PlatformImportOperationPlatform): SafeProfileMeta | undefined {
  const file = metaPath(value);
  if (!existsSync(file)) return undefined;
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as Partial<SafeProfileMeta>;
    if (!parsed || parsed.platform !== normalizePlatform(value)) return undefined;
    return {
      platform: parsed.platform,
      lastOpenedAt: parsed.lastOpenedAt,
      lastUserConfirmedLoginAt: parsed.lastUserConfirmedLoginAt,
      lastCaptureFailureAt: parsed.lastCaptureFailureAt,
      failureMessage: parsed.failureMessage,
      updatedAt: parsed.updatedAt ?? nowIso()
    };
  } catch {
    return undefined;
  }
}

function safeFailureMessage(value?: string) {
  if (!value) return undefined;
  return value.replace(sensitiveKeyPattern, "[sensitive]").slice(0, 180);
}

function writeMeta(value: AuthedBrowserPlatform | PlatformImportOperationPlatform, patch: Partial<SafeProfileMeta>) {
  const platform = normalizePlatform(value);
  const dir = authedBrowserProfileDir(platform);
  mkdirSync(dir, { recursive: true });
  const previous = readMeta(platform);
  const next: SafeProfileMeta = {
    platform,
    ...previous,
    ...patch,
    failureMessage: safeFailureMessage(patch.failureMessage ?? previous?.failureMessage),
    updatedAt: nowIso()
  };
  writeFileSync(metaPath(platform), JSON.stringify(next, null, 2), "utf8");
  return next;
}

function isFresh(value: string | undefined, ttlHours: number) {
  if (!value) return false;
  const parsed = new Date(value).valueOf();
  if (!Number.isFinite(parsed)) return false;
  return Date.now() - parsed <= ttlHours * 60 * 60 * 1000;
}

function stateLabel(state: AuthedBrowserProfileState) {
  const labels: Record<AuthedBrowserProfileState, string> = {
    not_opened: "未打开",
    waiting_login: "等待登录",
    session_maybe_available: "已登录可能可用",
    session_expired: "会话过期",
    capture_failed: "抓取失败"
  };
  return labels[state];
}

function nextAction(state: AuthedBrowserProfileState, label: string) {
  const actions: Record<AuthedBrowserProfileState, string> = {
    not_opened: `打开 ${label} 后台并完成登录。`,
    waiting_login: "在弹出的平台后台完成登录，然后回到这里确认已登录。",
    session_maybe_available: "可直接复用本机 profile；如页面要求重新登录，请再次确认登录。",
    session_expired: "建议重新打开后台确认会话仍可用。",
    capture_failed: "查看失败提示，重新打开后台后再抓取当前可见作品。"
  };
  return actions[state];
}

function profileState(config: AuthedBrowserProfileConfig, profileExists: boolean, meta?: SafeProfileMeta): AuthedBrowserProfileState {
  const failureAfterLogin = meta?.lastCaptureFailureAt && (!meta.lastUserConfirmedLoginAt || meta.lastCaptureFailureAt > meta.lastUserConfirmedLoginAt);
  if (failureAfterLogin) return "capture_failed";
  if (isFresh(meta?.lastUserConfirmedLoginAt, config.sessionTtlHours)) return "session_maybe_available";
  if (meta?.lastUserConfirmedLoginAt) return "session_expired";
  if (profileExists || meta?.lastOpenedAt) return "waiting_login";
  return "not_opened";
}

export function getAuthedBrowserProfileStatus(value: AuthedBrowserPlatform | PlatformImportOperationPlatform): AuthedBrowserProfileStatus {
  const config = getAuthedBrowserProfileConfig(value);
  const dir = authedBrowserProfileDir(config.platform);
  const profileExists = existsSync(dir);
  const meta = readMeta(config.platform);
  const state = profileState(config, profileExists, meta);
  return {
    platform: config.platform,
    key: config.key,
    label: config.label,
    startUrl: config.startUrl,
    profileDirRef: config.profileDirRef,
    profileExists,
    state,
    stateLabel: stateLabel(state),
    nextAction: nextAction(state, config.label),
    lastOpenedAt: meta?.lastOpenedAt,
    lastUserConfirmedLoginAt: meta?.lastUserConfirmedLoginAt,
    lastCaptureFailureAt: meta?.lastCaptureFailureAt,
    failureMessage: meta?.failureMessage,
    sessionTtlHours: config.sessionTtlHours,
    captureMvpEnabled: config.captureMvpEnabled,
    safety: {
      profileOnlyInLocal: true,
      noCookieTokenHeaderInBusinessDb: true,
      noStorageStateExport: true,
      noSensitiveLoginMaterialInDocsTestsOrGit: true
    }
  };
}

export function getAuthedBrowserProfileStatusView(): AuthedBrowserProfileStatusView {
  return {
    generatedAt: nowIso(),
    profiles: authedBrowserProfileConfigs.map((item) => getAuthedBrowserProfileStatus(item.platform)),
    safety: {
      baseDirRef,
      noCookieTokenHeaderInBusinessDb: true,
      localProfilesIgnoredByGit: true,
      wechatPaused: true,
      bilibiliAccountMetricsPreviewOnly: true
    }
  };
}

function browserExecutablePath() {
  const candidates = [
    process.env.AUTHED_BROWSER_CHROME_PATH,
    process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
  ].filter(Boolean) as string[];
  const found = candidates.find((item) => existsSync(item));
  if (!found) throw new Error("未找到 Chrome 或 Edge。请安装浏览器，或设置 AUTHED_BROWSER_CHROME_PATH / CHROME_PATH。");
  return found;
}

export function markAuthedBrowserProfileOpened(value: AuthedBrowserPlatform | PlatformImportOperationPlatform) {
  writeMeta(value, { lastOpenedAt: nowIso(), lastCaptureFailureAt: undefined, failureMessage: undefined });
  return getAuthedBrowserProfileStatus(value);
}

export function markAuthedBrowserProfileConfirmed(value: AuthedBrowserPlatform | PlatformImportOperationPlatform) {
  writeMeta(value, { lastUserConfirmedLoginAt: nowIso(), lastCaptureFailureAt: undefined, failureMessage: undefined });
  return getAuthedBrowserProfileStatus(value);
}

export function markAuthedBrowserCaptureFailure(value: AuthedBrowserPlatform | PlatformImportOperationPlatform, failureMessage: string) {
  writeMeta(value, { lastCaptureFailureAt: nowIso(), failureMessage });
  return getAuthedBrowserProfileStatus(value);
}

export function openAuthedBrowserProfile(value: AuthedBrowserPlatform | PlatformImportOperationPlatform, target: AuthedBrowserCaptureTarget = "default"): AuthedBrowserProfileActionResult {
  const config = getAuthedBrowserProfileConfig(value);
  const dir = authedBrowserProfileDir(config.platform);
  mkdirSync(dir, { recursive: true });
  statSync(dir);
  const child = spawn(browserExecutablePath(), [
    `--user-data-dir=${dir}`,
    "--no-first-run",
    "--no-default-browser-check",
    resolveAuthedBrowserTargetUrl(config.platform, target)
  ], {
    detached: true,
    stdio: "ignore",
    windowsHide: false
  });
  child.unref();
  const status = markAuthedBrowserProfileOpened(config.platform);
  return {
    ok: true,
    action: "open",
    status,
    message: target === "works_page"
      ? `已打开 ${config.label} 作品/笔记管理入口；如果平台跳回首页，请按页面左侧导航进入作品管理或笔记管理。`
      : `已打开 ${config.label} 后台；登录会话仅保存在 ${config.profileDirRef} 的本机浏览器 profile。`,
    warnings: []
  };
}

export function confirmAuthedBrowserProfileLogin(value: AuthedBrowserPlatform | PlatformImportOperationPlatform): AuthedBrowserProfileActionResult {
  const config = getAuthedBrowserProfileConfig(value);
  const status = markAuthedBrowserProfileConfirmed(config.platform);
  return {
    ok: true,
    action: "confirm_login",
    status,
    message: `${config.label} 已标记为“已登录可能可用”；系统没有读取或导出 cookie/token/header/storage state。`,
    warnings: []
  };
}
