#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";

const OUTPUT_DIR = ".local/daily-platform-ops";
const REPORT_JSON = `${OUTPUT_DIR}/report.json`;
const REPORT_MD = `${OUTPUT_DIR}/report.md`;
const AUDIT_OUT_DIR = `${OUTPUT_DIR}/trusted-dashboard-audit`;

const sensitivePatterns = [
  /(cookie|token|password|authorization|headers?|secret|session|auth)=([^&\s]+)/gi,
  /cookie/gi,
  /token/gi,
  /password/gi,
  /authorization/gi,
  /headers?/gi,
  /raw\s*payload/gi,
  /comment_content/gi,
  /danmu_text/gi,
  /SESSDATA/gi,
  /bili_jct/gi
];

function argValue(argv, name) {
  const prefix = `--${name}=`;
  return argv.find((item) => item.startsWith(prefix))?.slice(prefix.length);
}

function rel(cwd, target) {
  return path.relative(cwd, target).replaceAll(path.sep, "/");
}

function commandText(command, args) {
  return [command, ...args].join(" ");
}

function sanitizeText(value) {
  let text = String(value ?? "").replace(/\s+/g, " ").trim();
  for (const pattern of sensitivePatterns) text = text.replace(pattern, "[redacted]");
  return text.length > 1200 ? `${text.slice(0, 1200)}...[truncated]` : text;
}

function defaultRunCommand(step, cwd) {
  const startedAt = Date.now();
  const displayCommand = commandText(step.command, step.args);
  const command = process.platform === "win32" ? "cmd.exe" : step.command;
  const args = process.platform === "win32" ? ["/d", "/s", "/c", displayCommand] : step.args;
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    shell: false,
    stdio: ["ignore", "pipe", "pipe"]
  });
  return {
    exitCode: result.status ?? (result.error ? 1 : 0),
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    durationMs: Date.now() - startedAt,
    errorMessage: result.error?.message
  };
}

function readJsonIfExists(filePath) {
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function summarizeHealthGate(cwd) {
  const report = readJsonIfExists(path.join(cwd, ".local", "platform-ops-with-health", "report.json"));
  if (!report) return null;
  const freshness = report.summary?.freshness ?? {};
  return {
    status: report.status ?? "unknown",
    passed: Boolean(report.passed),
    blocked: Boolean(report.blocked),
    completedAllSteps: Boolean(report.summary?.completedAllSteps),
    blockingReasons: Array.isArray(report.summary?.blockingReasons) ? report.summary.blockingReasons.slice(0, 8).map(sanitizeText) : [],
    warnings: Array.isArray(report.summary?.warnings) ? report.summary.warnings.slice(0, 8).map(sanitizeText) : [],
    smokeDatabasePaths: report.scope?.smokeDatabasePaths ?? null,
    freshness: {
      latestRealCaptureAt: freshness.latestRealCaptureAt ?? null,
      latestSmokeAt: freshness.latestSmokeAt ?? null,
      latestAuditAt: freshness.latestAuditAt ?? null,
      realCaptureAgeHours: freshness.realCaptureAgeHours ?? null,
      smokeAgeHours: freshness.smokeAgeHours ?? null,
      realCaptureIsStale: freshness.realCaptureIsStale ?? null,
      smokeIsStale: freshness.smokeIsStale ?? null,
      staleAfterHours: freshness.staleAfterHours ?? null
    }
  };
}

function summarizeTrustedAudit(cwd) {
  const report = readJsonIfExists(path.join(cwd, AUDIT_OUT_DIR, "report.json"));
  if (!report) return null;
  const freshness = report.freshness ?? {};
  return {
    status: report.status ?? "unknown",
    mismatches: Array.isArray(report.mismatches) ? report.mismatches.slice(0, 12).map(sanitizeText) : [],
    trustedContentCount: Number(report.expected?.contentCount ?? 0),
    trustedMetricSnapshotCount: Number(report.expected?.metricSnapshotCount ?? 0),
    views: Number(report.expected?.views ?? 0),
    engagement: Number(report.expected?.engagement ?? 0),
    platformDistribution: report.expected?.platformDistribution ?? {},
    trustedPlatformCount: Object.keys(report.expected?.platformDistribution ?? {}).length,
    dashboardInput: report.dashboardInput ?? "unknown",
    latestAuditAt: report.generatedAt ?? freshness.latestAuditAt ?? null,
    freshness: {
      latestRealCaptureAt: freshness.latestRealCaptureAt ?? null,
      latestSmokeAt: freshness.latestSmokeAt ?? null,
      latestAuditAt: freshness.latestAuditAt ?? report.generatedAt ?? null,
      realCaptureAgeHours: freshness.realCaptureAgeHours ?? null,
      smokeAgeHours: freshness.smokeAgeHours ?? null,
      realCaptureIsStale: freshness.realCaptureIsStale ?? null,
      smokeIsStale: freshness.smokeIsStale ?? null,
      staleAfterHours: freshness.staleAfterHours ?? null
    }
  };
}

function stepRecord(step, output, summary, extra = {}) {
  return {
    key: step.key,
    label: step.label,
    command: commandText(step.command, step.args),
    exitCode: Number(output.exitCode ?? 1),
    passed: Number(output.exitCode ?? 1) === 0,
    durationMs: Number(output.durationMs ?? 0),
    summary,
    outputSummary: sanitizeText([output.stdout, output.stderr, output.errorMessage].filter(Boolean).join("\n")),
    ...extra
  };
}

function makeHealthStep() {
  return {
    key: "platform_ops_with_health",
    label: "Platform ops with health gate",
    command: "npm",
    args: ["run", "smoke:platform-ops-with-health"]
  };
}

function makeAuditStep(options) {
  const args = ["run", "audit:trusted-dashboard", "--", `--out-dir=${AUDIT_OUT_DIR}`];
  if (options.dashboardUrl) args.push(`--dashboard-url=${options.dashboardUrl}`);
  if (options.dashboardJson) args.push(`--dashboard-json=${options.dashboardJson}`);
  return {
    key: "trusted_dashboard_audit",
    label: "Trusted dashboard audit",
    command: "npm",
    args
  };
}

function blockingReasons(steps) {
  const reasons = [];
  for (const step of steps) {
    if (step.passed) continue;
    if (step.key === "trusted_dashboard_audit" && step.missingDashboardUrl) {
      reasons.push("trusted dashboard audit requires --dashboard-url=<url> or --dashboard-json=<path>; no service URL/input was provided");
      continue;
    }
    if (step.summary?.blockingReasons?.length) reasons.push(...step.summary.blockingReasons);
    if (step.summary?.mismatches?.length) reasons.push(`trusted dashboard audit mismatches: ${step.summary.mismatches.join(", ")}`);
    if (reasons.length === 0 || !step.summary) reasons.push(`${step.label} failed with exitCode=${step.exitCode}`);
  }
  return reasons.map(sanitizeText);
}

function reportStatus(steps, blocked) {
  if (blocked || steps.some((step) => !step.passed)) return "fail";
  if (steps.some((step) => step.summary?.status === "warn")) return "warn";
  return "pass";
}

function buildFreshnessSummary(steps) {
  const healthFreshness = steps.find((step) => step.key === "platform_ops_with_health")?.summary?.freshness ?? {};
  const auditFreshness = steps.find((step) => step.key === "trusted_dashboard_audit")?.summary?.freshness ?? {};
  return {
    latestRealCaptureAt: auditFreshness.latestRealCaptureAt ?? healthFreshness.latestRealCaptureAt ?? null,
    latestSmokeAt: auditFreshness.latestSmokeAt ?? healthFreshness.latestSmokeAt ?? null,
    latestAuditAt: auditFreshness.latestAuditAt ?? null,
    realCaptureAgeHours: auditFreshness.realCaptureAgeHours ?? healthFreshness.realCaptureAgeHours ?? null,
    smokeAgeHours: auditFreshness.smokeAgeHours ?? healthFreshness.smokeAgeHours ?? null,
    realCaptureIsStale: auditFreshness.realCaptureIsStale ?? healthFreshness.realCaptureIsStale ?? null,
    smokeIsStale: auditFreshness.smokeIsStale ?? healthFreshness.smokeIsStale ?? null,
    staleAfterHours: auditFreshness.staleAfterHours ?? healthFreshness.staleAfterHours ?? null
  };
}

export async function runDailyPlatformOpsGate(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const runCommand = options.runCommand ?? defaultRunCommand;
  const dashboardUrl = options.dashboardUrl;
  const dashboardJson = options.dashboardJson;
  const generatedAt = new Date(options.now ?? Date.now()).toISOString();
  const steps = [];
  let blocked = false;

  const healthStep = makeHealthStep();
  const healthOutput = await runCommand(healthStep, cwd);
  const healthRecord = stepRecord(healthStep, healthOutput, summarizeHealthGate(cwd));
  steps.push(healthRecord);
  if (!healthRecord.passed) blocked = true;

  if (!blocked) {
    const auditStep = makeAuditStep({ dashboardUrl, dashboardJson });
    const auditOutput = await runCommand(auditStep, cwd);
    const auditSummary = summarizeTrustedAudit(cwd);
    const auditRecord = stepRecord(auditStep, auditOutput, auditSummary, {
      missingDashboardUrl: !dashboardUrl && !dashboardJson
    });
    if (!dashboardUrl && !dashboardJson && !auditRecord.passed) {
      auditRecord.outputSummary = sanitizeText(`${auditRecord.outputSummary} Missing dashboard input: pass --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard or --dashboard-json=<file>.`);
    }
    steps.push(auditRecord);
  }

  const status = reportStatus(steps, blocked);
  const freshness = buildFreshnessSummary(steps);
  const report = {
    generatedAt,
    task: "DAILY-IMPORT-OPERATING-GATE-031",
    status,
    passed: status !== "fail",
    blocked,
    scope: {
      noCollection: true,
      databaseDeletion: false,
      wechatPaused: true,
      rawPayloadStored: false,
      sensitiveFieldsStored: false,
      dashboardInput: dashboardUrl ? "dashboard-url" : dashboardJson ? "dashboard-json" : "missing"
    },
    steps,
    summary: {
      stepCount: steps.length,
      plannedStepCount: 2,
      completedAllSteps: steps.length === 2,
      blockingReasons: blockingReasons(steps),
      warnings: steps.flatMap((step) => step.summary?.warnings ?? []),
      freshness
    },
    outputs: {
      json: REPORT_JSON,
      markdown: REPORT_MD,
      trustedDashboardAuditDir: AUDIT_OUT_DIR
    }
  };

  writeDailyPlatformOpsReport(report, { cwd });
  return report;
}

export function renderDailyPlatformOpsMarkdown(report) {
  const lines = [
    "# Daily Platform Ops Gate",
    "",
    `Generated at: ${report.generatedAt}`,
    `Task: ${report.task}`,
    `Status: ${report.status}`,
    `Passed: ${report.passed ? "true" : "false"}`,
    "",
    "## Scope",
    "",
    "- Runs `npm run smoke:platform-ops-with-health` first.",
    "- Runs trusted dashboard audit only after the health gate passes.",
    "- Does not collect platform data.",
    "- Does not delete or migrate database rows.",
    "- Stores summaries only; no raw payload, titles, cookies, tokens, or headers.",
    "",
    "## Freshness Timeline",
    "",
    `- Recent real capture: ${report.summary.freshness.latestRealCaptureAt ?? "-"}`,
    `- Recent smoke: ${report.summary.freshness.latestSmokeAt ?? "-"}`,
    `- Recent audit: ${report.summary.freshness.latestAuditAt ?? "-"}`,
    `- Real capture stale over ${report.summary.freshness.staleAfterHours ?? "?"}h: ${report.summary.freshness.realCaptureIsStale ?? "-"}`,
    `- Smoke stale over ${report.summary.freshness.staleAfterHours ?? "?"}h: ${report.summary.freshness.smokeIsStale ?? "-"}`,
    "",
    "## Smoke Database Paths",
    "",
    `- Four-platform save smoke DB: \`${report.steps[0]?.summary?.smokeDatabasePaths?.platformsSave ?? ".local/platform-personal-save-smoke/self-media-smoke.sqlite"}\``,
    `- Operations E2E smoke DB: \`${report.steps[0]?.summary?.smokeDatabasePaths?.platformOperationsE2E ?? ".local/platform-operations-e2e/self-media-smoke.sqlite"}\``,
    "",
    "## Steps",
    "",
    "| Step | Command | Exit | Result | Summary |",
    "| --- | --- | ---: | --- | --- |"
  ];
  for (const step of report.steps) {
    const summary =
      step.key === "trusted_dashboard_audit"
        ? `status=${step.summary?.status ?? "missing"} mismatches=${step.summary?.mismatches?.length ?? 0}`
        : `status=${step.summary?.status ?? "missing"} blocked=${step.summary?.blocked ?? false}`;
    lines.push(`| ${step.label} | \`${step.command}\` | ${step.exitCode} | ${step.passed ? "pass" : "fail"} | ${summary} |`);
  }

  lines.push("", "## Blocking Reasons", "");
  if (report.summary.blockingReasons.length === 0) lines.push("- None");
  else for (const reason of report.summary.blockingReasons) lines.push(`- ${reason}`);

  lines.push("", "## Warnings", "");
  if (report.summary.warnings.length === 0) lines.push("- None");
  else for (const warning of report.summary.warnings) lines.push(`- ${warning}`);

  const audit = report.steps.find((step) => step.key === "trusted_dashboard_audit")?.summary;
  if (audit) {
    lines.push(
      "",
      "## Trusted Dashboard Audit Summary",
      "",
      `- trustedContentCount: ${audit.trustedContentCount}`,
      `- trustedMetricSnapshotCount: ${audit.trustedMetricSnapshotCount}`,
      `- trustedPlatformCount: ${audit.trustedPlatformCount}`,
      `- latestAuditAt: ${audit.latestAuditAt ?? audit.freshness?.latestAuditAt ?? "-"}`,
      `- views: ${audit.views}`,
      `- engagement: ${audit.engagement}`,
      `- mismatches: ${audit.mismatches.join(", ") || "none"}`
    );
  }

  lines.push(
    "",
    "## Outputs",
    "",
    `- JSON: \`${report.outputs.json}\``,
    `- Markdown: \`${report.outputs.markdown}\``,
    `- Trusted dashboard audit dir: \`${report.outputs.trustedDashboardAuditDir}\``,
    ""
  );
  return lines.join("\n");
}

export function writeDailyPlatformOpsReport(report, options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const outputDir = path.join(cwd, OUTPUT_DIR);
  mkdirSync(outputDir, { recursive: true });
  const jsonPath = path.join(cwd, REPORT_JSON);
  const markdownPath = path.join(cwd, REPORT_MD);
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  writeFileSync(markdownPath, renderDailyPlatformOpsMarkdown(report));
  return { jsonPath, markdownPath };
}

function parseCli(argv) {
  return {
    dashboardUrl: argValue(argv, "dashboard-url"),
    dashboardJson: argValue(argv, "dashboard-json")
  };
}

async function runCli() {
  const report = await runDailyPlatformOpsGate(parseCli(process.argv.slice(2)));
  console.log(`Daily platform ops gate status: ${report.status}`);
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
