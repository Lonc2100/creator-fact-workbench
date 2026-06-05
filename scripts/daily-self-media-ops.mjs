#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { runDailyOpsRedactedSummary } from "./daily-ops-redacted-summary.mjs";

const OUTPUT_DIR = ".local/daily-self-media-ops";
const REPORT_JSON = `${OUTPUT_DIR}/report.json`;
const REPORT_MD = `${OUTPUT_DIR}/report.md`;
const REDACTED_SUMMARY_JSON = `${OUTPUT_DIR}/redacted-summary.json`;
const REDACTED_SUMMARY_MD = `${OUTPUT_DIR}/redacted-summary.md`;
const AUDIT_OUT_DIR = `${OUTPUT_DIR}/trusted-dashboard-audit`;
const PREFLIGHT_OUT_DIR = `${OUTPUT_DIR}/local-server-health`;
const DEFAULT_DASHBOARD_URL = "http://127.0.0.1:3200/api/self-media/dashboard";
const DEFAULT_PREFLIGHT_PORTS = "3200,3201,3202,3203,3204,3205,3206,3207,3208,3209,3210,3211,3212";
const DISALLOWED_TEXT = /cookie|authorization|headers?|access[_-]?token|refresh[_-]?token|session|secret|credential|raw\s*payload|comment_content|danmu_text|danmu|评论正文|弹幕/i;

function argValue(argv, name) {
  const prefix = `--${name}=`;
  return argv.find((item) => item.startsWith(prefix))?.slice(prefix.length);
}

function hasFlag(argv, name) {
  return argv.includes(`--${name}`);
}

function rel(cwd, target) {
  return path.relative(cwd, target).replaceAll(path.sep, "/");
}

function commandText(command, args) {
  return [command, ...args].join(" ");
}

function readJsonIfExists(cwd, relativePath) {
  const filePath = path.join(cwd, relativePath);
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function defaultRunCommand(step, cwd) {
  const startedAt = Date.now();
  return new Promise((resolve) => {
    const displayCommand = commandText(step.command, step.args);
    const child = process.platform === "win32"
      ? spawn("cmd.exe", ["/d", "/s", "/c", displayCommand], { cwd, stdio: ["ignore", "ignore", "ignore"] })
      : spawn(step.command, step.args, { cwd, stdio: ["ignore", "ignore", "ignore"] });
    child.on("error", (error) => {
      resolve({ exitCode: 1, durationMs: Date.now() - startedAt, errorMessage: error.message });
    });
    child.on("close", (code) => {
      resolve({ exitCode: code ?? 1, durationMs: Date.now() - startedAt });
    });
  });
}

function makeSteps(options = {}) {
  const dashboardUrl = options.dashboardUrl ?? DEFAULT_DASHBOARD_URL;
  return [
    {
      key: "platform_data_health",
      label: "Platform data health",
      command: "npm",
      args: ["run", "health:platform-data"],
      reportPath: ".local/platform-data-health/report.json"
    },
    {
      key: "real_capture_freshness",
      label: "Real capture freshness",
      command: "npm",
      args: ["run", "check:real-capture-freshness"],
      reportPath: ".local/real-capture-freshness/report.json"
    },
    {
      key: "trusted_weekly_safe",
      label: "Trusted weekly safe report",
      command: "npm",
      args: ["run", "report:trusted-weekly:safe"],
      reportPath: ".local/trusted-weekly-report/redacted-summary.json"
    },
    {
      key: "trusted_dashboard_audit",
      label: "Trusted dashboard audit",
      command: "npm",
      args: ["run", "audit:trusted-dashboard", "--", `--dashboard-url=${dashboardUrl}`, `--out-dir=${AUDIT_OUT_DIR}`],
      reportPath: `${AUDIT_OUT_DIR}/report.json`
    },
    {
      key: "daily_platform_ops_gate",
      label: "Daily platform ops gate",
      command: "npm",
      args: ["run", "gate:daily-platform-ops", "--", `--dashboard-url=${dashboardUrl}`],
      reportPath: ".local/daily-platform-ops/report.json"
    }
  ];
}

function makePreflightStep(options = {}) {
  const ports = options.preflightPorts ?? DEFAULT_PREFLIGHT_PORTS;
  return {
    key: "local_server_health_preflight",
    label: "Local server health preflight",
    command: "npm",
    args: ["run", "check:local-server-health", "--", `--ports=${ports}`, "--strict", "--require-trusted-data", "--check-page", `--out-dir=${PREFLIGHT_OUT_DIR}`],
    reportPath: `${PREFLIGHT_OUT_DIR}/report.json`
  };
}

function summarizeHealth(report) {
  if (!report) return { status: "missing", generatedAt: null, summary: null };
  return {
    status: report.status ?? "unknown",
    generatedAt: report.generatedAt ?? null,
    summary: {
      okCount: report.summary?.okCount ?? 0,
      warnCount: report.summary?.warnCount ?? 0,
      errorCount: report.summary?.errorCount ?? 0,
      missingCount: report.summary?.missingCount ?? 0,
      staleCount: report.summary?.staleCount ?? 0,
      realCaptureStaleCount: report.summary?.realCaptureStaleCount ?? 0,
      sourceMismatchCount: report.summary?.sourceMismatchCount ?? 0,
      bilibiliPreviewOnlyOk: report.summary?.bilibiliPreviewOnlyOk ?? null
    },
    freshness: report.summary?.freshness ?? null
  };
}

function summarizeFreshness(report) {
  if (!report) return { status: "missing", generatedAt: null, summary: null };
  return {
    status: report.status ?? "unknown",
    generatedAt: report.generatedAt ?? null,
    staleAfterHours: report.staleAfterHours ?? null,
    summary: {
      freshPlatforms: report.summary?.freshPlatforms ?? [],
      stalePlatforms: report.summary?.stalePlatforms ?? [],
      missingPlatforms: report.summary?.missingPlatforms ?? [],
      staleCount: report.summary?.staleCount ?? 0,
      missingCount: report.summary?.missingCount ?? 0
    },
    latestRealCaptureAt: latest(report.platforms?.map((item) => item.latestRealCaptureAt)),
    latestSmokeAt: latest(report.platforms?.map((item) => item.latestSmokeAt))
  };
}

function summarizeWeeklySafe(report) {
  if (!report) return { status: "missing", redactedOnly: true, paths: safeWeeklyPaths() };
  return {
    status: "pass",
    redactedOnly: true,
    generatedAt: report.generatedAt ?? null,
    paths: safeWeeklyPaths(),
    totals: {
      trustedContentCount: report.totals?.trustedContentCount ?? 0,
      metricSnapshotCount: report.totals?.metricSnapshotCount ?? 0,
      views: report.totals?.views ?? 0,
      engagement: report.totals?.engagement ?? 0
    },
    redaction: {
      contentTitlesIncluded: report.redaction?.contentTitlesIncluded ?? null,
      contentIdsIncluded: report.redaction?.contentIdsIncluded ?? null,
      accountMetricsIncluded: report.redaction?.accountMetricsIncluded ?? null,
      captureDetailsIncluded: report.redaction?.captureDetailsIncluded ?? null
    },
    consistencyChecks: report.consistencyChecks ?? {}
  };
}

function summarizeAudit(report) {
  if (!report) return { status: "missing", generatedAt: null, mismatches: [] };
  return {
    status: report.status ?? "unknown",
    generatedAt: report.generatedAt ?? null,
    mismatches: Array.isArray(report.mismatches) ? report.mismatches.slice(0, 12) : [],
    trustedContentCount: report.expected?.contentCount ?? 0,
    trustedMetricSnapshotCount: report.expected?.metricSnapshotCount ?? 0,
    views: report.expected?.views ?? 0,
    engagement: report.expected?.engagement ?? 0,
    dashboardInput: report.dashboardInput ?? "unknown",
    freshness: report.freshness ?? null
  };
}

function summarizeGate(report) {
  if (!report) return { status: "missing", passed: false, blockingReasons: [] };
  return {
    status: report.status ?? "unknown",
    passed: Boolean(report.passed),
    blocked: Boolean(report.blocked),
    completedAllSteps: Boolean(report.summary?.completedAllSteps),
    blockingReasons: Array.isArray(report.summary?.blockingReasons) ? report.summary.blockingReasons.slice(0, 12) : [],
    warnings: Array.isArray(report.summary?.warnings) ? report.summary.warnings.slice(0, 12) : [],
    freshness: report.summary?.freshness ?? null
  };
}

function summarizePreflight(report, enabled = false) {
  if (!report) {
    return {
      status: enabled ? "missing" : "disabled",
      enabled,
      passed: enabled ? false : null,
      preferredDashboardUrl: null,
      healthyPorts: [],
      apiReadyPorts: [],
      safeWeeklyReadyPorts: [],
      staleOrOldRoutePorts: [],
      nextActions: []
    };
  }
  return {
    status: report.status ?? "unknown",
    enabled: true,
    passed: Boolean(report.passed),
    generatedAt: report.generatedAt ?? null,
    strict: report.config?.strict === true,
    preferredDashboardUrl: report.summary?.preferredDashboardUrl ?? null,
    healthyPorts: Array.isArray(report.summary?.healthyPorts) ? report.summary.healthyPorts.slice(0, 12) : [],
    apiReadyPorts: Array.isArray(report.summary?.apiReadyPorts) ? report.summary.apiReadyPorts.slice(0, 12) : [],
    safeWeeklyReadyPorts: Array.isArray(report.summary?.safeWeeklyReadyPorts) ? report.summary.safeWeeklyReadyPorts.slice(0, 12) : [],
    trustedDataReadyPorts: Array.isArray(report.summary?.trustedDataReadyPorts) ? report.summary.trustedDataReadyPorts.slice(0, 12) : [],
    pageReadyPorts: Array.isArray(report.summary?.pageReadyPorts) ? report.summary.pageReadyPorts.slice(0, 12) : [],
    staleOrOldRoutePorts: Array.isArray(report.summary?.staleOrOldRoutePorts) ? report.summary.staleOrOldRoutePorts.slice(0, 12) : [],
    timeoutPorts: Array.isArray(report.summary?.timeoutPorts) ? report.summary.timeoutPorts.slice(0, 12) : [],
    oldRoutePorts: Array.isArray(report.summary?.oldRoutePorts) ? report.summary.oldRoutePorts.slice(0, 12) : [],
    nextActions: Array.isArray(report.summary?.nextActions) ? report.summary.nextActions.slice(0, 8) : []
  };
}

function safeWeeklyPaths() {
  return {
    redactedJson: ".local/trusted-weekly-report/redacted-summary.json",
    redactedMarkdown: ".local/trusted-weekly-report/redacted-summary.md",
    localEvidenceJson: null,
    localEvidenceMarkdown: null
  };
}

function latest(values = []) {
  const timestamps = values
    .filter(Boolean)
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value));
  if (timestamps.length === 0) return null;
  return new Date(Math.max(...timestamps)).toISOString();
}

function summarizeStep(step, commandResult, cwd) {
  const exitCode = Number(commandResult.exitCode ?? 1);
  const passed = exitCode === 0;
  const report = passed || step.key === "local_server_health_preflight" ? readJsonIfExists(cwd, step.reportPath) : null;
  const base = {
    key: step.key,
    label: step.label,
    command: commandText(step.command, step.args),
    reportPath: step.reportPath,
    exitCode,
    passed,
    durationMs: Number(commandResult.durationMs ?? 0)
  };
  if (commandResult.errorMessage) base.errorMessage = String(commandResult.errorMessage).slice(0, 240);
  if (step.key === "platform_data_health") return { ...base, summary: summarizeHealth(report) };
  if (step.key === "real_capture_freshness") return { ...base, summary: summarizeFreshness(report) };
  if (step.key === "trusted_weekly_safe") return { ...base, summary: summarizeWeeklySafe(report) };
  if (step.key === "trusted_dashboard_audit") return { ...base, summary: summarizeAudit(report) };
  if (step.key === "daily_platform_ops_gate") return { ...base, summary: summarizeGate(report) };
  if (step.key === "local_server_health_preflight") return { ...base, summary: summarizePreflight(report, true) };
  return { ...base, summary: report };
}

function buildSections(steps, options = {}) {
  const byKey = new Map(steps.map((step) => [step.key, step.summary]));
  return {
    preflightHealth: options.preflightHealth ? byKey.get("local_server_health_preflight") ?? summarizePreflight(null) : summarizePreflight(null),
    realCaptureFreshness: byKey.get("real_capture_freshness") ?? null,
    health: byKey.get("platform_data_health") ?? null,
    trustedWeeklySafe: byKey.get("trusted_weekly_safe") ?? null,
    trustedAudit: byKey.get("trusted_dashboard_audit") ?? null,
    dailyGate: byKey.get("daily_platform_ops_gate") ?? null
  };
}

function collectBlockingReasons(steps, sections) {
  const reasons = [];
  for (const step of steps) {
    if (!step.passed) reasons.push(`${step.label} command failed with exitCode=${step.exitCode}`);
  }
  if (sections.preflightHealth?.enabled && sections.preflightHealth?.status !== "pass") reasons.push("local server health preflight failed: no healthy dashboard/safe API/trusted-data/page-ready port");
  if (sections.health?.status === "error") reasons.push("platform data health status is error");
  if (sections.realCaptureFreshness?.status === "error") reasons.push("real capture freshness has missing platform evidence");
  if (sections.trustedWeeklySafe?.status !== "pass") reasons.push("trusted weekly safe report was not generated");
  if (sections.trustedAudit?.status === "fail") reasons.push(`trusted dashboard audit mismatches: ${(sections.trustedAudit.mismatches ?? []).join(", ") || "unknown"}`);
  if (sections.dailyGate?.status === "fail") reasons.push(...(sections.dailyGate.blockingReasons ?? ["daily platform ops gate failed"]));
  return [...new Set(reasons)].slice(0, 20);
}

function collectWarnings(sections) {
  const warnings = [];
  if (sections.health?.status === "warn") warnings.push("platform data health has warnings");
  if ((sections.realCaptureFreshness?.summary?.staleCount ?? 0) > 0) warnings.push(`real capture stale platforms: ${sections.realCaptureFreshness.summary.stalePlatforms.join(", ")}`);
  if (sections.dailyGate?.status === "warn") warnings.push("daily platform ops gate returned warn");
  warnings.push(...(sections.dailyGate?.warnings ?? []));
  return [...new Set(warnings)].slice(0, 20);
}

function collectNextActions(blockingReasons, warnings, sections) {
  const actions = [];
  if (sections.preflightHealth?.enabled && sections.preflightHealth?.status !== "pass") {
    actions.push("Run npm run check:local-server-health -- --ports=3200,3201 --strict --require-trusted-data --check-page; use a healthy preferredDashboardUrl or manually confirm the stale dev server before restarting it.");
    actions.push(...(sections.preflightHealth.nextActions ?? []));
  }
  if (blockingReasons.some((item) => item.includes("Platform data health")) || sections.health?.status === "error") actions.push("Run npm run health:platform-data and inspect .local/platform-data-health/report.md.");
  if (sections.realCaptureFreshness?.status === "error" || (sections.realCaptureFreshness?.summary?.missingCount ?? 0) > 0) actions.push("Manually refresh missing real captures, then run platform preview/save only after review.");
  if ((sections.realCaptureFreshness?.summary?.staleCount ?? 0) > 0) actions.push("Manually refresh stale platforms before trusting the next operating cycle.");
  if (sections.trustedWeeklySafe?.status !== "pass") actions.push("Rerun npm run report:trusted-weekly:safe; share only redacted-summary.*.");
  if (sections.trustedAudit?.status === "fail") actions.push("Inspect .local/daily-self-media-ops/trusted-dashboard-audit/report.md and fix dashboard/API trusted-scope mismatch.");
  if (sections.dailyGate?.status === "fail") actions.push("Inspect .local/daily-platform-ops/report.md for daily gate blocking reasons.");
  if (blockingReasons.some((item) => item.includes("Dashboard") || item.includes("audit"))) actions.push("Confirm the local dashboard API is available at http://127.0.0.1:3200/api/self-media/dashboard.");
  if (actions.length === 0 && blockingReasons.length > 0) actions.push("Inspect .local/daily-self-media-ops/report.md, rerun the failed command shown in steps, then rerun npm run ops:daily-self-media -- --preflight-health.");
  if (actions.length === 0 && warnings.length === 0) actions.push("No blocking action. Continue daily dashboard review and task follow-through.");
  return [...new Set(actions)].slice(0, 12);
}

function statusFrom(steps, sections, blockingReasons, warnings) {
  if (blockingReasons.length > 0 || steps.some((step) => !step.passed)) return "fail";
  if (warnings.length > 0 || sections.health?.status === "warn" || sections.realCaptureFreshness?.status === "warn" || sections.dailyGate?.status === "warn") return "warn";
  return "pass";
}

export async function runDailySelfMediaOps(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const generatedAt = new Date(options.now ?? Date.now()).toISOString();
  const runCommand = options.runCommand ?? defaultRunCommand;
  const steps = [];
  let dashboardUrl = options.dashboardUrl ?? DEFAULT_DASHBOARD_URL;
  let preflightStep = null;
  let preflightSummary = summarizePreflight(null);

  if (options.preflightHealth === true) {
    preflightStep = makePreflightStep({ preflightPorts: options.preflightPorts });
    const output = await runCommand(preflightStep, cwd);
    const summarized = summarizeStep(preflightStep, output, cwd);
    steps.push(summarized);
    preflightSummary = summarized.summary;
    if (summarized.passed && preflightSummary.preferredDashboardUrl) {
      dashboardUrl = preflightSummary.preferredDashboardUrl;
    } else {
      const sections = buildSections(steps, { preflightHealth: true });
      sections.preflightHealth = preflightSummary;
      const blockingReasons = collectBlockingReasons(steps, sections);
      const warnings = collectWarnings(sections);
      const nextActions = collectNextActions(blockingReasons, warnings, sections);
      const report = buildReport({
        generatedAt,
        status: "fail",
        plan: [],
        steps,
        sections,
        blockingReasons,
        warnings,
        nextActions,
        dashboardUrl,
        preflightEnabled: true,
        preflightPorts: options.preflightPorts ?? DEFAULT_PREFLIGHT_PORTS
      });
      assertSafeReport(report);
      writeDailySelfMediaOpsReport(report, { cwd });
      return report;
    }
  }

  const plan = makeSteps({ dashboardUrl });

  for (const step of plan) {
    const output = await runCommand(step, cwd);
    steps.push(summarizeStep(step, output, cwd));
  }

  const sections = buildSections(steps, { preflightHealth: options.preflightHealth === true });
  if (options.preflightHealth === true && !sections.preflightHealth.enabled) sections.preflightHealth = preflightSummary;
  const blockingReasons = collectBlockingReasons(steps, sections);
  const warnings = collectWarnings(sections);
  const nextActions = collectNextActions(blockingReasons, warnings, sections);
  const status = statusFrom(steps, sections, blockingReasons, warnings);
  const report = buildReport({
    generatedAt,
    status,
    plan,
    steps,
    sections,
    blockingReasons,
    warnings,
    nextActions,
    dashboardUrl,
    preflightEnabled: options.preflightHealth === true,
    preflightPorts: options.preflightPorts ?? DEFAULT_PREFLIGHT_PORTS
  });
  assertSafeReport(report);
  writeDailySelfMediaOpsReport(report, { cwd });
  if (report.status === "pass") {
    runDailyOpsRedactedSummary({
      cwd,
      outputJson: REDACTED_SUMMARY_JSON,
      outputMarkdown: REDACTED_SUMMARY_MD
    });
  }
  return report;
}

function buildReport({ generatedAt, status, plan, steps, sections, blockingReasons, warnings, nextActions, dashboardUrl, preflightEnabled, preflightPorts }) {
  return {
    generatedAt,
    task: "DAILY-OPS-PREFLIGHT-039",
    status,
    passed: status !== "fail",
    config: {
      dashboardUrl,
      preflightHealth: preflightEnabled === true,
      preflightPorts: preflightPorts ?? DEFAULT_PREFLIGHT_PORTS
    },
    scope: {
      serialExecution: true,
      noParallelSqliteReports: true,
      noCollection: true,
      browserOpened: false,
      platformLoginOpened: false,
      databaseDeletion: false,
      processKill: false,
      serverStarted: false,
      wechatPaused: true,
      bilibiliAccountMetricsSaved: false,
      commandOutputStored: false,
      platformSensitiveFieldsStored: false,
      originalResponseBodiesStored: false,
      trustedWeeklyRedactedOnly: true
    },
    summary: {
      stepCount: steps.length,
      plannedStepCount: plan.length + (preflightEnabled ? 1 : 0),
      completedAllSteps: steps.length === plan.length + (preflightEnabled ? 1 : 0),
      blockingReasons,
      warnings,
      nextActions
    },
    steps,
    sections,
    outputs: {
      json: REPORT_JSON,
      markdown: REPORT_MD,
      safeDailySummaryJson: REDACTED_SUMMARY_JSON,
      safeDailySummaryMarkdown: REDACTED_SUMMARY_MD,
      localServerHealthReport: `${PREFLIGHT_OUT_DIR}/report.json`,
      trustedWeeklyRedactedJson: ".local/trusted-weekly-report/redacted-summary.json",
      trustedWeeklyRedactedMarkdown: ".local/trusted-weekly-report/redacted-summary.md",
      trustedDashboardAuditDir: AUDIT_OUT_DIR,
      dailyGateReport: ".local/daily-platform-ops/report.json"
    }
  };
}

export function renderDailySelfMediaOpsMarkdown(report) {
  const lines = [
    "# Daily Self-media Ops",
    "",
    `Generated at: ${report.generatedAt}`,
    `Task: ${report.task}`,
    `Status: ${report.status}`,
    `Passed: ${report.passed ? "true" : "false"}`,
    "",
    "## Scope",
    "",
    "- Runs the daily checks serially to avoid local sqlite contention.",
    "- Does not collect platform data, open platform login pages, delete the database, resume WeChat, or save Bilibili account-level metrics.",
    "- Stores command status and report summaries only; child command output is not stored.",
    "- Weekly report output is redacted-only: `.local/trusted-weekly-report/redacted-summary.*`.",
    "",
    "## Operating Sections",
    "",
    `- Preflight health: ${report.sections.preflightHealth?.enabled ? report.sections.preflightHealth.status : "disabled"}`,
    `- Dashboard URL: ${report.config?.dashboardUrl ?? DEFAULT_DASHBOARD_URL}`,
    `- Health: ${report.sections.health?.status ?? "missing"}`,
    `- Real capture freshness: ${report.sections.realCaptureFreshness?.status ?? "missing"}`,
    `- Safe weekly report: ${report.sections.trustedWeeklySafe?.status ?? "missing"} (${report.outputs.trustedWeeklyRedactedMarkdown})`,
    `- Trusted audit: ${report.sections.trustedAudit?.status ?? "missing"}`,
    `- Daily gate: ${report.sections.dailyGate?.status ?? "missing"}`,
    "",
    "## Freshness",
    "",
    `- Recent real capture: ${report.sections.realCaptureFreshness?.latestRealCaptureAt ?? report.sections.health?.freshness?.latestRealCaptureAt ?? "-"}`,
    `- Recent smoke: ${report.sections.realCaptureFreshness?.latestSmokeAt ?? report.sections.health?.freshness?.latestSmokeAt ?? "-"}`,
    `- Recent audit: ${report.sections.trustedAudit?.freshness?.latestAuditAt ?? report.sections.dailyGate?.freshness?.latestAuditAt ?? "-"}`,
    `- Stale platforms: ${(report.sections.realCaptureFreshness?.summary?.stalePlatforms ?? []).join(", ") || "none"}`,
    "",
    "## Steps",
    "",
    "| Step | Command | Exit | Result | Report |",
    "| --- | --- | ---: | --- | --- |"
  ];
  for (const step of report.steps) {
    lines.push(`| ${step.label} | \`${step.command}\` | ${step.exitCode} | ${step.passed ? "pass" : "fail"} | \`${step.reportPath}\` |`);
  }
  lines.push("", "## Blocking Reasons", "");
  if (report.summary.blockingReasons.length === 0) lines.push("- None");
  else for (const reason of report.summary.blockingReasons) lines.push(`- ${reason}`);
  lines.push("", "## Next Actions", "");
  for (const action of report.summary.nextActions) lines.push(`- ${action}`);
  lines.push("", "## Outputs", "");
  for (const [key, value] of Object.entries(report.outputs)) lines.push(`- ${key}: \`${value}\``);
  lines.push("");
  const markdown = lines.join("\n");
  assertSafeReport(markdown);
  return markdown;
}

export function writeDailySelfMediaOpsReport(report, options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const outputDir = path.join(cwd, OUTPUT_DIR);
  mkdirSync(outputDir, { recursive: true });
  const jsonPath = path.join(cwd, REPORT_JSON);
  const markdownPath = path.join(cwd, REPORT_MD);
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(markdownPath, renderDailySelfMediaOpsMarkdown(report), "utf8");
  return { jsonPath, markdownPath };
}

function assertSafeReport(value) {
  const serialized = typeof value === "string" ? value : JSON.stringify(value);
  if (DISALLOWED_TEXT.test(serialized)) throw new Error("Daily self-media ops report contains disallowed sensitive text.");
}

function parseCli(argv) {
  return {
    dashboardUrl: argValue(argv, "dashboard-url") ?? DEFAULT_DASHBOARD_URL,
    preflightHealth: hasFlag(argv, "preflight-health"),
    preflightPorts: argValue(argv, "ports") ?? argValue(argv, "preflight-ports") ?? DEFAULT_PREFLIGHT_PORTS
  };
}

async function runCli() {
  const report = await runDailySelfMediaOps(parseCli(process.argv.slice(2)));
  console.log(`Daily self-media ops status: ${report.status}`);
  console.log(`JSON report: ${rel(process.cwd(), path.join(process.cwd(), REPORT_JSON))}`);
  console.log(`Markdown report: ${rel(process.cwd(), path.join(process.cwd(), REPORT_MD))}`);
  if (!report.passed) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exit(1);
  });
}
