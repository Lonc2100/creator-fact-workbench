import { getAuthedBrowserProfileStatusView } from "@/domain/self-media/providers";
import type {
  AuthedBrowserAutoRefreshPlatformResult,
  AuthedBrowserAutoRefreshRequest,
  AuthedBrowserAutoRefreshResult,
  AuthedBrowserPlatform,
  AuthedBrowserProfileStatus,
  DouyinAuthedBrowserCaptureResult,
  PlatformImportOperationPlatform,
  XiaohongshuAuthedBrowserCaptureResult
} from "@/domain/self-media/types";

export const runtime = "nodejs";

const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
const blockedInputKeys = ["cookie", "token", "password", "header", "headers", "raw", "request", "response", "storage", "screenshot", "har", "trace", "credential"];
const captureRoutes: Partial<Record<AuthedBrowserPlatform, string>> = {
  douyin: "/api/self-media/platform-imports/browser-capture/douyin",
  xiaohongshu: "/api/self-media/platform-imports/browser-capture/xiaohongshu"
};

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

function normalizePlatform(value: AuthedBrowserPlatform | PlatformImportOperationPlatform): AuthedBrowserPlatform {
  if (value === "video-account") return "video_account";
  if (value === "douyin" || value === "xiaohongshu" || value === "video_account" || value === "bilibili") return value;
  throw new Error("不支持的登录抓取平台。");
}

function statusLabel(status: AuthedBrowserAutoRefreshPlatformResult["status"]) {
  const labels: Record<AuthedBrowserAutoRefreshPlatformResult["status"], string> = {
    needs_login: "需要登录",
    preview_ready: "已抓到预览",
    needs_content_page: "需要作品/笔记页",
    unsupported: "暂未接入",
    failed: "抓取失败"
  };
  return labels[status];
}

function platformPageAction(platform: AuthedBrowserPlatform) {
  if (platform === "douyin") return "请在抖音创作者中心进入“作品管理”，确认能看到单条作品标题和播放/点赞/评论等指标，再点一次刷新。";
  if (platform === "xiaohongshu") return "请在小红书创作服务平台进入“笔记管理”，确认能看到本人笔记标题和浏览/点赞/评论/收藏等指标，再点一次刷新。";
  if (platform === "video_account") return "视频号内容级登录抓取仍是 discovery-only；当前不要建立可信保存路径。";
  return "B站登录抓取暂未接入；现有 B站 archive/work 内容级路径可用，账号指标仍 preview-only。";
}

function unsupportedResult(profile: AuthedBrowserProfileStatus): AuthedBrowserAutoRefreshPlatformResult {
  return {
    platform: profile.platform,
    key: profile.key,
    label: profile.label,
    status: "unsupported",
    statusLabel: statusLabel("unsupported"),
    message: profile.platform === "video_account" ? "视频号还没有稳定内容级登录抓取页面证据。" : "该平台暂未接入登录后自动预览。",
    nextAction: platformPageAction(profile.platform),
    attemptedPreview: false,
    openedWindow: false,
    contentCount: 0,
    metricCount: 0,
    profileState: profile.state,
    warnings: profile.platform === "bilibili" ? ["bilibili_account_metrics_preview_only"] : ["browser_capture_not_implemented"]
  };
}

function needsLoginResult(profile: AuthedBrowserProfileStatus): AuthedBrowserAutoRefreshPlatformResult {
  return {
    platform: profile.platform,
    key: profile.key,
    label: profile.label,
    status: "needs_login",
    statusLabel: statusLabel("needs_login"),
    message: `${profile.label} 还没有可复用的登录确认。`,
    nextAction: profile.nextAction,
    attemptedPreview: false,
    openedWindow: false,
    contentCount: 0,
    metricCount: 0,
    profileState: profile.state,
    warnings: []
  };
}

function safePreview<T extends DouyinAuthedBrowserCaptureResult | XiaohongshuAuthedBrowserCaptureResult>(preview: T): T {
  return { ...preview, pageUrl: undefined };
}

async function postCapture(origin: string, platform: AuthedBrowserPlatform, action: "open" | "capture_preview") {
  const route = captureRoutes[platform];
  if (!route) throw new Error("平台暂未接入登录抓取预览。");
  const response = await fetch(`${origin}${route}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, target: action === "open" ? "works_page" : undefined, userConfirmedLogin: true })
  });
  const body = await response.json() as DouyinAuthedBrowserCaptureResult | XiaohongshuAuthedBrowserCaptureResult;
  return { response, body };
}

function canAttemptPreview(profile: AuthedBrowserProfileStatus) {
  return profile.state === "session_maybe_available" || profile.state === "capture_failed" || profile.state === "waiting_login";
}

async function previewPlatform(origin: string, profile: AuthedBrowserProfileStatus, autoOpen: boolean): Promise<AuthedBrowserAutoRefreshPlatformResult> {
  if (!profile.captureMvpEnabled || !captureRoutes[profile.platform]) return unsupportedResult(profile);
  if (!canAttemptPreview(profile)) return needsLoginResult(profile);

  let preview = await postCapture(origin, profile.platform, "capture_preview");
  const needsWindow = !preview.response.ok && /请先打开|尚未打开|not_opened/i.test(preview.body.message);
  let openedWindow = false;
  if (needsWindow) {
    if (!autoOpen) {
      return {
        platform: profile.platform,
        key: profile.key,
        label: profile.label,
        status: "needs_login",
        statusLabel: statusLabel("needs_login"),
        message: `${profile.label} 本机窗口未打开。`,
        nextAction: "点击“手动打开后台并刷新”后再预览；系统不会静默保存数据。",
        attemptedPreview: true,
        openedWindow: false,
        contentCount: 0,
        metricCount: 0,
        profileState: profile.state,
        preview: safePreview(preview.body),
        warnings: preview.body.warnings
      };
    }
    const opened = await postCapture(origin, profile.platform, "open");
    openedWindow = opened.response.ok;
    if (!opened.response.ok) {
      return {
        platform: profile.platform,
        key: profile.key,
        label: profile.label,
        status: "failed",
        statusLabel: statusLabel("failed"),
        message: opened.body.message,
        nextAction: "先打开平台后台并完成登录确认。",
        attemptedPreview: true,
        openedWindow,
        contentCount: 0,
        metricCount: 0,
        profileState: profile.state,
        preview: safePreview(opened.body),
        warnings: opened.body.warnings
      };
    }
    preview = await postCapture(origin, profile.platform, "capture_preview");
  }

  const sanitized = safePreview(preview.body);
  if (preview.response.ok && sanitized.rows.length > 0) {
    return {
      platform: profile.platform,
      key: profile.key,
      label: profile.label,
      status: "preview_ready",
      statusLabel: statusLabel("preview_ready"),
      message: `${profile.label} 已抓到 ${sanitized.rows.length} 条可预览内容；请在平台预览区确认后再保存。`,
      nextAction: "检查预览内容，确认是本人后台内容级指标后保存。",
      attemptedPreview: true,
      contentCount: sanitized.contentCount,
      metricCount: sanitized.metricCount,
      profileState: profile.state,
      openedWindow,
      preview: sanitized,
      warnings: sanitized.warnings
    };
  }

  const needsLogin = sanitized.loginState === "needs_login";
  return {
    platform: profile.platform,
    key: profile.key,
    label: profile.label,
    status: needsLogin ? "needs_login" : "needs_content_page",
    statusLabel: statusLabel(needsLogin ? "needs_login" : "needs_content_page"),
    message: needsLogin ? `${profile.label} 页面仍像登录页；请完成登录后再刷新。` : sanitized.message,
    nextAction: needsLogin ? "手动打开平台后台，完成登录并确认登录状态。" : platformPageAction(profile.platform),
    attemptedPreview: true,
    openedWindow,
    contentCount: sanitized.contentCount,
    metricCount: sanitized.metricCount,
    profileState: profile.state,
    preview: sanitized,
    warnings: sanitized.warnings
  };
}

export async function POST(request: Request) {
  try {
    if (!isLocalRequest(request)) return Response.json({ errorMessage: "登录抓取自动刷新只允许本地 runtime 调用。" }, { status: 403 });
    const body = await request.json().catch(() => ({})) as AuthedBrowserAutoRefreshRequest;
    if (hasBlockedKey(body)) return Response.json({ errorMessage: "登录抓取自动刷新不接收 password/cookie/token/header/storage/raw request/raw response/screenshot/HAR/trace。" }, { status: 400 });

    const requested = body.platforms === "all" || !body.platforms
      ? null
      : new Set(body.platforms.map((item) => normalizePlatform(item)));
    const trigger = body.trigger === "startup" ? "startup" : body.trigger === "focus_return" ? "focus_return" : "manual";
    const autoOpen = trigger === "manual" && body.autoOpen === true;
    const profiles = getAuthedBrowserProfileStatusView().profiles.filter((profile) => !requested || requested.has(profile.platform));
    const origin = new URL(request.url).origin;
    const results: AuthedBrowserAutoRefreshPlatformResult[] = [];
    for (const profile of profiles) {
      results.push(await previewPlatform(origin, profile, autoOpen));
    }
    const previewReady = results.filter((item) => item.status === "preview_ready").length;
    const needsLogin = results.filter((item) => item.status === "needs_login").length;
    const needsContentPage = results.filter((item) => item.status === "needs_content_page").length;
    const openedWindowCount = results.filter((item) => item.openedWindow).length;
    const summary = previewReady > 0
      ? `已抓到 ${previewReady} 个平台的预览，等待你确认保存。${openedWindowCount > 0 ? ` 已按手动操作打开 ${openedWindowCount} 个后台窗口。` : ""}`
      : needsLogin > 0
        ? `有 ${needsLogin} 个平台需要先登录或确认登录。${openedWindowCount > 0 ? ` 已按手动操作打开 ${openedWindowCount} 个后台窗口。` : ""}`
        : needsContentPage > 0
          ? `已尝试抓取，但需要先切到作品/笔记管理页面。${openedWindowCount > 0 ? ` 已按手动操作打开 ${openedWindowCount} 个后台窗口。` : ""}`
          : "当前没有可自动预览的平台；请查看每个平台下一步。";

    const result: AuthedBrowserAutoRefreshResult = {
      ok: previewReady > 0,
      generatedAt: new Date().toISOString(),
      mode: "user_triggered_preview_only",
      trigger,
      summary,
      autoOpenEnabled: autoOpen,
      openedWindowCount,
      results,
      safety: {
        previewOnly: true,
        userMustConfirmSave: true,
        noSilentBackgroundCapture: true,
        noSensitiveLoginMaterialSaved: true,
        localExportFallbackOnly: true,
        wechatPaused: true,
        bilibiliAccountMetricsPreviewOnly: true
      }
    };
    return Response.json(result);
  } catch (error) {
    return Response.json({ errorMessage: error instanceof Error ? error.message : "登录抓取自动刷新失败。" }, { status: 400 });
  }
}
