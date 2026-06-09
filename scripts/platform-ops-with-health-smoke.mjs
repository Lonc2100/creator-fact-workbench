#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";

const OUTPUT_DIR = ".local/platform-ops-with-health";
const REPORT_JSON = `${OUTPUT_DIR}/report.json`;
const REPORT_MD = `${OUTPUT_DIR}/report.md`;
const SMOKE_DATABASE_PATHS = {
  platformsSave: ".local/platform-personal-save-smoke/self-media-smoke.sqlite",
  platformOperationsE2E: ".local/platform-operations-e2e/self-media-smoke.sqlite"
};

const STEP_PLAN = [
  { key: "health_before", label: "Health before operations", command: "npm", args: ["run", "health:platform-data"], kind: "health" },
  { key: "platforms_save_smoke", label: "Four-platform save smoke", command: "npm", args: ["run", "smoke:platforms-save"], kind: "smoke" },
  { key: "platform_operations_e2e", label: "Import operations E2E smoke", command: "npm", args: ["run", "smoke:platform-operations-e2e"], kind: "smoke" },
  { key: "health_after", label: "Health after operations", command: "npm", args: ["run", "health:platform-data"], kind: "health" }
];

function rel(cwd, target) {
  return path.relative(cwd, target).replaceAll(path.sep, "/");
}

function defaultRunCommand(step, cwd) {
  const startedAt = Date.now();
  const displayCommand = [step.command, ...step.args].join(" ");
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

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

export function evaluateHealthGate(healthReport) {
  const summary = healthReport?.summary ?? {};
  const freshness = summary.freshness ?? {};
  const errorCount = Number(summary.errorCount ?? 0);
  const missingCount = Number(summary.missingCount ?? 0);
  const sourceMismatchCount = Number(summary.sourceMismatchCount ?? 0);
  const staleCount = Number(summary.staleCount ?? 0);
  const realCaptureStaleCount = Number(summary.realCaptureStaleCount ?? 0);
  const blockingReasons = [];
  const warnings = [];

  if (errorCount > 0) blockingReasons.push(`health errorCount=${errorCount}`);
  if (missingCount > 0) blockingReasons.push(`health missingCount=${missingCount}`);
  if (sourceMismatchCount > 0) blockingReasons.push(`health sourceMismatchCount=${sourceMismatchCount}`);
  if (staleCount > 0) warnings.push(`health staleCount=${staleCount}; stale is warning-only under the current 72h threshold`);
  if (realCaptureStaleCount > 0) warnings.push(`health realCaptureStaleCount=${realCaptureStaleCount}; next real collection should refresh raw capture evidence`);

  return {
    passed: blockingReasons.length === 0,
    status: blockingReasons.length > 0 ? "error" : staleCount > 0 || healthReport?.status === "warn" ? "warn" : "ok",
    blockingReasons,
    warnings,
    summary: {
      status: healthReport?.status ?? "unknown",
      staleAfterHours: healthReport?.staleAfterHours ?? null,
      okCount: Number(summary.okCount ?? 0),
      warnCount: Number(summary.warnCount ?? 0),
      errorCount,
      missingCount,
      staleCount,
      realCaptureStaleCount,
      sourceMismatchCount,
      bilibiliPreviewOnlyOk: summary.bilibiliPreviewOnlyOk ?? null,
      freshness: {
        latestRealCaptureAt: freshness.latestRealCaptureAt ?? null,
        latestSmokeAt: freshness.latestSmokeAt ?? null,
        latestAuditAt: freshness.latestAuditAt ?? null,
        realCaptureAgeHours: freshness.realCaptureAgeHours ?? null,
        smokeAgeHours: freshness.smokeAgeHours ?? null,
        realCaptureIsStale: freshness.realCaptureIsStale ?? null,
        smokeIsStale: freshness.smokeIsStale ?? null,
        staleAfterHours: healthReport?.staleAfterHours ?? freshness.staleAfterHours ?? null,
        realCaptureEvidenceSource: freshness.realCaptureEvidenceSource ?? null,
        latestTrustedBrowserCaptureAt: freshness.latestTrustedBrowserCaptureAt ?? null,
        trustedBrowserCaptureRowCount: freshness.trustedBrowserCaptureRowCount ?? null
      }
    }
  };
}

function summarizeCommandOutput(output) {
  const combined = [output.stdout, output.stderr, output.errorMessage].filter(Boolean).join("\n");
  return combined.length > 1600 ? `${combined.slice(0, 1600)}...[truncated]` : combined;
}

function buildStepRecord(step, output, healthReport, healthGate) {
  return {
    key: step.key,
    label: step.label,
    command: [step.command, ...step.args].join(" "),
    kind: step.kind,
    exitCode: output.exitCode,
    passed: output.exitCode === 0 && (step.kind !== "health" || healthGate?.passed === true),
    durationMs: output.durationMs,
    healthGate,
    outputSummary: summarizeCommandOutput(output)
  };
}

function reportStatus(steps, blocked) {
  if (blocked || steps.some((step) => step.passed === false)) return "error";
  if (steps.some((step) => step.healthGate?.status === "warn")) return "warn";
  return "ok";
}

function latestHealthFreshness(steps) {
  const healthSummaries = steps.map((step) => step.healthGate?.summary?.freshness).filter(Boolean);
  return healthSummaries.at(-1) ?? {
    latestRealCaptureAt: null,
    latestSmokeAt: null,
    latestAuditAt: null,
    realCaptureAgeHours: null,
    smokeAgeHours: null,
    realCaptureIsStale: null,
    smokeIsStale: null,
    staleAfterHours: null
  };
}

export async function runPlatformOpsWithHealth(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const runCommand = options.runCommand ?? defaultRunCommand;
  const generatedAt = new Date(options.now ?? Date.now()).toISOString();
  const healthReportPath = path.join(cwd, ".local", "platform-data-health", "report.json");
  const steps = [];
  let blocked = false;

  for (const step of STEP_PLAN) {
    const output = await runCommand(step, cwd);
    let healthReport = null;
    let healthGate = null;

    if (step.kind === "health" && output.exitCode === 0) {
      try {
        healthReport = readJson(healthReportPath);
        healthGate = evaluateHealthGate(healthReport);
      } catch (error) {
        healthGate = {
          passed: false,
          status: "error",
          blockingReasons: [`health report could not be read: ${error instanceof Error ? error.message : String(error)}`],
          warnings: [],
          summary: null
        };
      }
    }

    const record = buildStepRecord(step, output, healthReport, healthGate);
    steps.push(record);
    if (!record.passed) {
      blocked = true;
      break;
    }
  }

  const status = reportStatus(steps, blocked);
  const freshness = latestHealthFreshness(steps);
  const report = {
    generatedAt,
    task: "PLATFORM-HEALTH-GATE-028",
    passed: status !== "error",
    status,
    blocked,
    scope: {
      commands: STEP_PLAN.map((step) => [step.command, ...step.args].join(" ")),
      stalePolicy: "stale remains warning-only under the current 72h platform data health threshold",
      noCollection: true,
      wechatPaused: true,
      smokeDatabasePaths: SMOKE_DATABASE_PATHS
    },
    steps,
    summary: {
      stepCount: steps.length,
      plannedStepCount: STEP_PLAN.length,
      completedAllSteps: steps.length === STEP_PLAN.length,
      blockingReasons: steps.flatMap((step) => step.healthGate?.blockingReasons ?? []),
      warnings: steps.flatMap((step) => step.healthGate?.warnings ?? []),
      freshness
    },
    outputs: {
      json: REPORT_JSON,
      markdown: REPORT_MD
    }
  };

  writePlatformOpsWithHealthReport(report, { cwd });
  return report;
}

export function renderPlatformOpsWithHealthMarkdown(report) {
  const lines = [
    "# Platform Ops With Health Report",
    "",
    `Generated at: ${report.generatedAt}`,
    `Task: ${report.task}`,
    `Status: ${report.status}`,
    `Passed: ${report.passed ? "true" : "false"}`,
    "",
    "## Scope",
    "",
    "- Runs platform data health before and after local platform operation smokes.",
    "- Does not collect platform data.",
    "- Does not run WeChat Official Account / WeChat backend flows.",
    "- Treats stale health findings as warnings under the current 72h threshold.",
    "- Fails on health errors, missing evidence, or source mismatches.",
    `- Four-platform save smoke DB: \`${report.scope.smokeDatabasePaths.platformsSave}\`.`,
    `- Operations E2E smoke DB: \`${report.scope.smokeDatabasePaths.platformOperationsE2E}\`.`,
    "",
    "## Freshness Timeline",
    "",
    `- Recent real capture: ${report.summary.freshness?.latestRealCaptureAt ?? "-"}`,
    `- Recent smoke: ${report.summary.freshness?.latestSmokeAt ?? "-"}`,
    `- Recent audit: ${report.summary.freshness?.latestAuditAt ?? "-"}`,
    `- Real capture stale over ${report.summary.freshness?.staleAfterHours ?? "?"}h: ${report.summary.freshness?.realCaptureIsStale ?? "-"}`,
    `- Smoke stale over ${report.summary.freshness?.staleAfterHours ?? "?"}h: ${report.summary.freshness?.smokeIsStale ?? "-"}`,
    "",
    "## Steps",
    "",
    "| Step | Command | Exit | Gate | Result |",
    "| --- | --- | ---: | --- | --- |"
  ];

  for (const step of report.steps) {
    const gate = step.healthGate ? `${step.healthGate.status}; ${step.healthGate.blockingReasons.join("; ") || step.healthGate.warnings.join("; ") || "clean"}` : "-";
    lines.push(`| ${step.label} | \`${step.command}\` | ${step.exitCode} | ${gate} | ${step.passed ? "pass" : "fail"} |`);
  }

  lines.push("", "## Blocking Reasons", "");
  if (report.summary.blockingReasons.length === 0) lines.push("- None");
  else for (const reason of report.summary.blockingReasons) lines.push(`- ${reason}`);

  lines.push("", "## Warnings", "");
  if (report.summary.warnings.length === 0) lines.push("- None");
  else for (const warning of report.summary.warnings) lines.push(`- ${warning}`);

  lines.push(
    "",
    "## Outputs",
    "",
    `- JSON: \`${report.outputs.json}\``,
    `- Markdown: \`${report.outputs.markdown}\``,
    ""
  );
  return lines.join("\n");
}

export function writePlatformOpsWithHealthReport(report, options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const outputDir = path.join(cwd, OUTPUT_DIR);
  mkdirSync(outputDir, { recursive: true });
  const jsonPath = path.join(cwd, REPORT_JSON);
  const markdownPath = path.join(cwd, REPORT_MD);
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  writeFileSync(markdownPath, renderPlatformOpsWithHealthMarkdown(report));
  return { jsonPath, markdownPath };
}

async function runCli() {
  const report = await runPlatformOpsWithHealth();
  console.log(`Platform ops with health status: ${report.status}`);
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
