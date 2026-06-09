#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { assistedRefreshCommands, buildPlatformDataHealthReport, STALE_AFTER_HOURS } from "./platform-data-health.mjs";

const OUTPUT_DIR = ".local/real-capture-freshness";
const REPORT_JSON = `${OUTPUT_DIR}/report.json`;
const REPORT_MD = `${OUTPUT_DIR}/report.md`;

function rel(cwd, target) {
  return path.relative(cwd, target).replaceAll(path.sep, "/");
}

function valueText(value) {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

function platformStatus(platform) {
  if (platform.realCaptureStatus && platform.realCaptureStatus !== "unknown") return platform.realCaptureStatus;
  if (!platform.freshness.latestRealCaptureAt) return "missing";
  if (platform.freshness.realCaptureIsStale === true) return "stale";
  if (platform.freshness.realCaptureIsStale === false) return "fresh";
  return "unknown";
}

function platformNextAction(platform, status) {
  const commands = assistedRefreshCommands(platform.platform);
  if (status === "missing" || status === "stale") {
    return `${commands.manualStep} 然后运行 preview/save/health/freshness/audit/gate；本报告只提示命令，不自动采集。`;
  }
  if (status === "fresh") {
    return "真实采集仍在 72 小时内；需要刷新入库时先 preview，确认后再 save，并重新 audit/gate。";
  }
  return "无法判断真实采集时间；先人工确认本地采集文件，再运行 freshness/health/audit/gate。";
}

export function buildRealCaptureFreshnessReport(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const now = options.now instanceof Date ? options.now : new Date(options.now ?? Date.now());
  const health = buildPlatformDataHealthReport({ cwd, now });
  const platforms = health.platforms.map((platform) => {
    const status = platformStatus(platform);
    return {
      platform: platform.platform,
      label: platform.label,
      status,
      rawPath: platform.raw.path,
      rawCaptureCount: platform.raw.captureCount,
      trustedBrowserCaptureRowCount: platform.trustedBrowserCapture?.rowCount ?? 0,
      latestTrustedBrowserCaptureAt: platform.trustedBrowserCapture?.latestCapturedAt ?? null,
      realCaptureEvidenceSource: platform.freshness.realCaptureEvidenceSource ?? null,
      latestRealCaptureAt: platform.freshness.latestRealCaptureAt,
      realCaptureAgeHours: platform.freshness.realCaptureAgeHours,
      realCaptureIsStale: platform.freshness.realCaptureIsStale,
      latestSmokeAt: platform.freshness.latestSmokeAt,
      smokeAgeHours: platform.freshness.smokeAgeHours,
      smokeIsStale: platform.freshness.smokeIsStale,
      commands: platform.commands ?? assistedRefreshCommands(platform.platform),
      nextAction: platform.nextAction ?? platformNextAction(platform, status)
    };
  });
  const stalePlatforms = platforms.filter((platform) => platform.status === "stale").map((platform) => platform.platform);
  const missingPlatforms = platforms.filter((platform) => platform.status === "missing").map((platform) => platform.platform);
  const freshPlatforms = platforms.filter((platform) => platform.status === "fresh").map((platform) => platform.platform);
  const status = missingPlatforms.length > 0 ? "error" : stalePlatforms.length > 0 ? "warn" : "pass";

  return {
    generatedAt: now.toISOString(),
    task: "REAL-CAPTURE-REFRESH-034",
    status,
    passed: status === "pass",
    staleAfterHours: STALE_AFTER_HOURS,
    scope: {
      noCollection: true,
      browserOpened: false,
      databaseWrites: false,
      rawPayloadRead: false,
      sensitiveFieldsRead: false,
      wechatPaused: true,
      platforms: platforms.map((platform) => platform.platform)
    },
    summary: {
      platformCount: platforms.length,
      freshCount: freshPlatforms.length,
      staleCount: stalePlatforms.length,
      missingCount: missingPlatforms.length,
      freshPlatforms,
      stalePlatforms,
      missingPlatforms
    },
    platforms,
    outputs: {
      json: REPORT_JSON,
      markdown: REPORT_MD
    }
  };
}

export function renderRealCaptureFreshnessMarkdown(report) {
  const lines = [
    "# Real Capture Freshness Check",
    "",
    `Generated at: ${report.generatedAt}`,
    `Task: ${report.task}`,
    `Status: ${report.status}`,
    `Stale threshold: ${report.staleAfterHours} hours`,
    "",
    "This is a read-only local evidence check. It accepts raw real-capture evidence and user-confirmed trusted content metric rows, including trusted browser captures. It does not open a browser, collect platform data, read original response bodies, read passwords/cookies/tokens/headers, write the operating DB, or touch WeChat.",
    "",
    "## Summary",
    "",
    `- freshPlatforms: ${report.summary.freshPlatforms.join(", ") || "none"}`,
    `- stalePlatforms: ${report.summary.stalePlatforms.join(", ") || "none"}`,
    `- missingPlatforms: ${report.summary.missingPlatforms.join(", ") || "none"}`,
    "",
    "## Platform Freshness",
    "",
    "| Platform | Status | Raw captures | Trusted metric rows | Evidence source | Recent real capture | Real age h | Recent smoke | Smoke age h | Next action |",
    "| --- | --- | ---: | ---: | --- | --- | ---: | --- | ---: | --- |"
  ];

  for (const platform of report.platforms) {
    lines.push(
      `| ${platform.platform} | ${platform.status} | ${platform.rawCaptureCount} | ${platform.trustedBrowserCaptureRowCount} | ${valueText(platform.realCaptureEvidenceSource)} | ${valueText(platform.latestRealCaptureAt)} | ${valueText(platform.realCaptureAgeHours)} | ${valueText(platform.latestSmokeAt)} | ${valueText(platform.smokeAgeHours)} | ${platform.nextAction} |`
    );
  }

  lines.push(
    "",
    "## Platform Command Plan",
    "",
    "| Platform | Manual step | Preview | Save | Health | Freshness | Audit | Gate |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |"
  );

  for (const platform of report.platforms) {
    lines.push(
      `| ${platform.platform} | ${platform.commands.manualStep} | \`${platform.commands.preview}\` | \`${platform.commands.save}\` | \`${platform.commands.health}\` | \`${platform.commands.freshness}\` | \`${platform.commands.audit}\` | \`${platform.commands.gate}\` |`
    );
  }

  lines.push(
    "",
    "## Safe Refresh Loop After Manual Collection",
    "",
    "1. Manually log in outside this command and complete the platform capture/discovery step.",
    "2. Run the platform import preview command for the refreshed platform without `--save` first.",
    "3. Inspect preview summaries; do not paste original response bodies into docs or chat.",
    "4. Run the platform import command with `--save` only when the preview is accepted.",
    "5. Run `npm run health:platform-data`.",
    "6. Run `npm run check:real-capture-freshness`.",
    "7. Run `npm run audit:trusted-dashboard -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard`.",
    "8. Run `npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard`.",
    ""
  );

  return lines.join("\n");
}

export function writeRealCaptureFreshnessReport(report, options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const outputDir = path.join(cwd, OUTPUT_DIR);
  mkdirSync(outputDir, { recursive: true });
  const jsonPath = path.join(cwd, REPORT_JSON);
  const markdownPath = path.join(cwd, REPORT_MD);
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  writeFileSync(markdownPath, renderRealCaptureFreshnessMarkdown(report));
  return { jsonPath, markdownPath };
}

function runCli() {
  const report = buildRealCaptureFreshnessReport();
  const output = writeRealCaptureFreshnessReport(report);
  console.log(`Real capture freshness status: ${report.status}`);
  console.log(`JSON report: ${rel(process.cwd(), output.jsonPath)}`);
  console.log(`Markdown report: ${rel(process.cwd(), output.markdownPath)}`);
  console.log(`Stale platforms: ${report.summary.stalePlatforms.join(", ") || "none"}`);
  console.log(`Missing platforms: ${report.summary.missingPlatforms.join(", ") || "none"}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
