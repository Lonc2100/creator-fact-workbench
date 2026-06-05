#!/usr/bin/env node
import net from "node:net";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_PORTS = [3200, 3201, 3202, 3203, 3204, 3205, 3206, 3207, 3208, 3209, 3210, 3211, 3212];
const DEFAULT_TIMEOUT_MS = 2500;
const DEFAULT_OUT_DIR = ".local/local-server-health";
const HOST = "127.0.0.1";
const DASHBOARD_PATH = "/api/self-media/dashboard";
const SAFE_WEEKLY_PATH = "/api/self-media/reports/trusted-weekly-safe";
const DASHBOARD_PAGE_PATH = "/dashboard";
const SENSITIVE_PATTERN = /raw\s*payload|cookie|authorization|headers?|access[_-]?token|refresh[_-]?token|\btoken\b|session|secret|credential|private|comment_content|danmu_text|danmu|评论正文|弹幕|\bcontentId\b/i;

function argValue(argv, name) {
  const prefix = `--${name}=`;
  return argv.find((item) => item.startsWith(prefix))?.slice(prefix.length);
}

function hasFlag(argv, name) {
  return argv.includes(`--${name}`);
}

function parsePorts(value) {
  if (!value) return DEFAULT_PORTS;
  const ports = value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item > 0 && item <= 65535);
  return [...new Set(ports)].length > 0 ? [...new Set(ports)] : DEFAULT_PORTS;
}

function parseTimeoutMs(value) {
  const timeoutMs = Number(value);
  return Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_TIMEOUT_MS;
}

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function nowIso(now = new Date()) {
  return new Date(now).toISOString();
}

function endpointUrl(port, endpointPath) {
  return `http://${HOST}:${port}${endpointPath}`;
}

function safeStatus(result) {
  if (result.timedOut) return "timeout";
  if (result.status === 404) return "old_route";
  if (!result.ok) return "error";
  return "pass";
}

function pageStatus(result) {
  if (result.timedOut) return "timeout";
  if (result.status === 404) return "old_route";
  if (!result.ok) return "error";
  return result.pageReady ? "pass" : "error";
}

function maybeObject(value) {
  return value && typeof value === "object" ? value : {};
}

function trustedTotalsFromDashboard(data) {
  const snapshot = maybeObject(data);
  const scope = maybeObject(snapshot.realDataScope);
  const trusted = maybeObject(snapshot.trustedOperatingStatus);
  const weekly = maybeObject(snapshot.weeklyReview);
  const metrics = maybeObject(weekly.metrics);
  const safeSummary = maybeObject(snapshot.trustedWeeklySummary);
  return {
    generatedAt: typeof snapshot.generatedAt === "string" ? snapshot.generatedAt : null,
    defaultScope: String(scope.defaultScope ?? trusted.defaultScope ?? "trusted_real_creator_center_content_level"),
    trustedContentCount: asNumber(scope.trustedContentCount ?? trusted.trustedContentCount ?? safeSummary.trustedContentCount),
    trustedMetricSnapshotCount: asNumber(scope.trustedMetricSnapshotCount ?? trusted.trustedMetricSnapshotCount ?? safeSummary.trustedMetricSnapshotCount),
    views: asNumber(trusted.views ?? metrics.totalViews ?? safeSummary.views),
    engagement: asNumber(trusted.engagement ?? metrics.totalEngagement ?? safeSummary.engagement),
    auditStatus: String(maybeObject(trusted.audit).status ?? "unknown"),
    dailyGateStatus: String(maybeObject(snapshot.dailyPlatformOpsGate).status ?? "unknown")
  };
}

function trustedTotalsFromSafeWeekly(data) {
  const payload = maybeObject(data);
  const report = maybeObject(payload.report ?? payload);
  const totals = maybeObject(report.totals);
  const redaction = maybeObject(report.redaction);
  const platformOverview = Array.isArray(report.platformOverview)
    ? report.platformOverview.map((item) => ({
        platform: String(maybeObject(item).platform ?? "unknown"),
        views: asNumber(maybeObject(item).views),
        engagement: asNumber(maybeObject(item).engagement),
        contentCount: asNumber(maybeObject(item).contentCount),
        metricSnapshotCount: asNumber(maybeObject(item).metricSnapshotCount)
      }))
    : [];
  return {
    generatedAt: typeof report.generatedAt === "string" ? report.generatedAt : null,
    defaultScope: String(report.defaultScope ?? "trusted_real_creator_center_content_level"),
    trustedContentCount: asNumber(totals.trustedContentCount),
    trustedMetricSnapshotCount: asNumber(totals.trustedMetricSnapshotCount ?? totals.metricSnapshotCount),
    views: asNumber(totals.views),
    engagement: asNumber(totals.engagement),
    platformOverview,
    redaction: {
      contentTitlesIncluded: redaction.contentTitlesIncluded === true,
      idsIncluded: redaction.contentIdsIncluded === true,
      accountMetricsIncluded: redaction.accountMetricsIncluded === true,
      captureDetailsIncluded: redaction.captureDetailsIncluded === true
    }
  };
}

function scanSafePayload(data) {
  const serialized = JSON.stringify(data ?? {});
  return {
    checked: true,
    passed: !SENSITIVE_PATTERN.test(serialized)
  };
}

export function probeTcpPort(port, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const startedAt = Date.now();
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: HOST, port });
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({
        durationMs: Date.now() - startedAt,
        ...result
      });
    };
    socket.setTimeout(timeoutMs);
    socket.on("connect", () => finish({ listening: true }));
    socket.on("timeout", () => finish({ listening: false, errorMessage: "tcp timeout" }));
    socket.on("error", (error) => finish({ listening: false, errorMessage: error?.code ?? error?.message ?? "tcp error" }));
  });
}

export async function fetchJsonWithTimeout(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const startedAt = Date.now();
  try {
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs)
    });
    let data = null;
    try {
      data = await response.json();
    } catch (error) {
      return {
        ok: false,
        status: response.status,
        durationMs: Date.now() - startedAt,
        errorMessage: error?.message ?? "invalid json"
      };
    }
    return {
      ok: response.ok,
      status: response.status,
      durationMs: Date.now() - startedAt,
      data,
      errorMessage: response.ok ? undefined : `http ${response.status}`
    };
  } catch (error) {
    const timedOut = error?.name === "TimeoutError" || error?.name === "AbortError";
    return {
      ok: false,
      status: 0,
      durationMs: Date.now() - startedAt,
      timedOut,
      errorMessage: timedOut ? "timeout" : error?.message ?? "fetch failed"
    };
  }
}

export async function fetchPageWithTimeout(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const startedAt = Date.now();
  try {
    const response = await fetch(url, {
      headers: { accept: "text/html" },
      signal: AbortSignal.timeout(timeoutMs)
    });
    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      durationMs: Date.now() - startedAt,
      pageReady: response.ok && /<html|__NEXT_DATA__|CreatorFact|内容看板|运营看板/i.test(text),
      errorMessage: response.ok ? undefined : `http ${response.status}`
    };
  } catch (error) {
    const timedOut = error?.name === "TimeoutError" || error?.name === "AbortError";
    return {
      ok: false,
      status: 0,
      durationMs: Date.now() - startedAt,
      timedOut,
      pageReady: false,
      errorMessage: timedOut ? "timeout" : error?.message ?? "fetch failed"
    };
  }
}

async function checkEndpoint(port, endpointPath, timeoutMs, fetchJson) {
  const result = await fetchJson(endpointUrl(port, endpointPath), timeoutMs);
  return {
    path: endpointPath,
    status: safeStatus(result),
    httpStatus: result.status,
    durationMs: result.durationMs,
    errorMessage: result.errorMessage
  };
}

function portIssue(portResult) {
  if (portResult.healthy) return "healthy";
  if (!portResult.tcp.listening) return "not_listening";
  if (portResult.dashboard.status === "timeout") return "dashboard_timeout";
  if (portResult.dashboard.status === "old_route") return "dashboard_old_route";
  if (portResult.dashboard.status !== "pass") return "dashboard_error";
  if (portResult.safeWeekly.status === "timeout") return "safe_weekly_timeout";
  if (portResult.safeWeekly.status === "old_route") return "safe_weekly_old_route";
  if (portResult.safeWeekly.status === "fail" && portResult.safeWeekly.sensitiveScan.checked) return "safe_weekly_sensitive_scan";
  if (portResult.safeWeekly.status !== "pass") return "safe_weekly_error";
  if (portResult.trustedDataRequired && !portResult.trustedDataReady) return "trusted_data_missing";
  if (portResult.pageCheckEnabled && portResult.dashboardPage.status === "timeout") return "dashboard_page_timeout";
  if (portResult.pageCheckEnabled && portResult.dashboardPage.status === "old_route") return "dashboard_page_old_route";
  if (portResult.pageCheckEnabled && portResult.dashboardPage.status !== "pass") return "dashboard_page_error";
  return "unknown";
}

function isStaleOrOldRouteIssue(issue) {
  return issue.includes("timeout") || issue.includes("old_route");
}

async function checkPort(port, options) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const probeTcp = options.probeTcp ?? probeTcpPort;
  const fetchJson = options.fetchJson ?? fetchJsonWithTimeout;
  const fetchPage = options.fetchPage ?? fetchPageWithTimeout;
  const tcp = await probeTcp(port, timeoutMs);
  const result = {
    port,
    baseUrl: `http://${HOST}:${port}`,
    healthy: false,
    tcp: {
      listening: tcp.listening === true,
      durationMs: asNumber(tcp.durationMs),
      errorMessage: tcp.errorMessage
    },
    dashboard: {
      path: DASHBOARD_PATH,
      status: "not_checked",
      apiReady: false,
      httpStatus: null,
      durationMs: null,
      trustedTotals: null,
      errorMessage: null
    },
    safeWeekly: {
      path: SAFE_WEEKLY_PATH,
      status: "not_checked",
      apiReady: false,
      httpStatus: null,
      durationMs: null,
      trustedTotals: null,
      sensitiveScan: { checked: false, passed: false },
      errorMessage: null
    },
    pageCheckEnabled: options.checkPage === true,
    dashboardPage: {
      path: DASHBOARD_PAGE_PATH,
      status: "not_checked",
      pageReady: false,
      httpStatus: null,
      durationMs: null,
      errorMessage: null
    },
    trustedDataRequired: options.requireTrustedData === true,
    trustedDataReady: false,
    issue: "not_checked",
    nextAction: ""
  };
  if (!result.tcp.listening) {
    result.issue = portIssue(result);
    return result;
  }

  const dashboardFetch = await fetchJson(endpointUrl(port, DASHBOARD_PATH), timeoutMs);
  result.dashboard = {
    ...result.dashboard,
    status: safeStatus(dashboardFetch),
    apiReady: dashboardFetch.ok === true,
    httpStatus: dashboardFetch.status,
    durationMs: dashboardFetch.durationMs,
    trustedTotals: dashboardFetch.ok ? trustedTotalsFromDashboard(dashboardFetch.data) : null,
    errorMessage: dashboardFetch.errorMessage ?? null
  };

  const safeFetch = await fetchJson(endpointUrl(port, SAFE_WEEKLY_PATH), timeoutMs);
  const sensitiveScan = safeFetch.ok ? scanSafePayload(safeFetch.data) : { checked: safeFetch.ok, passed: false };
  const safePassed = safeFetch.ok && sensitiveScan.passed;
  result.safeWeekly = {
    ...result.safeWeekly,
    status: safeFetch.timedOut ? "timeout" : safeFetch.status === 404 ? "old_route" : safePassed ? "pass" : safeFetch.ok ? "fail" : "error",
    apiReady: safePassed,
    httpStatus: safeFetch.status,
    durationMs: safeFetch.durationMs,
    trustedTotals: safePassed ? trustedTotalsFromSafeWeekly(safeFetch.data) : null,
    sensitiveScan,
    errorMessage: safeFetch.errorMessage ?? (safeFetch.ok && !sensitiveScan.passed ? "sensitive scan failed" : null)
  };
  result.trustedDataReady = result.dashboard.trustedTotals?.trustedContentCount > 0 && result.dashboard.trustedTotals?.trustedMetricSnapshotCount > 0;
  if (result.pageCheckEnabled) {
    const pageFetch = await fetchPage(endpointUrl(port, DASHBOARD_PAGE_PATH), timeoutMs);
    result.dashboardPage = {
      ...result.dashboardPage,
      status: pageStatus(pageFetch),
      pageReady: pageFetch.ok === true && pageFetch.pageReady === true,
      httpStatus: pageFetch.status,
      durationMs: pageFetch.durationMs,
      errorMessage: pageFetch.errorMessage ?? (pageFetch.ok && !pageFetch.pageReady ? "dashboard page marker missing" : null)
    };
  }
  result.healthy = result.dashboard.status === "pass" && result.safeWeekly.status === "pass" && (!result.trustedDataRequired || result.trustedDataReady) && (!result.pageCheckEnabled || result.dashboardPage.status === "pass");
  result.issue = portIssue(result);
  return result;
}

function actionForPort(portResult, healthyPorts) {
  const healthyAlternative = healthyPorts.find((port) => port !== portResult.port);
  const healthyUrl = healthyAlternative ? endpointUrl(healthyAlternative, DASHBOARD_PATH) : null;
  if (portResult.healthy) return `Use --dashboard-url=${endpointUrl(portResult.port, DASHBOARD_PATH)} for daily gate or audit commands.`;
  if (!portResult.tcp.listening) return `Port ${portResult.port} is not listening. Start a dev server on this port or use a healthy port.`;
  if (portResult.dashboard.status === "timeout") {
    return healthyUrl
      ? `Port ${portResult.port} is listening but dashboard API timed out. Use --dashboard-url=${healthyUrl} or restart the ${portResult.port} dev server.`
      : `Port ${portResult.port} is listening but dashboard API timed out. Restart the ${portResult.port} dev server or start another healthy port.`;
  }
  if (portResult.safeWeekly.status === "timeout") {
    return healthyUrl
      ? `Port ${portResult.port} is listening but safe weekly API timed out. Use --dashboard-url=${healthyUrl} for dashboard-dependent commands or restart this dev server.`
      : `Port ${portResult.port} is listening but safe weekly API timed out. Restart this dev server or start another healthy port.`;
  }
  if (portResult.dashboard.status === "old_route") {
    return healthyUrl
      ? `Port ${portResult.port} is listening but dashboard API returned an old route/404. Use --dashboard-url=${healthyUrl} or manually confirm this dev server before restarting it.`
      : `Port ${portResult.port} is listening but dashboard API returned an old route/404. Manually confirm this dev server and restart it if appropriate.`;
  }
  if (portResult.safeWeekly.status === "old_route") {
    return healthyUrl
      ? `Port ${portResult.port} is listening but safe weekly API returned an old route/404. Use --dashboard-url=${healthyUrl} for dashboard-dependent commands or manually confirm this dev server before restarting it.`
      : `Port ${portResult.port} is listening but safe weekly API returned an old route/404. Manually confirm this dev server and restart it if appropriate.`;
  }
  if (portResult.safeWeekly.status === "fail" && portResult.safeWeekly.sensitiveScan.checked) {
    return `Port ${portResult.port} safe weekly API failed the sensitive scan. Do not copy/export this response; inspect the safe API implementation.`;
  }
  if (portResult.trustedDataRequired && !portResult.trustedDataReady) {
    return healthyUrl
      ? `Port ${portResult.port} has usable APIs but no trusted operating data. Use --dashboard-url=${healthyUrl} or start a dev server against the real .local/self-media.sqlite DB.`
      : `Port ${portResult.port} has usable APIs but no trusted operating data. Start a dev server against the real .local/self-media.sqlite DB.`;
  }
  if (portResult.pageCheckEnabled && portResult.dashboardPage.status !== "pass") {
    return healthyUrl
      ? `Port ${portResult.port} APIs are usable but /dashboard page is not ready. Use --dashboard-url=${healthyUrl} or manually confirm this dev server before restarting it.`
      : `Port ${portResult.port} APIs are usable but /dashboard page is not ready. Manually confirm this dev server and restart it if appropriate.`;
  }
  return `Port ${portResult.port} is listening but API health is not usable. Use a healthy port or restart this dev server.`;
}

export async function buildLocalServerHealthReport(options = {}) {
  const ports = options.ports?.length ? options.ports : DEFAULT_PORTS;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const checkedPorts = [];
  for (const port of ports) {
    checkedPorts.push(await checkPort(port, { ...options, timeoutMs }));
  }
  const healthyPorts = checkedPorts.filter((item) => item.healthy).map((item) => item.port);
  const preferredPort = healthyPorts[0] ?? null;
  const annotatedPorts = checkedPorts.map((item) => ({ ...item, nextAction: actionForPort(item, healthyPorts) }));
  const apiReadyPorts = annotatedPorts.filter((item) => item.dashboard.apiReady).map((item) => item.port);
  const safeWeeklyReadyPorts = annotatedPorts.filter((item) => item.safeWeekly.apiReady).map((item) => item.port);
  const trustedDataReadyPorts = annotatedPorts.filter((item) => item.trustedDataReady).map((item) => item.port);
  const pageReadyPorts = annotatedPorts.filter((item) => item.dashboardPage.pageReady).map((item) => item.port);
  const summary = {
    healthyPorts,
    preferredPort,
    preferredDashboardUrl: preferredPort ? endpointUrl(preferredPort, DASHBOARD_PATH) : null,
    apiReadyPorts,
    safeWeeklyReadyPorts,
    trustedDataReadyPorts,
    pageReadyPorts,
    listeningButUnhealthyPorts: annotatedPorts.filter((item) => item.tcp.listening && !item.healthy).map((item) => item.port),
    timeoutPorts: annotatedPorts.filter((item) => item.dashboard.status === "timeout" || item.safeWeekly.status === "timeout").map((item) => item.port),
    oldRoutePorts: annotatedPorts.filter((item) => item.dashboard.status === "old_route" || item.safeWeekly.status === "old_route").map((item) => item.port),
    staleOrOldRoutePorts: annotatedPorts.filter((item) => item.tcp.listening && !item.healthy && isStaleOrOldRouteIssue(item.issue)).map((item) => item.port),
    notListeningPorts: annotatedPorts.filter((item) => !item.tcp.listening).map((item) => item.port),
    nextActions: annotatedPorts.map((item) => item.nextAction)
  };
  return {
    task: "LOCAL-SERVER-OPERATING-MODE-038",
    generatedAt: nowIso(options.now),
    status: healthyPorts.length > 0 ? "pass" : "fail",
    passed: healthyPorts.length > 0,
    scope: {
      readOnly: true,
      noProcessKill: true,
      noFileDelete: true,
      noServerStart: true,
      noFullDashboardJson: true,
      noSafeMarkdownText: true,
      trustedRealCreatorCenterContentLevelOnly: true
    },
    config: {
      host: HOST,
      ports,
      timeoutMs,
      strict: options.strict === true,
      requireTrustedData: options.requireTrustedData === true,
      checkPage: options.checkPage === true,
      dashboardPath: DASHBOARD_PATH,
      safeWeeklyPath: SAFE_WEEKLY_PATH,
      dashboardPagePath: DASHBOARD_PAGE_PATH
    },
    summary,
    ports: annotatedPorts
  };
}

function totalsLine(totals) {
  if (!totals) return "not available";
  return `trustedContent=${totals.trustedContentCount}, snapshots=${totals.trustedMetricSnapshotCount}, views=${totals.views}, engagement=${totals.engagement}`;
}

export function renderLocalServerHealthMarkdown(report) {
  const lines = [
    "# Local Server Health",
    "",
    `- generatedAt: ${report.generatedAt}`,
    `- status: ${report.status}`,
    `- checked ports: ${report.config.ports.join(", ")}`,
    `- timeoutMs: ${report.config.timeoutMs}`,
    `- strict: ${report.config.strict === true ? "yes" : "no"}`,
    `- require trusted data: ${report.config.requireTrustedData === true ? "yes" : "no"}`,
    `- check dashboard page: ${report.config.checkPage === true ? "yes" : "no"}`,
    `- preferred dashboard URL: ${report.summary.preferredDashboardUrl ?? "none"}`,
    `- API-ready ports: ${report.summary.apiReadyPorts.join(", ") || "none"}`,
    `- safe-weekly-ready ports: ${report.summary.safeWeeklyReadyPorts.join(", ") || "none"}`,
    `- trusted-data-ready ports: ${report.summary.trustedDataReadyPorts.join(", ") || "none"}`,
    `- page-ready ports: ${report.summary.pageReadyPorts.join(", ") || "none"}`,
    `- stale/old-route ports: ${report.summary.staleOrOldRoutePorts.join(", ") || "none"}`,
    "",
    "This report is read-only. It checks TCP listening state, API endpoints, and optionally the dashboard page route, then stores trusted totals summaries only. It does not print full dashboard JSON or safe weekly markdown.",
    "",
    "| Port | TCP | Dashboard API | Dashboard ms | Safe weekly API | Safe weekly ms | Dashboard page | Page ms | Issue | Trusted totals | Next action |",
    "| --- | --- | --- | ---: | --- | ---: | --- | ---: | --- | --- | --- |"
  ];
  for (const item of report.ports) {
    const totals = item.dashboard.trustedTotals ?? item.safeWeekly.trustedTotals;
    lines.push(`| ${item.port} | ${item.tcp.listening ? "listening" : "not listening"} | ${item.dashboard.status} | ${item.dashboard.durationMs ?? "-"} | ${item.safeWeekly.status} | ${item.safeWeekly.durationMs ?? "-"} | ${item.dashboardPage.status} | ${item.dashboardPage.durationMs ?? "-"} | ${item.issue} | ${totalsLine(totals)} | ${item.nextAction} |`);
  }
  lines.push("", "## Next Actions", "");
  for (const action of report.summary.nextActions) lines.push(`- ${action}`);
  return `${lines.join("\n")}\n`;
}

export function writeLocalServerHealthReport(report, options = {}) {
  const outDir = options.outDir ?? path.join(options.cwd ?? process.cwd(), DEFAULT_OUT_DIR);
  mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, "report.json");
  const markdownPath = path.join(outDir, "report.md");
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  writeFileSync(markdownPath, renderLocalServerHealthMarkdown(report));
  return {
    jsonPath: path.relative(options.cwd ?? process.cwd(), jsonPath).replaceAll("\\", "/"),
    markdownPath: path.relative(options.cwd ?? process.cwd(), markdownPath).replaceAll("\\", "/")
  };
}

export async function runLocalServerHealth(options = {}) {
  const report = await buildLocalServerHealthReport(options);
  const paths = writeLocalServerHealthReport(report, options);
  return { report, paths };
}

async function main() {
  const argv = process.argv.slice(2);
  const ports = parsePorts(argValue(argv, "ports"));
  const timeoutMs = parseTimeoutMs(argValue(argv, "timeout-ms"));
  const strict = hasFlag(argv, "strict");
  const requireTrustedData = hasFlag(argv, "require-trusted-data");
  const checkPage = hasFlag(argv, "check-page");
  const outDir = argValue(argv, "out-dir");
  const { report, paths } = await runLocalServerHealth({ ports, timeoutMs, strict, requireTrustedData, checkPage, outDir: outDir ? path.resolve(outDir) : undefined });
  const output = {
    status: report.status,
    passed: report.passed,
    mode: strict ? "strict" : "diagnostic",
    strict,
    requireTrustedData,
    checkPage,
    healthyPorts: report.summary.healthyPorts,
    apiReadyPorts: report.summary.apiReadyPorts,
    safeWeeklyReadyPorts: report.summary.safeWeeklyReadyPorts,
    trustedDataReadyPorts: report.summary.trustedDataReadyPorts,
    pageReadyPorts: report.summary.pageReadyPorts,
    staleOrOldRoutePorts: report.summary.staleOrOldRoutePorts,
    preferredDashboardUrl: report.summary.preferredDashboardUrl,
    reportJson: paths.jsonPath,
    reportMd: paths.markdownPath,
    nextActions: report.summary.nextActions
  };
  console.log(JSON.stringify(output, null, 2));
  if (strict && report.summary.healthyPorts.length === 0) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error?.message ?? error);
    process.exitCode = 1;
  });
}
