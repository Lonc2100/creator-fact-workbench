import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, rmdirSync, utimesSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { BilibiliPersonalProvider, CsvPresetProvider, DouyinPersonalProvider, FakeSelfMediaProvider, getAuthedBrowserProfileStatusView, ManualImportProvider, MediaCrawlerImportProvider, N8nExecutionProvider, VideoAccountPersonalProvider, WechatOfficialProvider, XiaohongshuPersonalProvider, previewBilibiliAccountMetricSnapshots } from "../src/domain/self-media/providers";
import { SqliteSelfMediaRepo } from "../src/domain/self-media/repo";
import { getSaveEnabledPlatformImportOperationPlatforms, runSelfMediaPlatformImportOperation } from "../src/domain/self-media/runtime";
import { SelfMediaService, buildDataCaptureScheduleReliability, buildTrustedAutoCaptureScheduler, generateReview, readDailyPlatformOpsGateView, readDailySelfMediaOpsView, readPlatformDataHealthView, readTrustedDashboardAuditView } from "../src/domain/self-media/service";
import { authedBrowserProfileConfigs, platformImportOperationCapabilities, resolveSelfMediaSeedMode, resolveWorkbenchDbPath } from "../src/domain/self-media/config";
import { selectDouyinCreatorCenterRows, selectXiaohongshuCreatorCenterRows, type CreatorCenterDomCandidate } from "../src/domain/self-media/providers/creator-center-row-selector";
import type { AccountMetricSnapshot, DashboardSnapshot, PlatformDataHealthView, TrustedWeeklySafeReportResponse } from "../src/domain/self-media/types";

const projectRoot = process.cwd();

type RealPreviewResult = {
  realPreviewRows: Array<{
    rowNumber: number;
    mappingConfidence: string;
    canConfirmSave: boolean;
    nativeMetrics: Record<string, unknown>;
    normalized: Record<string, unknown>;
    warnings: string[];
  }>;
};

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function zipStore(entries: Array<{ name: string; data: string }>) {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name);
    const data = Buffer.from(entry.data);
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    locals.push(local, name, data);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);
    offset += local.length + name.length + data.length;
  }
  const centralOffset = offset;
  const centralData = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralData.length, 12);
  eocd.writeUInt32LE(centralOffset, 16);
  return Buffer.concat([...locals, centralData, eocd]);
}

function xmlEscape(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function accountSnapshot(overrides: Partial<AccountMetricSnapshot> = {}): AccountMetricSnapshot {
  return {
    id: "account-snapshot-bilibili-2026-06-02-overview",
    platform: "bilibili",
    source: "bilibili_creator_center",
    date: "2026-06-02",
    views: 100,
    likes: 10,
    comments: 1,
    saves: 2,
    shares: 3,
    followersDelta: 4,
    rawEvidenceRef: "sanitized:bilibili:overview_stat_num:2026-06-02",
    updatedAt: "2026-06-02T10:00:00.000Z",
    ...overrides
  };
}

function schedulerHealthPlatform(platform: PlatformDataHealthView["platforms"][number]["platform"], label: string): PlatformDataHealthView["platforms"][number] {
  return {
    platform,
    label,
    status: "warn",
    realCaptureStatus: "missing",
    rawCaptureCount: 0,
    rawStatus: "warn",
    mappingPreview: { exists: false, status: "warn" },
    saveSmoke: { exists: false, status: "warn" },
    freshness: { latestRealCaptureAt: null, realCaptureIsStale: null },
    nextAction: "手动导入",
    commands: { manualStep: "手动导入", preview: "", save: "", health: "", freshness: "", audit: "", gate: "" },
    warnings: []
  };
}

function schedulerHealthFixture(overrides: Partial<PlatformDataHealthView> = {}): PlatformDataHealthView {
  const base: PlatformDataHealthView = {
    reportPath: ".local/platform-data-health/report.json",
    exists: true,
    status: "warn",
    generatedAt: "2026-06-07T07:00:00.000Z",
    staleAfterHours: 72,
    summary: {
      platformCount: 4,
      okCount: 0,
      warnCount: 4,
      errorCount: 0,
      missingCount: 0,
      staleCount: 4,
      realCaptureStaleCount: 4,
      sourceMismatchCount: 0,
      bilibiliPreviewOnlyOk: true,
      freshness: { latestRealCaptureAt: null, realCaptureIsStale: null, staleAfterHours: 72 }
    },
    platforms: [
      schedulerHealthPlatform("douyin", "抖音"),
      schedulerHealthPlatform("xiaohongshu", "小红书"),
      schedulerHealthPlatform("video-account", "视频号"),
      schedulerHealthPlatform("bilibili", "B站")
    ],
    bilibiliAccount: null
  };
  return { ...base, ...overrides };
}

function columnName(index: number) {
  let value = index + 1;
  let name = "";
  while (value > 0) {
    const mod = (value - 1) % 26;
    name = String.fromCharCode(65 + mod) + name;
    value = Math.floor((value - mod) / 26);
  }
  return name;
}

function createMinimalXlsx(rows: string[][]) {
  const sheetRows = rows
    .map((row, rowIndex) => {
      const cells = row
        .map((cell, cellIndex) => `<c r="${columnName(cellIndex)}${rowIndex + 1}" t="inlineStr"><is><t>${xmlEscape(cell)}</t></is></c>`)
        .join("");
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");
  return zipStore([
    { name: "[Content_Types].xml", data: '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/></Types>' },
    { name: "_rels/.rels", data: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
    { name: "xl/workbook.xml", data: '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>' },
    { name: "xl/_rels/workbook.xml.rels", data: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>' },
    { name: "xl/worksheets/sheet1.xml", data: `<?xml version="1.0" encoding="UTF-8"?><worksheet><sheetData>${sheetRows}</sheetData></worksheet>` }
  ]);
}

function writeRawCapture(rawDir: string, fileName: string, capture: unknown) {
  mkdirSync(rawDir, { recursive: true });
  writeFileSync(path.join(rawDir, fileName), JSON.stringify(capture, null, 2));
}

function publicBilibiliArchiveFields() {
  return {
    state: 0,
    state_desc: "Approved",
    state_panel: 0,
    no_public: 0,
    is_only_self: 0,
    is_space_hidden: 0,
    attrs: { no_public: 0 },
    reject_reason: ""
  };
}

type PlatformDataHealthModule = {
  buildPlatformDataHealthReport: (options?: { cwd?: string; now?: Date; platforms?: string[] }) => {
    status: string;
    summary: {
      missingCount: number;
      staleCount: number;
      realCaptureStaleCount?: number;
      bilibiliPreviewOnlyOk: boolean | null;
      freshness?: { latestRealCaptureAt: string | null; latestSmokeAt: string | null; latestAuditAt: string | null; realCaptureIsStale: boolean | null; smokeIsStale: boolean | null };
    };
    platforms: Array<{
      platform: string;
      status: string;
      warnings: string[];
      raw: { exists: boolean; captureCount: number; latestRealCaptureAt?: string | null; isStale?: boolean | null };
      freshness?: { latestRealCaptureAt: string | null; latestSmokeAt: string | null; realCaptureIsStale: boolean | null; smokeIsStale: boolean | null };
      realCaptureStatus?: string;
      nextAction?: string;
      commands?: { manualStep: string; preview: string; save: string; health: string; freshness: string; audit: string; gate: string };
      mappingPreview: { isStale: boolean | null; sourceMatches: boolean | null };
      saveSmokeReport: { isStale: boolean | null; sourceMatches: boolean | null };
    }>;
    bilibiliAccount: {
      accountPreview: { candidateCount: number | null; previewOnlyOk: boolean; status: string };
    } | null;
  };
};

async function loadPlatformDataHealthModule() {
  return (await import(pathToFileURL(path.join(process.cwd(), "scripts", "platform-data-health.mjs")).href)) as PlatformDataHealthModule;
}

type RealCaptureFreshnessModule = {
  buildRealCaptureFreshnessReport: (options?: { cwd?: string; now?: Date | string }) => {
    status: string;
    passed: boolean;
    scope: {
      noCollection: boolean;
      browserOpened: boolean;
      databaseWrites: boolean;
      rawPayloadRead: boolean;
      sensitiveFieldsRead: boolean;
      wechatPaused: boolean;
      platforms: string[];
    };
    summary: {
      freshPlatforms: string[];
      stalePlatforms: string[];
      missingPlatforms: string[];
      staleCount: number;
      missingCount: number;
    };
    platforms: Array<{
      platform: string;
      status: string;
      latestRealCaptureAt: string | null;
      realCaptureIsStale: boolean | null;
      latestSmokeAt: string | null;
      smokeIsStale: boolean | null;
      commands: { manualStep: string; preview: string; save: string; health: string; freshness: string; audit: string; gate: string };
      nextAction: string;
    }>;
  };
  renderRealCaptureFreshnessMarkdown: (report: unknown) => string;
};

async function loadRealCaptureFreshnessModule() {
  return (await import(pathToFileURL(path.join(process.cwd(), "scripts", "real-capture-freshness-check.mjs")).href)) as RealCaptureFreshnessModule;
}

type PlatformOpsWithHealthModule = {
  runPlatformOpsWithHealth: (options?: {
    cwd?: string;
    now?: string | Date;
    runCommand?: (step: { key: string; kind: string; command: string; args: string[] }, cwd: string) => Promise<{ exitCode: number; stdout?: string; stderr?: string; durationMs?: number; errorMessage?: string }> | { exitCode: number; stdout?: string; stderr?: string; durationMs?: number; errorMessage?: string };
  }) => Promise<{
    passed: boolean;
    status: string;
    blocked: boolean;
    scope: { smokeDatabasePaths?: { platformsSave: string; platformOperationsE2E: string } };
    steps: Array<{ key: string; passed: boolean; healthGate?: { status: string; blockingReasons: string[]; warnings: string[]; summary?: { freshness?: Record<string, unknown> } } }>;
    summary: { completedAllSteps: boolean; blockingReasons: string[]; warnings: string[]; freshness?: Record<string, unknown> };
  }>;
};

async function loadPlatformOpsWithHealthModule() {
  return (await import(pathToFileURL(path.join(process.cwd(), "scripts", "platform-ops-with-health-smoke.mjs")).href)) as PlatformOpsWithHealthModule;
}

type DailyPlatformOpsGateModule = {
  runDailyPlatformOpsGate: (options?: {
    cwd?: string;
    now?: string | Date;
    dashboardUrl?: string;
    dashboardJson?: string;
    runCommand?: (step: { key: string; label: string; command: string; args: string[] }, cwd: string) => Promise<{ exitCode: number; stdout?: string; stderr?: string; durationMs?: number; errorMessage?: string }> | { exitCode: number; stdout?: string; stderr?: string; durationMs?: number; errorMessage?: string };
  }) => Promise<{
    passed: boolean;
    status: string;
    blocked: boolean;
    steps: Array<{ key: string; passed: boolean; missingDashboardUrl?: boolean; summary?: { status?: string; mismatches?: string[]; trustedContentCount?: number; trustedPlatformCount?: number; platformDistribution?: Record<string, unknown>; smokeDatabasePaths?: { platformsSave: string; platformOperationsE2E: string }; freshness?: Record<string, unknown>; latestAuditAt?: string | null } | null }>;
    summary: { completedAllSteps: boolean; blockingReasons: string[]; warnings: string[]; freshness?: Record<string, unknown> };
  }>;
};

async function loadDailyPlatformOpsGateModule() {
  return (await import(pathToFileURL(path.join(process.cwd(), "scripts", "daily-platform-ops-gate.mjs")).href)) as DailyPlatformOpsGateModule;
}

type DailySelfMediaOpsModule = {
  runDailySelfMediaOps: (options?: {
    cwd?: string;
    now?: string | Date;
    dashboardUrl?: string;
    preflightHealth?: boolean;
    preflightPorts?: string;
    runCommand?: (step: { key: string; label: string; command: string; args: string[]; reportPath: string }, cwd: string) => Promise<{ exitCode: number; durationMs?: number; errorMessage?: string }> | { exitCode: number; durationMs?: number; errorMessage?: string };
  }) => Promise<{
    status: string;
    passed: boolean;
    scope: {
      serialExecution: boolean;
      noParallelSqliteReports: boolean;
      noCollection: boolean;
      browserOpened: boolean;
      platformLoginOpened: boolean;
      databaseDeletion: boolean;
      wechatPaused: boolean;
      bilibiliAccountMetricsSaved: boolean;
      commandOutputStored: boolean;
      platformSensitiveFieldsStored: boolean;
      originalResponseBodiesStored: boolean;
      trustedWeeklyRedactedOnly: boolean;
    };
    steps: Array<{ key: string; command: string; passed: boolean; reportPath: string; summary: Record<string, unknown> }>;
    sections: {
      preflightHealth: { enabled: boolean; status: string; preferredDashboardUrl: string | null; healthyPorts: number[] } | null;
      realCaptureFreshness: { status: string; summary: { stalePlatforms: string[]; missingPlatforms: string[] } } | null;
      health: { status: string } | null;
      trustedWeeklySafe: { status: string; redactedOnly: boolean; paths: { redactedJson: string; redactedMarkdown: string; localEvidenceJson: null; localEvidenceMarkdown: null } } | null;
      trustedAudit: { status: string } | null;
      dailyGate: { status: string } | null;
    };
    summary: { blockingReasons: string[]; warnings: string[]; nextActions: string[] };
    outputs: Record<string, string>;
  }>;
};

async function loadDailySelfMediaOpsModule() {
  return (await import(pathToFileURL(path.join(process.cwd(), "scripts", "daily-self-media-ops.mjs")).href)) as DailySelfMediaOpsModule;
}

type TrustedWeeklyReportModule = {
  buildTrustedWeeklyReport: (snapshot: DashboardSnapshot, options?: { now?: string | Date }) => {
    task: string;
    scope: {
      defaultScope: string;
      onlyTrustedDashboardReviewData: boolean;
      excludesAllDataLocalDebugRows: boolean;
      excludesAccountMetricSnapshots: boolean;
    };
    totals: {
      contentCount: number;
      trustedContentCount: number;
      metricSnapshotCount: number;
      views: number;
      engagement: number;
      bestPlatform: string;
    };
    platformOverview: Array<{ platform: string; views: number; engagement: number; contentCount: number; metricSnapshotCount: number }>;
    topContents: Array<{ contentId: string; title: string; views: number; engagement: number }>;
    lowInteractionContents: Array<{ contentId: string; views: number; engagementRate: number }>;
    freshness: { latestRealCaptureAt?: string | null; latestSmokeAt?: string | null; latestAuditAt?: string | null; realCaptureStaleCount: number };
    excluded: { excludedContentCount: number; excludedMetricSnapshotCount: number; userExcludedContentCount: number };
    recommendations: Array<{ title: string; summary?: string; nextAction: string }>;
    consistencyChecks: Record<string, boolean>;
  };
  buildRedactedTrustedWeeklySummary: (report: unknown) => {
    totals: { trustedContentCount: number; metricSnapshotCount: number; views: number; engagement: number };
    platformOverview: Array<{ platform: string; views: number; engagement: number; contentCount: number; metricSnapshotCount: number }>;
    topContentPerformance: Array<{ platform: string; views: number; engagement: number }>;
    lowInteractionPerformance: Array<{ platform: string; views: number; engagementRate: number }>;
    freshness: { latestRealCaptureAt?: string | null; latestSmokeAt?: string | null; latestAuditAt?: string | null; realCaptureStaleCount: number };
    excluded: { excludedContentCount: number; excludedMetricSnapshotCount: number; userExcludedContentCount: number; excludedSourceCount: number };
    redaction: { contentTitlesIncluded: false; contentIdsIncluded: false; accountMetricsIncluded: false; captureDetailsIncluded: false };
    consistencyChecks: Record<string, boolean>;
  };
  renderTrustedWeeklyMarkdown: (report: unknown) => string;
  renderRedactedTrustedWeeklyMarkdown: (summary: unknown) => string;
  writeTrustedWeeklyReport: (report: unknown, options?: { cwd?: string; outDir?: string }) => { jsonPath: string; markdownPath: string; redactedJsonPath: string; redactedMarkdownPath: string };
};

async function loadTrustedWeeklyReportModule() {
  return (await import(pathToFileURL(path.join(process.cwd(), "scripts", "trusted-weekly-report.mjs")).href)) as TrustedWeeklyReportModule;
}

type TrustedWeeklySafeReportRouteModule = {
  GET: () => Promise<Response>;
};

async function loadTrustedWeeklySafeReportRouteModule() {
  return (await import(pathToFileURL(path.join(projectRoot, "src", "app", "api", "self-media", "reports", "trusted-weekly-safe", "route.ts")).href)) as TrustedWeeklySafeReportRouteModule;
}

type LocalServerHealthModule = {
  buildLocalServerHealthReport: (options?: {
    ports?: number[];
    timeoutMs?: number;
    now?: string | Date;
    checkPage?: boolean;
    probeTcp?: (port: number, timeoutMs: number) => Promise<{ listening: boolean; durationMs: number; errorMessage?: string }> | { listening: boolean; durationMs: number; errorMessage?: string };
    fetchJson?: (url: string, timeoutMs: number) => Promise<{ ok: boolean; status: number; durationMs: number; data?: unknown; errorMessage?: string; timedOut?: boolean }> | { ok: boolean; status: number; durationMs: number; data?: unknown; errorMessage?: string; timedOut?: boolean };
    fetchPage?: (url: string, timeoutMs: number) => Promise<{ ok: boolean; status: number; durationMs: number; pageReady?: boolean; errorMessage?: string; timedOut?: boolean }> | { ok: boolean; status: number; durationMs: number; pageReady?: boolean; errorMessage?: string; timedOut?: boolean };
  }) => Promise<{
    status: string;
    passed: boolean;
    scope: { readOnly: boolean; noProcessKill: boolean; noFileDelete: boolean; noServerStart: boolean; noFullDashboardJson: boolean; noSafeMarkdownText: boolean; trustedRealCreatorCenterContentLevelOnly: boolean };
    summary: { healthyPorts: number[]; preferredDashboardUrl: string | null; apiReadyPorts: number[]; safeWeeklyReadyPorts: number[]; trustedDataReadyPorts: number[]; pageReadyPorts: number[]; timeoutPorts: number[]; oldRoutePorts: number[]; staleOrOldRoutePorts: number[]; notListeningPorts: number[]; nextActions: string[] };
    ports: Array<{
      port: number;
      healthy: boolean;
      tcp: { listening: boolean };
      issue: string;
      dashboard: { status: string; apiReady: boolean; durationMs: number | null; trustedTotals: null | { trustedContentCount: number; trustedMetricSnapshotCount: number; views: number; engagement: number } };
      safeWeekly: { status: string; apiReady: boolean; durationMs: number | null; trustedTotals: null | { trustedContentCount: number; trustedMetricSnapshotCount: number; views: number; engagement: number }; sensitiveScan: { checked: boolean; passed: boolean } };
      dashboardPage: { status: string; pageReady: boolean; durationMs: number | null };
      nextAction: string;
    }>;
  }>;
  renderLocalServerHealthMarkdown: (report: unknown) => string;
};

async function loadLocalServerHealthModule() {
  return (await import(pathToFileURL(path.join(projectRoot, "scripts", "local-server-health.mjs")).href)) as LocalServerHealthModule;
}

type DailyOpsRedactedSummaryModule = {
  runDailyOpsRedactedSummary: (options?: { cwd?: string; now?: string | Date; outputJson?: string; outputMarkdown?: string }) => {
    summary: {
      status: string;
      passed: boolean;
      scope: {
        readOnly: boolean;
        serverStarted: boolean;
        processKilled: boolean;
        platformCollection: boolean;
        platformPublishing: boolean;
        databaseDeletion: boolean;
        databaseMigration: boolean;
        fullLocalReportsIncluded: boolean;
        platformResponseBodiesIncluded: boolean;
        platformInteractionTextIncluded: boolean;
        contentTitlesIncluded: boolean;
      };
      blockingReasons: string[];
      warnings: string[];
      nextActions: string[];
      sections: {
        dailyOps: { status: string; warnings: string[]; nextActions: string[] };
        localServerHealth: { status: string; healthyPorts: number[]; trustedDataReadyPorts: number[]; pageReadyPorts: number[] };
        platformDataHealth: { status: string; summary: { staleCount: number }; platforms: Array<{ platform: string; warningCount: number }> };
        realCaptureFreshness: { status: string; summary: { stalePlatforms: string[]; staleCount: number } };
        trustedWeeklySafe: { status: string; totals: { trustedContentCount: number; metricSnapshotCount: number; views: number; engagement: number }; redaction: { titlesIncluded: boolean; idsIncluded: boolean } };
        trustedDashboardAudit: { status: string; mismatchCount: number; totals: { trustedContentCount: number; metricSnapshotCount: number; views: number; engagement: number } };
      };
    };
    outputs: { jsonPath: string; markdownPath: string };
  };
};

async function loadDailyOpsRedactedSummaryModule() {
  return (await import(pathToFileURL(path.join(projectRoot, "scripts", "daily-ops-redacted-summary.mjs")).href)) as DailyOpsRedactedSummaryModule;
}

type PlatformOperationsE2ESmokeModule = {
  resolvePlatformOperationsE2ESmokePlan: (env?: Record<string, string | undefined>) => {
    mode: "reuse" | "isolated";
    baseUrl: string | null;
    defaultReuseUrl: string;
    smokeDbPath: string | null;
    seedMode: string | null;
  };
};

async function loadPlatformOperationsE2ESmokeModule() {
  return (await import(pathToFileURL(path.join(process.cwd(), "scripts", "platform-operations-e2e-smoke.mjs")).href)) as PlatformOperationsE2ESmokeModule;
}

type OperatingActionToContentE2EModule = {
  resolveOperatingActionToContentE2EPlan: (env?: Record<string, string | undefined>) => {
    mode: "isolated";
    smokeDbPath: string;
    seedMode: string;
    portStart: number;
    screenshotPath: string;
    reportPath: string;
  };
};

async function loadOperatingActionToContentE2EModule() {
  return (await import(pathToFileURL(path.join(process.cwd(), "scripts", "operating-e2e-action-to-content.mjs")).href)) as OperatingActionToContentE2EModule;
}

function writeJsonSummary(filePath: string, value: unknown) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function cleanSelfMediaSmokeEnv(extra: Record<string, string> = {}) {
  const env: NodeJS.ProcessEnv = { ...process.env };
  delete env.SELF_MEDIA_DB_PATH;
  delete env.SELF_MEDIA_SEED_MODE;
  delete env.SELF_MEDIA_PROFILE;
  delete env.SELF_MEDIA_PLATFORM_SMOKE_DB_PATH;
  delete env.PLATFORM_OPERATIONS_E2E_SMOKE_DB_PATH;
  delete env.SMOKE_BASE_URL;
  return { ...env, ...extra };
}

function seedTrustedFourPlatformMainDb(dbPath: string) {
  const repo = new SqliteSelfMediaRepo(dbPath);
  try {
    const service = new SelfMediaService(repo);
    const rows = [
      { source: "douyin_creator_center", id: "dy-real-isolation-1", platform: "douyin", title: "Douyin real isolation row", views: 100 },
      { source: "xiaohongshu_creator_center", id: "xhs-real-isolation-1", platform: "xiaohongshu", title: "Xiaohongshu real isolation row", views: 200 },
      { source: "video_account_creator_center", id: "va-real-isolation-1", platform: "video_account", title: "Video Account real isolation row", views: 300 },
      { source: "bilibili_creator_center", id: "bili-real-isolation-1", platform: "bilibili", title: "Bilibili real isolation row", views: 400 }
    ] as const;
    for (const row of rows) {
      service.importPayload({
        source: row.source,
        contents: [{ id: row.id, title: row.title, platform: row.platform, status: "published", format: "short_video", topic: "trusted operating", publishedAt: "2026-06-03T09:00:00.000Z" }],
        metrics: [{ id: `metric-${row.id}`, contentId: row.id, platform: row.platform, capturedAt: "2026-06-03T10:00:00.000Z", views: row.views, likes: 10, comments: 2, saves: 3, shares: 4, followersDelta: 0 }]
      });
    }
  } finally {
    repo.close();
  }
}

function writeUnifiedPlatformSmokeFixtures(rootDir: string) {
  writeRawCapture(path.join(rootDir, ".local", "douyin-personal-v0", "raw"), "personal-list.json", {
    file: "raw/personal-list.json",
    capturedAt: "2026-06-03T14:48:00.000Z",
    urlSanitized: "https://creator.douyin.com/web/api/creator/item/list",
    body: {
      items: [
        {
          id: "dy-unified-smoke-1",
          description: "抖音统一烟测作品",
          create_time: "1779004829",
          metrics: { view_count: "456", like_count: "12", comment_count: "4", share_count: "3", favorite_count: "2" }
        }
      ]
    }
  });
  writeRawCapture(path.join(rootDir, ".local", "xiaohongshu-personal-v0", "raw"), "note-base.json", {
    file: "raw/note-base.json",
    capturedAt: "2026-06-03T16:54:00.000Z",
    urlSanitized: "https://creator.xiaohongshu.com/api/galaxy/creator/datacenter/note/base?note_id=xhs-unified-smoke-1",
    body: {
      data: {
        view_count: 321,
        like_count: 22,
        comment_count: 4,
        collect_count: 18,
        share_count: 3,
        rise_fans_count: 2,
        note_info: { id: "xhs-unified-smoke-1", desc: "小红书统一烟测笔记", type: "NORMAL", post_time: 1780314116000 }
      }
    }
  });
  writeRawCapture(path.join(rootDir, ".local", "video-account-personal-v0", "raw"), "content-post-list.json", {
    file: "raw/content-post-list.json",
    capturedAt: "2026-06-03T16:56:00.000Z",
    urlSanitized: "https://channels.weixin.qq.com/micro/content/cgi-bin/mmfinderassistant-bin/post/post_list",
    body: {
      data: {
        list: [
          {
            objectId: "export/video-unified-smoke-1",
            createTime: 1780314367,
            readCount: 1024,
            likeCount: 88,
            commentCount: 6,
            forwardCount: 7,
            favCount: 9,
            followCount: 3,
            desc: { shortTitle: "视频号统一烟测作品" }
          }
        ]
      }
    }
  });
  const bilibiliRaw = path.join(rootDir, ".local", "bilibili-personal-v0", "raw");
  writeRawCapture(bilibiliRaw, "archives.json", {
    file: "raw/archives.json",
    capturedAt: "2026-06-04T03:25:41.118Z",
    urlSanitized: "https://member.bilibili.com/x/vupre/web/oversea/archives",
    body: {
      data: {
        arc_audits: [
          {
            Archive: { aid: 116658358257524, bvid: "BVUnifiedSmokeOne", title: "B站统一烟测 archives", ptime: 1780314116, comment_content: "raw comment secret", ...publicBilibiliArchiveFields() },
            stat: { view: 1500, like: 30, reply: 4, favorite: 11, share: 12 },
            danmu_text: "danmu text secret"
          }
        ]
      }
    }
  });
  writeRawCapture(bilibiliRaw, "overview-num.json", {
    file: "raw/overview-num.json",
    capturedAt: "2026-06-04T03:25:54.846Z",
    urlSanitized: "https://member.bilibili.com/c/data/oversea/web/overview/stat/num",
    body: { data: { play: 999999, like: 888888, comment: 777777, fav: 666666, share: 555555, fan: 444444, log_date: "2026-06-02" } }
  });
  writeRawCapture(bilibiliRaw, "survey.json", {
    file: "raw/survey.json",
    capturedAt: "2026-06-04T03:25:54.902Z",
    urlSanitized: "https://member.bilibili.com/c/data/oversea/web/survey",
    body: { data: { "20260602": { arc_inc: [{ aid: 116658358257524, bvid: "BVUnifiedSmokeOne", play: 999999 }], arc_play: [{ aid: 116658358257524, play: 888888 }] } } }
  });
}

test("fake provider maps external sample data into internal self-media payload", async () => {
  const payload = await new FakeSelfMediaProvider().importSample();
  assert.equal(payload.source, "fake");
  assert.ok(payload.contents.length >= 3);
  assert.ok(payload.metrics.every((metric) => metric.contentId.length > 0));
  assert.ok(payload.ideas?.some((idea) => idea.title.includes("复盘")));
});

test("manual csv provider returns content and metric contracts", () => {
  const csv = [
    "id,title,platform,status,format,topic,views,likes,comments,saves,shares,followersDelta",
    "csv-1,测试内容,douyin,published,short_video,AI短片,100,10,2,3,1,1"
  ].join("\n");
  const payload = new ManualImportProvider().fromCsv(csv);
  assert.equal(payload.source, "csv");
  assert.equal(payload.contents[0].title, "测试内容");
  assert.equal(payload.metrics[0].views, 100);
});

test("platform csv presets map exported rows into internal content and metrics", () => {
  const provider = new CsvPresetProvider();
  const cases = [
    ["douyin", "作品ID,标题,发布时间,播放量,点赞数,评论数,收藏数,分享数,涨粉\ndy-1,抖音导出,2026-06-01T09:00:00.000Z,100,10,2,3,1,1", "douyin"],
    ["xiaohongshu", "笔记ID,标题,发布时间,浏览量,点赞,评论,收藏,分享,涨粉\nxhs-1,小红书导出,2026-06-01T09:00:00.000Z,200,20,4,30,2,2", "xiaohongshu"],
    ["wechat", "文章ID,标题,发布时间,阅读,点赞,评论,收藏,分享,涨粉\nwx-1,公众号导出,2026-06-01T09:00:00.000Z,300,30,6,9,3,3", "wechat"],
    ["video_account", "视频ID,标题,发布时间,播放,点赞,评论,收藏,转发,涨粉\nva-1,视频号导出,2026-06-01T09:00:00.000Z,400,40,8,12,4,4", "video_account"],
    ["bilibili", "稿件ID,标题,发布时间,播放,点赞,评论,收藏,分享,涨粉\nbili-1,B站导出,2026-06-01T09:00:00.000Z,500,50,10,15,5,5", "bilibili"]
  ] as const;
  for (const [preset, csv, platform] of cases) {
    const payload = provider.fromCsv(csv, preset);
    assert.equal(payload.source, "csv");
    assert.equal(payload.contents[0].platform, platform);
    assert.equal(payload.metrics[0].platform, platform);
    assert.ok(payload.metrics[0].views > 0);
  }
});

test("real platform preview preserves native metrics and mapping confidence", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-real-preview-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    const cases = [
      {
        preset: "douyin",
        csv: "item_id,title,create_time,play_count,digg_count,comment_count,share_count,forward_count,download_count\ndy-real-1,抖音真实字段,2026-06-01T09:00:00.000Z,1000,100,10,8,3,2",
        confidence: "confirmed_official",
        nativeKey: "forward_count"
      },
      {
        preset: "wechat",
        csv: "msgid,title,发布时间,ref_date,int_page_read_count,int_page_read_user,share_count,share_user,add_to_fav_count,cancel_user\nwx-real-1,公众号真实字段,2026-06-01T09:00:00.000Z,2026-06-02,800,600,9,7,11,1",
        confidence: "confirmed_official",
        nativeKey: "int_page_read_user"
      },
      {
        preset: "bilibili",
        csv: "bvid,title,pubdate,view,like,reply,favorite,share,danmaku,coin\nBVreal1,B站真实字段,2026-06-01T09:00:00.000Z,2000,200,20,60,12,18,30",
        confidence: "mature_reference",
        nativeKey: "danmaku"
      },
      {
        preset: "xiaohongshu",
        csv: "note_id,title,publish_time,view_count,liked_count,comment_count,collected_count,share_count,曝光量,流量来源\nxhs-real-1,小红书真实字段,2026-06-01T09:00:00.000Z,700,70,7,30,4,1400,搜索",
        confidence: "draft_realistic",
        nativeKey: "曝光量"
      },
      {
        preset: "video_account",
        csv: "feed_id,title,publish_time,play_count,like_count,comment_count,favorite_count,share_count,朋友圈转发,公众号阅读转化\nva-real-1,视频号真实字段,2026-06-01T09:00:00.000Z,900,90,9,12,6,2,5",
        confidence: "draft_realistic",
        nativeKey: "朋友圈转发"
      }
    ] as const;
    for (const item of cases) {
      const preview = service.previewImportRequest({ mode: "csv", preset: item.preset, csv: item.csv }) as RealPreviewResult & { contentCount: number };
      assert.equal(preview.contentCount, 1);
      assert.equal(preview.realPreviewRows[0].mappingConfidence, item.confidence);
      assert.equal(preview.realPreviewRows[0].canConfirmSave, true);
      assert.ok(preview.realPreviewRows[0].nativeMetrics[item.nativeKey] !== undefined);
    }
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("real import preview reads xlsx files without saving native raw fields", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-xlsx-preview-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    const xlsx = createMinimalXlsx([
      ["作品ID", "标题", "发布时间", "播放量", "点赞数", "评论数", "分享数", "下载数"],
      ["xlsx-dy-1", "XLSX 抖音导入", "2026-06-01T09:00:00.000Z", "1234", "88", "6", "5", "2"]
    ]);
    const beforeRuns = repo.listImports().length;
    const preview = service.previewImportRequest({
      mode: "csv",
      preset: "douyin",
      fileName: "douyin-export.xlsx",
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      fileBase64: xlsx.toString("base64")
    } as never) as RealPreviewResult & { contentCount: number; metricCount: number };
    assert.equal(preview.contentCount, 1);
    assert.equal(preview.metricCount, 1);
    assert.equal(preview.realPreviewRows[0].normalized.views, 1234);
    assert.equal(preview.realPreviewRows[0].nativeMetrics["下载数"], "2");
    assert.equal(repo.listImports().length, beforeRuns);
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("real import preview flags rows missing title or native id/url as not confirmable", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-invalid-real-preview-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    const preview = service.previewImportRequest({
      mode: "csv",
      preset: "douyin",
      csv: ["作品ID,标题,播放量", "dy-no-title,,100", ",只有标题没有ID,200"].join("\n")
    }) as RealPreviewResult & { contentCount: number; warnings: string[] };
    assert.equal(preview.contentCount, 0);
    assert.equal(preview.realPreviewRows.length, 2);
    assert.equal(preview.realPreviewRows.every((row) => row.canConfirmSave === false), true);
    assert.ok(preview.realPreviewRows[0].warnings.includes("missing_title"));
    assert.ok(preview.realPreviewRows[1].warnings.includes("missing_native_id_or_url"));
    assert.ok(preview.warnings.length >= 2);
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("mediacrawler json provider creates content, metrics, and idea signals", () => {
  const payload = new MediaCrawlerImportProvider().fromJson({
    platform: "xhs",
    items: [{ note_id: "mc-1", title: "爆款AI工具笔记", liked_count: 80, comment_count: 9, collected_count: 40, share_count: 7, keyword: "AI工具" }]
  });
  assert.equal(payload.source, "mediacrawler");
  assert.equal(payload.contents[0].platform, "xiaohongshu");
  assert.equal(payload.metrics[0].likes, 80);
  assert.ok(payload.ideas?.[0].title.includes("爆款AI工具笔记"));
});

test("n8n execution provider records workflow source and metrics", () => {
  const payload = new N8nExecutionProvider().fromJson({
    executionId: "exec-test",
    workflowName: "平台导出同步",
    items: [{ id: "n8n-1", title: "n8n同步内容", platform: "douyin", views: 700, likes: 33 }]
  });
  assert.equal(payload.source, "n8n");
  assert.equal(payload.contents[0].notes, "n8n:平台导出同步:exec-test");
  assert.equal(payload.metrics[0].views, 700);
  assert.ok(payload.warnings?.some((item) => item.includes("exec-test")));
});

test("wechat official provider reads token and analytics contracts without leaking secrets", async () => {
  const calls: Array<{ url: string; body?: string }> = [];
  const fakeFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, body: typeof init?.body === "string" ? init.body : undefined });
    if (url.includes("/cgi-bin/token")) return Response.json({ access_token: "test-token", expires_in: 7200 });
    if (url.includes("/datacube/getarticlesummary")) return Response.json({ list: [{ ref_date: "2026-06-01", title: "测试文章", int_page_read_count: 12, share_count: 2 }] });
    if (url.includes("/datacube/getusersummary")) return Response.json({ list: [{ ref_date: "2026-06-01", new_user: 1, cancel_user: 0 }] });
    return Response.json({ errcode: 40013, errmsg: "invalid appid" });
  }) as typeof fetch;
  const provider = new WechatOfficialProvider({ appId: "wx-test", appSecret: "secret-test" }, fakeFetch);
  const token = await provider.getAccessToken();
  const article = await provider.getArticleSummary(token.accessToken, "2026-06-01", "2026-06-01");
  const users = await provider.getUserSummary(token.accessToken, "2026-06-01", "2026-06-01");
  assert.equal(token.expiresIn, 7200);
  assert.equal(article[0].int_page_read_count, 12);
  assert.equal(users[0].new_user, 1);
  assert.ok(calls[0].url.includes("secret=secret-test"));
});

test("wechat official sync stores articles as internal content and dated snapshots", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-wechat-sync-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    const fakeFetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/cgi-bin/token")) return Response.json({ access_token: "test-token", expires_in: 7200 });
      if (url.includes("/datacube/getarticlesummary")) {
        return Response.json({
          list: [
            {
              ref_date: "2026-06-01",
              msgid: "wechat-msg-1",
              title: "公众号官方同步测试",
              int_page_read_count: 128,
              share_count: 6,
              add_to_fav_count: 9
            }
          ]
        });
      }
      if (url.includes("/datacube/getusersummary")) return Response.json({ list: [{ ref_date: "2026-06-01", new_user: 3, cancel_user: 1 }] });
      return Response.json({ errcode: 40013, errmsg: "invalid appid" });
    }) as typeof fetch;
    const provider = new WechatOfficialProvider({ appId: "wx-test", appSecret: "secret-test", accountId: "gh-test" }, fakeFetch);
    const result = await service.syncWechatOfficialAnalytics({ beginDate: "2026-06-01", endDate: "2026-06-01", accountId: "gh-test" }, provider);
    const snapshot = await service.dashboard();
    assert.equal(result.importResult.run.status, "success");
    assert.equal(result.articleRows, 1);
    assert.equal(result.userRows, 1);
    assert.ok(repo.listContents().some((item) => item.title === "公众号官方同步测试" && item.platform === "wechat"));
    assert.ok(repo.listPlatformVersions().some((item) => result.contentIds.includes(item.contentId) && item.platform === "wechat"));
    assert.ok(repo.listMetricSnapshots().some((item) => result.snapshotIds.includes(item.id) && item.views === 128 && item.shares === 6 && item.saves === 9));
    assert.equal(snapshot.contents.some((item) => item.platform === "wechat"), false);
    assert.equal(snapshot.metricSnapshots.some((item) => item.source === "wechat_official"), false);
    assert.equal(snapshot.weeklyReview.metrics.totalViews, 0);
    assert.ok(snapshot.realDataScope.excludedSources.some((item) => item.source === "wechat_official"));
    assert.ok(snapshot.imports.some((item) => item.id === result.importResult.run.id && item.source === "wechat_official"));
    assert.ok(snapshot.logs.some((log) => log.event === "self_media.wechat_official_sync"));
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("douyin personal provider maps sanitized creator captures into internal payload", () => {
  const captures = [
    {
      file: "raw/personal-list.json",
      capturedAt: "2026-06-03T14:48:00.000Z",
      urlSanitized: "https://creator.douyin.com/web/api/creator/item/list",
      body: {
        items: [
          {
            id: "dy-own-1",
            description: "个人作品一",
            create_time: "1779004829",
            cover: { url_list: ["https://example.com/cover-one.webp"] },
            metrics: { view_count: "1200", like_count: "80", comment_count: "9", share_count: "5", favorite_count: "12" }
          },
          {
            id: "dy-own-2",
            description: "个人作品二",
            create_time: "2026-05-17 16:00",
            cover: { url_list: ["https://example.com/cover-two.webp"] }
          }
        ]
      }
    },
    {
      file: "raw/item-performance.json",
      capturedAt: "2026-06-03T14:49:00.000Z",
      urlSanitized: "https://creator.douyin.com/janus/douyin/creator/data/item_analysis/item_performance",
      body: { items: [{ item_id: "dy-own-2", title: "个人作品二标题", publish_time: "2026-05-17 16:00", play_count: "249" }] }
    },
    {
      file: "raw/hot-video.json",
      capturedAt: "2026-06-03T14:50:00.000Z",
      urlSanitized: "https://creator.douyin.com/dp/douyin/v1/creator/item/hot_video",
      body: {
        data: [
          { ItemId: "dy-own-2", ItemTitle: "个人作品二补充", ItemUrl: "https://www.douyin.com/share/video/dy-own-2", ItemCoverUrl: "https://example.com/cover-two-hot.webp", PlayCount: 300, LikeCount: 20, CommentCount: 3, ShareCount: 2 },
          { ItemId: "public-hot-1", ItemTitle: "公共热点不入库", PlayCount: 999 }
        ]
      }
    }
  ];
  const payload = new DouyinPersonalProvider().fromCaptures(captures);
  assert.equal(payload.source, "douyin_creator_center");
  assert.equal(payload.contents.length, 2);
  assert.equal(payload.metrics.length, 2);
  assert.equal(payload.contents.find((item) => item.id === "dy-own-1")?.publishedAt, "2026-05-17T08:00:29.000Z");
  assert.ok(payload.contents.find((item) => item.id === "dy-own-2")?.notes?.includes("raw/item-performance.json"));
  assert.equal(payload.metrics.find((item) => item.contentId === "dy-own-1")?.views, 1200);
  assert.equal(payload.metrics.find((item) => item.contentId === "dy-own-1")?.likes, 80);
  assert.equal(payload.metrics.find((item) => item.contentId === "dy-own-2")?.views, 300);
  assert.equal(payload.metrics.find((item) => item.contentId === "dy-own-2")?.comments, 3);
  assert.ok(payload.warnings?.some((item) => item.includes("skipped 1 hot_video")));
});

test("douyin personal captures import into metric snapshots without raw payload persistence", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-douyin-personal-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    const result = service.importDouyinPersonalCaptures([
      {
        file: "raw/personal-list.json",
        capturedAt: "2026-06-03T14:48:00.000Z",
        urlSanitized: "https://creator.douyin.com/web/api/creator/item/list",
        body: {
          items: [
            {
              id: "dy-import-1",
              description: "导入作品",
              create_time: "1779004829",
              cover: { url_list: ["https://example.com/cover.webp"] },
              metrics: { view_count: "456", like_count: "12", comment_count: "4", share_count: "3", favorite_count: "2" }
            }
          ]
        }
      }
    ]);
    const snapshot = repo.listMetricSnapshots().find((item) => item.contentId === "dy-import-1");
    assert.equal(result.run.source, "douyin_creator_center");
    assert.equal(repo.listContents().find((item) => item.id === "dy-import-1")?.platform, "douyin");
    assert.equal(snapshot?.source, "douyin_creator_center");
    assert.equal(snapshot?.views, 456);
    assert.equal(snapshot?.likes, 12);
    assert.equal(snapshot?.comments, 4);
    assert.equal(snapshot?.shares, 3);
    assert.ok(repo.listContents().find((item) => item.id === "dy-import-1")?.notes?.includes("raw/personal-list.json"));
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("douyin authed browser visible rows import content metrics without saving login material", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-douyin-browser-capture-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    const rows = [
      {
        id: "7134567890123456789",
        nativeId: "7134567890123456789",
        title: "抖音登录后抓取闭环",
        publishedAt: "2026-06-01T09:00:00.000Z",
        capturedAt: "2026-06-07T10:00:00.000Z",
        views: 2300,
        likes: 188,
        comments: 26,
        saves: 41,
        shares: 17,
        followersDelta: 0,
        itemUrl: "https://www.douyin.com/video/dy-browser-085?token=should-not-save",
        extractionSource: "visible_dom" as const,
        sourcePageKind: "creator_center_owned_works" as const,
        confidence: "owned_creator_center_row" as const,
        nativeIdConfidence: "stable_platform_id" as const,
        warnings: []
      }
    ];

    const previewPayload = service.parseDouyinBrowserVisibleRows(rows);
    assert.equal(previewPayload.source, "douyin_creator_center");
    assert.equal(previewPayload.contents.length, 1);
    assert.equal(previewPayload.metrics[0].views, 2300);
    assert.ok(previewPayload.warnings?.some((item) => item.includes("douyin_authed_browser_capture")));

    const result = service.importDouyinBrowserVisibleRows(rows, {
      isTestFixture: false,
      operationKind: "platform_save",
      trustedScopeEligible: true,
      dataDomain: "user_work"
    });
    const snapshot = repo.listMetricSnapshots().find((item) => item.contentId === "7134567890123456789");
    const dashboard = await service.dashboard();
    assert.equal(result.run.status, "success");
    assert.equal(result.run.source, "douyin_creator_center");
    assert.equal(snapshot?.source, "douyin_creator_center");
    assert.equal(snapshot?.dataDomain, "user_work");
    assert.equal(snapshot?.views, 2300);
    assert.equal(repo.getEntity("contents", "7134567890123456789")?.dataDomain, "user_work");
    assert.ok(dashboard.contents.some((item) => item.id === "7134567890123456789"));
    assert.ok(dashboard.metricSnapshots.some((item) => item.contentId === "7134567890123456789" && item.source === "douyin_creator_center"));
    assert.equal(dashboard.weeklyReview.metrics.totalViews, 2300);
    assert.doesNotMatch(JSON.stringify(repo.listMetricSnapshots()), /cookie|token|header|raw request|should-not-save/i);
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("xiaohongshu authed browser visible rows import trusted note metrics without saving login material", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-xiaohongshu-browser-capture-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    const rows = [
      {
        id: "66abc123456789000001",
        nativeId: "66abc123456789000001",
        title: "小红书登录后抓取闭环",
        publishedAt: "2026-06-01T09:00:00.000Z",
        capturedAt: "2026-06-07T10:00:00.000Z",
        views: 1200,
        likes: 166,
        comments: 18,
        saves: 90,
        shares: 12,
        followersDelta: 0,
        noteUrl: "https://creator.xiaohongshu.com/note/xhs-browser-086?token=should-not-save",
        format: "image_text" as const,
        extractionSource: "visible_dom" as const,
        sourcePageKind: "creator_center_owned_works" as const,
        confidence: "owned_creator_center_row" as const,
        nativeIdConfidence: "stable_platform_id" as const,
        warnings: []
      }
    ];

    const previewPayload = service.parseXiaohongshuBrowserVisibleRows(rows);
    assert.equal(previewPayload.source, "xiaohongshu_creator_center");
    assert.equal(previewPayload.contents.length, 1);
    assert.equal(previewPayload.contents[0].platform, "xiaohongshu");
    assert.equal(previewPayload.contents[0].format, "image_text");
    assert.equal(previewPayload.metrics[0].views, 1200);
    assert.ok(previewPayload.warnings?.some((item) => item.includes("xiaohongshu_authed_browser_capture")));

    const result = service.importXiaohongshuBrowserVisibleRows(rows, {
      isTestFixture: false,
      operationKind: "platform_save",
      trustedScopeEligible: true,
      dataDomain: "user_work"
    });
    const snapshot = repo.listMetricSnapshots().find((item) => item.contentId === "66abc123456789000001");
    const dashboard = await service.dashboard();
    assert.equal(result.run.status, "success");
    assert.equal(result.run.source, "xiaohongshu_creator_center");
    assert.equal(snapshot?.source, "xiaohongshu_creator_center");
    assert.equal(snapshot?.dataDomain, "user_work");
    assert.equal(snapshot?.views, 1200);
    assert.equal(repo.getEntity("contents", "66abc123456789000001")?.dataDomain, "user_work");
    assert.ok(dashboard.contents.some((item) => item.id === "66abc123456789000001"));
    assert.ok(dashboard.metricSnapshots.some((item) => item.contentId === "66abc123456789000001" && item.source === "xiaohongshu_creator_center"));
    assert.equal(dashboard.weeklyReview.metrics.totalViews, 1200);
    assert.doesNotMatch(JSON.stringify(repo.listContents()), /cookie|token|header|raw request|should-not-save/i);
    assert.doesNotMatch(JSON.stringify(repo.listMetricSnapshots()), /cookie|token|header|raw request|should-not-save/i);
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("authed browser fallback id preview rows do not enter trusted dashboard or calendar", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-browser-fallback-id-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    const douyinRows = [
      {
        id: "dy-browser-fallback-low-confidence",
        title: "抖音 fallback 预览行",
        capturedAt: "2026-06-07T10:00:00.000Z",
        views: 2300,
        likes: 188,
        comments: 26,
        saves: 41,
        shares: 17,
        followersDelta: 0,
        extractionSource: "visible_dom" as const,
        sourcePageKind: "creator_center_owned_works" as const,
        confidence: "owned_creator_center_row" as const,
        nativeIdConfidence: "fallback_text_hash" as const,
        warnings: ["fallback_id_from_visible_text"]
      },
      {
        id: "semiTab1",
        nativeId: "semiTab1",
        title: "投稿作品直播场次投稿分析投稿列表 体裁全部发布时间 ~ 投稿概览导出数据周期内投稿量",
        capturedAt: "2026-06-07T10:00:00.000Z",
        views: 1057,
        likes: 2600,
        comments: 110,
        saves: 0,
        shares: 340,
        followersDelta: 0,
        extractionSource: "visible_dom" as const,
        sourcePageKind: "creator_center_owned_works" as const,
        confidence: "owned_creator_center_row" as const,
        nativeIdConfidence: "stable_platform_id" as const,
        warnings: []
      }
    ];
    const xiaohongshuRows = [
      {
        id: "xhs-browser-public-low-confidence",
        title: "小红书公开页预览行",
        capturedAt: "2026-06-07T10:00:00.000Z",
        views: 1200,
        likes: 166,
        comments: 18,
        saves: 90,
        shares: 12,
        followersDelta: 0,
        format: "image_text" as const,
        extractionSource: "visible_dom" as const,
        sourcePageKind: "public_creator_home" as const,
        confidence: "fallback_visible_card" as const,
        nativeIdConfidence: "visible_platform_id" as const,
        warnings: ["not_creator_center_owned_works_page"]
      },
      {
        id: "notes-request",
        nativeId: "notes-request",
        title: "全部 6已发布审核中未通过00:24AI机甲大片感，终于有一点出来了2026-06-05 19:5551803014000:10末日来临的那一刻",
        publishedAt: "2026-06-05T11:55:00.000Z",
        capturedAt: "2026-06-07T10:00:00.000Z",
        views: 0,
        likes: 0,
        comments: 0,
        saves: 0,
        shares: 2026,
        followersDelta: 0,
        format: "image_text" as const,
        extractionSource: "visible_dom" as const,
        sourcePageKind: "creator_center_owned_works" as const,
        confidence: "owned_creator_center_row" as const,
        nativeIdConfidence: "stable_platform_id" as const,
        warnings: []
      }
    ];

    const douyinPreview = service.parseDouyinBrowserVisibleRows(douyinRows);
    const xiaohongshuPreview = service.parseXiaohongshuBrowserVisibleRows(xiaohongshuRows);
    assert.equal(douyinPreview.contents.length, 0);
    assert.equal(douyinPreview.metrics.length, 0);
    assert.equal(xiaohongshuPreview.contents.length, 0);
    assert.equal(xiaohongshuPreview.metrics.length, 0);
    assert.ok(douyinPreview.warnings?.some((item) => /skipped 2 preview rows/.test(item)));
    assert.ok(xiaohongshuPreview.warnings?.some((item) => /skipped 2 preview rows/.test(item)));

    service.importDouyinBrowserVisibleRows(douyinRows, {
      isTestFixture: false,
      operationKind: "platform_save",
      trustedScopeEligible: true,
      dataDomain: "user_work"
    });
    service.importXiaohongshuBrowserVisibleRows(xiaohongshuRows, {
      isTestFixture: false,
      operationKind: "platform_save",
      trustedScopeEligible: true,
      dataDomain: "user_work"
    });
    const dashboard = await service.dashboard();
    assert.equal(dashboard.contents.some((item) => item.id === "dy-browser-fallback-low-confidence"), false);
    assert.equal(dashboard.contents.some((item) => item.id === "xhs-browser-public-low-confidence"), false);
    assert.equal(dashboard.contents.some((item) => item.id === "semiTab1"), false);
    assert.equal(dashboard.contents.some((item) => item.id === "notes-request"), false);
    assert.equal(dashboard.metricSnapshots.some((item) => item.contentId === "dy-browser-fallback-low-confidence"), false);
    assert.equal(dashboard.metricSnapshots.some((item) => item.contentId === "xhs-browser-public-low-confidence"), false);
    assert.equal(dashboard.metricSnapshots.some((item) => item.contentId === "semiTab1"), false);
    assert.equal(dashboard.metricSnapshots.some((item) => item.contentId === "notes-request"), false);
    assert.equal(service.calendar().some((item) => item.contentId === "dy-browser-fallback-low-confidence" || item.contentId === "xhs-browser-public-low-confidence" || item.contentId === "semiTab1" || item.contentId === "notes-request"), false);
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("creator-center row selectors accept only stable owned row candidates with same-row metrics", () => {
  const capturedAt = "2026-06-08T08:00:00.000Z";
  const douyinCandidates: CreatorCenterDomCandidate[] = [
    {
      text: "投稿作品直播场次投稿分析投稿列表 数据周期内投稿量 作品标题一 播放 1057 点赞 2600 评论 110 收藏 0 分享 340",
      className: "semiTab list-container",
      idAttr: "semiTab1",
      hrefs: [],
      dataValues: ["semiTab1"],
      cells: ["投稿作品直播场次", "作品标题一", "播放", "1057", "点赞", "2600", "评论", "110"],
      childCandidateCount: 2
    },
    {
      text: "脱敏抖音作品标题 2026-06-01 播放 1,057 点赞 26 评论 3 收藏 4 分享 5",
      tagName: "tr",
      role: "row",
      titleAttr: "脱敏抖音作品标题",
      hrefs: ["https://www.douyin.com/video/7420123456789012345"],
      dataValues: ["7420123456789012345"],
      cells: ["脱敏抖音作品标题", "2026-06-01", "1,057", "26", "3", "4", "5"],
      childCandidateCount: 0
    }
  ];
  const xiaohongshuCandidates: CreatorCenterDomCandidate[] = [
    {
      text: "全部 6已发布审核中未通过 2026-06-05 19:55 notes-request 浏览 0 点赞 0 评论 0 收藏 0 分享 2026",
      className: "notes-request semiTab",
      idAttr: "notes-request",
      hrefs: [],
      dataValues: ["notes-request"],
      cells: ["全部 6已发布", "2026-06-05", "分享", "2026"],
      childCandidateCount: 1
    },
    {
      text: "脱敏小红书笔记标题 2026-06-02 浏览 1200 点赞 66 评论 7 收藏 8 分享 9",
      tagName: "article",
      titleAttr: "脱敏小红书笔记标题",
      hrefs: ["https://www.xiaohongshu.com/explore/66abc123456789000001?note_id=66abc123456789000001"],
      dataValues: ["66abc123456789000001"],
      cells: ["脱敏小红书笔记标题", "2026-06-02", "1200", "66", "7", "8", "9"],
      childCandidateCount: 0
    }
  ];

  const douyinRows = selectDouyinCreatorCenterRows(douyinCandidates, capturedAt);
  const xiaohongshuRows = selectXiaohongshuCreatorCenterRows(xiaohongshuCandidates, capturedAt);

  assert.equal(douyinRows.length, 1);
  assert.equal(douyinRows[0].title, "脱敏抖音作品标题");
  assert.equal(douyinRows[0].nativeId, "7420123456789012345");
  assert.equal(douyinRows[0].nativeIdConfidence, "stable_platform_id");
  assert.equal(douyinRows[0].views, 1057);
  assert.equal(douyinRows[0].likes, 26);
  assert.equal(douyinRows[0].shares, 5);
  assert.equal(douyinRows.some((row) => row.nativeId === "semiTab1"), false);

  assert.equal(xiaohongshuRows.length, 1);
  assert.equal(xiaohongshuRows[0].title, "脱敏小红书笔记标题");
  assert.equal(xiaohongshuRows[0].nativeId, "66abc123456789000001");
  assert.equal(xiaohongshuRows[0].nativeIdConfidence, "stable_platform_id");
  assert.equal(xiaohongshuRows[0].views, 1200);
  assert.equal(xiaohongshuRows[0].likes, 66);
  assert.equal(xiaohongshuRows[0].shares, 9);
  assert.equal(xiaohongshuRows.some((row) => row.nativeId === "notes-request"), false);
});

test("authed browser profile configs isolate four platform sessions under local profiles", () => {
  const view = getAuthedBrowserProfileStatusView();
  const configuredPlatforms = authedBrowserProfileConfigs.map((item) => item.platform);
  assert.deepEqual(configuredPlatforms, ["douyin", "xiaohongshu", "video_account", "bilibili"]);
  assert.equal(view.safety.baseDirRef, ".local/browser-profiles");
  assert.equal(view.safety.localProfilesIgnoredByGit, true);
  assert.equal(view.safety.noCookieTokenHeaderInBusinessDb, true);
  assert.equal(view.safety.wechatPaused, true);
  assert.equal(view.safety.bilibiliAccountMetricsPreviewOnly, true);
  assert.equal(view.profiles.length, 4);
  assert.deepEqual(view.profiles.map((item) => item.profileDirRef), [
    ".local/browser-profiles/douyin",
    ".local/browser-profiles/xiaohongshu",
    ".local/browser-profiles/video_account",
    ".local/browser-profiles/bilibili"
  ]);
  assert.equal(view.profiles.filter((item) => item.captureMvpEnabled).map((item) => item.platform).join(","), "douyin,xiaohongshu");
  assert.doesNotMatch(view.profiles.map((item) => item.platform).join(","), /wechat/i);
  for (const profile of view.profiles) {
    assert.equal(profile.safety.profileOnlyInLocal, true);
    assert.equal(profile.safety.noCookieTokenHeaderInBusinessDb, true);
    assert.equal(profile.safety.noStorageStateExport, true);
    assert.equal(profile.safety.noSensitiveLoginMaterialInDocsTestsOrGit, true);
  }
});

test("xiaohongshu personal provider maps sanitized creator captures into internal payload", () => {
  const captures = [
    {
      file: "raw/latest-note.json",
      capturedAt: "2026-06-03T16:53:54.000Z",
      urlSanitized: "https://creator.xiaohongshu.com/api/galaxy/creator/home/latest_note_data",
      body: {
        data: {
          noteInfo: {
            id: "xhs-own-1",
            title: "个人笔记一",
            postTime: 1780314116000,
            type: "video",
            link: "xhsdiscover://item/discovery.xhs-own-1?type=video",
            coverUrl: "https://example.com/xhs-cover.jpg?token=hidden"
          }
        }
      }
    },
    {
      file: "raw/note-base.json",
      capturedAt: "2026-06-03T16:54:00.000Z",
      urlSanitized: "https://creator.xiaohongshu.com/api/galaxy/creator/datacenter/note/base?note_id=xhs-own-1",
      body: {
        data: {
          view_count: 10667,
          like_count: 85,
          comment_count: 3,
          collect_count: 38,
          share_count: 7,
          rise_fans_count: 5,
          note_info: {
            id: "xhs-own-1",
            desc: "个人笔记一补充标题",
            type: "VIDEO",
            post_time: 1780314116000,
            cover_url: "https://example.com/xhs-cover-from-base.jpg?secret=hidden"
          }
        }
      }
    },
    {
      file: "raw/topic-public.json",
      capturedAt: "2026-06-03T16:55:00.000Z",
      urlSanitized: "https://creator.xiaohongshu.com/api/galaxy/creator/select/topic/detail",
      body: { data: [{ selectTopics: [{ notes: [{ noteId: "public-note", title: "公共话题不入库", likes: 999 }] }] }] }
    }
  ];
  const payload = new XiaohongshuPersonalProvider().fromCaptures(captures);
  assert.equal(payload.source, "xiaohongshu_creator_center");
  assert.equal(payload.contents.length, 1);
  assert.equal(payload.metrics.length, 1);
  assert.equal(payload.contents[0].id, "xhs-own-1");
  assert.equal(payload.contents[0].platform, "xiaohongshu");
  assert.equal(payload.contents[0].format, "short_video");
  assert.ok(payload.contents[0].notes?.includes("raw/note-base.json"));
  assert.equal(payload.metrics[0].views, 10667);
  assert.equal(payload.metrics[0].likes, 85);
  assert.equal(payload.metrics[0].comments, 3);
  assert.equal(payload.metrics[0].saves, 38);
  assert.equal(payload.metrics[0].shares, 7);
  assert.equal(payload.metrics[0].followersDelta, 5);
  assert.ok(payload.warnings?.some((item) => item.includes("skipped 1 topic/detail")));
});

test("xiaohongshu personal captures import into metric snapshots without raw payload persistence", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-xiaohongshu-personal-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    const result = service.importXiaohongshuPersonalCaptures([
      {
        file: "raw/note-base.json",
        capturedAt: "2026-06-03T16:54:00.000Z",
        urlSanitized: "https://creator.xiaohongshu.com/api/galaxy/creator/datacenter/note/base?note_id=xhs-import-1",
        body: {
          data: {
            view_count: 321,
            like_count: 22,
            comment_count: 4,
            collect_count: 18,
            share_count: 3,
            rise_fans_count: 2,
            note_info: { id: "xhs-import-1", desc: "导入笔记", type: "NORMAL", post_time: 1780314116000 }
          }
        }
      }
    ]);
    const content = repo.listContents().find((item) => item.id === "xhs-import-1");
    const snapshot = repo.listMetricSnapshots().find((item) => item.contentId === "xhs-import-1");
    assert.equal(result.run.source, "xiaohongshu_creator_center");
    assert.equal(content?.platform, "xiaohongshu");
    assert.equal(content?.notes?.includes("raw/note-base.json"), true);
    assert.equal(content?.notes?.includes("view_count"), false);
    assert.equal(snapshot?.source, "xiaohongshu_creator_center");
    assert.equal(snapshot?.views, 321);
    assert.equal(snapshot?.likes, 22);
    assert.equal(snapshot?.comments, 4);
    assert.equal(snapshot?.saves, 18);
    assert.equal(snapshot?.shares, 3);
    assert.equal(snapshot?.followersDelta, 2);
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("video account personal provider maps sanitized post-list captures into internal payload", () => {
  const captures = [
    {
      file: "raw/content-post-list.json",
      capturedAt: "2026-06-03T16:56:00.000Z",
      urlSanitized: "https://channels.weixin.qq.com/micro/content/cgi-bin/mmfinderassistant-bin/post/post_list",
      body: {
        data: {
          list: [
            {
              objectId: "export/video-account-own-1",
              createTime: 1780314367,
              likeCount: 450,
              commentCount: 59,
              readCount: 257493,
              forwardCount: 594,
              favCount: 1749,
              followCount: 180,
              desc: {
                shortTitle: "视频号个人作品一",
                media: [{ coverUrl: "https://finder.video.qq.com/cover.jpg?token=hidden", videoPlayLen: 10 }]
              }
            },
            {
              objectId: "[REDACTED]",
              createTime: 1780314000,
              readCount: 999,
              desc: { shortTitle: "脱敏ID不入库" }
            }
          ]
        }
      }
    },
    {
      file: "raw/interaction-post-list.json",
      capturedAt: "2026-06-03T16:57:00.000Z",
      urlSanitized: "https://channels.weixin.qq.com/micro/interaction/cgi-bin/mmfinderassistant-bin/post/post_list",
      body: {
        data: {
          list: [
            { objectId: "export/video-account-own-1", readCount: 257494, likeCount: 451, commentCount: 60, forwardAggregationCount: 595, favCount: 1750, followCount: 181, desc: { shortTitle: "视频号个人作品一互动更新" } },
            { objectId: "export/public-or-unmatched", readCount: 999 }
          ]
        }
      }
    },
    {
      file: "raw/bullet-chat.json",
      capturedAt: "2026-06-03T16:58:00.000Z",
      urlSanitized: "https://channels.weixin.qq.com/micro/interaction/cgi-bin/mmfinderassistant-bin/bullet-chat/feed-list",
      body: { data: { list: [{ objectId: "export/video-account-own-1", readCount: 257495, likeCount: 452, commentCount: 61, forwardCount: 596, favCount: 1751, followCount: 182, commentList: [{ content: "不应导入评论正文" }] }] } }
    },
    {
      file: "raw/private-msg.json",
      capturedAt: "2026-06-03T16:59:00.000Z",
      urlSanitized: "https://channels.weixin.qq.com/micro/interaction/cgi-bin/mmfinderassistant-bin/private-msg/get-history-msg",
      body: { data: { message: "不应导入私信" } }
    }
  ];
  const payload = new VideoAccountPersonalProvider().fromCaptures(captures);
  assert.equal(payload.source, "video_account_creator_center");
  assert.equal(payload.contents.length, 1);
  assert.equal(payload.metrics.length, 1);
  assert.equal(payload.contents[0].platform, "video_account");
  assert.equal(payload.contents[0].format, "short_video");
  assert.equal(payload.contents[0].title, "视频号个人作品一");
  assert.ok(payload.contents[0].id.startsWith("video-account-"));
  assert.ok(payload.contents[0].notes?.includes("raw/content-post-list.json"));
  assert.ok(payload.contents[0].notes?.includes("raw/bullet-chat.json"));
  assert.equal(payload.contents[0].notes?.includes("commentList"), false);
  assert.equal(payload.metrics[0].views, 257495);
  assert.equal(payload.metrics[0].likes, 452);
  assert.equal(payload.metrics[0].comments, 61);
  assert.equal(payload.metrics[0].saves, 1751);
  assert.equal(payload.metrics[0].shares, 596);
  assert.equal(payload.metrics[0].followersDelta, 182);
  assert.ok(payload.warnings?.some((item) => item.includes("skipped 1 private message")));
  assert.ok(payload.warnings?.some((item) => item.includes("redacted or missing objectId")));
  assert.ok(payload.warnings?.some((item) => item.includes("skipped 1 interaction rows")));
});

test("video account personal provider refuses incomplete post-list rows as durable works", () => {
  const payload = new VideoAccountPersonalProvider().fromCaptures([
    {
      file: "raw/incomplete-post-list.json",
      capturedAt: "2026-06-03T17:10:00.000Z",
      urlSanitized: "https://channels.weixin.qq.com/micro/content/cgi-bin/mmfinderassistant-bin/post/post_list",
      body: {
        data: {
          list: [
            {
              objectId: "export/video-account-no-title",
              createTime: 1780314367,
              readCount: 100,
              likeCount: 10,
              commentCount: 1,
              forwardCount: 2,
              desc: {}
            },
            {
              objectId: "export/video-account-no-time",
              readCount: 100,
              likeCount: 10,
              commentCount: 1,
              forwardCount: 2,
              desc: { shortTitle: "缺少发布时间" }
            },
            {
              objectId: "export/video-account-no-shares",
              createTime: 1780314367,
              readCount: 100,
              likeCount: 10,
              commentCount: 1,
              desc: { shortTitle: "缺少分享字段" }
            }
          ]
        }
      }
    },
    {
      file: "raw/interaction-only.json",
      capturedAt: "2026-06-03T17:11:00.000Z",
      urlSanitized: "https://channels.weixin.qq.com/micro/interaction/cgi-bin/mmfinderassistant-bin/post/post_list",
      body: {
        data: {
          list: [{ objectId: "export/video-account-interaction-only", readCount: 999, likeCount: 99, commentCount: 9, forwardCount: 8, desc: { shortTitle: "互动孤行" } }]
        }
      }
    }
  ]);

  assert.equal(payload.source, "video_account_creator_center");
  assert.equal(payload.contents.length, 0);
  assert.equal(payload.metrics.length, 0);
  assert.ok(payload.warnings?.some((item) => item.includes("without complete content-level fields")));
  assert.ok(payload.warnings?.some((item) => item.includes("title=1")));
  assert.ok(payload.warnings?.some((item) => item.includes("publish_time=1")));
  assert.ok(payload.warnings?.some((item) => item.includes("shares=1")));
  assert.ok(payload.warnings?.some((item) => item.includes("interaction rows that did not match content post ids")));
  assert.ok(payload.warnings?.some((item) => item.includes("no personal post rows")));
});

test("video account personal captures import into metric snapshots without private or raw payload persistence", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-video-account-personal-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    const result = service.importVideoAccountPersonalCaptures([
      {
        file: "raw/content-post-list.json",
        capturedAt: "2026-06-03T16:56:00.000Z",
        urlSanitized: "https://channels.weixin.qq.com/micro/content/cgi-bin/mmfinderassistant-bin/post/post_list",
        body: {
          data: {
            list: [
              {
                objectId: "export/video-account-import-1",
                createTime: 1780314367,
                readCount: 1024,
                likeCount: 88,
                commentCount: 6,
                forwardCount: 7,
                favCount: 9,
                followCount: 3,
                desc: { shortTitle: "视频号导入作品", media: [{ coverUrl: "https://finder.video.qq.com/cover.jpg?token=hidden" }] }
              }
            ]
          }
        }
      }
    ]);
    const content = repo.listContents().find((item) => item.platform === "video_account" && item.title === "视频号导入作品");
    assert.equal(result.run.source, "video_account_creator_center");
    assert.ok(content);
    assert.equal(content?.notes?.includes("raw/content-post-list.json"), true);
    assert.equal(content?.notes?.includes("readCount"), false);
    assert.equal(content?.notes?.includes("token=hidden"), false);
    const snapshot = repo.listMetricSnapshots().find((item) => item.contentId === content?.id);
    assert.equal(snapshot?.source, "video_account_creator_center");
    assert.equal(snapshot?.views, 1024);
    assert.equal(snapshot?.likes, 88);
    assert.equal(snapshot?.comments, 6);
    assert.equal(snapshot?.shares, 7);
    assert.equal(snapshot?.saves, 9);
    assert.equal(snapshot?.followersDelta, 3);
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("bilibili personal provider maps archives into preview-only works and per-video metrics", () => {
  const payload = new BilibiliPersonalProvider().fromCaptures([
    {
      file: "raw/archives.json",
      capturedAt: "2026-06-04T03:25:41.118Z",
      urlSanitized: "https://member.bilibili.com/x/vupre/web/oversea/archives",
      body: {
        data: {
          arc_audits: [
            {
              Archive: {
                aid: 116658358257508,
                bvid: "BV1BiliOwn",
                title: "Bilibili personal work",
                author: "[REDACTED]",
                ptime: 1780314116,
                desc: "comment body must stay out of payload",
                ...publicBilibiliArchiveFields()
              },
              stat: {
                view: 1500,
                vv: 1550,
                like: 30,
                reply: 4,
                danmaku: 9,
                favorite: 11,
                share: 12
              }
            }
          ]
        }
      }
    },
    {
      file: "raw/overview-num.json",
      capturedAt: "2026-06-04T03:25:54.846Z",
      urlSanitized: "https://member.bilibili.com/c/data/oversea/web/overview/stat/num",
      body: { data: { play: 999999, like: 888888, comment: 777777, fav: 666666, share: 555555, fan: 444444, log_date: "2026-06-02" } }
    }
  ]);

  assert.equal(payload.source, "bilibili_creator_center");
  assert.equal(payload.contents.length, 1);
  assert.equal(payload.metrics.length, 1);
  assert.equal(payload.contents[0].id, "bilibili-BV1BiliOwn");
  assert.equal(payload.contents[0].platform, "bilibili");
  assert.equal(payload.contents[0].title, "Bilibili personal work");
  assert.equal(payload.contents[0].publishedAt, "2026-06-01T11:41:56.000Z");
  assert.ok(payload.contents[0].notes?.includes("platformVersionId=platform-version-bilibili-BV1BiliOwn"));
  assert.equal(payload.metrics[0].contentId, "bilibili-BV1BiliOwn");
  assert.equal(payload.metrics[0].views, 1500);
  assert.equal(payload.metrics[0].likes, 30);
  assert.equal(payload.metrics[0].comments, 4);
  assert.equal(payload.metrics[0].saves, 11);
  assert.equal(payload.metrics[0].shares, 12);
  assert.equal(payload.metrics[0].followersDelta, 0);
  assert.equal(payload.accountMetrics.length, 1);
  assert.equal(payload.accountMetrics[0].views, 999999);
  assert.equal(payload.accountMetrics[0].followersDelta, 444444);
  assert.ok(payload.warnings?.some((item) => item.includes("account-level overview/stat")));
});

test("bilibili public-only filter keeps private hidden unknown review down and offline archives out of content metrics", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-bilibili-public-only-"));
  let repo: SqliteSelfMediaRepo | undefined;
  const archiveCapture = {
    file: "raw/archives-public-only.json",
    capturedAt: "2026-06-04T03:25:41.118Z",
    urlSanitized: "https://member.bilibili.com/x/vupre/web/oversea/archives",
    body: {
      data: {
        arc_audits: [
          {
            Archive: { aid: 1, bvid: "BVPublicOnly", title: "Public archive", ptime: 1780314116, ...publicBilibiliArchiveFields() },
            stat: { view: 101, like: 11, reply: 1, favorite: 2, share: 3 }
          },
          {
            Archive: { aid: 2, bvid: "BVPrivateOnly", title: "Private archive", ptime: 1780314116, ...publicBilibiliArchiveFields(), is_only_self: 1, state: -50, state_desc: -50, state_panel: 1 },
            stat: { view: 999, like: 999, reply: 999, favorite: 999, share: 999 }
          },
          {
            Archive: { aid: 3, bvid: "BVHiddenOnly", title: "Hidden archive", ptime: 1780314116, ...publicBilibiliArchiveFields(), no_public: 1 },
            stat: { view: 999, like: 999, reply: 999, favorite: 999, share: 999 }
          },
          {
            Archive: { aid: 4, bvid: "BVUnknownOnly", title: "Unknown archive", ptime: 1780314116 },
            stat: { view: 999, like: 999, reply: 999, favorite: 999, share: 999 }
          },
          {
            Archive: { aid: 5, bvid: "BVReviewOnly", title: "Review archive", ptime: 1780314116, ...publicBilibiliArchiveFields(), state: 1, state_desc: "Pending review" },
            stat: { view: 999, like: 999, reply: 999, favorite: 999, share: 999 }
          },
          {
            Archive: { aid: 6, bvid: "BVDownOnly", title: "Down archive", ptime: 1780314116, ...publicBilibiliArchiveFields(), state: -100, state_desc: "Rejected", reject_reason: "synthetic rejected" },
            stat: { view: 999, like: 999, reply: 999, favorite: 999, share: 999 }
          },
          {
            Archive: { aid: 7, bvid: "BVOfflineOnly", title: "Offline archive", ptime: 1780314116, ...publicBilibiliArchiveFields(), state: -40, state_desc: "Offline" },
            stat: { view: 999, like: 999, reply: 999, favorite: 999, share: 999 }
          }
        ]
      }
    }
  };
  try {
    const payload = new BilibiliPersonalProvider().fromCaptures([archiveCapture]);
    const warning = payload.warnings?.find((item) => item.includes("non-public or unknown archive rows")) ?? "";
    assert.deepEqual(payload.contents.map((item) => item.id), ["bilibili-BVPublicOnly"]);
    assert.deepEqual(payload.metrics.map((item) => item.contentId), ["bilibili-BVPublicOnly"]);
    assert.equal(payload.metrics[0].views, 101);
    assert.match(warning, /skipped 6/);
    assert.match(warning, /private_or_only_self=1/);
    assert.match(warning, /hidden_or_no_public=1/);
    assert.match(warning, /unknown_public_state=1/);
    assert.match(warning, /down_or_rejected=1/);
    assert.match(warning, /review_down_offline_or_non_public_state=2/);

    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    service.importBilibiliPersonalCaptures([archiveCapture]);
    const snapshot = await service.dashboard();
    assert.ok(snapshot.contents.some((item) => item.id === "bilibili-BVPublicOnly" && item.platform === "bilibili"));
    assert.equal(snapshot.contents.some((item) => item.id === "bilibili-BVPrivateOnly"), false);
    assert.equal(snapshot.contents.some((item) => item.id === "bilibili-BVHiddenOnly"), false);
    assert.equal(snapshot.contents.some((item) => item.id === "bilibili-BVUnknownOnly"), false);
    assert.equal(snapshot.contents.some((item) => item.id === "bilibili-BVReviewOnly"), false);
    assert.equal(snapshot.contents.some((item) => item.id === "bilibili-BVDownOnly"), false);
    assert.equal(snapshot.contents.some((item) => item.id === "bilibili-BVOfflineOnly"), false);
    assert.equal(repo.listMetricSnapshots().filter((item) => item.source === "bilibili_creator_center").length, 1);
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("trusted dashboard audit matches API snapshot totals and trusted post-import evidence", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-trusted-dashboard-audit-"));
  const dbPath = path.join(dir, "test.sqlite");
  const outDir = path.join(dir, "audit");
  const dashboardPath = path.join(dir, "dashboard.json");
  let repo: SqliteSelfMediaRepo | undefined;
  const archiveCapture = {
    file: "raw/archives-trusted-audit.json",
    capturedAt: "2026-06-04T03:25:41.118Z",
    urlSanitized: "https://member.bilibili.com/x/vupre/web/oversea/archives",
    body: {
      data: {
        arc_audits: [
          {
            Archive: { aid: 11, bvid: "BVTrustedAuditPublic", title: "Public audit archive", ptime: 1780314116, ...publicBilibiliArchiveFields() },
            stat: { view: 101, like: 11, reply: 1, favorite: 2, share: 3 }
          },
          {
            Archive: { aid: 12, bvid: "BVTrustedAuditPrivate", title: "Private audit archive", ptime: 1780314116, ...publicBilibiliArchiveFields(), is_only_self: 1, state: -50 },
            stat: { view: 999, like: 999, reply: 999, favorite: 999, share: 999 }
          }
        ]
      }
    }
  };
  try {
    repo = new SqliteSelfMediaRepo(dbPath);
    const service = new SelfMediaService(repo);
    service.importBilibiliPersonalCaptures([archiveCapture]);
    service.importPayload({
      source: "wechat_official",
      contents: [{ id: "wechat-trusted-audit-paused", title: "Paused WeChat audit row", platform: "wechat", status: "published", format: "article", topic: "paused", publishedAt: "2026-06-03T09:00:00.000Z" }],
      metrics: [{ id: "metric-wechat-trusted-audit-paused", contentId: "wechat-trusted-audit-paused", platform: "wechat", capturedAt: "2026-06-03T10:00:00.000Z", views: 999, likes: 99, comments: 9, saves: 9, shares: 9, followersDelta: 0 }]
    });
    service.importPayload({
      source: "bilibili_creator_center",
      contents: [{ id: "BiliOpSave-hidden-audit", title: "BiliOpSave hidden audit row", platform: "bilibili", status: "published", format: "short_video", topic: "legacy polluted", publishedAt: "2026-06-03T09:00:00.000Z" }],
      metrics: [{ id: "metric-BiliOpSave-hidden-audit", contentId: "BiliOpSave-hidden-audit", platform: "bilibili", capturedAt: "2026-06-03T10:00:00.000Z", views: 888, likes: 88, comments: 8, saves: 8, shares: 8, followersDelta: 0 }]
    });
    const snapshot = await service.dashboard();
    writeJsonSummary(dashboardPath, snapshot);
    writeJsonSummary(path.join(dir, ".local", "platform-data-health", "report.json"), {
      generatedAt: "2026-06-04T08:00:00.000Z",
      staleAfterHours: 72,
      summary: {
        freshness: {
          latestRealCaptureAt: "2026-06-04T03:25:41.118Z",
          latestSmokeAt: "2026-06-04T07:30:00.000Z",
          latestAuditAt: null,
          realCaptureIsStale: false,
          smokeIsStale: false,
          staleAfterHours: 72
        }
      }
    });

    const result = spawnSync(process.execPath, [path.join(process.cwd(), "scripts", "trusted-dashboard-audit.mjs"), `--dashboard-json=${dashboardPath}`, `--out-dir=${outDir}`], {
      cwd: dir,
      env: { ...process.env, SELF_MEDIA_DB_PATH: dbPath },
      encoding: "utf8"
    });
    const report = JSON.parse(readFileSync(path.join(outDir, "report.json"), "utf8")) as {
      status: string;
      expected: { contentCount: number; metricSnapshotCount: number; views: number; engagement: number; bilibili: { excludedMetricSnapshotCount: number } };
      postImportSuggestions: { untrustedEvidenceCount: number; onlyTrustedSnapshotEvidence: boolean };
      mismatches: string[];
      freshness: { latestRealCaptureAt: string | null; latestSmokeAt: string | null; latestAuditAt: string | null; realCaptureIsStale: boolean | null };
    };
    const serializedReport = JSON.stringify(report);

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(report.status, "pass");
    assert.deepEqual(report.mismatches, []);
    assert.equal(report.expected.contentCount, 1);
    assert.equal(report.expected.metricSnapshotCount, 1);
    assert.equal(report.expected.views, 101);
    assert.equal(report.expected.engagement, 17);
    assert.equal(report.expected.bilibili.excludedMetricSnapshotCount, 1);
    assert.equal(report.postImportSuggestions.onlyTrustedSnapshotEvidence, true);
    assert.equal(report.postImportSuggestions.untrustedEvidenceCount, 0);
    assert.equal(report.freshness.latestRealCaptureAt, "2026-06-04T03:25:41.118Z");
    assert.equal(report.freshness.latestSmokeAt, "2026-06-04T07:30:00.000Z");
    assert.equal(typeof report.freshness.latestAuditAt, "string");
    assert.equal(report.freshness.realCaptureIsStale, false);
    assert.equal(snapshot.contents.some((item) => item.id === "bilibili-BVTrustedAuditPublic"), true);
    assert.equal(snapshot.contents.some((item) => item.id === "bilibili-BVTrustedAuditPrivate"), false);
    assert.equal(snapshot.contents.some((item) => item.id === "BiliOpSave-hidden-audit"), false);
    assert.equal(serializedReport.includes("Private audit archive"), false);
    assert.equal(serializedReport.includes("BiliOpSave hidden audit row"), false);
  } finally {
    repo?.close();
  }
});

test("dashboard business number surfaces align with trusted audit totals", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-dashboard-number-trust-"));
  const dbPath = path.join(dir, "test.sqlite");
  const outDir = path.join(dir, "audit");
  const dashboardPath = path.join(dir, "dashboard.json");
  const fixtures = [
    { source: "douyin_creator_center", platform: "douyin", id: "number-trust-douyin", views: 2400, likes: 260, comments: 32, saves: 42, shares: 28 },
    { source: "xiaohongshu_creator_center", platform: "xiaohongshu", id: "number-trust-xhs", views: 920, likes: 2, comments: 0, saves: 0, shares: 0 },
    { source: "video_account_creator_center", platform: "video_account", id: "number-trust-video", views: 640, likes: 45, comments: 5, saves: 6, shares: 5 },
    { source: "bilibili_creator_center", platform: "bilibili", id: "number-trust-bilibili", views: 810, likes: 50, comments: 8, saves: 12, shares: 7 }
  ] as const;
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(dbPath);
    const service = new SelfMediaService(repo);
    for (const fixture of fixtures) {
      service.importPayload(
        {
          source: fixture.source,
          contents: [{ id: fixture.id, title: `数字校验 ${fixture.platform}`, platform: fixture.platform, status: "published", format: "short_video", topic: "number trust", publishedAt: "2026-06-03T08:00:00.000Z" }],
          metrics: [{ id: `metric-${fixture.id}`, contentId: fixture.id, platform: fixture.platform, capturedAt: "2026-06-04T08:00:00.000Z", views: fixture.views, likes: fixture.likes, comments: fixture.comments, saves: fixture.saves, shares: fixture.shares, followersDelta: 0 }]
        },
        { isTestFixture: false, operationKind: "platform_save", trustedScopeEligible: true }
      );
    }

    const snapshot = await service.dashboard();
    writeJsonSummary(dashboardPath, snapshot);
    const result = spawnSync(process.execPath, [path.join(process.cwd(), "scripts", "trusted-dashboard-audit.mjs"), `--dashboard-json=${dashboardPath}`, `--out-dir=${outDir}`], {
      cwd: dir,
      env: { ...process.env, SELF_MEDIA_DB_PATH: dbPath },
      encoding: "utf8"
    });
    const report = JSON.parse(readFileSync(path.join(outDir, "report.json"), "utf8")) as {
      status: string;
      expected: {
        contentCount: number;
        metricSnapshotCount: number;
        views: number;
        engagement: number;
        platformDistribution: Record<string, { contentCount: number; metricSnapshotCount: number; views: number; engagement: number }>;
      };
      mismatches: string[];
    };
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(report.status, "pass");
    assert.deepEqual(report.mismatches, []);

    const expected = report.expected;
    assert.equal(snapshot.trustedOperatingStatus.trustedContentCount, expected.contentCount);
    assert.equal(snapshot.trustedOperatingStatus.trustedMetricSnapshotCount, expected.metricSnapshotCount);
    assert.equal(snapshot.trustedOperatingStatus.views, expected.views);
    assert.equal(snapshot.trustedOperatingStatus.engagement, expected.engagement);
    assert.equal(snapshot.realDataScope.trustedContentCount, expected.contentCount);
    assert.equal(snapshot.realDataScope.trustedMetricSnapshotCount, expected.metricSnapshotCount);
    assert.equal(snapshot.weeklyReview.metrics.totalViews, expected.views);
    assert.equal(snapshot.weeklyReview.metrics.totalEngagement, expected.engagement);
    assert.equal(snapshot.trustedWeeklySummary.trustedContentCount, expected.contentCount);
    assert.equal(snapshot.trustedWeeklySummary.trustedMetricSnapshotCount, expected.metricSnapshotCount);
    assert.equal(snapshot.trustedWeeklySummary.views, expected.views);
    assert.equal(snapshot.trustedWeeklySummary.engagement, expected.engagement);

    const metricPlatformMap = Object.fromEntries(snapshot.metricPlatformGroups.map((group) => [group.platform, { contentCount: group.contentCount, metricSnapshotCount: group.snapshotCount, views: group.views, engagement: group.engagement }]));
    const weeklyPlatformMap = Object.fromEntries(snapshot.trustedWeeklySummary.platformOverview.map((group) => [group.platform, { contentCount: group.contentCount, metricSnapshotCount: group.metricSnapshotCount, views: group.views, engagement: group.engagement }]));
    for (const [platform, expectedGroup] of Object.entries(expected.platformDistribution)) {
      const expectedBusinessNumbers = {
        contentCount: expectedGroup.contentCount,
        metricSnapshotCount: expectedGroup.metricSnapshotCount,
        views: expectedGroup.views,
        engagement: expectedGroup.engagement
      };
      assert.deepEqual(metricPlatformMap[platform], expectedBusinessNumbers);
      assert.deepEqual(weeklyPlatformMap[platform], expectedBusinessNumbers);
    }

    const contentRanking = snapshot.metricSnapshots
      .map((metric) => ({
        contentId: metric.contentId,
        views: metric.views,
        engagement: metric.likes + metric.comments + metric.saves + metric.shares
      }))
      .sort((a, b) => b.views - a.views || b.engagement - a.engagement || a.contentId.localeCompare(b.contentId));
    assert.equal(contentRanking.length, expected.contentCount);
    assert.equal(contentRanking.reduce((sum, row) => sum + row.views, 0), expected.views);
    assert.equal(contentRanking.reduce((sum, row) => sum + row.engagement, 0), expected.engagement);
  } finally {
    repo?.close();
  }
});

test("trusted dashboard audit view reports missing as unaudited", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-trusted-audit-missing-"));
  try {
    const view = readTrustedDashboardAuditView(dir);
    assert.equal(view.exists, false);
    assert.equal(view.status, "missing");
    assert.equal(view.mismatchCount, 0);
    assert.ok(view.message?.includes("npm run audit:trusted-dashboard"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("bilibili personal provider keeps account overview trends out of per-work metrics", () => {
  const payload = new BilibiliPersonalProvider().fromCaptures([
    {
      file: "raw/index-stat.json",
      capturedAt: "2026-06-04T03:25:31.763Z",
      urlSanitized: "https://member.bilibili.com/c/data/oversea/web/index/stat",
      body: {
        data: {
          incr_click: 10,
          total_click: 2000,
          inc_like: 5,
          total_like: 100,
          incr_reply: 1,
          total_reply: 9,
          inc_fav: 2,
          total_fav: 40,
          inc_share: 3,
          total_share: 12,
          incr_fans: 7,
          total_fans: 80
        }
      }
    },
    {
      file: "raw/compare.json",
      capturedAt: "2026-06-04T03:25:54.901Z",
      urlSanitized: "https://member.bilibili.com/c/data/oversea/web/overview/compare",
      body: { data: { play: 10, like: 2, replydm: 1, fans: 80, new_fans: 7 } }
    }
  ]);

  assert.equal(payload.contents.length, 0);
  assert.equal(payload.metrics.length, 0);
  assert.equal(payload.accountMetrics.length, 2);
  assert.deepEqual(
    payload.accountMetrics.map((item) => item.endpoint),
    ["index_stat", "overview_compare"]
  );
  assert.ok(payload.warnings?.some((item) => item.includes("account-level overview/stat")));
  assert.ok(payload.warnings?.some((item) => item.includes("no personal archive rows")));
});

test("bilibili personal provider normalizes date keys without creating unreviewed metrics", () => {
  const payload = new BilibiliPersonalProvider().fromCaptures([
    {
      file: "raw/survey.json",
      capturedAt: "2026-06-04T03:25:54.902Z",
      urlSanitized: "https://member.bilibili.com/c/data/oversea/web/survey",
      body: {
        data: {
          "20260602": {
            arc_inc: [{ aid: 1, bvid: "BVDateKeyOne" }],
            arc_play: [{ aid: 1, bvid: "BVDateKeyOne", play: 99 }]
          }
        }
      }
    }
  ]);

  assert.equal(payload.contents.length, 0);
  assert.equal(payload.metrics.length, 0);
  assert.deepEqual(payload.dateKeyRows, [
    { sourceDateKey: "20260602", normalizedDate: "2026-06-02", rowKind: "arc_inc", rowCount: 1 },
    { sourceDateKey: "20260602", normalizedDate: "2026-06-02", rowKind: "arc_play", rowCount: 1 }
  ]);
  assert.ok(payload.warnings?.some((item) => item.includes("normalized 1 date keys")));
  assert.ok(payload.warnings?.some((item) => item.includes("2 dated rows")));
});

test("bilibili personal preview payload excludes raw payload, secrets, comments, and danmu text", () => {
  const payload = new BilibiliPersonalProvider().fromCaptures([
    {
      file: "raw/archives-secret.json",
      capturedAt: "2026-06-04T03:25:41.118Z",
      urlSanitized: "https://member.bilibili.com/x/vupre/web/oversea/archives",
      cookie: "should-not-exist",
      headers: { authorization: "Bearer hidden" },
      body: {
        token: "secret-token-value",
        headers: { cookie: "secret-cookie-value" },
        data: {
          arc_audits: [
            {
              Archive: {
                aid: 99,
                bvid: "BVSafeOnly",
                title: "Safe title",
                ptime: 1780314116,
                desc: "comment text secret",
                comment_content: "raw comment secret",
                ...publicBilibiliArchiveFields()
              },
              stat: { view: 1, like: 2, reply: 3, favorite: 4, share: 5 },
              danmu_text: "danmu text secret"
            }
          ]
        }
      }
    }
  ] as never);

  const serialized = JSON.stringify(payload);
  assert.equal(payload.contents.length, 1);
  assert.doesNotMatch(serialized, /secret-token-value|secret-cookie-value|Bearer hidden|should-not-exist/);
  assert.doesNotMatch(serialized, /comment text secret|raw comment secret|danmu text secret/);
  assert.doesNotMatch(serialized, /headers|cookie|token|authorization/i);
});

test("bilibili account metrics preview creates deduped AccountMetricSnapshot candidates", () => {
  const preview = previewBilibiliAccountMetricSnapshots({
    accountMetrics: [
      { endpoint: "overview_stat_num", capturedAt: "2026-06-04T03:25:54.846Z", snapshotDate: "20260602", views: 0, likes: 0, comments: 0, saves: 0, shares: 0, followersDelta: 0 },
      { endpoint: "overview_stat_num", capturedAt: "2026-06-04T03:25:54.901Z", snapshotDate: "20260602", views: 7, likes: 0, comments: 0, saves: 0, shares: 0, followersDelta: 1 },
      { endpoint: "overview_stat_num", capturedAt: "2026-06-04T03:25:54.848Z", snapshotDate: "20260602", views: 0, likes: 0, comments: 0, saves: 0, shares: 0, followersDelta: 0 }
    ],
    dateKeyRows: [{ sourceDateKey: "20260602", normalizedDate: "2026-06-02", rowKind: "arc_inc", rowCount: 3 }]
  });
  assert.equal(preview.saved, false);
  assert.equal(preview.previewOnly, true);
  assert.equal(preview.candidates.length, 1);
  assert.equal(preview.candidates[0].snapshot.platform, "bilibili");
  assert.equal(preview.candidates[0].snapshot.source, "bilibili_creator_center");
  assert.equal(preview.candidates[0].snapshot.date, "2026-06-02");
  assert.equal(preview.candidates[0].snapshot.views, 7);
  assert.equal(preview.candidates[0].snapshot.followersDelta, 1);
  assert.equal(preview.candidates[0].selectedFrom, 3);
  assert.equal(preview.rejected.filter((item) => item.reason.includes("deduped")).length, 2);
  assert.deepEqual(preview.diagnostics.dateKeyRows, [{ sourceDateKey: "20260602", normalizedDate: "2026-06-02", rowKind: "arc_inc", rowCount: 3 }]);
});

test("bilibili account metrics preview rejects comparison graph and aggregate rows", () => {
  const preview = previewBilibiliAccountMetricSnapshots({
    accountMetrics: [
      { endpoint: "index_stat", capturedAt: "2026-06-04T03:25:31.763Z", views: 1550, likes: 30, comments: 1, saves: 11, shares: 12, followersDelta: 0 },
      { endpoint: "overview_compare", capturedAt: "2026-06-04T03:25:54.901Z", views: 62, likes: 12, comments: -1, saves: 0, shares: 0, followersDelta: 7 },
      { endpoint: "overview_stat_graph", capturedAt: "2026-06-04T03:25:54.985Z", views: 0, likes: 0, comments: 0, saves: 0, shares: 0, followersDelta: 0 }
    ],
    dateKeyRows: []
  });
  assert.equal(preview.candidates.length, 0);
  assert.equal(preview.rejected.length, 3);
  assert.ok(preview.rejected.some((item) => item.endpoint === "index_stat" && item.reason.includes("aggregate")));
  assert.ok(preview.rejected.some((item) => item.endpoint === "overview_compare" && item.reason.includes("comparison")));
  assert.ok(preview.rejected.some((item) => item.endpoint === "overview_stat_graph" && item.reason.includes("graph")));
});

test("bilibili account metrics preview does not write account snapshots or content totals", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-bilibili-account-preview-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    service.importPayload({
      source: "bilibili_creator_center",
      contents: [{ id: "bili-account-preview-content", title: "B站账号预览边界", platform: "bilibili", status: "published", format: "short_video", topic: "账号指标预览", publishedAt: "2026-06-02T09:00:00.000Z" }],
      metrics: [{ id: "metric-bili-account-preview-content", contentId: "bili-account-preview-content", platform: "bilibili", capturedAt: "2026-06-02T10:00:00.000Z", views: 240, likes: 24, comments: 2, saves: 1, shares: 1, followersDelta: 0 }]
    });
    const before = await service.dashboard();
    const preview = previewBilibiliAccountMetricSnapshots({
      accountMetrics: [{ endpoint: "overview_stat_num", capturedAt: "2026-06-04T03:25:54.901Z", snapshotDate: "20260602", views: 9000, likes: 900, comments: 0, saves: 0, shares: 0, followersDelta: 90 }],
      dateKeyRows: [{ sourceDateKey: "20260602", normalizedDate: "2026-06-02", rowKind: "arc_inc", rowCount: 3 }]
    });
    const after = await service.dashboard();
    assert.equal(preview.candidates.length, 1);
    assert.equal(repo.listAccountMetricSnapshots().length, 0);
    assert.equal(after.accountMetricSnapshots.length, 0);
    assert.equal(after.weeklyReview.metrics.totalViews, before.weeklyReview.metrics.totalViews);
    assert.equal(after.metricSourceGroups.reduce((sum, group) => sum + group.views, 0), before.metricSourceGroups.reduce((sum, group) => sum + group.views, 0));
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("bilibili personal save writes archives while keeping account diagnostics out of snapshots", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-bilibili-personal-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    const captures = [
      {
        file: "raw/archives.json",
        capturedAt: "2026-06-04T03:25:41.118Z",
        urlSanitized: "https://member.bilibili.com/x/vupre/web/oversea/archives",
        body: {
          data: {
            arc_audits: [
              {
                Archive: {
                  aid: 116658358257508,
                  bvid: "BVSaveSmokeOne",
                  title: "Bilibili durable work",
                  ptime: 1780314116,
                  desc: "comment body must not persist",
                  comment_content: "raw comment secret",
                  ...publicBilibiliArchiveFields()
                },
                stat: {
                  view: 1500,
                  like: 30,
                  reply: 4,
                  favorite: 11,
                  share: 12
                },
                danmu_text: "danmu text secret"
              }
            ]
          }
        }
      },
      {
        file: "raw/overview-num.json",
        capturedAt: "2026-06-04T03:25:54.846Z",
        urlSanitized: "https://member.bilibili.com/c/data/oversea/web/overview/stat/num",
        body: { data: { play: 999999, like: 888888, comment: 777777, fav: 666666, share: 555555, fan: 444444, log_date: "2026-06-02" } }
      },
      {
        file: "raw/survey.json",
        capturedAt: "2026-06-04T03:25:54.902Z",
        urlSanitized: "https://member.bilibili.com/c/data/oversea/web/survey",
        body: { data: { "20260602": { arc_inc: [{ aid: 116658358257508, bvid: "BVSaveSmokeOne", play: 999999 }] } } }
      }
    ];
    const preview = service.parseBilibiliPersonalCaptures(captures);
    assert.equal(preview.contents.length, 1);
    assert.equal(preview.metrics.length, 1);
    assert.equal(preview.accountMetrics.length, 1);
    assert.equal(preview.dateKeyRows.length, 1);
    const result = service.importBilibiliPersonalCaptures(captures);
    const snapshot = await service.dashboard();
    const contentId = "bilibili-BVSaveSmokeOne";
    const metricSnapshots = repo.listMetricSnapshots().filter((item) => item.contentId === contentId && item.source === "bilibili_creator_center");
    const serializedSnapshots = JSON.stringify(metricSnapshots);
    assert.equal(result.run.source, "bilibili_creator_center");
    assert.equal(result.run.status, "success");
    assert.ok(repo.listContents().some((item) => item.id === contentId && item.platform === "bilibili"));
    assert.ok(repo.listMetrics().some((item) => item.contentId === contentId && item.platform === "bilibili"));
    assert.ok(repo.listPlatformVersions().some((item) => item.contentId === contentId && item.platform === "bilibili"));
    assert.equal(metricSnapshots.length, 1);
    assert.equal(metricSnapshots[0].views, 1500);
    assert.equal(metricSnapshots[0].likes, 30);
    assert.equal(metricSnapshots[0].comments, 4);
    assert.equal(metricSnapshots[0].saves, 11);
    assert.equal(metricSnapshots[0].shares, 12);
    assert.ok(snapshot.contents.some((item) => item.id === contentId && item.platform === "bilibili"));
    assert.ok(snapshot.metricSnapshots.some((item) => item.contentId === contentId && item.source === "bilibili_creator_center"));
    assert.ok(snapshot.platformVersions.some((item) => item.contentId === contentId && item.platform === "bilibili"));
    assert.equal(snapshot.weeklyReview.metrics.totalViews >= 1500, true);
    assert.equal(snapshot.monthlyReview.metrics.totalViews >= 1500, true);
    assert.doesNotMatch(serializedSnapshots, /999999|888888|777777|666666|555555|444444/);
    assert.doesNotMatch(serializedSnapshots, /accountMetrics|dateKeyRows|raw comment secret|danmu text secret|comment body must not persist/i);
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("platform import statuses summarize priority creator-center runs", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-import-status-"));
  const repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
  const service = new SelfMediaService(repo);
  service.importDouyinPersonalCaptures([
    {
      file: "raw/personal-list.json",
      capturedAt: "2026-06-03T14:48:00.000Z",
      urlSanitized: "https://creator.douyin.com/web/api/creator/item/list",
      body: { items: [{ id: "dy-status-1", description: "抖音状态作品", create_time: "1779004829", metrics: { view_count: 456, like_count: 12 } }] }
    }
  ]);
  service.importXiaohongshuPersonalCaptures([
    {
      file: "raw/note-base.json",
      capturedAt: "2026-06-03T16:54:00.000Z",
      urlSanitized: "https://creator.xiaohongshu.com/api/galaxy/creator/datacenter/note/base?note_id=xhs-status-1",
      body: { data: { view_count: 321, like_count: 22, note_info: { id: "xhs-status-1", desc: "小红书状态笔记", type: "NORMAL", post_time: 1780314116000 } } }
    }
  ]);
  service.importVideoAccountPersonalCaptures([
    {
      file: "raw/content-post-list.json",
      capturedAt: "2026-06-03T16:56:00.000Z",
      urlSanitized: "https://channels.weixin.qq.com/micro/content/cgi-bin/mmfinderassistant-bin/post/post_list",
      body: { data: { list: [{ objectId: "export/video-status-1", createTime: 1780314367, readCount: 1024, likeCount: 88, commentCount: 6, forwardCount: 7, desc: { shortTitle: "视频号状态作品" } }] } }
    }
  ]);
  const snapshot = await service.dashboard();
  const statuses = snapshot.platformImportStatuses;
  assert.deepEqual(statuses.map((item) => item.source), ["douyin_creator_center", "xiaohongshu_creator_center", "video_account_creator_center", "bilibili_creator_center"]);
  for (const status of statuses.filter((item) => item.source !== "bilibili_creator_center")) {
    assert.equal(status.latestStatus, "success");
    assert.equal(status.contentCount, 1);
    assert.equal(status.metricCount, 1);
    assert.equal(status.enteredDashboardReview, true);
    assert.ok(status.latestRunAt);
    assert.ok(status.latestRunId);
  }
  const bilibili = statuses.find((item) => item.source === "bilibili_creator_center");
  assert.equal(bilibili?.latestStatus, "never");
  assert.equal(bilibili?.contentCount, 0);
  assert.equal(bilibili?.metricCount, 0);
  repo.close();
});

test("data capture schedule reliability stays manual-only and surfaces stale catch-up", () => {
  const result = buildDataCaptureScheduleReliability({
    generatedAt: "2026-06-06T08:00:00.000Z",
    platformDataHealth: {
      reportPath: ".local/platform-data-health/report.json",
      exists: true,
      status: "warn",
      generatedAt: "2026-06-06T07:30:00.000Z",
      staleAfterHours: 72,
      summary: {
        platformCount: 4,
        okCount: 3,
        warnCount: 1,
        errorCount: 0,
        missingCount: 0,
        staleCount: 1,
        realCaptureStaleCount: 1,
        sourceMismatchCount: 0,
        bilibiliPreviewOnlyOk: true,
        freshness: {
          latestRealCaptureAt: "2026-06-04T08:00:00.000Z",
          realCaptureIsStale: true,
          staleAfterHours: 72
        }
      },
      platforms: [],
      bilibiliAccount: null
    },
    dailySelfMediaOps: { status: "pass", generatedAt: "2026-06-06T07:45:00.000Z" } as Parameters<typeof buildDataCaptureScheduleReliability>[0]["dailySelfMediaOps"],
    dailyPlatformOpsGate: { status: "pass", generatedAt: "2026-06-06T07:40:00.000Z", freshness: {} } as Parameters<typeof buildDataCaptureScheduleReliability>[0]["dailyPlatformOpsGate"]
  });

  assert.equal(result.mode, "manual_only");
  assert.equal(result.hasHourlyAutomation, false);
  assert.equal(result.hasBackgroundDaemon, false);
  assert.equal(result.hasStartupAutomation, false);
  assert.equal(result.windowsTaskSchedulerRegistered, false);
  assert.equal(result.status, "stale");
  assert.equal(result.startupCatchUpRequired, true);
  assert.equal(result.nextSuggestedAt, "2026-06-05T08:00:00.000Z");
  assert.equal(result.boundaries.noSensitiveLoginMaterial, true);
  assert.equal(result.boundaries.wechatPaused, true);
  assert.equal(result.boundaries.bilibiliAccountPreviewOnly, true);
  assert.equal(result.boundaries.noAutoRegistration, true);
});

test("trusted auto capture scheduler blocks scheduling without authorization", () => {
  const scheduler = buildTrustedAutoCaptureScheduler({
    generatedAt: "2026-06-07T08:00:00.000Z",
    platformDataHealth: schedulerHealthFixture()
  });

  assert.equal(scheduler.statuses.length, 4);
  assert.equal(scheduler.schedulerEnabledCount, 0);
  assert.equal(scheduler.manualOnlyCount, 4);
  assert.equal(scheduler.startupCatchUpCount, 4);
  assert.ok(scheduler.statuses.every((item) => item.captureMode === "manual"));
  assert.ok(scheduler.statuses.every((item) => item.captureConnectionStatus === "not_authorized"));
  assert.ok(scheduler.statuses.every((item) => item.captureSchedule.enabled === false));
  assert.ok(scheduler.statuses.every((item) => item.captureSchedule.allowScheduledCapture === false));
  assert.ok(scheduler.statuses.every((item) => item.nextScheduledCaptureAt === null));
  assert.ok(scheduler.statuses.every((item) => item.needsManualAction === true));
  assert.match(scheduler.statuses[0].missedCaptureReason ?? "", /手动导入/);
  assert.equal(scheduler.boundaries.noScheduleWithoutAuthorization, true);
  assert.equal(scheduler.boundaries.noRealPlatformApiCall, true);
});

test("trusted auto capture scheduler allows official API scheduling and restart catch-up", () => {
  const scheduler = buildTrustedAutoCaptureScheduler({
    generatedAt: "2026-06-07T08:00:00.000Z",
    platformDataHealth: schedulerHealthFixture(),
    connections: [
      {
        platform: "douyin",
        captureMode: "official_api",
        isAuthorized: true,
        captureScheduleEnabled: true,
        intervalHours: 1,
        lastSuccessfulCaptureAt: "2026-06-07T05:00:00.000Z"
      }
    ]
  });
  const douyin = scheduler.statuses.find((item) => item.platform === "douyin");

  assert.equal(douyin?.captureMode, "official_api");
  assert.equal(douyin?.captureConnectionStatus, "authorized");
  assert.equal(douyin?.isAuthorized, true);
  assert.equal(douyin?.captureSchedule.allowScheduledCapture, true);
  assert.equal(douyin?.captureSchedule.enabled, true);
  assert.equal(douyin?.captureSchedule.cadence, "hourly");
  assert.equal(douyin?.lastSuccessfulCaptureAt, "2026-06-07T05:00:00.000Z");
  assert.equal(douyin?.nextScheduledCaptureAt, "2026-06-07T06:00:00.000Z");
  assert.equal(douyin?.startupCatchUpRequired, true);
  assert.equal(douyin?.canRunImmediateCapture, true);
  assert.match(douyin?.missedCaptureReason ?? "", /补抓/);
});

test("trusted auto capture scheduler requires an active browser-assisted session", () => {
  const scheduler = buildTrustedAutoCaptureScheduler({
    generatedAt: "2026-06-07T08:00:00.000Z",
    platformDataHealth: schedulerHealthFixture(),
    connections: [
      {
        platform: "xiaohongshu",
        captureMode: "browser_assisted",
        browserSessionAvailable: false,
        captureScheduleEnabled: true,
        intervalHours: 24,
        lastSuccessfulCaptureAt: "2026-06-07T07:00:00.000Z"
      },
      {
        platform: "bilibili",
        captureMode: "browser_assisted",
        browserSessionAvailable: true,
        captureScheduleEnabled: true,
        intervalHours: 24,
        lastSuccessfulCaptureAt: "2026-06-07T07:00:00.000Z"
      }
    ]
  });
  const xiaohongshu = scheduler.statuses.find((item) => item.platform === "xiaohongshu");
  const bilibili = scheduler.statuses.find((item) => item.platform === "bilibili");

  assert.equal(xiaohongshu?.captureConnectionStatus, "browser_session_missing");
  assert.equal(xiaohongshu?.captureSchedule.enabled, false);
  assert.equal(xiaohongshu?.captureSchedule.allowScheduledCapture, false);
  assert.equal(xiaohongshu?.nextScheduledCaptureAt, null);
  assert.equal(xiaohongshu?.needsManualAction, true);
  assert.match(xiaohongshu?.missedCaptureReason ?? "", /会话不可用/);
  assert.equal(bilibili?.captureConnectionStatus, "browser_session_active");
  assert.equal(bilibili?.captureSchedule.enabled, true);
  assert.equal(bilibili?.nextScheduledCaptureAt, "2026-06-08T07:00:00.000Z");
  assert.equal(bilibili?.needsManualAction, true);
});

test("platform readiness overview keeps platform order and maturity labels stable", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-readiness-"));
  const repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
  const service = new SelfMediaService(repo);
  try {
    const readiness = service.platformReadinessStatuses();
    assert.deepEqual(readiness.map((item) => item.platform), ["douyin", "xiaohongshu", "video_account", "bilibili", "wechat"]);
    assert.deepEqual(readiness.map((item) => item.stageLabel), ["已闭环", "已闭环", "已闭环", "已闭环", "暂停"]);
    assert.deepEqual(readiness.map((item) => item.stage), ["closed_loop", "closed_loop", "closed_loop", "closed_loop", "paused"]);
  } finally {
    repo.close();
  }
});

test("platform readiness overview shows bilibili save boundary and wechat pause", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-readiness-boundary-"));
  const repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
  const service = new SelfMediaService(repo);
  try {
    const readiness = service.platformReadinessStatuses();
    const bilibili = readiness.find((item) => item.platform === "bilibili");
    const wechat = readiness.find((item) => item.platform === "wechat");
    assert.equal(bilibili?.discoveryStatus, "real discovery 已完成");
    assert.equal(bilibili?.mappingStatus, "V1 archives 内容级 mapping 已接入");
    assert.equal(bilibili?.saveStatus, "已确认 archives 内容级保存入库");
    assert.equal(bilibili?.dashboardReviewStatus, "archives 内容级指标进入 dashboard/review");
    assert.equal(bilibili?.operationsStatus, "operations 可运行");
    assert.equal(bilibili?.evidenceFile, "BILIBILI-PERSONAL-V1-SAVE-SMOKE-022-orchestrator-review.md");
    assert.equal(wechat?.stage, "paused");
    assert.equal(wechat?.saveStatus, "不新增保存路径");
    assert.equal(wechat?.operationsStatus, "暂停入口");
    assert.equal(wechat?.evidenceFile, "PLATFORM-PRIORITY-019-orchestrator-decision.md");
  } finally {
    repo.close();
  }
});

test("bilibili operation save is enabled for archives while account metrics remain preview-only", () => {
  const saveEnabledPlatforms = getSaveEnabledPlatformImportOperationPlatforms();
  const bilibili = platformImportOperationCapabilities.find((item) => item.key === "bilibili");
  assert.deepEqual(saveEnabledPlatforms, ["douyin", "xiaohongshu", "video-account", "bilibili"]);
  assert.equal(saveEnabledPlatforms.includes("bilibili"), true);
  assert.equal(bilibili?.previewEnabled, true);
  assert.equal(bilibili?.saveEnabled, true);
  assert.equal(bilibili?.saveSmokeEnabled, true);
  assert.equal(bilibili?.disabledReason, undefined);
  assert.equal(bilibili?.nextHandoff, "BILIBILI-PERSONAL-V1-SAVE-SMOKE-022-orchestrator-review.md");
});

test("platform import operations enforce whitelist and missing raw capture errors", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-platform-op-guard-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    await assert.rejects(
      () => runSelfMediaPlatformImportOperation({ action: "preview", platform: "wechat" as never }, { service }),
      /不支持的平台/
    );
    const missingRaw = await runSelfMediaPlatformImportOperation({ action: "preview", platform: "douyin" }, { service, rawDirs: { douyin: path.join(dir, "missing-raw") } });
    assert.equal(missingRaw.passed, false);
    assert.equal(missingRaw.summaries[0].platform, "douyin");
    assert.equal(missingRaw.summaries[0].label, "抖音创作者中心");
    assert.equal(missingRaw.summaries[0].rawDir, path.join(dir, "missing-raw"));
    assert.equal(missingRaw.summaries[0].discoverCommand, "npm run discover:douyin");
    assert.match(missingRaw.summaries[0].errorMessage ?? "", /raw capture 目录不存在/);
    const missingBilibiliSave = await runSelfMediaPlatformImportOperation({ action: "save", platform: "bilibili" }, { service, rawDirs: { bilibili: path.join(dir, "missing-raw") } });
    assert.equal(missingBilibiliSave.passed, false);
    assert.equal(missingBilibiliSave.summaries[0].platform, "bilibili");
    assert.equal(missingBilibiliSave.summaries[0].source, "bilibili_creator_center");
    assert.equal(missingBilibiliSave.summaries[0].label, "B站创作中心");
    assert.equal(missingBilibiliSave.summaries[0].rawDir, path.join(dir, "missing-raw"));
    assert.equal(missingBilibiliSave.summaries[0].discoverCommand, "npm run discover:bilibili");
    assert.match(missingBilibiliSave.summaries[0].errorMessage ?? "", /raw capture 目录不存在/);
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("platform import operations return safe summaries without raw payload", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-platform-op-preview-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    const rawDir = path.join(dir, "raw");
    writeRawCapture(rawDir, "personal-list.json", {
      capturedAt: "2026-06-03T14:48:00.000Z",
      urlSanitized: "https://creator.douyin.com/web/api/creator/item/list",
      body: {
        items: [
          {
            id: "dy-op-preview-1",
            description: "平台操作预览",
            create_time: "1779004829",
            cover: { url_list: ["https://example.com/cover.webp?token=secret"] },
            metrics: { view_count: "456", like_count: "12", comment_count: "4", share_count: "3", favorite_count: "2" }
          }
        ]
      }
    });
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    const result = await runSelfMediaPlatformImportOperation({ action: "preview", platform: "douyin" }, { service, rawDirs: { douyin: rawDir } });
    const serialized = JSON.stringify(result);
    assert.equal(result.passed, true);
    assert.equal(result.summaries[0].source, "douyin_creator_center");
    assert.equal(result.summaries[0].contentCount, 1);
    assert.equal(serialized.includes("secret"), false);
    assert.equal(serialized.includes("url_list"), false);
    assert.equal(serialized.includes("metrics"), false);
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("platform import operation history records preview summaries and warning abstracts", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-platform-op-history-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    const rawDir = path.join(dir, "raw");
    writeRawCapture(rawDir, "personal-list.json", {
      capturedAt: "2026-06-03T14:48:00.000Z",
      urlSanitized: "https://creator.douyin.com/web/api/creator/item/list",
      body: {
        items: [
          {
            id: "dy-op-history-1",
            description: "平台操作历史",
            create_time: "1779004829",
            metrics: { view_count: "456", like_count: "12", comment_count: "4", share_count: "3", favorite_count: "2" }
          }
        ]
      }
    });
    writeRawCapture(rawDir, "hot-video.json", {
      capturedAt: "2026-06-03T14:49:00.000Z",
      urlSanitized: "https://creator.douyin.com/dp/douyin/v1/creator/item/hot_video",
      body: { data: [{ ItemId: "public-hot-history", ItemTitle: "公共热点不入库", PlayCount: 999 }] }
    });
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    const result = await runSelfMediaPlatformImportOperation({ action: "preview", platform: "douyin" }, { service, rawDirs: { douyin: rawDir } });
    const snapshot = await service.dashboard();
    const history = snapshot.operationHistory.find((item) => item.runId === result.runId && item.platform === "douyin");
    assert.equal(result.passed, true);
    assert.equal(history?.action, "preview");
    assert.equal(history?.source, "douyin_creator_center");
    assert.equal(history?.status, "success");
    assert.equal(history?.contentCount, 1);
    assert.equal(history?.metricCount, 1);
    assert.equal(history?.warningCount, 1);
    assert.match(history?.warningSummary ?? "", /skipped 1 hot_video/);
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("platform operation history redacts sensitive warning fields", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-platform-op-history-sensitive-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    service.recordPlatformOperationHistory("preview", {
      platform: "douyin",
      source: "douyin_creator_center",
      label: "抖音创作者中心",
      contentCount: 0,
      metricCount: 0,
      warnings: ["token=supersecret cookie headers raw payload captures"],
      runId: "history-sensitive-run",
      passed: false,
      errorMessage: "authorization=hidden-secret"
    });
    const serialized = JSON.stringify((await service.dashboard()).operationHistory);
    assert.equal(serialized.includes("supersecret"), false);
    assert.equal(serialized.includes("hidden-secret"), false);
    assert.equal(serialized.includes("token"), false);
    assert.equal(serialized.includes("cookie"), false);
    assert.equal(serialized.includes("headers"), false);
    assert.equal(serialized.includes("raw payload"), false);
    assert.equal(serialized.includes("captures"), false);
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("platform import save operation writes dashboard and review readable facts", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-platform-op-save-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    const rawDir = path.join(dir, "raw");
    writeRawCapture(rawDir, "note-base.json", {
      capturedAt: "2026-06-03T16:54:00.000Z",
      urlSanitized: "https://creator.xiaohongshu.com/api/galaxy/creator/datacenter/note/base?note_id=xhs-real-save-1",
      body: {
        data: {
          view_count: 321,
          like_count: 22,
          comment_count: 4,
          collect_count: 18,
          share_count: 3,
          rise_fans_count: 2,
          note_info: { id: "xhs-real-save-1", desc: "平台操作保存", type: "NORMAL", post_time: 1780314116000 }
        }
      }
    });
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    const result = await runSelfMediaPlatformImportOperation({ action: "save", platform: "xiaohongshu" }, { service, rawDirs: { xiaohongshu: rawDir } });
    const snapshot = await service.dashboard();
    assert.equal(result.passed, true);
    assert.equal(result.summaries[0].source, "xiaohongshu_creator_center");
    assert.ok(result.summaries[0].runId.startsWith("import-"));
    assert.ok(snapshot.contents.some((item) => item.id === "xhs-real-save-1" && item.platform === "xiaohongshu"));
    assert.ok(snapshot.metricSnapshots.some((item) => item.contentId === "xhs-real-save-1" && item.source === "xiaohongshu_creator_center"));
    assert.ok(snapshot.weeklyReview.metrics.totalViews >= 321);
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("unified platform save smoke covers douyin xiaohongshu video account and bilibili", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-four-platform-smoke-"));
  try {
    writeUnifiedPlatformSmokeFixtures(dir);
    const scriptPath = path.join(process.cwd(), "scripts", "platform-personal-save-smoke.mjs");
    const result = spawnSync(process.execPath, ["--import", "tsx", scriptPath, "--platform=all"], {
      cwd: process.cwd(),
      env: cleanSelfMediaSmokeEnv({ SELF_MEDIA_PLATFORM_SMOKE_CWD: dir }),
      encoding: "utf8",
      timeout: 30000,
      windowsHide: true
    });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const report = JSON.parse(readFileSync(path.join(dir, ".local", "platform-personal-save-smoke", "report.json"), "utf8")) as {
      task: string;
      passed: boolean;
      database: {
        smokeDbPath: string;
        seedMode: string;
        isolation: string;
      };
      platforms: Array<{
        platform: string;
        source: string;
        contentCount: number;
        metricCount: number;
        checks: {
          contentCount: number;
          metricCount: number;
          platformVersionCount: number;
          metricSnapshotCount: number;
          dashboardContents: number;
          dashboardMetrics: number;
          dashboardMetricSnapshots: number;
          dashboardPlatformVersions: number;
          defaultScope: string;
          isDefaultDashboardTrusted: boolean;
          excludedSourceMetricSnapshots: number;
          weeklyReviewTotalViews: number;
          monthlyReviewTotalViews: number;
          expectedTotalViews: number;
          provenance: {
            isTestFixture: boolean;
            operationKind?: string;
            trustedScopeEligible?: boolean;
            metricSnapshotsMarkedFixture: boolean;
          };
          diagnostics?: {
            boundary: string;
            accountMetricDiagnosticCount: number;
            dateKeyDiagnosticCount: number;
            accountMetricsSaved: boolean;
            dateKeyRowsSaved: boolean;
            accountMetricSnapshotsExcludedFromContentTotals: boolean;
          };
          idempotency: {
            contentEntitiesStable: boolean;
            platformVersionsStable: boolean;
            metricSnapshotsStable: boolean;
            importRunsAppend: boolean;
          };
        };
      }>;
    };
    assert.equal(report.task, "PLATFORM-OPS-FOUR-024");
    assert.equal(report.passed, true);
    assert.equal(report.database.smokeDbPath, ".local/platform-personal-save-smoke/self-media-smoke.sqlite");
    assert.equal(report.database.seedMode, "off");
    assert.equal(report.database.isolation, "forced_smoke_db");
    assert.equal(existsSync(path.join(dir, report.database.smokeDbPath)), true);
    assert.deepEqual(report.platforms.map((item) => item.platform), ["douyin", "xiaohongshu", "video-account", "bilibili"]);
    for (const platform of report.platforms) {
      assert.equal(platform.contentCount, 1);
      assert.equal(platform.metricCount, 1);
      assert.equal(platform.checks.contentCount, 1);
      assert.equal(platform.checks.metricCount, 1);
      assert.equal(platform.checks.platformVersionCount, 1);
      assert.equal(platform.checks.metricSnapshotCount, 1);
      assert.equal(platform.checks.defaultScope, "trusted_real_creator_center");
      assert.equal(platform.checks.isDefaultDashboardTrusted, true);
      assert.equal(platform.checks.dashboardContents, 0);
      assert.equal(platform.checks.dashboardMetrics, 0);
      assert.equal(platform.checks.dashboardMetricSnapshots, 0);
      assert.equal(platform.checks.dashboardPlatformVersions, 0);
      assert.ok(platform.checks.excludedSourceMetricSnapshots >= 1);
      assert.equal(platform.checks.weeklyReviewTotalViews, 0);
      assert.equal(platform.checks.monthlyReviewTotalViews, 0);
      assert.equal(platform.checks.provenance.isTestFixture, true);
      assert.equal(platform.checks.provenance.operationKind, "platform_save_smoke");
      assert.equal(platform.checks.provenance.trustedScopeEligible, false);
      assert.equal(platform.checks.provenance.metricSnapshotsMarkedFixture, true);
      assert.equal(platform.checks.idempotency.contentEntitiesStable, true);
      assert.equal(platform.checks.idempotency.platformVersionsStable, true);
      assert.equal(platform.checks.idempotency.metricSnapshotsStable, true);
      assert.equal(platform.checks.idempotency.importRunsAppend, true);
    }
    const bilibili = report.platforms.find((item) => item.platform === "bilibili");
    assert.equal(bilibili?.source, "bilibili_creator_center");
    assert.equal(bilibili?.checks.diagnostics?.boundary, "archives_content_level_only");
    assert.equal(bilibili?.checks.diagnostics?.accountMetricDiagnosticCount, 1);
    assert.ok((bilibili?.checks.diagnostics?.dateKeyDiagnosticCount ?? 0) > 0);
    assert.equal(bilibili?.checks.diagnostics?.accountMetricsSaved, false);
    assert.equal(bilibili?.checks.diagnostics?.dateKeyRowsSaved, false);
    assert.equal(bilibili?.checks.diagnostics?.accountMetricSnapshotsExcludedFromContentTotals, true);
    assert.doesNotMatch(JSON.stringify(report), /raw comment secret|danmu text secret|cookie|authorization|token|headers/i);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("platform save smoke forces isolated DB even when parent env points at operating DB", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-smoke-isolation-main-db-"));
  const mainDbPath = path.join(dir, ".local", "self-media.sqlite");
  writeUnifiedPlatformSmokeFixtures(dir);
  seedTrustedFourPlatformMainDb(mainDbPath);

  const scriptPath = path.join(process.cwd(), "scripts", "platform-personal-save-smoke.mjs");
  const result = spawnSync(process.execPath, ["--import", "tsx", scriptPath, "--platform=all"], {
    cwd: process.cwd(),
    env: cleanSelfMediaSmokeEnv({ SELF_MEDIA_PLATFORM_SMOKE_CWD: dir, SELF_MEDIA_DB_PATH: mainDbPath, SELF_MEDIA_SEED_MODE: "demo" }),
    encoding: "utf8",
    timeout: 30000,
    windowsHide: true
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);

  const report = JSON.parse(readFileSync(path.join(dir, ".local", "platform-personal-save-smoke", "report.json"), "utf8")) as {
    passed: boolean;
    database: { smokeDbPath: string; seedMode: string; isolation: string };
  };
  const mainRepo = new SqliteSelfMediaRepo(mainDbPath);
  try {
    const mainSnapshots = mainRepo.listMetricSnapshots();
    const mainImports = mainRepo.listImports();
    const smokeDbPath = path.join(dir, report.database.smokeDbPath);

    assert.equal(report.passed, true);
    assert.equal(report.database.smokeDbPath, ".local/platform-personal-save-smoke/self-media-smoke.sqlite");
    assert.equal(report.database.seedMode, "off");
    assert.equal(report.database.isolation, "forced_smoke_db");
    assert.equal(existsSync(smokeDbPath), true);
    assert.equal(path.resolve(smokeDbPath) === path.resolve(mainDbPath), false);
    assert.equal(mainSnapshots.some((item) => item.provenance?.operationKind === "platform_save_smoke" || item.provenance?.isTestFixture === true), false);
    assert.equal(mainImports.some((item) => item.provenance?.operationKind === "platform_save_smoke" || item.provenance?.isTestFixture === true), false);
    assert.deepEqual([...new Set(mainSnapshots.map((item) => item.platform))].sort(), ["bilibili", "douyin", "video_account", "xiaohongshu"]);
  } finally {
    mainRepo.close();
  }
});

test("platform operations e2e smoke defaults to isolated server instead of reusing 3200", async () => {
  const { resolvePlatformOperationsE2ESmokePlan } = await loadPlatformOperationsE2ESmokeModule();
  const inheritedEnv = {
    SELF_MEDIA_DB_PATH: ".local/self-media.sqlite",
    SELF_MEDIA_SEED_MODE: "demo"
  };
  const defaultPlan = resolvePlatformOperationsE2ESmokePlan(inheritedEnv);
  const explicitReusePlan = resolvePlatformOperationsE2ESmokePlan({ ...inheritedEnv, SMOKE_BASE_URL: "http://127.0.0.1:3200" });

  assert.equal(defaultPlan.mode, "isolated");
  assert.equal(defaultPlan.baseUrl, null);
  assert.equal(defaultPlan.defaultReuseUrl, "http://127.0.0.1:3200");
  assert.equal(defaultPlan.smokeDbPath, ".local/platform-operations-e2e/self-media-smoke.sqlite");
  assert.equal(defaultPlan.seedMode, "off");
  assert.equal(explicitReusePlan.mode, "reuse");
  assert.equal(explicitReusePlan.baseUrl, "http://127.0.0.1:3200");
  assert.equal(explicitReusePlan.smokeDbPath, null);
});

test("operating action-to-content e2e smoke always defaults to isolated database and temporary port", async () => {
  const { resolveOperatingActionToContentE2EPlan } = await loadOperatingActionToContentE2EModule();
  const plan = resolveOperatingActionToContentE2EPlan({
    SELF_MEDIA_DB_PATH: ".local/self-media.sqlite",
    SELF_MEDIA_SEED_MODE: "demo"
  });

  assert.equal(plan.mode, "isolated");
  assert.match(plan.smokeDbPath, /\.local[\\/]operating-e2e-action-to-content-038[\\/]self-media-action-content-/);
  assert.equal(plan.seedMode, "off");
  assert.equal(plan.portStart, 3280);
  assert.equal(plan.screenshotPath.endsWith(".local\\operating-e2e-action-to-content-038.png") || plan.screenshotPath.endsWith(".local/operating-e2e-action-to-content-038.png"), true);
  assert.equal(plan.reportPath.endsWith("operating-e2e-action-to-content-038\\report.json") || plan.reportPath.endsWith("operating-e2e-action-to-content-038/report.json"), true);
});

test("platform data health flags missing raw capture directories without reading payloads", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-platform-health-missing-"));
  const { buildPlatformDataHealthReport } = await loadPlatformDataHealthModule();
  const report = buildPlatformDataHealthReport({ cwd: dir, now: new Date("2026-06-04T08:00:00.000Z"), platforms: ["douyin"] });
  const douyin = report.platforms[0];

  assert.equal(report.status, "error");
  assert.equal(report.summary.missingCount, 3);
  assert.equal(douyin.platform, "douyin");
  assert.equal(douyin.raw.exists, false);
  assert.equal(douyin.raw.captureCount, 0);
  assert.ok(douyin.warnings.some((warning) => warning.includes("raw capture directory is missing")));
});

test("platform data health marks old mapping preview and save smoke reports stale", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-platform-health-stale-"));
  const rawDir = path.join(dir, ".local", "douyin-personal-v0", "raw");
  const oldGeneratedAt = "2026-05-30T08:00:00.000Z";
  mkdirSync(rawDir, { recursive: true });
  writeFileSync(path.join(rawDir, "capture.json"), "{}");
  writeJsonSummary(path.join(dir, ".local", "douyin-personal-v1", "mapping-preview.json"), {
    generatedAt: oldGeneratedAt,
    saved: false,
    payload: { source: "douyin_creator_center", contentCount: 1, metricCount: 1 }
  });
  writeJsonSummary(path.join(dir, ".local", "douyin-personal-v1", "save-smoke-report.json"), {
    generatedAt: oldGeneratedAt,
    passed: true,
    source: "douyin_creator_center",
    contentCount: 1,
    metricCount: 1,
    checks: { importRunSource: true }
  });

  const { buildPlatformDataHealthReport } = await loadPlatformDataHealthModule();
  const report = buildPlatformDataHealthReport({ cwd: dir, now: new Date("2026-06-04T08:00:00.000Z"), platforms: ["douyin"] });
  const douyin = report.platforms[0];

  assert.equal(report.status, "warn");
  assert.equal(report.summary.staleCount, 2);
  assert.equal(douyin.mappingPreview.isStale, true);
  assert.equal(douyin.saveSmokeReport.isStale, true);
  assert.equal(douyin.mappingPreview.sourceMatches, true);
  assert.equal(douyin.saveSmokeReport.sourceMatches, true);
});

test("platform data health does not let fresh smoke masquerade as fresh real capture", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-platform-health-real-vs-smoke-"));
  const rawDir = path.join(dir, ".local", "douyin-personal-v0", "raw");
  const rawPath = path.join(rawDir, "capture.json");
  const oldRealCaptureAt = new Date("2026-05-30T08:00:00.000Z");
  const freshSmokeAt = "2026-06-04T07:30:00.000Z";
  mkdirSync(rawDir, { recursive: true });
  writeFileSync(rawPath, "{}");
  utimesSync(rawPath, oldRealCaptureAt, oldRealCaptureAt);
  writeJsonSummary(path.join(dir, ".local", "douyin-personal-v1", "mapping-preview.json"), {
    generatedAt: freshSmokeAt,
    saved: true,
    payload: { source: "douyin_creator_center", contentCount: 1, metricCount: 1 }
  });
  writeJsonSummary(path.join(dir, ".local", "douyin-personal-v1", "save-smoke-report.json"), {
    generatedAt: freshSmokeAt,
    passed: true,
    source: "douyin_creator_center",
    contentCount: 1,
    metricCount: 1,
    checks: { importRunSource: true }
  });

  const { buildPlatformDataHealthReport } = await loadPlatformDataHealthModule();
  const report = buildPlatformDataHealthReport({ cwd: dir, now: new Date("2026-06-04T08:00:00.000Z"), platforms: ["douyin"] });
  const douyin = report.platforms[0];

  assert.equal(report.status, "warn");
  assert.equal(report.summary.realCaptureStaleCount, 1);
  assert.equal(report.summary.freshness?.latestRealCaptureAt, oldRealCaptureAt.toISOString());
  assert.equal(report.summary.freshness?.latestSmokeAt, freshSmokeAt);
  assert.equal(report.summary.freshness?.realCaptureIsStale, true);
  assert.equal(report.summary.freshness?.smokeIsStale, false);
  assert.equal(douyin.freshness?.latestRealCaptureAt, oldRealCaptureAt.toISOString());
  assert.equal(douyin.freshness?.latestSmokeAt, freshSmokeAt);
  assert.equal(douyin.raw.isStale, true);
  assert.equal(douyin.realCaptureStatus, "stale");
  assert.equal(douyin.commands?.preview, "npm run import:douyin");
  assert.equal(douyin.commands?.save, "npm run import:douyin -- --save");
  assert.ok(douyin.nextAction?.includes("人工登录"));
  assert.ok(douyin.warnings.some((warning) => warning.includes("real capture is older than 72 hours")));
});

test("real capture freshness check reports stale real captures separately from fresh smoke", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-real-capture-freshness-"));
  const now = new Date("2026-06-04T08:00:00.000Z");
  const oldRealCaptureAt = new Date("2026-05-30T08:00:00.000Z");
  const freshRealCaptureAt = new Date("2026-06-04T06:00:00.000Z");
  const freshSmokeAt = "2026-06-04T07:30:00.000Z";
  const fixtures = [
    { platform: "douyin", rawDir: ".local/douyin-personal-v0/raw", outDir: ".local/douyin-personal-v1", source: "douyin_creator_center", realCaptureAt: oldRealCaptureAt },
    { platform: "xiaohongshu", rawDir: ".local/xiaohongshu-personal-v0/raw", outDir: ".local/xiaohongshu-personal-v1", source: "xiaohongshu_creator_center", realCaptureAt: freshRealCaptureAt },
    { platform: "video-account", rawDir: ".local/video-account-personal-v0/raw", outDir: ".local/video-account-personal-v1", source: "video_account_creator_center", realCaptureAt: freshRealCaptureAt },
    { platform: "bilibili", rawDir: ".local/bilibili-personal-v0/raw", outDir: ".local/bilibili-personal-v1", source: "bilibili_creator_center", realCaptureAt: freshRealCaptureAt }
  ];

  for (const fixture of fixtures) {
    const rawDir = path.join(dir, fixture.rawDir);
    const rawPath = path.join(rawDir, "capture.json");
    mkdirSync(rawDir, { recursive: true });
    writeFileSync(rawPath, JSON.stringify({ cookie: "do-not-leak-cookie", token: "do-not-leak-token", rawPayload: "do-not-leak-payload" }));
    utimesSync(rawPath, fixture.realCaptureAt, fixture.realCaptureAt);
    writeJsonSummary(path.join(dir, fixture.outDir, "mapping-preview.json"), {
      generatedAt: freshSmokeAt,
      saved: true,
      payload: { source: fixture.source, contentCount: 1, metricCount: 1 }
    });
    writeJsonSummary(path.join(dir, fixture.outDir, "save-smoke-report.json"), {
      generatedAt: freshSmokeAt,
      passed: true,
      source: fixture.source,
      contentCount: 1,
      metricCount: 1,
      checks: { importRunSource: true }
    });
  }

  const { buildRealCaptureFreshnessReport, renderRealCaptureFreshnessMarkdown } = await loadRealCaptureFreshnessModule();
  const report = buildRealCaptureFreshnessReport({ cwd: dir, now });
  const douyin = report.platforms.find((platform) => platform.platform === "douyin");
  const rendered = renderRealCaptureFreshnessMarkdown(report);
  const serialized = JSON.stringify(report);

  assert.equal(report.status, "warn");
  assert.equal(report.passed, false);
  assert.equal(report.summary.staleCount, 1);
  assert.equal(report.summary.missingCount, 0);
  assert.deepEqual(report.summary.stalePlatforms, ["douyin"]);
  assert.deepEqual(report.summary.missingPlatforms, []);
  assert.equal(douyin?.latestRealCaptureAt, oldRealCaptureAt.toISOString());
  assert.equal(douyin?.latestSmokeAt, freshSmokeAt);
  assert.equal(douyin?.realCaptureIsStale, true);
  assert.equal(douyin?.smokeIsStale, false);
  assert.equal(douyin?.commands.preview, "npm run import:douyin");
  assert.equal(douyin?.commands.save, "npm run import:douyin -- --save");
  assert.ok(douyin?.commands.audit.includes("npm run audit:trusted-dashboard"));
  assert.ok(douyin?.commands.gate.includes("npm run gate:daily-platform-ops"));
  assert.ok(douyin?.nextAction.includes("人工登录"));
  assert.equal(report.scope.noCollection, true);
  assert.equal(report.scope.browserOpened, false);
  assert.equal(report.scope.databaseWrites, false);
  assert.equal(report.scope.rawPayloadRead, false);
  assert.equal(report.scope.sensitiveFieldsRead, false);
  assert.equal(report.scope.wechatPaused, true);
  assert.deepEqual(report.scope.platforms, ["douyin", "xiaohongshu", "video-account", "bilibili"]);
  assert.doesNotMatch(serialized, /do-not-leak-cookie|do-not-leak-token|do-not-leak-payload|authorization/i);
  assert.doesNotMatch(serialized, /sync:wechat|discover:wechat|check:wechat|preview:bilibili-account-metrics/i);
  assert.ok(rendered.includes("Safe Refresh Loop After Manual Collection"));
  assert.ok(rendered.includes("Platform Command Plan"));
  assert.ok(rendered.includes("npm run import:douyin -- --save"));
  assert.ok(rendered.includes("stalePlatforms: douyin"));
  assert.ok(rendered.includes("does not open a browser"));
});

test("platform data health keeps Bilibili account metrics on the preview-only boundary", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-platform-health-bilibili-"));
  const now = new Date();
  const generatedAt = now.toISOString();
  const rawDir = path.join(dir, ".local", "bilibili-personal-v0", "raw");
  mkdirSync(rawDir, { recursive: true });
  writeFileSync(path.join(rawDir, "archives.json"), "{}");
  writeJsonSummary(path.join(dir, ".local", "bilibili-personal-v1", "mapping-preview.json"), {
    generatedAt,
    saved: false,
    previewOnly: true,
    payload: { source: "bilibili_creator_center", contentCount: 1, metricCount: 1 }
  });
  writeJsonSummary(path.join(dir, ".local", "bilibili-personal-v1", "save-smoke-report.json"), {
    generatedAt,
    passed: true,
    source: "bilibili_creator_center",
    contentCount: 1,
    metricCount: 1,
    checks: { diagnosticsExcludedFromPersistence: { accountMetricsSaved: false, dateKeyRowsSaved: false } }
  });
  const accountPreviewPath = path.join(dir, ".local", "bilibili-account-metrics-v0", "account-preview.json");
  writeJsonSummary(accountPreviewPath, {
    generatedAt,
    saved: false,
    previewOnly: true,
    source: "bilibili_creator_center",
    candidateCount: 1
  });
  mkdirSync(path.dirname(path.join(dir, ".local", "bilibili-account-metrics-v0", "stability-report.md")), { recursive: true });
  writeFileSync(path.join(dir, ".local", "bilibili-account-metrics-v0", "stability-report.md"), "# stability\n");

  const { buildPlatformDataHealthReport } = await loadPlatformDataHealthModule();
  const report = buildPlatformDataHealthReport({ cwd: dir, now, platforms: ["bilibili"] });
  assert.equal(report.summary.bilibiliPreviewOnlyOk, true);
  assert.equal(report.bilibiliAccount?.accountPreview.candidateCount, 1);
  assert.equal(report.bilibiliAccount?.accountPreview.previewOnlyOk, true);

  writeJsonSummary(accountPreviewPath, {
    generatedAt,
    saved: true,
    previewOnly: false,
    source: "bilibili_creator_center",
    candidateCount: 1
  });
  const boundaryBreach = buildPlatformDataHealthReport({ cwd: dir, now, platforms: ["bilibili"] });
  assert.equal(boundaryBreach.summary.bilibiliPreviewOnlyOk, false);
  assert.equal(boundaryBreach.bilibiliAccount?.accountPreview.status, "warn");
});

test("platform ops with health blocks smoke when health has blocking failures", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-platform-health-gate-fail-"));
  const commandKeys: string[] = [];
  const { runPlatformOpsWithHealth } = await loadPlatformOpsWithHealthModule();
  const blockingHealth = {
    generatedAt: "2026-06-04T08:00:00.000Z",
    status: "error",
    staleAfterHours: 72,
    summary: {
      okCount: 0,
      warnCount: 0,
      errorCount: 1,
      missingCount: 1,
      staleCount: 0,
      sourceMismatchCount: 1,
      bilibiliPreviewOnlyOk: true
    }
  };

  try {
    const report = await runPlatformOpsWithHealth({
      cwd: dir,
      now: "2026-06-04T08:00:00.000Z",
      runCommand: (step, cwd) => {
        commandKeys.push(step.key);
        if (step.kind === "health") writeJsonSummary(path.join(cwd, ".local", "platform-data-health", "report.json"), blockingHealth);
        return { exitCode: 0, stdout: `${step.key} ok`, stderr: "", durationMs: 1 };
      }
    });

    assert.equal(report.passed, false);
    assert.equal(report.status, "error");
    assert.equal(report.blocked, true);
    assert.deepEqual(commandKeys, ["health_before"]);
    assert.ok(report.summary.blockingReasons.some((item) => item.includes("errorCount=1")));
    assert.ok(report.summary.blockingReasons.some((item) => item.includes("missingCount=1")));
    assert.ok(report.summary.blockingReasons.some((item) => item.includes("sourceMismatchCount=1")));
    assert.ok(readFileSync(path.join(dir, ".local", "platform-ops-with-health", "report.md"), "utf8").includes("Fails on health errors"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("platform ops with health treats stale health as warning only", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-platform-health-gate-stale-"));
  const commandKeys: string[] = [];
  const { runPlatformOpsWithHealth } = await loadPlatformOpsWithHealthModule();
  const staleHealth = {
    generatedAt: "2026-06-04T08:00:00.000Z",
    status: "warn",
    staleAfterHours: 72,
    summary: {
      okCount: 12,
      warnCount: 2,
      errorCount: 0,
      missingCount: 0,
      staleCount: 2,
      sourceMismatchCount: 0,
      bilibiliPreviewOnlyOk: true
    }
  };

  try {
    const report = await runPlatformOpsWithHealth({
      cwd: dir,
      now: "2026-06-04T08:00:00.000Z",
      runCommand: (step, cwd) => {
        commandKeys.push(step.key);
        if (step.kind === "health") writeJsonSummary(path.join(cwd, ".local", "platform-data-health", "report.json"), staleHealth);
        return { exitCode: 0, stdout: `${step.key} ok`, stderr: "", durationMs: 1 };
      }
    });

    assert.equal(report.passed, true);
    assert.equal(report.status, "warn");
    assert.equal(report.blocked, false);
    assert.deepEqual(commandKeys, ["health_before", "platforms_save_smoke", "platform_operations_e2e", "health_after"]);
    assert.equal(report.summary.completedAllSteps, true);
    assert.equal(report.summary.blockingReasons.length, 0);
    assert.ok(report.summary.warnings.some((item) => item.includes("staleCount=2")));
    assert.ok(readFileSync(path.join(dir, ".local", "platform-ops-with-health", "report.json"), "utf8").includes("\"passed\": true"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("daily platform ops gate blocks trusted audit when health gate fails", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-daily-gate-health-fail-"));
  const commandKeys: string[] = [];
  const { runDailyPlatformOpsGate } = await loadDailyPlatformOpsGateModule();
  try {
    const report = await runDailyPlatformOpsGate({
      cwd: dir,
      now: "2026-06-04T08:00:00.000Z",
      dashboardUrl: "http://127.0.0.1:3200/api/self-media/dashboard",
      runCommand: (step, cwd) => {
        commandKeys.push(step.key);
        writeJsonSummary(path.join(cwd, ".local", "platform-ops-with-health", "report.json"), {
          status: "error",
          passed: false,
          blocked: true,
          summary: { completedAllSteps: false, blockingReasons: ["health missingCount=1"], warnings: [] }
        });
        return { exitCode: 1, stdout: "health gate failed", stderr: "", durationMs: 1 };
      }
    });
    assert.equal(report.passed, false);
    assert.equal(report.status, "fail");
    assert.equal(report.blocked, true);
    assert.deepEqual(commandKeys, ["platform_ops_with_health"]);
    assert.equal(report.summary.completedAllSteps, false);
    assert.ok(report.summary.blockingReasons.some((item) => item.includes("health missingCount=1")));
    assert.ok(readFileSync(path.join(dir, ".local", "daily-platform-ops", "report.md"), "utf8").includes("Runs trusted dashboard audit only after the health gate passes"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("daily platform ops gate fails on trusted dashboard audit mismatch", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-daily-gate-audit-fail-"));
  const commandKeys: string[] = [];
  const { runDailyPlatformOpsGate } = await loadDailyPlatformOpsGateModule();
  try {
    const report = await runDailyPlatformOpsGate({
      cwd: dir,
      now: "2026-06-04T08:00:00.000Z",
      dashboardUrl: "http://127.0.0.1:3200/api/self-media/dashboard",
      runCommand: (step, cwd) => {
        commandKeys.push(step.key);
        if (step.key === "platform_ops_with_health") {
          writeJsonSummary(path.join(cwd, ".local", "platform-ops-with-health", "report.json"), {
            status: "ok",
            passed: true,
            blocked: false,
            summary: { completedAllSteps: true, blockingReasons: [], warnings: [] }
          });
          return { exitCode: 0, stdout: "health gate ok", stderr: "", durationMs: 1 };
        }
        writeJsonSummary(path.join(cwd, ".local", "daily-platform-ops", "trusted-dashboard-audit", "report.json"), {
          status: "fail",
          dashboardInput: "url",
          expected: { contentCount: 2, metricSnapshotCount: 2, views: 200, engagement: 20 },
          mismatches: ["weeklyReview.totalViews"]
        });
        return { exitCode: 1, stdout: "audit mismatch", stderr: "", durationMs: 1 };
      }
    });
    assert.equal(report.passed, false);
    assert.equal(report.status, "fail");
    assert.equal(report.blocked, false);
    assert.deepEqual(commandKeys, ["platform_ops_with_health", "trusted_dashboard_audit"]);
    assert.equal(report.steps[1].summary?.status, "fail");
    assert.deepEqual(report.steps[1].summary?.mismatches, ["weeklyReview.totalViews"]);
    assert.ok(report.summary.blockingReasons.some((item) => item.includes("weeklyReview.totalViews")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("daily platform ops gate passes when health gate and trusted audit pass", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-daily-gate-pass-"));
  const commandKeys: string[] = [];
  const { runDailyPlatformOpsGate } = await loadDailyPlatformOpsGateModule();
  try {
    const report = await runDailyPlatformOpsGate({
      cwd: dir,
      now: "2026-06-04T08:00:00.000Z",
      dashboardUrl: "http://127.0.0.1:3200/api/self-media/dashboard",
      runCommand: (step, cwd) => {
        commandKeys.push(step.key);
        if (step.key === "platform_ops_with_health") {
          writeJsonSummary(path.join(cwd, ".local", "platform-ops-with-health", "report.json"), {
            status: "ok",
            passed: true,
            blocked: false,
            summary: { completedAllSteps: true, blockingReasons: [], warnings: [] }
          });
          return { exitCode: 0, stdout: "health gate ok", stderr: "", durationMs: 1 };
        }
        writeJsonSummary(path.join(cwd, ".local", "daily-platform-ops", "trusted-dashboard-audit", "report.json"), {
          status: "pass",
          dashboardInput: "url",
          expected: { contentCount: 19, metricSnapshotCount: 19, views: 344412, engagement: 4259 },
          mismatches: []
        });
        return { exitCode: 0, stdout: "audit ok", stderr: "", durationMs: 1 };
      }
    });
    const serialized = readFileSync(path.join(dir, ".local", "daily-platform-ops", "report.json"), "utf8");
    assert.equal(report.passed, true);
    assert.equal(report.status, "pass");
    assert.equal(report.blocked, false);
    assert.deepEqual(commandKeys, ["platform_ops_with_health", "trusted_dashboard_audit"]);
    assert.equal(report.summary.completedAllSteps, true);
    assert.equal(report.steps[1].summary?.trustedContentCount, 19);
    assert.doesNotMatch(serialized, /cookie|authorization|token|headers|raw payload/i);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("daily platform ops gate summarizes real capture smoke and audit freshness separately", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-daily-gate-freshness-"));
  const { runDailyPlatformOpsGate } = await loadDailyPlatformOpsGateModule();
  try {
    const report = await runDailyPlatformOpsGate({
      cwd: dir,
      now: "2026-06-04T08:00:00.000Z",
      dashboardUrl: "http://127.0.0.1:3200/api/self-media/dashboard",
      runCommand: (step, cwd) => {
        if (step.key === "platform_ops_with_health") {
          writeJsonSummary(path.join(cwd, ".local", "platform-ops-with-health", "report.json"), {
            status: "warn",
            passed: true,
            blocked: false,
            summary: {
              completedAllSteps: true,
              blockingReasons: [],
              warnings: ["health realCaptureStaleCount=1; next real collection should refresh raw capture evidence"],
              freshness: {
                latestRealCaptureAt: "2026-05-30T08:00:00.000Z",
                latestSmokeAt: "2026-06-04T07:30:00.000Z",
                latestAuditAt: null,
                realCaptureAgeHours: 120,
                smokeAgeHours: 0.5,
                realCaptureIsStale: true,
                smokeIsStale: false,
                staleAfterHours: 72
              }
            }
          });
          return { exitCode: 0, stdout: "health gate ok", stderr: "", durationMs: 1 };
        }
        writeJsonSummary(path.join(cwd, ".local", "daily-platform-ops", "trusted-dashboard-audit", "report.json"), {
          generatedAt: "2026-06-04T08:01:00.000Z",
          status: "pass",
          dashboardInput: "url",
          freshness: {
            latestRealCaptureAt: "2026-05-30T08:00:00.000Z",
            latestSmokeAt: "2026-06-04T07:30:00.000Z",
            latestAuditAt: "2026-06-04T08:01:00.000Z",
            realCaptureAgeHours: 120,
            smokeAgeHours: 0.5,
            realCaptureIsStale: true,
            smokeIsStale: false,
            staleAfterHours: 72
          },
          expected: { contentCount: 19, metricSnapshotCount: 19, views: 344412, engagement: 4259 },
          mismatches: []
        });
        return { exitCode: 0, stdout: "audit ok", stderr: "", durationMs: 1 };
      }
    });
    const markdown = readFileSync(path.join(dir, ".local", "daily-platform-ops", "report.md"), "utf8");

    assert.equal(report.passed, true);
    assert.equal(report.status, "warn");
    assert.equal(report.summary.freshness?.latestRealCaptureAt, "2026-05-30T08:00:00.000Z");
    assert.equal(report.summary.freshness?.latestSmokeAt, "2026-06-04T07:30:00.000Z");
    assert.equal(report.summary.freshness?.latestAuditAt, "2026-06-04T08:01:00.000Z");
    assert.equal(report.summary.freshness?.realCaptureIsStale, true);
    assert.equal(report.summary.freshness?.smokeIsStale, false);
    assert.ok(markdown.includes("Recent real capture: 2026-05-30T08:00:00.000Z"));
    assert.ok(markdown.includes("Recent smoke: 2026-06-04T07:30:00.000Z"));
    assert.ok(markdown.includes("Recent audit: 2026-06-04T08:01:00.000Z"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("daily platform ops gate keeps operating DB trusted audit at four platforms after save smoke", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-daily-gate-smoke-isolation-"));
  const mainDbPath = path.join(dir, ".local", "self-media.sqlite");
  const dashboardPath = path.join(dir, ".local", "dashboard-after-smoke.json");
  const auditOutDir = path.join(dir, ".local", "daily-platform-ops", "trusted-dashboard-audit");
  const commandKeys: string[] = [];
  const { runDailyPlatformOpsGate } = await loadDailyPlatformOpsGateModule();

  writeUnifiedPlatformSmokeFixtures(dir);
  seedTrustedFourPlatformMainDb(mainDbPath);
  const smokeResult = spawnSync(process.execPath, ["--import", "tsx", path.join(process.cwd(), "scripts", "platform-personal-save-smoke.mjs"), "--platform=all"], {
    cwd: process.cwd(),
    env: cleanSelfMediaSmokeEnv({ SELF_MEDIA_PLATFORM_SMOKE_CWD: dir, SELF_MEDIA_DB_PATH: mainDbPath }),
    encoding: "utf8",
    timeout: 30000,
    windowsHide: true
  });
  assert.equal(smokeResult.status, 0, `${smokeResult.stdout}\n${smokeResult.stderr}`);

  const mainRepo = new SqliteSelfMediaRepo(mainDbPath);
  try {
    const dashboard = await new SelfMediaService(mainRepo).dashboard();
    writeJsonSummary(dashboardPath, dashboard);
    assert.deepEqual([...new Set(mainRepo.listMetricSnapshots().map((item) => item.platform))].sort(), ["bilibili", "douyin", "video_account", "xiaohongshu"]);
    assert.equal(mainRepo.listMetricSnapshots().some((item) => item.provenance?.isTestFixture === true), false);
  } finally {
    mainRepo.close();
  }

  const report = await runDailyPlatformOpsGate({
    cwd: dir,
    now: "2026-06-04T08:00:00.000Z",
    dashboardJson: dashboardPath,
    runCommand: (step, cwd) => {
      commandKeys.push(step.key);
      if (step.key === "platform_ops_with_health") {
        writeJsonSummary(path.join(cwd, ".local", "platform-ops-with-health", "report.json"), {
          status: "ok",
          passed: true,
          blocked: false,
          scope: {
            smokeDatabasePaths: {
              platformsSave: ".local/platform-personal-save-smoke/self-media-smoke.sqlite",
              platformOperationsE2E: ".local/platform-operations-e2e/self-media-smoke.sqlite"
            }
          },
          summary: { completedAllSteps: true, blockingReasons: [], warnings: [] }
        });
        return { exitCode: 0, stdout: "health and smoke gate ok", stderr: "", durationMs: 1 };
      }
      const auditResult = spawnSync(process.execPath, [path.join(process.cwd(), "scripts", "trusted-dashboard-audit.mjs"), `--dashboard-json=${dashboardPath}`, `--out-dir=${auditOutDir}`], {
        cwd: process.cwd(),
        env: { ...process.env, SELF_MEDIA_DB_PATH: mainDbPath, SELF_MEDIA_SEED_MODE: "off" },
        encoding: "utf8",
        windowsHide: true
      });
      return { exitCode: auditResult.status ?? 1, stdout: auditResult.stdout, stderr: auditResult.stderr, durationMs: 1 };
    }
  });

  const auditSummary = report.steps.find((item) => item.key === "trusted_dashboard_audit")?.summary;
  const serializedReport = readFileSync(path.join(dir, ".local", "daily-platform-ops", "report.md"), "utf8");
  assert.equal(report.passed, true);
  assert.deepEqual(commandKeys, ["platform_ops_with_health", "trusted_dashboard_audit"]);
  assert.equal(auditSummary?.trustedPlatformCount, 4);
  assert.deepEqual(Object.keys(auditSummary?.platformDistribution ?? {}).sort(), ["bilibili", "douyin", "video_account", "xiaohongshu"]);
  assert.ok(serializedReport.includes(".local/platform-personal-save-smoke/self-media-smoke.sqlite"));
  assert.ok(serializedReport.includes(".local/platform-operations-e2e/self-media-smoke.sqlite"));
});

test("daily self-media ops runs report commands serially and keeps redacted-only weekly output", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-daily-one-command-"));
  const { runDailySelfMediaOps } = await loadDailySelfMediaOpsModule();
  const commandKeys: string[] = [];
  let activeCommands = 0;
  let maxActiveCommands = 0;

  const report = await runDailySelfMediaOps({
    cwd: dir,
    now: "2026-06-05T08:00:00.000Z",
    dashboardUrl: "http://127.0.0.1:3200/api/self-media/dashboard",
    runCommand: async (step, cwd) => {
      activeCommands += 1;
      maxActiveCommands = Math.max(maxActiveCommands, activeCommands);
      commandKeys.push(step.key);
      await new Promise((resolve) => setTimeout(resolve, 1));
      if (step.key === "platform_data_health") {
        writeJsonSummary(path.join(cwd, ".local", "platform-data-health", "report.json"), {
          generatedAt: "2026-06-05T07:59:00.000Z",
          status: "ok",
          summary: { okCount: 14, warnCount: 0, errorCount: 0, missingCount: 0, staleCount: 0, realCaptureStaleCount: 0, sourceMismatchCount: 0, bilibiliPreviewOnlyOk: true, freshness: { latestRealCaptureAt: "2026-06-05T07:00:00.000Z", latestSmokeAt: "2026-06-05T07:30:00.000Z" } }
        });
      }
      if (step.key === "real_capture_freshness") {
        writeJsonSummary(path.join(cwd, ".local", "real-capture-freshness", "report.json"), {
          generatedAt: "2026-06-05T08:00:00.000Z",
          status: "pass",
          passed: true,
          staleAfterHours: 72,
          summary: { freshPlatforms: ["douyin", "xiaohongshu", "video-account", "bilibili"], stalePlatforms: [], missingPlatforms: [], staleCount: 0, missingCount: 0 },
          platforms: [
            { platform: "douyin", latestRealCaptureAt: "2026-06-05T07:00:00.000Z", latestSmokeAt: "2026-06-05T07:30:00.000Z" }
          ]
        });
      }
      if (step.key === "trusted_weekly_safe") {
        writeJsonSummary(path.join(cwd, ".local", "trusted-weekly-report", "redacted-summary.json"), {
          generatedAt: "2026-06-05T08:01:00.000Z",
          totals: { trustedContentCount: 19, metricSnapshotCount: 19, views: 344412, engagement: 4259 },
          redaction: { contentTitlesIncluded: false, contentIdsIncluded: false, accountMetricsIncluded: false, captureDetailsIncluded: false },
          consistencyChecks: { trustedTotalsMatchDashboard: true }
        });
      }
      if (step.key === "trusted_dashboard_audit") {
        writeJsonSummary(path.join(cwd, ".local", "daily-self-media-ops", "trusted-dashboard-audit", "report.json"), {
          generatedAt: "2026-06-05T08:02:00.000Z",
          status: "pass",
          expected: { contentCount: 19, metricSnapshotCount: 19, views: 344412, engagement: 4259 },
          mismatches: [],
          dashboardInput: "url",
          freshness: { latestAuditAt: "2026-06-05T08:02:00.000Z" }
        });
      }
      if (step.key === "daily_platform_ops_gate") {
        writeJsonSummary(path.join(cwd, ".local", "daily-platform-ops", "report.json"), {
          generatedAt: "2026-06-05T08:03:00.000Z",
          status: "pass",
          passed: true,
          blocked: false,
          summary: { completedAllSteps: true, blockingReasons: [], warnings: [], freshness: { latestAuditAt: "2026-06-05T08:03:00.000Z" } }
        });
      }
      activeCommands -= 1;
      return { exitCode: 0, durationMs: 1 };
    }
  });
  const serialized = JSON.stringify(report);
  const persisted = readFileSync(path.join(dir, ".local", "daily-self-media-ops", "report.json"), "utf8");

  assert.equal(report.status, "pass");
  assert.equal(report.passed, true);
  assert.deepEqual(commandKeys, ["platform_data_health", "real_capture_freshness", "trusted_weekly_safe", "trusted_dashboard_audit", "daily_platform_ops_gate"]);
  assert.equal(maxActiveCommands, 1);
  assert.equal(report.scope.serialExecution, true);
  assert.equal(report.scope.noParallelSqliteReports, true);
  assert.equal(report.scope.noCollection, true);
  assert.equal(report.scope.platformLoginOpened, false);
  assert.equal(report.scope.databaseDeletion, false);
  assert.equal(report.scope.wechatPaused, true);
  assert.equal(report.scope.bilibiliAccountMetricsSaved, false);
  assert.equal(report.scope.commandOutputStored, false);
  assert.equal(report.scope.trustedWeeklyRedactedOnly, true);
  assert.equal(report.sections.preflightHealth?.enabled, false);
  assert.equal(report.sections.preflightHealth?.status, "disabled");
  assert.equal(report.sections.trustedWeeklySafe?.redactedOnly, true);
  assert.equal(report.sections.trustedWeeklySafe?.paths.redactedJson, ".local/trusted-weekly-report/redacted-summary.json");
  assert.equal(report.sections.trustedWeeklySafe?.paths.localEvidenceJson, null);
  assert.equal(report.outputs.safeDailySummaryJson, ".local/daily-self-media-ops/redacted-summary.json");
  assert.equal(report.outputs.safeDailySummaryMarkdown, ".local/daily-self-media-ops/redacted-summary.md");
  assert.equal(existsSync(path.join(dir, ".local", "daily-self-media-ops", "redacted-summary.json")), true);
  assert.ok(report.steps.find((step) => step.key === "trusted_weekly_safe")?.command.includes("report:trusted-weekly:safe"));
  assert.equal(report.steps.some((step) => step.command === "npm run report:trusted-weekly"), false);
  assert.doesNotMatch(serialized, /cookie|authorization|headers?|access[_-]?token|refresh[_-]?token|raw\s*payload|comment_content|danmu_text|danmu/i);
  assert.doesNotMatch(persisted, /cookie|authorization|headers?|access[_-]?token|refresh[_-]?token|raw\s*payload|comment_content|danmu_text|danmu/i);
});

test("daily self-media ops preflight pass adopts preferred dashboard url", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-daily-preflight-pass-"));
  const { runDailySelfMediaOps } = await loadDailySelfMediaOpsModule();
  const commands: string[] = [];
  const report = await runDailySelfMediaOps({
    cwd: dir,
    now: "2026-06-05T08:00:00.000Z",
    dashboardUrl: "http://127.0.0.1:3200/api/self-media/dashboard",
    preflightHealth: true,
    runCommand: (step, cwd) => {
      commands.push(step.command + " " + step.args.join(" "));
      if (step.key === "local_server_health_preflight") {
        writeJsonSummary(path.join(cwd, ".local", "daily-self-media-ops", "local-server-health", "report.json"), {
          status: "pass",
          passed: true,
          config: { strict: true },
          summary: {
            preferredDashboardUrl: "http://127.0.0.1:3201/api/self-media/dashboard",
            healthyPorts: [3201],
            apiReadyPorts: [3201],
            safeWeeklyReadyPorts: [3201],
            trustedDataReadyPorts: [3201],
            pageReadyPorts: [3201],
            staleOrOldRoutePorts: [3200],
            nextActions: ["Use healthy 3201"]
          }
        });
      }
      if (step.key === "platform_data_health") writeJsonSummary(path.join(cwd, ".local", "platform-data-health", "report.json"), { status: "ok", summary: { okCount: 1, warnCount: 0, errorCount: 0 } });
      if (step.key === "real_capture_freshness") writeJsonSummary(path.join(cwd, ".local", "real-capture-freshness", "report.json"), { status: "pass", summary: { freshPlatforms: ["douyin"], stalePlatforms: [], missingPlatforms: [], staleCount: 0, missingCount: 0 }, platforms: [] });
      if (step.key === "trusted_weekly_safe") writeJsonSummary(path.join(cwd, ".local", "trusted-weekly-report", "redacted-summary.json"), { totals: { trustedContentCount: 19, metricSnapshotCount: 19, views: 344412, engagement: 4259 }, redaction: { contentTitlesIncluded: false, contentIdsIncluded: false, accountMetricsIncluded: false, captureDetailsIncluded: false } });
      if (step.key === "trusted_dashboard_audit") writeJsonSummary(path.join(cwd, ".local", "daily-self-media-ops", "trusted-dashboard-audit", "report.json"), { status: "pass", expected: { contentCount: 19, metricSnapshotCount: 19, views: 344412, engagement: 4259 }, mismatches: [], dashboardInput: "url" });
      if (step.key === "daily_platform_ops_gate") writeJsonSummary(path.join(cwd, ".local", "daily-platform-ops", "report.json"), { status: "pass", passed: true, summary: { completedAllSteps: true, blockingReasons: [], warnings: [] } });
      return { exitCode: 0, durationMs: 1 };
    }
  });

  assert.equal(report.status, "pass");
  assert.equal(report.sections.preflightHealth?.enabled, true);
  assert.equal(report.sections.preflightHealth?.status, "pass");
  assert.equal(report.sections.preflightHealth?.preferredDashboardUrl, "http://127.0.0.1:3201/api/self-media/dashboard");
  assert.deepEqual(report.sections.preflightHealth?.trustedDataReadyPorts, [3201]);
  assert.deepEqual(report.sections.preflightHealth?.pageReadyPorts, [3201]);
  assert.equal(report.config.dashboardUrl, "http://127.0.0.1:3201/api/self-media/dashboard");
  assert.deepEqual(report.steps.map((step) => step.key), ["local_server_health_preflight", "platform_data_health", "real_capture_freshness", "trusted_weekly_safe", "trusted_dashboard_audit", "daily_platform_ops_gate"]);
  const safeDailySummary = JSON.parse(readFileSync(path.join(dir, ".local", "daily-self-media-ops", "redacted-summary.json"), "utf8"));
  const safeDailyMarkdown = readFileSync(path.join(dir, ".local", "daily-self-media-ops", "redacted-summary.md"), "utf8");
  assert.equal(safeDailySummary.status, "pass");
  assert.equal(safeDailySummary.passed, true);
  assert.equal(safeDailySummary.sections.dailyOps.status, "pass");
  assert.equal(safeDailySummary.sections.localServerHealth.status, "pass");
  assert.equal(safeDailySummary.sections.trustedWeeklySafe.redaction.titlesIncluded, false);
  assert.doesNotMatch(JSON.stringify(safeDailySummary), /raw\s*payload|cookie|authorization|headers?|access[_-]?token|refresh[_-]?token|comment_content|danmu_text|danmu/i);
  assert.doesNotMatch(safeDailyMarkdown, /raw\s*payload|cookie|authorization|headers?|access[_-]?token|refresh[_-]?token|comment_content|danmu_text|danmu/i);
  assert.ok(commands.find((command) => command.includes("check:local-server-health"))?.includes("--check-page"));
  assert.ok(commands.find((command) => command.includes("check:local-server-health"))?.includes("--require-trusted-data"));
  assert.ok(commands.find((command) => command.includes("audit:trusted-dashboard"))?.includes("3201"));
  assert.ok(commands.find((command) => command.includes("gate:daily-platform-ops"))?.includes("3201"));
});

test("daily self-media ops preflight fail writes blocking report without reading stale child reports", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-daily-preflight-fail-"));
  const { runDailySelfMediaOps } = await loadDailySelfMediaOpsModule();
  writeJsonSummary(path.join(dir, ".local", "trusted-weekly-report", "redacted-summary.json"), { status: "pass", generatedAt: "old-stale-child" });
  let commandCount = 0;
  const report = await runDailySelfMediaOps({
    cwd: dir,
    now: "2026-06-05T08:00:00.000Z",
    preflightHealth: true,
    runCommand: (step, cwd) => {
      commandCount += 1;
      assert.equal(step.key, "local_server_health_preflight");
      writeJsonSummary(path.join(cwd, ".local", "daily-self-media-ops", "local-server-health", "report.json"), {
        status: "fail",
        passed: false,
        config: { strict: true },
        summary: {
          preferredDashboardUrl: null,
          healthyPorts: [],
          apiReadyPorts: [],
          safeWeeklyReadyPorts: [3201],
          trustedDataReadyPorts: [],
          pageReadyPorts: [],
          staleOrOldRoutePorts: [3200, 3201],
          timeoutPorts: [3200],
          oldRoutePorts: [3201],
          nextActions: ["Manually confirm stale dev servers; do not auto-kill."]
        }
      });
      return { exitCode: 1, durationMs: 1 };
    }
  });
  const persisted = JSON.parse(readFileSync(path.join(dir, ".local", "daily-self-media-ops", "report.json"), "utf8"));

  assert.equal(commandCount, 1);
  assert.equal(report.status, "fail");
  assert.equal(report.passed, false);
  assert.equal(report.steps.length, 1);
  assert.equal(report.steps[0].key, "local_server_health_preflight");
  assert.equal(report.sections.preflightHealth?.status, "fail");
  assert.equal(report.sections.trustedWeeklySafe, null);
  assert.ok(report.summary.blockingReasons.some((reason) => reason.includes("preflight failed")));
  assert.ok(report.summary.nextActions.some((action) => action.includes("check:local-server-health")));
  assert.equal(JSON.stringify(persisted).includes("old-stale-child"), false);
});

test("daily self-media ops reports blocking reasons and next actions on safe weekly failure", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-daily-one-command-fail-"));
  const { runDailySelfMediaOps } = await loadDailySelfMediaOpsModule();
  const report = await runDailySelfMediaOps({
    cwd: dir,
    now: "2026-06-05T08:00:00.000Z",
    runCommand: (step, cwd) => {
      if (step.key === "platform_data_health") writeJsonSummary(path.join(cwd, ".local", "platform-data-health", "report.json"), { status: "ok", summary: { okCount: 1, warnCount: 0, errorCount: 0 } });
      if (step.key === "real_capture_freshness") writeJsonSummary(path.join(cwd, ".local", "real-capture-freshness", "report.json"), { status: "warn", summary: { freshPlatforms: ["douyin"], stalePlatforms: ["bilibili"], missingPlatforms: [], staleCount: 1, missingCount: 0 }, platforms: [] });
      if (step.key === "trusted_dashboard_audit") writeJsonSummary(path.join(cwd, ".local", "daily-self-media-ops", "trusted-dashboard-audit", "report.json"), { status: "pass", expected: {}, mismatches: [] });
      if (step.key === "daily_platform_ops_gate") writeJsonSummary(path.join(cwd, ".local", "daily-platform-ops", "report.json"), { status: "pass", passed: true, summary: { blockingReasons: [], warnings: [] } });
      return { exitCode: step.key === "trusted_weekly_safe" ? 1 : 0, durationMs: 1 };
    }
  });

  assert.equal(report.status, "fail");
  assert.equal(report.passed, false);
  assert.equal(report.sections.trustedWeeklySafe?.status, "missing");
  assert.ok(report.summary.blockingReasons.some((reason) => reason.includes("Trusted weekly safe report command failed")));
  assert.ok(report.summary.warnings.some((warning) => warning.includes("real capture stale platforms: bilibili")));
  assert.ok(report.summary.nextActions.some((action) => action.includes("report:trusted-weekly:safe")));
  assert.ok(report.summary.nextActions.some((action) => action.includes("Manually refresh stale platforms")));
});

test("daily ops redacted summary consolidates reports without leaking sensitive or private content", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-daily-redacted-summary-"));
  const { runDailyOpsRedactedSummary } = await loadDailyOpsRedactedSummaryModule();
  const dangerousText = "cookie=abc token=def headers={x:1} raw payload comment_content danmu_text contentId 私密标题《不要泄露》";
  writeJsonSummary(path.join(dir, ".local", "daily-self-media-ops", "report.json"), {
    generatedAt: "2026-06-05T08:05:00.000Z",
    status: "warn",
    passed: true,
    config: { dashboardUrl: "http://127.0.0.1:3200/api/self-media/dashboard" },
    summary: {
      completedAllSteps: true,
      blockingReasons: [],
      warnings: ["real capture stale platforms: bilibili", dangerousText],
      nextActions: ["Refresh stale platform captures manually before trusting the next operating cycle.", dangerousText]
    },
    sections: {
      preflightHealth: {
        enabled: true,
        status: "pass",
        preferredDashboardUrl: "http://127.0.0.1:3200/api/self-media/dashboard",
        healthyPorts: [3200],
        trustedDataReadyPorts: [3200],
        pageReadyPorts: [3200]
      }
    },
    steps: [
      { key: "trusted_weekly_safe", label: "Trusted weekly safe report", passed: true, reportPath: ".local/trusted-weekly-report/redacted-summary.json", summary: { status: "pass" } }
    ],
    rawPayload: dangerousText
  });
  writeJsonSummary(path.join(dir, ".local", "daily-self-media-ops", "local-server-health", "report.json"), {
    generatedAt: "2026-06-05T08:00:00.000Z",
    status: "pass",
    passed: true,
    summary: {
      preferredDashboardUrl: "http://127.0.0.1:3200/api/self-media/dashboard",
      healthyPorts: [3200],
      apiReadyPorts: [3200],
      safeWeeklyReadyPorts: [3200],
      trustedDataReadyPorts: [3200],
      pageReadyPorts: [3200],
      timeoutPorts: [],
      oldRoutePorts: [],
      staleOrOldRoutePorts: [],
      notListeningPorts: [],
      nextActions: ["Use --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard for daily gate or audit commands."]
    },
    ports: [{
      port: 3200,
      healthy: true,
      issue: "healthy",
      dashboard: { status: "pass", durationMs: 20 },
      safeWeekly: { status: "pass", durationMs: 18, rawPayload: dangerousText },
      dashboardPage: { status: "pass", durationMs: 25 }
    }]
  });
  writeJsonSummary(path.join(dir, ".local", "platform-data-health", "report.json"), {
    generatedAt: "2026-06-05T07:59:00.000Z",
    status: "warn",
    summary: {
      platformCount: 4,
      okCount: 3,
      warnCount: 1,
      errorCount: 0,
      missingCount: 0,
      staleCount: 1,
      realCaptureStaleCount: 1,
      sourceMismatchCount: 0,
      bilibiliPreviewOnlyOk: true,
      freshness: { latestRealCaptureAt: "2026-06-05T07:00:00.000Z", latestSmokeAt: "2026-06-05T07:30:00.000Z", realCaptureIsStale: true, smokeIsStale: false, staleAfterHours: 72 }
    },
    platforms: [{
      platform: "bilibili",
      status: "warn",
      realCaptureStatus: "stale",
      raw: { captureCount: 3, path: dangerousText },
      mappingPreview: { status: "ok" },
      saveSmokeReport: { status: "ok" },
      warnings: [dangerousText]
    }]
  });
  writeJsonSummary(path.join(dir, ".local", "real-capture-freshness", "report.json"), {
    generatedAt: "2026-06-05T08:00:00.000Z",
    status: "warn",
    passed: true,
    staleAfterHours: 72,
    summary: { freshPlatforms: ["douyin", "xiaohongshu"], stalePlatforms: ["bilibili"], missingPlatforms: [], staleCount: 1, missingCount: 0 },
    platforms: [{ platform: "bilibili", latestRealCaptureAt: "2026-06-01T08:00:00.000Z", latestSmokeAt: "2026-06-05T07:30:00.000Z", nextAction: dangerousText }]
  });
  writeJsonSummary(path.join(dir, ".local", "trusted-weekly-report", "redacted-summary.json"), {
    generatedAt: "2026-06-05T08:01:00.000Z",
    totals: { trustedContentCount: 19, metricSnapshotCount: 19, views: 344412, engagement: 4259 },
    redaction: { contentTitlesIncluded: false, contentIdsIncluded: false, accountMetricsIncluded: false, captureDetailsIncluded: false },
    platformOverview: [{ platform: "bilibili", contentCount: 4, metricSnapshotCount: 4, views: 12000, engagement: 300 }],
    topContentPerformance: [{ title: dangerousText, contentId: dangerousText }]
  });
  writeJsonSummary(path.join(dir, ".local", "daily-self-media-ops", "trusted-dashboard-audit", "report.json"), {
    generatedAt: "2026-06-05T08:02:00.000Z",
    status: "fail",
    expected: {
      contentCount: 19,
      metricSnapshotCount: 19,
      views: 344412,
      engagement: 4259,
      platformDistribution: { bilibili: { contentCount: 4, metricSnapshotCount: 4, views: 12000, engagement: 300 } }
    },
    mismatches: [dangerousText],
    dashboardInput: "url",
    freshness: { latestAuditAt: "2026-06-05T08:02:00.000Z" }
  });

  const { summary, outputs } = runDailyOpsRedactedSummary({ cwd: dir, now: "2026-06-05T08:10:00.000Z" });
  const json = readFileSync(outputs.jsonPath, "utf8");
  const markdown = readFileSync(outputs.markdownPath, "utf8");
  const combined = `${json}\n${markdown}`;

  assert.equal(summary.status, "fail");
  assert.equal(summary.passed, false);
  assert.equal(summary.scope.readOnly, true);
  assert.equal(summary.scope.serverStarted, false);
  assert.equal(summary.scope.processKilled, false);
  assert.equal(summary.scope.platformCollection, false);
  assert.equal(summary.scope.platformPublishing, false);
  assert.equal(summary.scope.databaseDeletion, false);
  assert.equal(summary.scope.databaseMigration, false);
  assert.equal(summary.scope.fullLocalReportsIncluded, false);
  assert.equal(summary.scope.platformResponseBodiesIncluded, false);
  assert.equal(summary.scope.platformInteractionTextIncluded, false);
  assert.equal(summary.scope.contentTitlesIncluded, false);
  assert.ok(summary.blockingReasons.some((reason) => reason.includes("trusted dashboard audit")));
  assert.ok(summary.warnings.some((warning) => warning.includes("bilibili")));
  assert.ok(summary.nextActions.some((action) => action.includes("audit:trusted-dashboard")));
  assert.deepEqual(summary.sections.localServerHealth.healthyPorts, [3200]);
  assert.deepEqual(summary.sections.localServerHealth.trustedDataReadyPorts, [3200]);
  assert.deepEqual(summary.sections.localServerHealth.pageReadyPorts, [3200]);
  assert.equal(summary.sections.platformDataHealth.summary.staleCount, 1);
  assert.equal(summary.sections.platformDataHealth.platforms[0].warningCount, 1);
  assert.equal(summary.sections.realCaptureFreshness.summary.stalePlatforms[0], "bilibili");
  assert.equal(summary.sections.trustedWeeklySafe.totals.trustedContentCount, 19);
  assert.equal(summary.sections.trustedWeeklySafe.redaction.titlesIncluded, false);
  assert.equal(summary.sections.trustedWeeklySafe.redaction.idsIncluded, false);
  assert.equal(summary.sections.trustedDashboardAudit.mismatchCount, 1);
  assert.equal(existsSync(outputs.jsonPath), true);
  assert.equal(existsSync(outputs.markdownPath), true);
  assert.doesNotMatch(combined, /cookie|authorization|headers?|access[_-]?token|refresh[_-]?token|\btoken\b|raw\s*payload|comment_content|danmu_text|danmu|contentId|私密标题|不要泄露|《/i);
});

function writeDailySelfMediaOpsViewReport(dir: string, overrides: Record<string, unknown> = {}) {
  const steps = [
    ["platform_data_health", "Platform data health", "npm run health:platform-data", ".local/platform-data-health/report.json"],
    ["real_capture_freshness", "Real capture freshness", "npm run check:real-capture-freshness", ".local/real-capture-freshness/report.json"],
    ["trusted_weekly_safe", "Trusted weekly safe report", "npm run report:trusted-weekly:safe", ".local/trusted-weekly-report/redacted-summary.json"],
    ["trusted_dashboard_audit", "Trusted dashboard audit", "npm run audit:trusted-dashboard -- --dashboard-url=http://127.0.0.1:3201/api/self-media/dashboard --out-dir=.local/daily-self-media-ops/trusted-dashboard-audit", ".local/daily-self-media-ops/trusted-dashboard-audit/report.json"],
    ["daily_platform_ops_gate", "Daily platform ops gate", "npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3201/api/self-media/dashboard", ".local/daily-platform-ops/report.json"]
  ].map(([key, label, command, reportPath]) => ({ key, label, command, reportPath, exitCode: 0, passed: true, durationMs: 1, summary: { status: "pass" } }));
  writeJsonSummary(path.join(dir, ".local", "daily-self-media-ops", "report.json"), {
    generatedAt: "2026-06-05T09:00:00.000Z",
    task: "DAILY-OPS-ONE-COMMAND-036",
    status: "pass",
    passed: true,
    scope: {
      serialExecution: true,
      noCollection: true,
      browserOpened: false,
      platformLoginOpened: false,
      databaseDeletion: false,
      wechatPaused: true,
      bilibiliAccountMetricsSaved: false,
      commandOutputStored: false,
      trustedWeeklyRedactedOnly: true
    },
    summary: {
      stepCount: 5,
      plannedStepCount: 5,
      completedAllSteps: true,
      blockingReasons: [],
      warnings: [],
      nextActions: ["No blocking action. Continue daily dashboard review and task follow-through."]
    },
    steps,
    sections: {
      preflightHealth: {
        enabled: false,
        status: "disabled",
        passed: null,
        preferredDashboardUrl: null,
        healthyPorts: [],
        apiReadyPorts: [],
        safeWeeklyReadyPorts: [],
        staleOrOldRoutePorts: []
      }
    },
    outputs: {
      trustedWeeklyRedactedJson: ".local/trusted-weekly-report/redacted-summary.json",
      trustedWeeklyRedactedMarkdown: ".local/trusted-weekly-report/redacted-summary.md"
    },
    ...overrides
  });
}

test("daily self-media ops UI view reports missing parent report with run command guidance", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-daily-ops-ui-missing-"));
  const view = readDailySelfMediaOpsView(dir);

  assert.equal(view.exists, false);
  assert.equal(view.status, "missing");
  assert.equal(view.steps.length, 5);
  assert.equal(view.steps.every((step) => step.status === "missing"), true);
  assert.equal(view.command, "npm run ops:daily-self-media");
  assert.ok(view.message?.includes("npm run ops:daily-self-media"));
  assert.ok(view.message?.includes("http://127.0.0.1:3200/api/self-media/dashboard"));
  assert.ok(view.fallbackDashboardUrlHint.includes("--dashboard-url=http://127.0.0.1:<healthy-port>/api/self-media/dashboard"));
});

test("daily self-media ops UI view reads pass report summary and redacted weekly paths", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-daily-ops-ui-pass-"));
  writeDailySelfMediaOpsViewReport(dir);
  const view = readDailySelfMediaOpsView(dir);

  assert.equal(view.exists, true);
  assert.equal(view.status, "pass");
  assert.equal(view.passed, true);
  assert.equal(view.stepCount, 5);
  assert.equal(view.plannedStepCount, 5);
  assert.equal(view.preflightHealth.enabled, false);
  assert.equal(view.preflightHealth.status, "disabled");
  assert.equal(view.completedAllSteps, true);
  assert.equal(view.steps.length, 5);
  assert.equal(view.steps.every((step) => step.status === "pass"), true);
  assert.equal(view.safeWeeklyRedactedPaths.json, ".local/trusted-weekly-report/redacted-summary.json");
  assert.equal(view.safeWeeklyRedactedPaths.markdown, ".local/trusted-weekly-report/redacted-summary.md");
  assert.equal(view.scope.noCollection, true);
  assert.equal(view.scope.platformLoginOpened, false);
  assert.equal(view.scope.databaseDeletion, false);
  assert.equal(view.scope.wechatPaused, true);
  assert.equal(view.scope.bilibiliAccountMetricsSaved, false);
});

test("daily self-media ops UI view reads strict preflight status", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-daily-ops-ui-preflight-"));
  writeDailySelfMediaOpsViewReport(dir, {
    summary: {
      stepCount: 6,
      plannedStepCount: 6,
      completedAllSteps: true,
      blockingReasons: [],
      warnings: [],
      nextActions: ["No blocking action. Continue daily dashboard review and task follow-through."]
    },
    sections: {
      preflightHealth: {
        enabled: true,
        status: "pass",
        passed: true,
        preferredDashboardUrl: "http://127.0.0.1:3201/api/self-media/dashboard",
        healthyPorts: [3201],
        apiReadyPorts: [3201],
        safeWeeklyReadyPorts: [3201],
        trustedDataReadyPorts: [3201],
        pageReadyPorts: [3201],
        staleOrOldRoutePorts: [3200]
      }
    },
    steps: [
      { key: "local_server_health_preflight", label: "Local server health preflight", command: "npm run check:local-server-health -- --ports=3200,3201 --strict --require-trusted-data --check-page", reportPath: ".local/daily-self-media-ops/local-server-health/report.json", exitCode: 0, passed: true, durationMs: 1, summary: { status: "pass" } },
      { key: "platform_data_health", label: "Platform data health", command: "npm run health:platform-data", reportPath: ".local/platform-data-health/report.json", exitCode: 0, passed: true, durationMs: 1, summary: { status: "ok" } },
      { key: "real_capture_freshness", label: "Real capture freshness", command: "npm run check:real-capture-freshness", reportPath: ".local/real-capture-freshness/report.json", exitCode: 0, passed: true, durationMs: 1, summary: { status: "pass" } },
      { key: "trusted_weekly_safe", label: "Trusted weekly safe report", command: "npm run report:trusted-weekly:safe", reportPath: ".local/trusted-weekly-report/redacted-summary.json", exitCode: 0, passed: true, durationMs: 1, summary: { status: "pass" } },
      { key: "trusted_dashboard_audit", label: "Trusted dashboard audit", command: "npm run audit:trusted-dashboard -- --dashboard-url=http://127.0.0.1:3201/api/self-media/dashboard", reportPath: ".local/daily-self-media-ops/trusted-dashboard-audit/report.json", exitCode: 0, passed: true, durationMs: 1, summary: { status: "pass" } },
      { key: "daily_platform_ops_gate", label: "Daily platform ops gate", command: "npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3201/api/self-media/dashboard", reportPath: ".local/daily-platform-ops/report.json", exitCode: 0, passed: true, durationMs: 1, summary: { status: "pass" } }
    ]
  });
  const view = readDailySelfMediaOpsView(dir);

  assert.equal(view.preflightHealth.enabled, true);
  assert.equal(view.preflightHealth.status, "pass");
  assert.equal(view.preflightHealth.preferredDashboardUrl, "http://127.0.0.1:3201/api/self-media/dashboard");
  assert.deepEqual(view.preflightHealth.healthyPorts, [3201]);
  assert.deepEqual(view.preflightHealth.apiReadyPorts, [3201]);
  assert.deepEqual(view.preflightHealth.safeWeeklyReadyPorts, [3201]);
  assert.deepEqual(view.preflightHealth.trustedDataReadyPorts, [3201]);
  assert.deepEqual(view.preflightHealth.pageReadyPorts, [3201]);
  assert.deepEqual(view.preflightHealth.staleOrOldRoutePorts, [3200]);
  assert.equal(view.steps[0].key, "local_server_health_preflight");
  assert.equal(view.steps.length, 6);
});

test("daily self-media ops UI view reads fail report blocking reasons warnings and next actions", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-daily-ops-ui-fail-"));
  writeDailySelfMediaOpsViewReport(dir, {
    status: "fail",
    passed: false,
    summary: {
      stepCount: 5,
      plannedStepCount: 5,
      completedAllSteps: true,
      blockingReasons: ["Trusted weekly safe report command failed with exitCode=1"],
      warnings: ["real capture stale platforms: bilibili"],
      nextActions: ["Rerun npm run report:trusted-weekly:safe; share only redacted-summary.*."]
    },
    steps: [
      { key: "platform_data_health", label: "Platform data health", command: "npm run health:platform-data", reportPath: ".local/platform-data-health/report.json", exitCode: 0, passed: true, durationMs: 1, summary: { status: "ok" } },
      { key: "real_capture_freshness", label: "Real capture freshness", command: "npm run check:real-capture-freshness", reportPath: ".local/real-capture-freshness/report.json", exitCode: 0, passed: true, durationMs: 1, summary: { status: "warn" } },
      { key: "trusted_weekly_safe", label: "Trusted weekly safe report", command: "npm run report:trusted-weekly:safe", reportPath: ".local/trusted-weekly-report/redacted-summary.json", exitCode: 1, passed: false, durationMs: 1, summary: { status: "missing" } },
      { key: "trusted_dashboard_audit", label: "Trusted dashboard audit", command: "npm run audit:trusted-dashboard -- --dashboard-url=http://127.0.0.1:3201/api/self-media/dashboard", reportPath: ".local/daily-self-media-ops/trusted-dashboard-audit/report.json", exitCode: 0, passed: true, durationMs: 1, summary: { status: "pass" } },
      { key: "daily_platform_ops_gate", label: "Daily platform ops gate", command: "npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3201/api/self-media/dashboard", reportPath: ".local/daily-platform-ops/report.json", exitCode: 0, passed: true, durationMs: 1, summary: { status: "pass" } }
    ]
  });
  const view = readDailySelfMediaOpsView(dir);

  assert.equal(view.status, "fail");
  assert.equal(view.passed, false);
  assert.equal(view.steps.find((step) => step.key === "trusted_weekly_safe")?.status, "fail");
  assert.ok(view.blockingReasons.some((reason) => reason.includes("Trusted weekly safe report command failed")));
  assert.ok(view.warnings.some((warning) => warning.includes("bilibili")));
  assert.ok(view.nextActions.some((action) => action.includes("report:trusted-weekly:safe")));
});

test("daily self-media ops UI view does not treat old child reports as parent report", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-daily-ops-ui-child-"));
  writeJsonSummary(path.join(dir, ".local", "daily-self-media-ops", "trusted-dashboard-audit", "report.json"), { status: "pass", generatedAt: "2026-06-04T09:00:00.000Z" });
  writeJsonSummary(path.join(dir, ".local", "daily-platform-ops", "report.json"), { status: "pass", generatedAt: "2026-06-04T09:01:00.000Z" });
  const view = readDailySelfMediaOpsView(dir);

  assert.equal(view.exists, false);
  assert.equal(view.status, "missing");
  assert.equal(view.stepCount, 0);
  assert.equal(view.steps.every((step) => step.status === "missing"), true);
});

test("daily self-media ops UI view redacts sensitive text before display", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-daily-ops-ui-sensitive-"));
  writeDailySelfMediaOpsViewReport(dir, {
    status: "fail",
    passed: false,
    summary: {
      stepCount: 5,
      plannedStepCount: 5,
      completedAllSteps: false,
      blockingReasons: ["cookie and access_token leaked from child output"],
      warnings: ["raw payload contained comment_content and danmu_text"],
      nextActions: ["Inspect headers before retry"]
    },
    steps: [
      { key: "platform_data_health", label: "Platform data health", command: "npm run health:platform-data -- --token=abc", reportPath: ".local/platform-data-health/report.json", exitCode: 1, passed: false, durationMs: 1, summary: { status: "headers" } }
    ]
  });
  const view = readDailySelfMediaOpsView(dir);
  const serialized = JSON.stringify(view);

  assert.equal(view.blockingReasons[0], "已隐藏敏感操作细节");
  assert.equal(view.warnings[0], "已隐藏敏感操作细节");
  assert.equal(view.nextActions[0], "已隐藏敏感操作细节");
  assert.equal(view.steps.find((step) => step.key === "platform_data_health")?.command, "已隐藏敏感操作细节");
  assert.doesNotMatch(serialized, /cookie|authorization|headers?|access[_-]?token|refresh[_-]?token|raw\s*payload|comment_content|danmu_text|danmu|评论正文|弹幕/i);
});

test("local server health reports healthy dashboard and safe weekly summaries", async () => {
  const { buildLocalServerHealthReport, renderLocalServerHealthMarkdown } = await loadLocalServerHealthModule();
  const report = await buildLocalServerHealthReport({
    ports: [3200],
    timeoutMs: 25,
    checkPage: true,
    now: "2026-06-05T09:00:00.000Z",
    probeTcp: async () => ({ listening: true, durationMs: 2 }),
    fetchJson: async (url) => {
      if (url.endsWith("/api/self-media/dashboard")) {
        return {
          ok: true,
          status: 200,
          durationMs: 12,
          data: {
            generatedAt: "2026-06-05T08:59:00.000Z",
            realDataScope: {
              defaultScope: "trusted_real_creator_center_content_level",
              trustedContentCount: 19,
              trustedMetricSnapshotCount: 19
            },
            weeklyReview: { metrics: { totalViews: 344412, totalEngagement: 4259 } },
            contents: [{ id: "private-content-id", title: "真实标题不应进入健康报告" }]
          }
        };
      }
      return {
        ok: true,
        status: 200,
        durationMs: 14,
        data: {
          report: {
            generatedAt: "2026-06-05T08:59:30.000Z",
            defaultScope: "trusted_real_creator_center_content_level",
            totals: { trustedContentCount: 19, trustedMetricSnapshotCount: 19, views: 344412, engagement: 4259 },
            platformOverview: [{ platform: "douyin", views: 100, engagement: 10, contentCount: 1, metricSnapshotCount: 1 }],
            redaction: { contentTitlesIncluded: false, contentIdsIncluded: false, accountMetricsIncluded: false, captureDetailsIncluded: false }
          },
          markdown: "Safe weekly redacted summary text should not be stored in health output."
        }
      };
    },
    fetchPage: async () => {
      return { ok: true, status: 200, durationMs: 16, pageReady: true };
    }
  });
  const serialized = JSON.stringify(report);
  const markdown = renderLocalServerHealthMarkdown(report);

  assert.equal(report.status, "pass");
  assert.equal(report.passed, true);
  assert.deepEqual(report.summary.healthyPorts, [3200]);
  assert.deepEqual(report.summary.apiReadyPorts, [3200]);
  assert.deepEqual(report.summary.safeWeeklyReadyPorts, [3200]);
  assert.deepEqual(report.summary.trustedDataReadyPorts, [3200]);
  assert.deepEqual(report.summary.pageReadyPorts, [3200]);
  assert.equal(report.summary.preferredDashboardUrl, "http://127.0.0.1:3200/api/self-media/dashboard");
  assert.equal(report.ports[0].issue, "healthy");
  assert.equal(report.ports[0].dashboard.apiReady, true);
  assert.equal(report.ports[0].safeWeekly.apiReady, true);
  assert.equal(report.ports[0].dashboardPage.status, "pass");
  assert.equal(report.ports[0].dashboardPage.pageReady, true);
  assert.equal(report.ports[0].dashboard.trustedTotals?.trustedContentCount, 19);
  assert.equal(report.ports[0].safeWeekly.trustedTotals?.views, 344412);
  assert.equal(report.scope.noFullDashboardJson, true);
  assert.equal(report.scope.noSafeMarkdownText, true);
  assert.doesNotMatch(serialized, /真实标题不应进入健康报告|private-content-id|Safe weekly redacted summary text/i);
  assert.ok(markdown.includes("trustedContent=19"));
  assert.ok(markdown.includes("page-ready ports: 3200"));
});

test("local server health rejects page-unavailable ports even when APIs and trusted data are ready", async () => {
  const { buildLocalServerHealthReport, renderLocalServerHealthMarkdown } = await loadLocalServerHealthModule();
  const report = await buildLocalServerHealthReport({
    ports: [3200],
    timeoutMs: 25,
    checkPage: true,
    probeTcp: async () => ({ listening: true, durationMs: 1 }),
    fetchJson: async (url) => {
      if (url.endsWith("/api/self-media/dashboard")) {
        return {
          ok: true,
          status: 200,
          durationMs: 8,
          data: { realDataScope: { trustedContentCount: 19, trustedMetricSnapshotCount: 19 }, weeklyReview: { metrics: { totalViews: 10, totalEngagement: 2 } } }
        };
      }
      return {
        ok: true,
        status: 200,
        durationMs: 9,
        data: { report: { totals: { trustedContentCount: 19, trustedMetricSnapshotCount: 19, views: 10, engagement: 2 }, redaction: {} } }
      };
    },
    fetchPage: async () => ({ ok: false, status: 404, durationMs: 7, pageReady: false, errorMessage: "http 404" })
  });
  const markdown = renderLocalServerHealthMarkdown(report);

  assert.equal(report.status, "fail");
  assert.deepEqual(report.summary.apiReadyPorts, [3200]);
  assert.deepEqual(report.summary.safeWeeklyReadyPorts, [3200]);
  assert.deepEqual(report.summary.trustedDataReadyPorts, [3200]);
  assert.deepEqual(report.summary.pageReadyPorts, []);
  assert.deepEqual(report.summary.healthyPorts, []);
  assert.equal(report.summary.preferredDashboardUrl, null);
  assert.equal(report.ports[0].dashboardPage.status, "old_route");
  assert.equal(report.ports[0].issue, "dashboard_page_old_route");
  assert.ok(report.ports[0].nextAction.includes("/dashboard page is not ready"));
  assert.ok(markdown.includes("dashboard_page_old_route"));
});

test("local server health flags listening dashboard timeout with healthy port action", async () => {
  const { buildLocalServerHealthReport } = await loadLocalServerHealthModule();
  const report = await buildLocalServerHealthReport({
    ports: [3200, 3201],
    timeoutMs: 25,
    probeTcp: async () => ({ listening: true, durationMs: 1 }),
    fetchJson: async (url) => {
      if (url.includes(":3200") && url.endsWith("/api/self-media/dashboard")) {
        return { ok: false, status: 0, durationMs: 25, timedOut: true, errorMessage: "timeout" };
      }
      if (url.includes(":3200")) {
        return {
          ok: true,
          status: 200,
          durationMs: 8,
          data: { report: { totals: { trustedContentCount: 19, trustedMetricSnapshotCount: 19, views: 1, engagement: 1 }, redaction: {} } }
        };
      }
      if (url.endsWith("/api/self-media/dashboard")) {
        return {
          ok: true,
          status: 200,
          durationMs: 10,
          data: { realDataScope: { trustedContentCount: 19, trustedMetricSnapshotCount: 19 }, weeklyReview: { metrics: { totalViews: 2, totalEngagement: 2 } } }
        };
      }
      return {
        ok: true,
        status: 200,
        durationMs: 10,
        data: { report: { totals: { trustedContentCount: 19, trustedMetricSnapshotCount: 19, views: 2, engagement: 2 }, redaction: {} } }
      };
    }
  });

  assert.equal(report.status, "pass");
  assert.deepEqual(report.summary.healthyPorts, [3201]);
  assert.deepEqual(report.summary.apiReadyPorts, [3201]);
  assert.deepEqual(report.summary.safeWeeklyReadyPorts, [3200, 3201]);
  assert.deepEqual(report.summary.timeoutPorts, [3200]);
  assert.deepEqual(report.summary.staleOrOldRoutePorts, [3200]);
  assert.equal(report.ports.find((item) => item.port === 3200)?.dashboard.status, "timeout");
  assert.equal(report.ports.find((item) => item.port === 3200)?.issue, "dashboard_timeout");
  assert.ok(report.ports.find((item) => item.port === 3200)?.nextAction.includes("--dashboard-url=http://127.0.0.1:3201/api/self-media/dashboard"));
  assert.ok(report.ports.find((item) => item.port === 3200)?.nextAction.includes("restart"));
});

test("local server health flags old route servers separately from not listening", async () => {
  const { buildLocalServerHealthReport, renderLocalServerHealthMarkdown } = await loadLocalServerHealthModule();
  const report = await buildLocalServerHealthReport({
    ports: [3200],
    timeoutMs: 25,
    probeTcp: async () => ({ listening: true, durationMs: 1 }),
    fetchJson: async (url) => {
      if (url.endsWith("/api/self-media/dashboard")) {
        return { ok: false, status: 404, durationMs: 8, data: { error: "not found" }, errorMessage: "http 404" };
      }
      return {
        ok: true,
        status: 200,
        durationMs: 9,
        data: { report: { totals: { trustedContentCount: 19, trustedMetricSnapshotCount: 19, views: 10, engagement: 2 }, redaction: {} } }
      };
    }
  });
  const markdown = renderLocalServerHealthMarkdown(report);

  assert.equal(report.status, "fail");
  assert.deepEqual(report.summary.healthyPorts, []);
  assert.deepEqual(report.summary.oldRoutePorts, [3200]);
  assert.deepEqual(report.summary.staleOrOldRoutePorts, [3200]);
  assert.deepEqual(report.summary.notListeningPorts, []);
  assert.equal(report.ports[0].tcp.listening, true);
  assert.equal(report.ports[0].dashboard.status, "old_route");
  assert.equal(report.ports[0].issue, "dashboard_old_route");
  assert.ok(report.ports[0].nextAction.toLowerCase().includes("manually confirm"));
  assert.ok(markdown.includes("dashboard_old_route"));
});

test("local server health reports not listening without API checks", async () => {
  const { buildLocalServerHealthReport } = await loadLocalServerHealthModule();
  let fetchCalls = 0;
  const report = await buildLocalServerHealthReport({
    ports: [3200],
    timeoutMs: 25,
    probeTcp: async () => ({ listening: false, durationMs: 1, errorMessage: "ECONNREFUSED" }),
    fetchJson: async () => {
      fetchCalls += 1;
      return { ok: false, status: 0, durationMs: 0, errorMessage: "should not be called" };
    }
  });

  assert.equal(report.status, "fail");
  assert.deepEqual(report.summary.notListeningPorts, [3200]);
  assert.equal(report.ports[0].dashboard.status, "not_checked");
  assert.equal(report.ports[0].safeWeekly.status, "not_checked");
  assert.equal(fetchCalls, 0);
});

test("local server health CLI keeps diagnostic exit zero while strict fails without healthy ports", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-local-server-health-strict-"));
  const script = path.join(projectRoot, "scripts", "local-server-health.mjs");
  const port = 65534;
  try {
    const diagnostic = spawnSync(process.execPath, [script, `--ports=${port}`, "--timeout-ms=50"], { cwd: dir, encoding: "utf8" });
    assert.equal(diagnostic.status, 0);
    const diagnosticOutput = JSON.parse(diagnostic.stdout);
    assert.equal(diagnosticOutput.mode, "diagnostic");
    assert.deepEqual(diagnosticOutput.healthyPorts, []);
    assert.equal(existsSync(path.join(dir, ".local", "local-server-health", "report.json")), true);

    const strict = spawnSync(process.execPath, [script, `--ports=${port}`, "--timeout-ms=50", "--strict"], { cwd: dir, encoding: "utf8" });
    assert.notEqual(strict.status, 0);
    const strictOutput = JSON.parse(strict.stdout);
    assert.equal(strictOutput.mode, "strict");
    assert.equal(strictOutput.strict, true);
    assert.deepEqual(strictOutput.healthyPorts, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("local server health fails safe API sensitive scan without echoing payload", async () => {
  const { buildLocalServerHealthReport } = await loadLocalServerHealthModule();
  const report = await buildLocalServerHealthReport({
    ports: [3200],
    timeoutMs: 25,
    probeTcp: async () => ({ listening: true, durationMs: 1 }),
    fetchJson: async (url) => {
      if (url.endsWith("/api/self-media/dashboard")) {
        return {
          ok: true,
          status: 200,
          durationMs: 7,
          data: { realDataScope: { trustedContentCount: 19, trustedMetricSnapshotCount: 19 }, weeklyReview: { metrics: { totalViews: 10, totalEngagement: 2 } } }
        };
      }
      return {
        ok: true,
        status: 200,
        durationMs: 9,
        data: {
          report: { totals: { trustedContentCount: 19, trustedMetricSnapshotCount: 19, views: 10, engagement: 2 }, redaction: {} },
          markdown: "cookie token private secret comment_content danmu_text contentId super-sensitive-title"
        }
      };
    }
  });
  const serialized = JSON.stringify(report);

  assert.equal(report.status, "fail");
  assert.equal(report.ports[0].safeWeekly.status, "fail");
  assert.equal(report.ports[0].safeWeekly.sensitiveScan.checked, true);
  assert.equal(report.ports[0].safeWeekly.sensitiveScan.passed, false);
  assert.doesNotMatch(serialized, /cookie|token|private|secret|comment_content|danmu_text|contentId|super-sensitive-title/i);
  assert.ok(report.ports[0].nextAction.includes("sensitive scan"));
});

test("daily platform ops gate UI view reports missing as not run", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-daily-gate-ui-missing-"));
  const view = readDailyPlatformOpsGateView(dir);
  assert.equal(view.exists, false);
  assert.equal(view.status, "missing");
  assert.equal(view.healthGate.status, "missing");
  assert.equal(view.trustedAudit.status, "missing");
  assert.ok(view.message?.includes("未运行"));
});

test("daily platform ops gate UI view reads summarized gate status without raw output", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-daily-gate-ui-summary-"));
  writeJsonSummary(path.join(dir, ".local", "daily-platform-ops", "report.json"), {
    generatedAt: "2026-06-04T12:46:30.938Z",
    status: "fail",
    passed: false,
    steps: [
      {
        key: "platform_ops_with_health",
        label: "Platform ops with health gate",
        passed: true,
        durationMs: 15127,
        summary: { status: "ok", passed: true, blockingReasons: [], warnings: [] },
        outputSummary: "token raw payload cookie authorization should not surface"
      },
      {
        key: "trusted_dashboard_audit",
        label: "Trusted dashboard audit",
        passed: false,
        durationMs: 443,
        summary: {
          status: "fail",
          mismatches: ["weeklyReview.totalViews"],
          trustedContentCount: 19,
          trustedMetricSnapshotCount: 19,
          views: 344412,
          engagement: 4259,
          dashboardInput: "url"
        },
        outputSummary: "headers stdout raw payload should not surface"
      }
    ],
    summary: {
      completedAllSteps: true,
      blockingReasons: ["trusted dashboard audit mismatches: weeklyReview.totalViews"],
      warnings: []
    }
  });
  const view = readDailyPlatformOpsGateView(dir);
  assert.equal(view.exists, true);
  assert.equal(view.status, "fail");
  assert.equal(view.healthGate.status, "pass");
  assert.equal(view.healthGate.summaryStatus, "ok");
  assert.equal(view.trustedAudit.status, "fail");
  assert.equal(view.trustedAudit.trustedContentCount, 19);
  assert.equal(view.trustedAudit.mismatchCount, 1);
  assert.deepEqual(view.blockingReasons, ["trusted dashboard audit mismatches: weeklyReview.totalViews"]);
  const serialized = JSON.stringify(view);
  assert.doesNotMatch(serialized, /cookie|authorization|token|headers|stdout|raw payload/i);
});

test("platform data health UI view reports missing health report without running checks", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-platform-health-ui-missing-"));
  const view = readPlatformDataHealthView(dir);
  assert.equal(view.exists, false);
  assert.equal(view.status, "missing");
  assert.equal(view.summary.platformCount, 0);
  assert.ok(view.message?.includes("npm run health:platform-data"));
});

test("platform data health UI view reads ok report summary", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-platform-health-ui-ok-"));
  writeJsonSummary(path.join(dir, ".local", "platform-data-health", "report.json"), {
    generatedAt: "2026-06-04T08:23:53.852Z",
    staleAfterHours: 72,
    status: "ok",
    summary: { platformCount: 4, okCount: 14, warnCount: 0, errorCount: 0, missingCount: 0, staleCount: 0, sourceMismatchCount: 0, bilibiliPreviewOnlyOk: true },
    platforms: [
      {
        platform: "douyin",
        label: "Douyin personal creator center",
        latestGeneratedAt: "2026-06-04T08:00:00.000Z",
        raw: { exists: true, captureCount: 12, latestModifiedAt: "2026-06-04T07:50:00.000Z", status: "ok" },
        mappingPreview: { exists: true, status: "ok", generatedAt: "2026-06-04T07:55:00.000Z", isStale: false, sourceMatches: true, source: "douyin_creator_center", contentCount: 5, metricCount: 5 },
        saveSmokeReport: { exists: true, status: "ok", generatedAt: "2026-06-04T08:00:00.000Z", isStale: false, sourceMatches: true, source: "douyin_creator_center", passed: true, contentCount: 5, metricCount: 5 },
        status: "ok",
        warnings: []
      }
    ],
    bilibiliAccount: {
      status: "ok",
      latestGeneratedAt: "2026-06-04T08:01:00.000Z",
      accountPreview: { exists: true, status: "ok", generatedAt: "2026-06-04T08:01:00.000Z", isStale: false, sourceMatches: true, candidateCount: 1, previewOnly: true, saved: false, previewOnlyOk: true },
      warnings: []
    }
  });
  const view = readPlatformDataHealthView(dir);
  assert.equal(view.exists, true);
  assert.equal(view.status, "ok");
  assert.equal(view.summary.platformCount, 4);
  assert.equal(view.summary.bilibiliPreviewOnlyOk, true);
  assert.equal(view.platforms[0].rawCaptureCount, 12);
  assert.equal(view.platforms[0].mappingPreview.exists, true);
  assert.equal(view.platforms[0].saveSmoke.passed, true);
  assert.equal(view.platforms[0].realCaptureStatus, "unknown");
  assert.equal(view.platforms[0].commands.preview, "npm run import:douyin");
  assert.equal(view.platforms[0].commands.gate, "npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard");
  assert.equal(view.bilibiliAccount?.accountPreview.previewOnlyOk, true);
});

test("platform data health UI view exposes assisted freshness actions without raw payload fields", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-platform-health-ui-freshness-actions-"));
  writeJsonSummary(path.join(dir, ".local", "platform-data-health", "report.json"), {
    generatedAt: "2026-06-04T08:23:53.852Z",
    staleAfterHours: 72,
    status: "warn",
    summary: {
      platformCount: 1,
      okCount: 2,
      warnCount: 1,
      errorCount: 0,
      missingCount: 0,
      staleCount: 1,
      realCaptureStaleCount: 1,
      sourceMismatchCount: 0,
      bilibiliPreviewOnlyOk: true,
      freshness: {
        latestRealCaptureAt: "2026-05-30T08:00:00.000Z",
        latestSmokeAt: "2026-06-04T07:30:00.000Z",
        latestAuditAt: "2026-06-04T08:01:00.000Z",
        realCaptureIsStale: true,
        smokeIsStale: false,
        staleAfterHours: 72
      }
    },
    platforms: [
      {
        platform: "douyin",
        label: "Douyin personal creator center",
        realCaptureStatus: "stale",
        nextAction: "人工登录抖音创作者中心，完成真实采集；然后运行 preview/save/audit/gate。",
        commands: {
          manualStep: "人工登录抖音创作者中心，完成真实采集；本检查不会自动打开平台。",
          preview: "npm run import:douyin",
          save: "npm run import:douyin -- --save",
          health: "npm run health:platform-data",
          freshness: "npm run check:real-capture-freshness",
          audit: "npm run audit:trusted-dashboard -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard",
          gate: "npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard"
        },
        raw: { exists: true, captureCount: 1, latestModifiedAt: "2026-05-30T08:00:00.000Z", status: "warn", rawPayload: "secret-payload", cookie: "secret-cookie", token: "secret-token", headers: "secret-headers" },
        mappingPreview: { exists: true, status: "ok", generatedAt: "2026-06-04T07:30:00.000Z", isStale: false, sourceMatches: true, source: "douyin_creator_center", contentCount: 1, metricCount: 1, rawPayload: "secret-preview" },
        saveSmokeReport: { exists: true, status: "ok", generatedAt: "2026-06-04T07:30:00.000Z", isStale: false, sourceMatches: true, source: "douyin_creator_center", passed: true, contentCount: 1, metricCount: 1 },
        freshness: {
          latestRealCaptureAt: "2026-05-30T08:00:00.000Z",
          latestSmokeAt: "2026-06-04T07:30:00.000Z",
          realCaptureIsStale: true,
          smokeIsStale: false,
          staleAfterHours: 72
        },
        status: "warn",
        warnings: ["real capture is older than 72 hours"]
      }
    ],
    bilibiliAccount: {
      status: "ok",
      accountPreview: { exists: true, status: "ok", previewOnly: true, saved: false, previewOnlyOk: true, rawPayload: "secret-account-payload" },
      warnings: []
    }
  });

  const view = readPlatformDataHealthView(dir);
  const serialized = JSON.stringify(view);
  assert.equal(view.platforms[0].realCaptureStatus, "stale");
  assert.equal(view.platforms[0].freshness.latestRealCaptureAt, "2026-05-30T08:00:00.000Z");
  assert.equal(view.platforms[0].freshness.latestSmokeAt, "2026-06-04T07:30:00.000Z");
  assert.equal(view.summary.freshness.latestAuditAt, "2026-06-04T08:01:00.000Z");
  assert.equal(view.platforms[0].commands.preview, "npm run import:douyin");
  assert.equal(view.platforms[0].commands.save, "npm run import:douyin -- --save");
  assert.ok(view.platforms[0].commands.audit.includes("npm run audit:trusted-dashboard"));
  assert.ok(view.platforms[0].commands.gate.includes("npm run gate:daily-platform-ops"));
  assert.equal(view.bilibiliAccount?.accountPreview.previewOnlyOk, true);
  assert.doesNotMatch(serialized, /secret-|raw payload|rawPayload|cookie|token|headers/i);
});

test("platform data health UI view surfaces stale and source mismatch warnings", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-platform-health-ui-warn-"));
  writeJsonSummary(path.join(dir, ".local", "platform-data-health", "report.json"), {
    generatedAt: "2026-06-04T08:23:53.852Z",
    staleAfterHours: 72,
    status: "warn",
    summary: { platformCount: 4, okCount: 12, warnCount: 2, errorCount: 0, missingCount: 0, staleCount: 1, sourceMismatchCount: 1, bilibiliPreviewOnlyOk: false },
    platforms: [
      {
        platform: "bilibili",
        label: "Bilibili creator center",
        latestGeneratedAt: "2026-05-30T08:00:00.000Z",
        raw: { exists: true, captureCount: 2, latestModifiedAt: "2026-06-04T07:50:00.000Z", status: "ok" },
        mappingPreview: { exists: true, status: "warn", generatedAt: "2026-05-30T08:00:00.000Z", isStale: true, sourceMatches: true, source: "bilibili_creator_center", previewOnly: true, saved: false },
        saveSmokeReport: { exists: true, status: "error", generatedAt: "2026-06-04T08:00:00.000Z", isStale: false, sourceMatches: false, source: "wrong_source", passed: true },
        status: "warn",
        warnings: ["mapping preview is stale", "save smoke source mismatch"]
      }
    ],
    bilibiliAccount: {
      status: "warn",
      latestGeneratedAt: "2026-06-04T08:01:00.000Z",
      accountPreview: { exists: true, status: "warn", generatedAt: "2026-06-04T08:01:00.000Z", isStale: false, sourceMatches: true, candidateCount: 1, previewOnly: false, saved: true, previewOnlyOk: false },
      warnings: ["Bilibili account preview is no longer previewOnly=true with saved=false"]
    }
  });
  const view = readPlatformDataHealthView(dir);
  assert.equal(view.status, "warn");
  assert.equal(view.summary.staleCount, 1);
  assert.equal(view.summary.sourceMismatchCount, 1);
  assert.equal(view.platforms[0].mappingPreview.isStale, true);
  assert.equal(view.platforms[0].saveSmoke.sourceMatches, false);
  assert.equal(view.bilibiliAccount?.accountPreview.previewOnlyOk, false);
});

test("bilibili operation preview and save record history while account diagnostics stay out of snapshots", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-bilibili-op-save-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    const rawDir = path.join(dir, "raw");
    writeRawCapture(rawDir, "archives.json", {
      capturedAt: "2026-06-04T03:25:41.118Z",
      urlSanitized: "https://member.bilibili.com/x/vupre/web/oversea/archives",
      body: {
        data: {
          arc_audits: [
            {
              Archive: {
                aid: 116658358257510,
                bvid: "BVRealCreatorSaveOne",
                title: "B站 operation 保存",
                ptime: 1780314116,
                comment_content: "raw comment secret",
                ...publicBilibiliArchiveFields()
              },
              stat: { view: 1500, like: 30, reply: 4, favorite: 11, share: 12 },
              danmu_text: "danmu text secret"
            }
          ]
        }
      }
    });
    writeRawCapture(rawDir, "overview-num.json", {
      capturedAt: "2026-06-04T03:25:54.846Z",
      urlSanitized: "https://member.bilibili.com/c/data/oversea/web/overview/stat/num",
      body: { data: { play: 999999, like: 888888, comment: 777777, fav: 666666, share: 555555, fan: 444444, log_date: "2026-06-02" } }
    });
    writeRawCapture(rawDir, "survey.json", {
      capturedAt: "2026-06-04T03:25:54.902Z",
      urlSanitized: "https://member.bilibili.com/c/data/oversea/web/survey",
      body: { data: { "20260602": { arc_inc: [{ aid: 116658358257510, bvid: "BVRealCreatorSaveOne", play: 999999 }], arc_play: [{ aid: 116658358257510, play: 888888 }] } } }
    });
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    const preview = await runSelfMediaPlatformImportOperation({ action: "preview", platform: "bilibili" }, { service, rawDirs: { bilibili: rawDir } });
    const save = await runSelfMediaPlatformImportOperation({ action: "save", platform: "bilibili" }, { service, rawDirs: { bilibili: rawDir } });
    const snapshot = await service.dashboard();
    const savedReview = service.saveReview({ period: "weekly" });
    const contentId = "bilibili-BVRealCreatorSaveOne";
    const metricSnapshots = repo.listMetricSnapshots().filter((item) => item.contentId === contentId && item.source === "bilibili_creator_center");
    const history = snapshot.operationHistory.filter((item) => item.platform === "bilibili");
    const serializedSaved = JSON.stringify({
      contents: repo.listContents().filter((item) => item.platform === "bilibili"),
      metrics: repo.listMetrics().filter((item) => item.platform === "bilibili"),
      platformVersions: repo.listPlatformVersions().filter((item) => item.platform === "bilibili"),
      metricSnapshots
    });

    assert.equal(preview.passed, true);
    assert.equal(save.passed, true);
    assert.equal(preview.summaries[0].source, "bilibili_creator_center");
    assert.equal(save.summaries[0].source, "bilibili_creator_center");
    assert.equal(save.summaries[0].provenance?.operationKind, "platform_save");
    assert.equal(save.summaries[0].provenance?.trustedScopeEligible, true);
    assert.ok(history.some((item) => item.action === "preview" && item.status === "success" && item.contentCount === 1 && item.metricCount === 1));
    assert.ok(history.some((item) => item.action === "save" && item.status === "success" && item.contentCount === 1 && item.metricCount === 1 && item.provenance?.operationKind === "platform_save"));
    assert.ok(repo.listContents().some((item) => item.id === contentId && item.platform === "bilibili"));
    assert.ok(repo.listPlatformVersions().some((item) => item.contentId === contentId && item.platform === "bilibili"));
    assert.equal(snapshot.contents.some((item) => item.id === contentId && item.platform === "bilibili"), true);
    assert.equal(snapshot.platformVersions.some((item) => item.contentId === contentId && item.platform === "bilibili"), true);
    assert.equal(metricSnapshots.length, 1);
    assert.equal(metricSnapshots[0].provenance?.operationKind, "platform_save");
    assert.equal(metricSnapshots[0].provenance?.trustedScopeEligible, true);
    assert.equal(metricSnapshots[0].views, 1500);
    assert.equal(metricSnapshots[0].likes, 30);
    assert.equal(metricSnapshots[0].comments, 4);
    assert.equal(metricSnapshots[0].saves, 11);
    assert.equal(metricSnapshots[0].shares, 12);
    assert.equal(snapshot.weeklyReview.metrics.totalViews, 1500);
    assert.equal(savedReview.review.metricSnapshotIds.includes(metricSnapshots[0].id), true);
    assert.equal(snapshot.realDataScope.trustedMetricSnapshotCount, 1);
    assert.doesNotMatch(serializedSaved, /999999|888888|777777|666666|555555|444444/);
    assert.doesNotMatch(serializedSaved, /accountMetrics|dateKeyRows|raw comment secret|danmu text secret|headers|cookie|token|authorization/i);
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("bilibili missing raw save operation history never records save success", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-bilibili-missing-raw-history-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    const result = await runSelfMediaPlatformImportOperation({ action: "save", platform: "bilibili" }, { service, rawDirs: { bilibili: path.join(dir, "missing-raw") } });
    const history = (await service.dashboard()).operationHistory.filter((item) => item.platform === "bilibili" && item.action === "save");
    assert.equal(result.passed, false);
    assert.equal(history.length, 1);
    assert.equal(history[0].status, "failed");
    assert.equal(history[0].contentCount, 0);
    assert.equal(history[0].metricCount, 0);
    assert.equal(history.some((item) => item.status === "success"), false);
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("dashboard groups imported metric snapshots by source and platform without duplicate counting", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-metric-groups-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    service.importPayload({
      source: "douyin_creator_center",
      contents: [{ id: "mix-dy-1", title: "抖音混合指标", platform: "douyin", status: "published", format: "short_video", topic: "混合指标", publishedAt: "2026-06-03T09:00:00.000Z" }],
      metrics: [{ id: "metric-mix-dy-1", contentId: "mix-dy-1", platform: "douyin", capturedAt: "2026-06-03T10:00:00.000Z", views: 100, likes: 10, comments: 1, saves: 2, shares: 3, followersDelta: 1 }]
    });
    service.importPayload({
      source: "douyin_creator_center",
      contents: [{ id: "mix-dy-1", title: "抖音混合指标", platform: "douyin", status: "published", format: "short_video", topic: "混合指标", publishedAt: "2026-06-03T09:00:00.000Z" }],
      metrics: [{ id: "metric-mix-dy-1", contentId: "mix-dy-1", platform: "douyin", capturedAt: "2026-06-03T10:00:00.000Z", views: 100, likes: 10, comments: 1, saves: 2, shares: 3, followersDelta: 1 }]
    });
    service.importPayload({
      source: "xiaohongshu_creator_center",
      contents: [{ id: "mix-xhs-1", title: "小红书混合指标", platform: "xiaohongshu", status: "published", format: "image_text", topic: "混合指标", publishedAt: "2026-06-03T11:00:00.000Z" }],
      metrics: [{ id: "metric-mix-xhs-1", contentId: "mix-xhs-1", platform: "xiaohongshu", capturedAt: "2026-06-03T12:00:00.000Z", views: 200, likes: 20, comments: 2, saves: 4, shares: 6, followersDelta: 2 }]
    });
    service.importPayload({
      source: "video_account_creator_center",
      contents: [{ id: "mix-va-1", title: "视频号混合指标", platform: "video_account", status: "published", format: "short_video", topic: "混合指标", publishedAt: "2026-06-03T13:00:00.000Z" }],
      metrics: [{ id: "metric-mix-va-1", contentId: "mix-va-1", platform: "video_account", capturedAt: "2026-06-03T14:00:00.000Z", views: 300, likes: 30, comments: 3, saves: 6, shares: 9, followersDelta: 3 }]
    });

    const snapshot = await service.dashboard();
    const sourceViews = new Map(snapshot.metricSourceGroups.map((group) => [group.source, group.views]));
    const platformViews = new Map(snapshot.metricPlatformGroups.map((group) => [group.platform, group.views]));
    assert.equal(sourceViews.get("douyin_creator_center"), 100);
    assert.equal(sourceViews.get("xiaohongshu_creator_center"), 200);
    assert.equal(sourceViews.get("video_account_creator_center"), 300);
    assert.equal(platformViews.get("douyin"), 100);
    assert.equal(platformViews.get("xiaohongshu"), 200);
    assert.equal(platformViews.get("video_account"), 300);
    assert.equal(snapshot.metricSourceGroups.reduce((sum, group) => sum + group.views, 0), 600);
    assert.equal(snapshot.metricPlatformGroups.reduce((sum, group) => sum + group.views, 0), 600);
    assert.equal(snapshot.weeklyReview.metrics.totalViews, 600);
    assert.ok(snapshot.metricSourceGroups.every((group) => group.includedInReview));
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("reviews explain four content platforms while keeping account metrics out of totals", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-four-platform-review-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    service.importPayload({
      source: "douyin_creator_center",
      contents: [{ id: "review-four-dy", title: "抖音四平台复盘", platform: "douyin", status: "published", format: "short_video", topic: "四平台复盘", publishedAt: "2026-06-03T09:00:00.000Z" }],
      metrics: [{ id: "metric-review-four-dy", contentId: "review-four-dy", platform: "douyin", capturedAt: "2026-06-03T10:00:00.000Z", views: 100, likes: 10, comments: 1, saves: 2, shares: 3, followersDelta: 1 }]
    });
    service.importPayload({
      source: "xiaohongshu_creator_center",
      contents: [{ id: "review-four-xhs", title: "小红书四平台复盘", platform: "xiaohongshu", status: "published", format: "image_text", topic: "四平台复盘", publishedAt: "2026-06-03T11:00:00.000Z" }],
      metrics: [{ id: "metric-review-four-xhs", contentId: "review-four-xhs", platform: "xiaohongshu", capturedAt: "2026-06-03T12:00:00.000Z", views: 200, likes: 20, comments: 2, saves: 4, shares: 6, followersDelta: 2 }]
    });
    service.importPayload({
      source: "video_account_creator_center",
      contents: [{ id: "review-four-va", title: "视频号四平台复盘", platform: "video_account", status: "published", format: "short_video", topic: "四平台复盘", publishedAt: "2026-06-03T13:00:00.000Z" }],
      metrics: [{ id: "metric-review-four-va", contentId: "review-four-va", platform: "video_account", capturedAt: "2026-06-03T14:00:00.000Z", views: 300, likes: 30, comments: 3, saves: 6, shares: 9, followersDelta: 3 }]
    });
    service.importPayload({
      source: "bilibili_creator_center",
      contents: [{ id: "review-four-bili", title: "B站 archives 四平台复盘", platform: "bilibili", status: "published", format: "short_video", topic: "四平台复盘", publishedAt: "2026-06-03T15:00:00.000Z" }],
      metrics: [{ id: "metric-review-four-bili", contentId: "review-four-bili", platform: "bilibili", capturedAt: "2026-06-03T16:00:00.000Z", views: 400, likes: 40, comments: 4, saves: 8, shares: 12, followersDelta: 4 }]
    });
    repo.upsertAccountMetricSnapshot(accountSnapshot({ views: 9000, likes: 900, followersDelta: 90 }));

    const snapshot = await service.dashboard();
    const platformViews = new Map(snapshot.metricPlatformGroups.map((group) => [group.platform, group.views]));
    const sourceViews = new Map(snapshot.metricSourceGroups.map((group) => [group.source, group.views]));
    assert.equal(snapshot.weeklyReview.metrics.totalViews, 1000);
    assert.equal(snapshot.monthlyReview.metrics.totalViews, 1000);
    assert.equal(platformViews.get("douyin"), 100);
    assert.equal(platformViews.get("xiaohongshu"), 200);
    assert.equal(platformViews.get("video_account"), 300);
    assert.equal(platformViews.get("bilibili"), 400);
    assert.equal(sourceViews.get("bilibili_creator_center"), 400);
    assert.equal(snapshot.accountMetricGroups.reduce((sum, group) => sum + group.views, 0), 9000);
    assert.equal(snapshot.weeklyReview.markdown.includes("B站：曝光 400"), true);
    assert.equal(snapshot.weeklyReview.markdown.includes("archives 内容级指标"), true);
    assert.equal(snapshot.weeklyReview.markdown.includes("AccountMetricSnapshot 单独作为账号趋势展示，不计入内容数、总曝光、总互动或当前优势平台。"), true);
    assert.equal(snapshot.weeklyReview.markdown.includes("9000"), false);
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("trusted weekly report uses only trusted dashboard and review totals", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-trusted-weekly-report-"));
  const previousCwd = process.cwd();
  const previousEnv = {
    SELF_MEDIA_DB_PATH: process.env.SELF_MEDIA_DB_PATH,
    SELF_MEDIA_PROFILE: process.env.SELF_MEDIA_PROFILE,
    SELF_MEDIA_SEED_MODE: process.env.SELF_MEDIA_SEED_MODE
  };
  const { buildTrustedWeeklyReport, buildRedactedTrustedWeeklySummary, renderTrustedWeeklyMarkdown, renderRedactedTrustedWeeklyMarkdown, writeTrustedWeeklyReport } = await loadTrustedWeeklyReportModule();
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    writeJsonSummary(path.join(dir, ".local", "platform-data-health", "report.json"), {
      generatedAt: "2026-06-04T08:23:53.852Z",
      staleAfterHours: 72,
      status: "warn",
      summary: {
        platformCount: 4,
        okCount: 10,
        warnCount: 2,
        errorCount: 0,
        missingCount: 0,
        staleCount: 1,
        realCaptureStaleCount: 1,
        sourceMismatchCount: 0,
        bilibiliPreviewOnlyOk: true,
        freshness: {
          latestRealCaptureAt: "2026-06-01T08:00:00.000Z",
          latestSmokeAt: "2026-06-04T07:30:00.000Z",
          latestAuditAt: null,
          realCaptureAgeHours: 72,
          smokeAgeHours: 1,
          realCaptureIsStale: true,
          smokeIsStale: false,
          staleAfterHours: 72
        }
      },
      platforms: [
        { platform: "douyin", status: "warn", raw: { exists: true, captureCount: 1 }, mappingPreview: { exists: true, status: "ok" }, saveSmokeReport: { exists: true, status: "ok" }, freshness: { latestRealCaptureAt: "2026-06-01T08:00:00.000Z", latestSmokeAt: "2026-06-04T07:30:00.000Z", realCaptureIsStale: true, smokeIsStale: false }, warnings: ["real capture stale"] },
        { platform: "xiaohongshu", status: "ok", raw: { exists: true, captureCount: 1 }, mappingPreview: { exists: true, status: "ok" }, saveSmokeReport: { exists: true, status: "ok" }, freshness: { latestRealCaptureAt: "2026-06-04T08:00:00.000Z", latestSmokeAt: "2026-06-04T07:30:00.000Z", realCaptureIsStale: false, smokeIsStale: false }, warnings: [] },
        { platform: "video-account", status: "ok", raw: { exists: true, captureCount: 1 }, mappingPreview: { exists: true, status: "ok" }, saveSmokeReport: { exists: true, status: "ok" }, freshness: { latestRealCaptureAt: "2026-06-04T08:00:00.000Z", latestSmokeAt: "2026-06-04T07:30:00.000Z", realCaptureIsStale: false, smokeIsStale: false }, warnings: [] },
        { platform: "bilibili", status: "ok", raw: { exists: true, captureCount: 1 }, mappingPreview: { exists: true, status: "ok" }, saveSmokeReport: { exists: true, status: "ok" }, freshness: { latestRealCaptureAt: "2026-06-04T08:00:00.000Z", latestSmokeAt: "2026-06-04T07:30:00.000Z", realCaptureIsStale: false, smokeIsStale: false }, warnings: [] }
      ],
      bilibiliAccount: { accountPreview: { previewOnlyOk: true, candidateCount: 1, saved: false } }
    });
    process.chdir(dir);
    const dbPath = path.join(dir, "test.sqlite");
    process.env.SELF_MEDIA_DB_PATH = dbPath;
    process.env.SELF_MEDIA_SEED_MODE = "off";
    delete process.env.SELF_MEDIA_PROFILE;
    repo = new SqliteSelfMediaRepo(dbPath);
    const service = new SelfMediaService(repo);
    service.importPayload({
      source: "douyin_creator_center",
      contents: [
        { id: "weekly-report-dy-top", title: "抖音可信高表现", platform: "douyin", status: "published", format: "short_video", topic: "周报", publishedAt: "2026-06-03T09:00:00.000Z" },
        { id: "weekly-report-dy-excluded", title: "抖音用户排除", platform: "douyin", status: "published", format: "short_video", topic: "周报", publishedAt: "2026-06-03T09:00:00.000Z" }
      ],
      metrics: [
        { id: "metric-weekly-report-dy-top", contentId: "weekly-report-dy-top", platform: "douyin", capturedAt: "2026-06-03T10:00:00.000Z", views: 1000, likes: 100, comments: 10, saves: 20, shares: 30, followersDelta: 2 },
        { id: "metric-weekly-report-dy-excluded", contentId: "weekly-report-dy-excluded", platform: "douyin", capturedAt: "2026-06-03T10:00:00.000Z", views: 777, likes: 77, comments: 7, saves: 7, shares: 7, followersDelta: 0 }
      ]
    });
    service.importPayload({
      source: "xiaohongshu_creator_center",
      contents: [{ id: "weekly-report-xhs-low", title: "小红书低互动", platform: "xiaohongshu", status: "published", format: "image_text", topic: "周报", publishedAt: "2026-06-03T11:00:00.000Z" }],
      metrics: [{ id: "metric-weekly-report-xhs-low", contentId: "weekly-report-xhs-low", platform: "xiaohongshu", capturedAt: "2026-06-03T12:00:00.000Z", views: 500, likes: 1, comments: 0, saves: 0, shares: 0, followersDelta: 0 }]
    });
    service.importPayload({
      source: "video_account_creator_center",
      contents: [{ id: "weekly-report-va", title: "视频号可信内容", platform: "video_account", status: "published", format: "short_video", topic: "周报", publishedAt: "2026-06-03T13:00:00.000Z" }],
      metrics: [{ id: "metric-weekly-report-va", contentId: "weekly-report-va", platform: "video_account", capturedAt: "2026-06-03T14:00:00.000Z", views: 300, likes: 30, comments: 3, saves: 6, shares: 9, followersDelta: 1 }]
    });
    service.importPayload({
      source: "bilibili_creator_center",
      contents: [{ id: "weekly-report-bili", title: "B站可信 archives", platform: "bilibili", status: "published", format: "short_video", topic: "周报", publishedAt: "2026-06-03T15:00:00.000Z" }],
      metrics: [{ id: "metric-weekly-report-bili", contentId: "weekly-report-bili", platform: "bilibili", capturedAt: "2026-06-03T16:00:00.000Z", views: 200, likes: 20, comments: 2, saves: 4, shares: 6, followersDelta: 0 }]
    });
    service.importPayload({
      source: "manual",
      contents: [{ id: "weekly-report-manual-pollution", title: "手动污染数据", platform: "douyin", status: "published", format: "short_video", topic: "污染", publishedAt: "2026-06-03T09:00:00.000Z" }],
      metrics: [{ id: "metric-weekly-report-manual-pollution", contentId: "weekly-report-manual-pollution", platform: "douyin", capturedAt: "2026-06-03T10:00:00.000Z", views: 9999, likes: 999, comments: 99, saves: 99, shares: 99, followersDelta: 0 }]
    });
    service.importPayload({
      source: "douyin_creator_center",
      provenance: { isTestFixture: true, operationKind: "platform_save_smoke", trustedScopeEligible: false },
      contents: [{ id: "weekly-report-smoke-pollution", title: "Smoke fixture should stay out", platform: "douyin", status: "published", format: "short_video", topic: "smoke", publishedAt: "2026-06-03T09:00:00.000Z" }],
      metrics: [{ id: "metric-weekly-report-smoke-pollution", contentId: "weekly-report-smoke-pollution", platform: "douyin", capturedAt: "2026-06-03T10:00:00.000Z", views: 8888, likes: 888, comments: 88, saves: 88, shares: 88, followersDelta: 0 }]
    });
    repo.upsertAccountMetricSnapshot(accountSnapshot({ views: 9000, likes: 900, followersDelta: 90 }));
    service.updateContentTrustedScope({ contentId: "weekly-report-dy-excluded", userExcludedFromTrustedScope: true, actor: "test" });

    const snapshot = await service.dashboard();
    const report = buildTrustedWeeklyReport(snapshot, { now: "2026-06-04T09:00:00.000Z" });
    const redactedSummary = buildRedactedTrustedWeeklySummary(report);
    const markdown = renderTrustedWeeklyMarkdown(report);
    const redactedMarkdown = renderRedactedTrustedWeeklyMarkdown(redactedSummary);
    const outputs = writeTrustedWeeklyReport(report, { cwd: dir, outDir: ".local/trusted-weekly-report-test" });
    const writtenJson = JSON.parse(readFileSync(outputs.jsonPath, "utf8"));
    const writtenMarkdown = readFileSync(outputs.markdownPath, "utf8");
    const writtenRedactedJson = JSON.parse(readFileSync(outputs.redactedJsonPath, "utf8"));
    const writtenRedactedMarkdown = readFileSync(outputs.redactedMarkdownPath, "utf8");
    const platformViews = new Map(report.platformOverview.map((item) => [item.platform, item.views]));
    const serialized = JSON.stringify(report);
    const redactedSerialized = `${JSON.stringify(redactedSummary)}\n${redactedMarkdown}\n${writtenRedactedMarkdown}`;
    const safeReport = await service.trustedWeeklySafeReport();
    const route = await loadTrustedWeeklySafeReportRouteModule();
    const response = await route.GET();
    const apiPayload = (await response.json()) as TrustedWeeklySafeReportResponse;
    const apiSerialized = JSON.stringify(apiPayload);

    assert.equal(report.task, "TRUSTED-WEEKLY-REPORT-034");
    assert.equal(report.scope.onlyTrustedDashboardReviewData, true);
    assert.equal(report.scope.excludesAllDataLocalDebugRows, true);
    assert.equal(report.scope.excludesAccountMetricSnapshots, true);
    assert.equal(report.totals.views, snapshot.weeklyReview.metrics.totalViews);
    assert.equal(report.totals.views, snapshot.trustedOperatingStatus.views);
    assert.equal(report.totals.engagement, snapshot.weeklyReview.metrics.totalEngagement);
    assert.equal(report.totals.trustedContentCount, snapshot.realDataScope.trustedContentCount);
    assert.equal(report.totals.metricSnapshotCount, snapshot.realDataScope.trustedMetricSnapshotCount);
    assert.equal(report.totals.views, 2000);
    assert.equal(snapshot.trustedWeeklySummary.views, 2000);
    assert.equal(snapshot.trustedWeeklySummary.trustedContentCount, snapshot.realDataScope.trustedContentCount);
    assert.equal(snapshot.trustedWeeklySummary.trustedMetricSnapshotCount, snapshot.realDataScope.trustedMetricSnapshotCount);
    assert.equal(snapshot.trustedWeeklySummary.redaction.contentTitlesIncluded, false);
    assert.equal(snapshot.trustedWeeklySummary.redaction.accountMetricsIncluded, false);
    assert.equal(snapshot.trustedWeeklySummary.redaction.captureDetailsIncluded, false);
    assert.equal(platformViews.get("douyin"), 1000);
    assert.equal(platformViews.get("xiaohongshu"), 500);
    assert.equal(platformViews.get("video_account"), 300);
    assert.equal(platformViews.get("bilibili"), 200);
    assert.equal(report.topContents[0].contentId, "weekly-report-dy-top");
    assert.equal(report.lowInteractionContents[0].contentId, "weekly-report-xhs-low");
    assert.equal(report.excluded.userExcludedContentCount, 1);
    assert.equal(report.freshness.realCaptureStaleCount, 1);
    assert.ok(report.recommendations.length > 0);
    assert.ok(Object.values(report.consistencyChecks).every(Boolean));
    assert.equal(markdown.includes("## 四平台概览"), true);
    assert.equal(markdown.includes("## 数据新鲜度"), true);
    assert.equal(writtenJson.totals.views, 2000);
    assert.equal(writtenMarkdown.includes("Trusted Weekly Report"), true);
    assert.equal(redactedSummary.totals.views, 2000);
    assert.equal(writtenRedactedJson.totals.views, 2000);
    assert.equal(writtenRedactedMarkdown.includes("Trusted Weekly Redacted Summary"), true);
    assert.equal(redactedSummary.redaction.contentTitlesIncluded, false);
    assert.equal(redactedSummary.redaction.contentIdsIncluded, false);
    assert.equal(redactedSummary.redaction.accountMetricsIncluded, false);
    assert.equal(redactedSummary.redaction.captureDetailsIncluded, false);
    assert.equal(safeReport.report.task, "SAFE-WEEKLY-REPORT-UI-EXPORT-036");
    assert.equal(safeReport.report.source, "trusted_dashboard_review");
    assert.equal(safeReport.report.totals.views, 2000);
    assert.equal(safeReport.report.totals.trustedContentCount, snapshot.realDataScope.trustedContentCount);
    assert.equal(safeReport.report.totals.trustedMetricSnapshotCount, snapshot.realDataScope.trustedMetricSnapshotCount);
    assert.equal(safeReport.report.redaction.contentTitlesIncluded, false);
    assert.equal(safeReport.report.redaction.accountMetricsIncluded, false);
    assert.equal(safeReport.report.redaction.captureDetailsIncluded, false);
    assert.equal(response.status, 200);
    assert.equal(apiPayload.report.totals.views, 2000);
    assert.equal(apiPayload.report.totals.trustedContentCount, snapshot.realDataScope.trustedContentCount);
    assert.equal(apiPayload.report.totals.trustedMetricSnapshotCount, snapshot.realDataScope.trustedMetricSnapshotCount);
    assert.equal(apiPayload.report.safeApiPath, "/api/self-media/reports/trusted-weekly-safe");
    assert.equal(serialized.includes("9999"), false);
    assert.equal(serialized.includes("8888"), false);
    assert.equal(serialized.includes("9000"), false);
    assert.equal(redactedSerialized.includes("抖音可信高表现"), false);
    assert.equal(redactedSerialized.includes("小红书低互动"), false);
    assert.equal(redactedSerialized.includes("视频号可信内容"), false);
    assert.equal(redactedSerialized.includes("B站可信 archives"), false);
    assert.equal(redactedSerialized.includes("weekly-report-dy-top"), false);
    assert.equal(redactedSerialized.includes("9999"), false);
    assert.equal(redactedSerialized.includes("8888"), false);
    assert.equal(redactedSerialized.includes("9000"), false);
    assert.equal(apiSerialized.includes("抖音可信高表现"), false);
    assert.equal(apiSerialized.includes("小红书低互动"), false);
    assert.equal(apiSerialized.includes("视频号可信内容"), false);
    assert.equal(apiSerialized.includes("B站可信 archives"), false);
    assert.equal(apiSerialized.includes("weekly-report-dy-top"), false);
    assert.equal(apiSerialized.includes("contentId"), false);
    assert.equal(apiSerialized.includes("9999"), false);
    assert.equal(apiSerialized.includes("8888"), false);
    assert.equal(apiSerialized.includes("9000"), false);
    assert.doesNotMatch(`${serialized}\n${markdown}\n${redactedSerialized}`, /raw payload|cookie|authorization|token|headers|private|secret|credential|comment_content|danmu_text|评论正文|弹幕/i);
    assert.doesNotMatch(apiSerialized, /raw payload|cookie|authorization|token|headers|private|secret|credential|comment_content|danmu_text|评论正文|弹幕|真实标题/i);
  } finally {
    repo?.close();
    process.chdir(previousCwd);
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("post import action suggestions cover four platform content metrics with evidence", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-post-import-actions-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    service.importPayload({
      source: "douyin_creator_center",
      contents: [{ id: "action-dy-high", title: "抖音高表现内容", platform: "douyin", status: "published", format: "short_video", topic: "导入后建议", publishedAt: "2026-06-03T09:00:00.000Z" }],
      metrics: [{ id: "metric-action-dy-high", contentId: "action-dy-high", platform: "douyin", capturedAt: "2026-06-03T10:00:00.000Z", views: 1200, likes: 120, comments: 12, saves: 18, shares: 16, followersDelta: 4 }]
    });
    service.importPayload({
      source: "xiaohongshu_creator_center",
      contents: [{ id: "action-xhs-low", title: "小红书低互动内容", platform: "xiaohongshu", status: "published", format: "image_text", topic: "导入后建议", publishedAt: "2026-06-03T11:00:00.000Z" }],
      metrics: [{ id: "metric-action-xhs-low", contentId: "action-xhs-low", platform: "xiaohongshu", capturedAt: "2026-06-03T12:00:00.000Z", views: 700, likes: 1, comments: 0, saves: 0, shares: 0, followersDelta: 0 }]
    });
    service.importPayload({
      source: "video_account_creator_center",
      contents: [{ id: "action-va-mid", title: "视频号中位内容", platform: "video_account", status: "published", format: "short_video", topic: "导入后建议", publishedAt: "2026-06-03T13:00:00.000Z" }],
      metrics: [{ id: "metric-action-va-mid", contentId: "action-va-mid", platform: "video_account", capturedAt: "2026-06-03T14:00:00.000Z", views: 500, likes: 20, comments: 2, saves: 3, shares: 4, followersDelta: 1 }]
    });
    service.importPayload({
      source: "bilibili_creator_center",
      contents: [{ id: "action-bili-archives", title: "B站 archives 内容", platform: "bilibili", status: "published", format: "short_video", topic: "导入后建议", publishedAt: "2026-06-03T15:00:00.000Z" }],
      metrics: [{ id: "metric-action-bili-archives", contentId: "action-bili-archives", platform: "bilibili", capturedAt: "2026-06-03T16:00:00.000Z", views: 800, likes: 30, comments: 4, saves: 8, shares: 10, followersDelta: 0 }]
    });
    repo.upsertAccountMetricSnapshot(accountSnapshot({ views: 9000, likes: 900, followersDelta: 90 }));

    const snapshot = await service.dashboard();
    const suggestions = snapshot.postImportActionSuggestions;
    const types = new Set(suggestions.map((suggestion) => suggestion.type));
    assert.ok(types.has("reuse_high_performer"));
    assert.ok(types.has("review_low_engagement"));
    assert.ok(types.has("platform_priority"));
    assert.ok(types.has("bilibili_archives_content"));
    assert.ok(suggestions.some((suggestion) => suggestion.type === "bilibili_archives_content" && suggestion.summary.includes("archives 内容级快照")));
    assert.ok(suggestions.every((suggestion) => suggestion.evidence.every((item) => item.platform && (item.contentId || item.source) && (item.metricSnapshotId || item.importRunId || item.source))));
    assert.equal(JSON.stringify(suggestions).includes("9000"), false);
    assert.equal(snapshot.weeklyReview.metrics.totalViews, 3200);
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("trusted post import action suggestion can become an internal action item with evidence", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-post-import-action-item-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    service.importPayload({
      source: "douyin_creator_center",
      contents: [{ id: "suggestion-task-trusted", title: "可信建议转任务内容", platform: "douyin", status: "published", format: "short_video", topic: "建议转任务", publishedAt: "2026-06-03T09:00:00.000Z" }],
      metrics: [{ id: "metric-suggestion-task-trusted", contentId: "suggestion-task-trusted", platform: "douyin", capturedAt: "2026-06-03T10:00:00.000Z", views: 1200, likes: 120, comments: 12, saves: 18, shares: 16, followersDelta: 4 }]
    });

    const before = await service.dashboard();
    const suggestion = before.postImportActionSuggestions.find((item) => item.type === "reuse_high_performer");
    assert.ok(suggestion);
    assert.equal(suggestion.convertedToActionItem, false);

    const created = service.createActionItemFromPostImportSuggestion({ suggestionId: suggestion.id });
    assert.equal(created.idempotent, false);
    assert.equal(created.actionItem.sourceSuggestionId, suggestion.id);
    assert.equal(created.actionItem.suggestionType, suggestion.type);
    assert.equal(created.actionItem.status, "todo");
    assert.equal(created.actionItem.nextAction, suggestion.nextAction);
    assert.equal(created.actionItem.evidence?.[0]?.platform, "douyin");
    assert.equal(created.actionItem.evidence?.[0]?.contentId, "suggestion-task-trusted");
    assert.equal(created.actionItem.evidence?.[0]?.source, "douyin_creator_center");
    assert.ok(created.actionItem.evidence?.[0]?.metricSnapshotId);
    assert.equal(JSON.stringify(created.actionItem).includes("raw payload"), false);
    assert.equal(JSON.stringify(created.actionItem).includes("cookie"), false);

    const after = await service.dashboard();
    const converted = after.postImportActionSuggestions.find((item) => item.id === suggestion.id);
    assert.equal(converted?.convertedToActionItem, true);
    assert.equal(converted?.actionItemId, created.actionItem.id);

    const repeated = service.createActionItemFromPostImportSuggestion({ suggestionId: suggestion.id });
    assert.equal(repeated.idempotent, true);
    assert.equal(repo.listActionItems().filter((item) => item.sourceSuggestionId === suggestion.id).length, 1);
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("action task operating loop keeps safe sources and supports four status patches", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-action-tasks-operating-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    service.importPayload({
      source: "douyin_creator_center",
      contents: [{ id: "action-tasks-operating-content", title: "行动任务运营内容", platform: "douyin", status: "published", format: "short_video", topic: "任务闭环", publishedAt: "2026-06-03T09:00:00.000Z" }],
      metrics: [{ id: "metric-action-tasks-operating-content", contentId: "action-tasks-operating-content", platform: "douyin", capturedAt: "2026-06-03T10:00:00.000Z", views: 1800, likes: 160, comments: 16, saves: 22, shares: 18, followersDelta: 5 }]
    });

    const before = await service.dashboard();
    const suggestion = before.postImportActionSuggestions.find((item) => item.type === "reuse_high_performer");
    assert.ok(suggestion);
    const created = service.createActionItemFromPostImportSuggestion({ suggestionId: suggestion.id });
    service.saveReview({ period: "weekly" });
    const dashboard = await service.dashboard();
    const importedTask = dashboard.actionItems.find((item) => item.id === created.actionItem.id);
    const reviewTask = dashboard.actionItems.find((item) => item.reviewId);

    assert.ok(importedTask);
    assert.ok(reviewTask);
    assert.equal(importedTask.sourceSuggestionId, suggestion.id);
    assert.equal(importedTask.suggestionType, suggestion.type);
    assert.equal(importedTask.evidence?.[0]?.platform, "douyin");
    assert.equal(importedTask.evidence?.[0]?.contentId, "action-tasks-operating-content");
    assert.equal(importedTask.evidence?.[0]?.source, "douyin_creator_center");
    assert.ok(importedTask.evidence?.[0]?.metricSnapshotId);
    assert.doesNotMatch(JSON.stringify(importedTask), /raw payload|cookie|token|headers|comment body|danmu/i);

    for (const status of ["doing", "done", "dropped", "todo"] as const) {
      const updated = service.updateActionItem({ id: importedTask.id, status, nextAction: `status ${status}` });
      assert.equal(updated.actionItem.status, status);
      assert.equal(updated.actionItem.nextAction, `status ${status}`);
    }

    const repeated = service.createActionItemFromPostImportSuggestion({ suggestionId: suggestion.id });
    assert.equal(repeated.idempotent, true);
    assert.equal(repo.listActionItems().filter((item) => item.sourceSuggestionId === suggestion.id).length, 1);
  } finally {
    repo?.close();
  }
});

test("trusted action item can become scheduled content without entering default calendar", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-action-to-content-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    service.importPayload({
      source: "douyin_creator_center",
      contents: [{ id: "action-to-content-trusted", title: "行动项转内容可信素材", platform: "douyin", status: "published", format: "short_video", topic: "行动到内容", publishedAt: "2026-06-04T09:00:00.000Z" }],
      metrics: [{ id: "metric-action-to-content-trusted", contentId: "action-to-content-trusted", platform: "douyin", capturedAt: "2026-06-04T10:00:00.000Z", views: 2400, likes: 260, comments: 24, saves: 30, shares: 22, followersDelta: 7 }]
    });

    const dashboard = await service.dashboard();
    const suggestion = dashboard.postImportActionSuggestions.find((item) => item.type === "reuse_high_performer");
    assert.ok(suggestion);
    const task = service.createActionItemFromPostImportSuggestion({ suggestionId: suggestion.id });
    const scheduledAt = "2099-06-06T09:00:00.000Z";
    const converted = service.createContentFromActionItem({ id: task.actionItem.id, scheduledAt });
    const repeated = service.createContentFromActionItem({ id: task.actionItem.id, scheduledAt });

    assert.equal(converted.idempotent, false);
    assert.equal(repeated.idempotent, true);
    assert.equal(repeated.content.id, converted.content.id);
    assert.equal(converted.actionItem.status, "doing");
    assert.equal(converted.actionItem.contentWorkflowStatus, "scheduled");
    assert.equal(converted.actionItem.contentDraftId, converted.content.id);
    assert.equal(converted.actionItem.platformVersionId, converted.platformVersion.id);
    assert.equal(converted.content.status, "scheduled");
    assert.equal(converted.content.platform, "douyin");
    assert.equal(converted.content.workOwnership, "operator_owned_work");
    assert.equal(converted.content.dataDomain, "system_log");
    assert.equal(converted.queue.status, "scheduled");
    assert.equal(converted.platformVersion.status, "scheduled");
    assert.equal(converted.platformVersion.scheduledAt, scheduledAt);
    assert.equal(repo.listContents().filter((item) => item.id === converted.content.id).length, 1);
    assert.equal(repo.listPlatformVersions().filter((item) => item.id === converted.platformVersion.id).length, 1);
    assert.equal(repo.listQueue().filter((item) => item.id === converted.queue.id).length, 1);

    const after = await service.dashboard();
    assert.equal(after.contents.some((item) => item.id === converted.content.id), false);
    assert.equal(after.calendarItems.some((item) => item.platformVersionId === converted.platformVersion.id && item.scheduledAt === scheduledAt), false);
    const workbench = await service.contentWorkbench();
    const row = workbench.contentRows.find((item) => item.content.id === converted.content.id);
    assert.ok(row);
    assert.equal(row.originKind, "action_item_generated");
    assert.ok(row.platformVersions.some((item) => item.id === converted.platformVersion.id && item.scheduledAt === scheduledAt));
    assert.ok(row.queueItems.some((item) => item.id === converted.queue.id && item.scheduledAt === scheduledAt));
    assert.doesNotMatch(JSON.stringify(converted), /raw payload|cookie|token|headers|comment body|danmu/i);
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("action content draft review edits content version and queue without polluting trusted totals", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-content-draft-review-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    service.importPayload({
      source: "douyin_creator_center",
      contents: [{ id: "draft-review-trusted-source", title: "草稿审核可信来源", platform: "douyin", status: "published", format: "short_video", topic: "草稿审核", publishedAt: "2026-06-04T09:00:00.000Z" }],
      metrics: [{ id: "metric-draft-review-trusted-source", contentId: "draft-review-trusted-source", platform: "douyin", capturedAt: "2026-06-04T10:00:00.000Z", views: 2400, likes: 260, comments: 24, saves: 30, shares: 22, followersDelta: 7 }]
    });

    const dashboard = await service.dashboard();
    const suggestion = dashboard.postImportActionSuggestions.find((item) => item.type === "reuse_high_performer");
    assert.ok(suggestion);
    const task = service.createActionItemFromPostImportSuggestion({ suggestionId: suggestion.id });
    const converted = service.createContentFromActionItem({ id: task.actionItem.id, scheduledAt: "2026-06-06T09:00:00.000Z" });

    const reviewed = service.reviewContentDraft({
      contentId: converted.content.id,
      platformVersionId: converted.platformVersion.id,
      publishQueueItemId: converted.queue.id,
      title: "人工复核后的内容标题",
      body: "人工编辑后的正文草稿",
      topic: "人工复核选题",
      scheduledAt: "2026-06-07T10:30:00.000Z",
      status: "draft",
      nextAction: "补齐封面后再排期",
      checklist: { title: true, humanConfirmed: true }
    });

    assert.equal(reviewed.content.title, "人工复核后的内容标题");
    assert.equal(reviewed.content.topic, "人工复核选题");
    assert.equal(reviewed.content.status, "draft");
    assert.equal(reviewed.platformVersion.title, "人工复核后的内容标题");
    assert.equal(reviewed.platformVersion.body, "人工编辑后的正文草稿");
    assert.equal(reviewed.platformVersion.status, "draft");
    assert.equal(reviewed.platformVersion.scheduledAt, "2026-06-07T10:30:00.000Z");
    assert.equal(reviewed.platformVersion.nextAction, "补齐封面后再排期");
    assert.equal(reviewed.queue?.status, "draft");
    assert.equal(reviewed.queue?.scheduledAt, "2026-06-07T10:30:00.000Z");
    assert.equal(reviewed.queue?.nextAction, "补齐封面后再排期");

    const scheduled = service.reviewContentDraft({
      contentId: converted.content.id,
      platformVersionId: converted.platformVersion.id,
      publishQueueItemId: converted.queue.id,
      title: "人工复核后的内容标题",
      body: "人工编辑后的正文草稿",
      topic: "人工复核选题",
      scheduledAt: "2026-06-08T11:00:00.000Z",
      status: "scheduled",
      nextAction: "发布前人工检查标题和正文"
    });

    assert.equal(scheduled.content.status, "scheduled");
    assert.equal(scheduled.platformVersion.status, "scheduled");
    assert.equal(scheduled.queue?.status, "scheduled");
    assert.equal(repo.listPublishRecords().length, 0);
    assert.ok(service.calendar().some((item) => item.platformVersionId === converted.platformVersion.id && item.scheduledAt === "2026-06-08T11:00:00.000Z"));

    const afterSchedule = await service.dashboard();
    assert.equal(afterSchedule.weeklyReview.metrics.totalViews, 2400);
    assert.equal(afterSchedule.realDataScope.trustedContentCount, 1);
    assert.equal(afterSchedule.realDataScope.trustedMetricSnapshotCount, 1);
    assert.equal(repo.getEntity("contents", converted.content.id)?.status, "scheduled");
    assert.equal(afterSchedule.contents.some((item) => item.id === converted.content.id), false);

    const confirmation = service.confirmPlatformVersionPublish({
      platformVersionId: converted.platformVersion.id,
      status: "published",
      happenedAt: "2026-06-08T12:00:00.000Z",
      confirmationSource: "manual",
      confirmedBy: "operator"
    });
    const publishedContent = repo.getEntity("contents", converted.content.id);
    const publishedQueue = repo.getEntity("queue", converted.queue.id);

    assert.equal(confirmation.publishRecord.status, "published");
    assert.equal(repo.listPublishRecords().length, 1);
    assert.equal(publishedContent?.status, "published");
    assert.equal(publishedQueue?.status, "published");
    const afterPublish = await service.dashboard();
    assert.equal(afterPublish.weeklyReview.metrics.totalViews, 2400);
    assert.equal(afterPublish.realDataScope.trustedContentCount, 1);
    assert.equal(afterPublish.realDataScope.trustedMetricSnapshotCount, 1);
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("untrusted or stale action evidence cannot become content", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-action-to-content-blocked-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    service.importPayload({
      source: "manual",
      contents: [{ id: "action-to-content-manual", title: "手动证据不可转内容", platform: "douyin", status: "published", format: "short_video", topic: "行动到内容", publishedAt: "2026-06-04T09:00:00.000Z" }],
      metrics: [{ id: "metric-action-to-content-manual", contentId: "action-to-content-manual", platform: "douyin", capturedAt: "2026-06-04T10:00:00.000Z", views: 9999, likes: 999, comments: 99, saves: 88, shares: 77, followersDelta: 1 }]
    });
    const manualSnapshot = repo.listMetricSnapshots().find((item) => item.contentId === "action-to-content-manual");
    assert.ok(manualSnapshot);
    repo.upsertEntity("actionItems", "action-item-manual-evidence", {
      id: "action-item-manual-evidence",
      title: "手动证据行动项",
      status: "todo",
      priority: "high",
      evidence: [{ platform: "douyin", contentId: "action-to-content-manual", metricSnapshotId: manualSnapshot.id, source: "manual" }],
      updatedAt: "2026-06-04T11:00:00.000Z"
    });
    assert.throws(() => service.createContentFromActionItem({ id: "action-item-manual-evidence" }), /缺少当前可信的内容级证据/);

    service.importPayload({
      source: "xiaohongshu_creator_center",
      contents: [{ id: "action-to-content-excluded", title: "排除后不可转内容", platform: "xiaohongshu", status: "published", format: "image_text", topic: "行动到内容", publishedAt: "2026-06-04T12:00:00.000Z" }],
      metrics: [{ id: "metric-action-to-content-excluded", contentId: "action-to-content-excluded", platform: "xiaohongshu", capturedAt: "2026-06-04T13:00:00.000Z", views: 1800, likes: 120, comments: 12, saves: 30, shares: 9, followersDelta: 2 }]
    });
    const beforeExclude = await service.dashboard();
    const trustedSuggestion = beforeExclude.postImportActionSuggestions.find((item) => item.evidence.some((evidence) => evidence.contentId === "action-to-content-excluded"));
    assert.ok(trustedSuggestion);
    const trustedTask = service.createActionItemFromPostImportSuggestion({ suggestionId: trustedSuggestion.id });
    service.updateContentTrustedScope({ contentId: "action-to-content-excluded", userExcludedFromTrustedScope: true, actor: "test" });
    assert.throws(() => service.createContentFromActionItem({ id: trustedTask.actionItem.id }), /已过期或已被排除/);
    assert.equal(repo.listContents().some((item) => item.id.startsWith("content-from-action-")), false);
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("untrusted or user-excluded post import suggestions cannot become new action items", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-post-import-action-blocked-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    service.importPayload({
      source: "manual",
      contents: [{ id: "suggestion-task-manual", title: "手动来源不可信建议", platform: "douyin", status: "published", format: "short_video", topic: "建议转任务", publishedAt: "2026-06-03T09:00:00.000Z" }],
      metrics: [{ id: "metric-suggestion-task-manual", contentId: "suggestion-task-manual", platform: "douyin", capturedAt: "2026-06-03T10:00:00.000Z", views: 9000, likes: 900, comments: 90, saves: 80, shares: 70, followersDelta: 6 }]
    });
    const manualSnapshot = repo.listMetricSnapshots().find((item) => item.contentId === "suggestion-task-manual");
    assert.ok(manualSnapshot);
    assert.throws(
      () => service.createActionItemFromPostImportSuggestion({ suggestionId: `post-import-reuse-${manualSnapshot.id}` }),
      /找不到可转任务的导入后建议/
    );

    service.importPayload({
      source: "bilibili_creator_center",
      contents: [{ id: "suggestion-task-excluded", title: "排除后不可转任务", platform: "bilibili", status: "published", format: "short_video", topic: "建议转任务", publishedAt: "2026-06-03T11:00:00.000Z" }],
      metrics: [{ id: "metric-suggestion-task-excluded", contentId: "suggestion-task-excluded", platform: "bilibili", capturedAt: "2026-06-03T12:00:00.000Z", views: 1200, likes: 120, comments: 12, saves: 18, shares: 16, followersDelta: 4 }]
    });
    const beforeExclude = await service.dashboard();
    const trustedSuggestion = beforeExclude.postImportActionSuggestions.find((item) => item.evidence.some((evidence) => evidence.contentId === "suggestion-task-excluded"));
    assert.ok(trustedSuggestion);

    service.updateContentTrustedScope({ contentId: "suggestion-task-excluded", userExcludedFromTrustedScope: true, actor: "test" });
    assert.throws(
      () => service.createActionItemFromPostImportSuggestion({ suggestionId: trustedSuggestion.id }),
      /找不到可转任务的导入后建议/
    );
    assert.equal(repo.listActionItems().some((item) => item.sourceSuggestionId === trustedSuggestion.id), false);
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("post import action suggestions surface data health anomalies", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-post-import-health-"));
  const previousCwd = process.cwd();
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    writeJsonSummary(path.join(dir, ".local", "platform-data-health", "report.json"), {
      generatedAt: "2026-06-04T08:23:53.852Z",
      staleAfterHours: 72,
      status: "warn",
      summary: { platformCount: 4, okCount: 12, warnCount: 2, errorCount: 0, missingCount: 0, staleCount: 1, sourceMismatchCount: 1, bilibiliPreviewOnlyOk: false },
      platforms: [
        {
          platform: "bilibili",
          label: "Bilibili creator center",
          latestGeneratedAt: "2026-05-30T08:00:00.000Z",
          raw: { exists: true, captureCount: 2, latestModifiedAt: "2026-06-04T07:50:00.000Z", status: "ok" },
          mappingPreview: { exists: true, status: "warn", generatedAt: "2026-05-30T08:00:00.000Z", isStale: true, sourceMatches: true, source: "bilibili_creator_center", previewOnly: true, saved: false },
          saveSmokeReport: { exists: true, status: "error", generatedAt: "2026-06-04T08:00:00.000Z", isStale: false, sourceMatches: false, source: "wrong_source", passed: true },
          status: "warn",
          warnings: ["mapping preview is stale", "save smoke source mismatch"]
        }
      ],
      bilibiliAccount: {
        status: "warn",
        latestGeneratedAt: "2026-06-04T08:01:00.000Z",
        accountPreview: { exists: true, status: "warn", generatedAt: "2026-06-04T08:01:00.000Z", isStale: false, sourceMatches: true, candidateCount: 1, previewOnly: false, saved: true, previewOnlyOk: false },
        warnings: ["Bilibili account preview is no longer previewOnly=true with saved=false"]
      }
    });
    process.chdir(dir);
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    service.importPayload({
      source: "bilibili_creator_center",
      contents: [{ id: "action-health-bili", title: "B站健康异常内容", platform: "bilibili", status: "published", format: "short_video", topic: "健康异常", publishedAt: "2026-06-03T15:00:00.000Z" }],
      metrics: [{ id: "metric-action-health-bili", contentId: "action-health-bili", platform: "bilibili", capturedAt: "2026-06-03T16:00:00.000Z", views: 300, likes: 6, comments: 1, saves: 1, shares: 1, followersDelta: 0 }]
    });
    const snapshot = await service.dashboard();
    const healthSuggestion = snapshot.postImportActionSuggestions.find((suggestion) => suggestion.type === "data_health_anomaly");
    assert.ok(healthSuggestion);
    assert.equal(healthSuggestion.priority, "medium");
    assert.ok(healthSuggestion.summary.includes("stale 1"));
    assert.ok(healthSuggestion.summary.includes("source mismatch 1"));
    assert.equal(healthSuggestion.evidence[0].platform, "bilibili");
    assert.equal(healthSuggestion.evidence[0].source, "bilibili_creator_center");
  } finally {
    repo?.close();
    process.chdir(previousCwd);
    rmSync(dir, { recursive: true, force: true });
  }
});

test("account metric snapshot upsert is idempotent", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-account-snapshot-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    repo.upsertAccountMetricSnapshot(accountSnapshot({ views: 120 }));
    repo.upsertAccountMetricSnapshot(accountSnapshot({ views: 180, followersDelta: 8 }));
    const snapshots = repo.listAccountMetricSnapshots();
    assert.equal(snapshots.length, 1);
    assert.equal(snapshots[0].views, 180);
    assert.equal(snapshots[0].followersDelta, 8);
    assert.equal(repo.listMetricSnapshots().length, 0);
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("account metrics do not affect content metric totals", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-account-separate-totals-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    service.importPayload({
      source: "bilibili_creator_center",
      contents: [{ id: "bili-content-total-1", title: "B站内容级指标", platform: "bilibili", status: "published", format: "short_video", topic: "账号趋势边界", publishedAt: "2026-06-02T09:00:00.000Z" }],
      metrics: [{ id: "metric-bili-content-total-1", contentId: "bili-content-total-1", platform: "bilibili", capturedAt: "2026-06-02T10:00:00.000Z", views: 600, likes: 60, comments: 6, saves: 3, shares: 2, followersDelta: 0 }]
    });
    repo.upsertAccountMetricSnapshot(accountSnapshot({ views: 5000, likes: 500, followersDelta: 20 }));
    const snapshot = await service.dashboard();
    assert.equal(snapshot.weeklyReview.metrics.totalViews, 600);
    assert.equal(snapshot.weeklyReview.metrics.totalLikes, 60);
    assert.equal(snapshot.metricSourceGroups.reduce((sum, group) => sum + group.views, 0), 600);
    assert.equal(snapshot.accountMetricGroups.reduce((sum, group) => sum + group.views, 0), 5000);
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("dashboard reads account metric groups separately by platform source and date", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-account-groups-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    repo.upsertAccountMetricSnapshot(accountSnapshot({ id: "account-bili-2026-06-02-a", views: 100, likes: 10, comments: 1, rawEvidenceRef: "sanitized:bilibili:a", importRunId: "import-bili-a" }));
    repo.upsertAccountMetricSnapshot(accountSnapshot({ id: "account-bili-2026-06-02-b", views: 50, likes: 5, comments: 2, rawEvidenceRef: "sanitized:bilibili:b", importRunId: "import-bili-b" }));
    repo.upsertAccountMetricSnapshot(accountSnapshot({ id: "account-bili-2026-06-03-a", date: "2026-06-03", views: 30, likes: 3, rawEvidenceRef: "sanitized:bilibili:c" }));
    const snapshot = await service.dashboard();
    const group = snapshot.accountMetricGroups.find((item) => item.platform === "bilibili" && item.source === "bilibili_creator_center" && item.date === "2026-06-02");
    assert.ok(group);
    assert.equal(group.snapshotCount, 2);
    assert.equal(group.views, 150);
    assert.equal(group.likes, 15);
    assert.equal(group.comments, 3);
    assert.equal(group.includedInContentReview, false);
    assert.ok(snapshot.accountMetricGroups.some((item) => item.date === "2026-06-03" && item.views === 30));
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("review totals do not include account metric snapshots", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-account-review-separation-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    service.importPayload({
      source: "bilibili_creator_center",
      contents: [{ id: "bili-review-content-1", title: "B站复盘内容", platform: "bilibili", status: "published", format: "short_video", topic: "复盘边界", publishedAt: "2026-06-02T09:00:00.000Z" }],
      metrics: [{ id: "metric-bili-review-content-1", contentId: "bili-review-content-1", platform: "bilibili", capturedAt: "2026-06-02T10:00:00.000Z", views: 240, likes: 24, comments: 2, saves: 1, shares: 1, followersDelta: 0 }]
    });
    repo.upsertAccountMetricSnapshot(accountSnapshot({ views: 9000, likes: 900, followersDelta: 90 }));
    const saved = service.saveReview({ period: "weekly" });
    assert.equal(saved.review.metrics.totalViews, 240);
    assert.equal(saved.review.metrics.totalLikes, 24);
    assert.equal(saved.review.markdown.includes("9000"), false);
    assert.equal(saved.review.metricSnapshotIds.includes("account-snapshot-bilibili-2026-06-02-overview"), false);
    assert.ok(saved.review.metricSnapshotIds.every((id) => id.startsWith("snapshot-")));
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("sqlite repo stores imported payloads and logs", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-"));
  try {
    const repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const payload = await new FakeSelfMediaProvider().importSample();
    const run = repo.savePayload(payload);
    assert.equal(run.status, "success");
    assert.equal(repo.listContents().length, payload.contents.length);
    assert.equal(repo.listMetrics().length, payload.metrics.length);
    repo.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("review generator creates structured data and markdown", async () => {
  const payload = await new FakeSelfMediaProvider().importSample();
  const review = generateReview("weekly", payload.contents, payload.metrics);
  assert.equal(review.period, "weekly");
  assert.ok(review.markdown.includes("# 周复盘"));
  assert.ok(review.metrics.totalViews > 0);
  assert.ok(review.actions.length >= 1);
});

test("service dashboard returns the complete backend workbench snapshot", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-service-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    const snapshot = await service.dashboard();
    assert.equal(snapshot.contents.length, 0);
    assert.equal(snapshot.realDataScope.trustedContentCount, 0);
    assert.equal(snapshot.trustedOperatingStatus.defaultScope, "trusted_real_creator_center");
    assert.equal(snapshot.trustedOperatingStatus.trustedContentCount, snapshot.realDataScope.trustedContentCount);
    assert.equal(snapshot.trustedOperatingStatus.trustedMetricSnapshotCount, snapshot.realDataScope.trustedMetricSnapshotCount);
    assert.ok(["dirty", "clean"].includes(snapshot.trustedOperatingStatus.profile));
    assert.ok(["pass", "fail", "missing", "error"].includes(snapshot.trustedOperatingStatus.audit.status));
    assert.ok(snapshot.realDataScope.excludedMetricCount > 0);
    assert.ok(snapshot.realDataScope.excludedSources.some((item) => item.source === "fake" || item.source === "review_metric"));
    assert.ok(snapshot.weeklyReview.markdown.includes("下一步"));
    assert.ok(snapshot.logs.some((log) => log.event === "self_media.seed"));
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("clean local profile uses isolated seed-free sqlite without demo smoke rows", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-clean-profile-"));
  const cleanPath = path.join(dir, "clean.sqlite");
  const dirtyPath = path.join(dir, "dirty.sqlite");
  const previousEnv = {
    SELF_MEDIA_PROFILE: process.env.SELF_MEDIA_PROFILE,
    SELF_MEDIA_DB_PATH: process.env.SELF_MEDIA_DB_PATH,
    SELF_MEDIA_SEED_MODE: process.env.SELF_MEDIA_SEED_MODE
  };
  let dirtyRepo: SqliteSelfMediaRepo | undefined;
  let cleanRepo: SqliteSelfMediaRepo | undefined;
  try {
    dirtyRepo = new SqliteSelfMediaRepo(dirtyPath);
    dirtyRepo.savePayload(await new FakeSelfMediaProvider().importSample());
    assert.ok(dirtyRepo.listContents().length > 0);
    dirtyRepo.close();
    dirtyRepo = undefined;

    process.env.SELF_MEDIA_PROFILE = "clean";
    process.env.SELF_MEDIA_DB_PATH = cleanPath;
    process.env.SELF_MEDIA_SEED_MODE = "off";

    cleanRepo = new SqliteSelfMediaRepo();
    const service = new SelfMediaService(cleanRepo);
    const snapshot = await service.dashboard();
    assert.equal(path.resolve(process.cwd(), resolveWorkbenchDbPath()), cleanPath);
    assert.equal(resolveSelfMediaSeedMode(), "off");
    assert.equal(cleanRepo.listContents().length, 0);
    assert.equal(cleanRepo.listMetricSnapshots().length, 0);
    assert.equal(cleanRepo.listImports().length, 0);
    assert.equal(cleanRepo.listLogs(100).some((log) => log.event === "self_media.seed"), false);
    assert.equal(snapshot.contents.length, 0);
    assert.equal(snapshot.metrics.length, 0);
    assert.equal(snapshot.metricSnapshots.length, 0);
    assert.equal(snapshot.trustedOperatingStatus.profile, "clean");
    assert.equal(snapshot.trustedOperatingStatus.profileLabel, "clean");
    assert.equal(snapshot.trustedOperatingStatus.seedMode, "off");
    assert.equal(snapshot.trustedOperatingStatus.trustedContentCount, 0);
    assert.equal(snapshot.trustedOperatingStatus.trustedMetricSnapshotCount, 0);
    assert.equal(snapshot.realDataScope.allContentCount, 0);
    assert.equal(snapshot.realDataScope.excludedMetricSnapshotCount, 0);
    assert.equal(snapshot.weeklyReview.metrics.totalViews, 0);
    assert.equal(snapshot.monthlyReview.metrics.totalViews, 0);
    assert.equal(existsSync(dirtyPath), true);
    cleanRepo.close();
    cleanRepo = undefined;

    dirtyRepo = new SqliteSelfMediaRepo(dirtyPath);
    assert.ok(dirtyRepo.listContents().some((item) => item.id.includes("content-ai")));
  } finally {
    cleanRepo?.close();
    dirtyRepo?.close();
    for (const key of Object.keys(previousEnv) as Array<keyof typeof previousEnv>) {
      const value = previousEnv[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    for (const basePath of [cleanPath, dirtyPath]) {
      for (const file of [basePath, `${basePath}-shm`, `${basePath}-wal`, `${basePath}-journal`]) {
        if (existsSync(file)) rmSync(file, { force: true });
      }
    }
    if (existsSync(dir)) rmdirSync(dir);
  }
});

test("fixture provenance excludes creator-center snapshots from default dashboard", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-provenance-fixture-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    const result = service.importPayload({
      source: "douyin_creator_center",
      provenance: { isTestFixture: true, operationKind: "platform_save_smoke", trustedScopeEligible: false },
      contents: [{ id: "creator-fixture-real-title", title: "真实标题但来自烟测夹具", platform: "douyin", status: "published", format: "short_video", topic: "真实标题", publishedAt: "2026-06-03T09:00:00.000Z" }],
      metrics: [{ id: "metric-creator-fixture-real-title", contentId: "creator-fixture-real-title", platform: "douyin", capturedAt: "2026-06-03T10:00:00.000Z", views: 888, likes: 88, comments: 8, saves: 6, shares: 3, followersDelta: 1 }]
    });
    const storedSnapshot = repo.listMetricSnapshots().find((item) => item.contentId === "creator-fixture-real-title");
    const dashboard = await service.dashboard();
    assert.equal(result.run.provenance?.isTestFixture, true);
    assert.equal(storedSnapshot?.provenance?.isTestFixture, true);
    assert.equal(storedSnapshot?.provenance?.trustedScopeEligible, false);
    assert.equal(dashboard.contents.some((item) => item.id === "creator-fixture-real-title"), false);
    assert.equal(dashboard.metricSnapshots.some((item) => item.contentId === "creator-fixture-real-title"), false);
    assert.equal(dashboard.weeklyReview.metrics.totalViews, 0);
    assert.ok(dashboard.realDataScope.excludedSources.some((item) => item.source === "douyin_creator_center"));
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("unmarked real creator-center snapshots remain eligible for default dashboard", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-provenance-real-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    service.importPayload({
      source: "xiaohongshu_creator_center",
      contents: [{ id: "creator-real-unmarked-1", title: "真实创作中心内容", platform: "xiaohongshu", status: "published", format: "image_text", topic: "真实数据", publishedAt: "2026-06-03T09:00:00.000Z" }],
      metrics: [{ id: "metric-creator-real-unmarked-1", contentId: "creator-real-unmarked-1", platform: "xiaohongshu", capturedAt: "2026-06-03T10:00:00.000Z", views: 321, likes: 22, comments: 4, saves: 18, shares: 3, followersDelta: 2 }]
    });
    const dashboard = await service.dashboard();
    assert.ok(dashboard.contents.some((item) => item.id === "creator-real-unmarked-1"));
    assert.ok(dashboard.metricSnapshots.some((item) => item.contentId === "creator-real-unmarked-1"));
    assert.equal(dashboard.weeklyReview.metrics.totalViews, 321);
    assert.equal(dashboard.realDataScope.trustedContentCount, 1);
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("real provenance does not override acceptance demo title isolation", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-provenance-title-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    service.importPayload({
      source: "bilibili_creator_center",
      provenance: { isTestFixture: false, operationKind: "platform_save", trustedScopeEligible: true },
      contents: [{ id: "creator-real-title-contains-words", title: "A/B test demo 真实复盘", platform: "bilibili", status: "published", format: "short_video", topic: "真实实验", publishedAt: "2026-06-03T09:00:00.000Z" }],
      metrics: [{ id: "metric-creator-real-title-contains-words", contentId: "creator-real-title-contains-words", platform: "bilibili", capturedAt: "2026-06-03T10:00:00.000Z", views: 1500, likes: 30, comments: 4, saves: 11, shares: 12, followersDelta: 0 }]
    });
    const storedSnapshot = repo.listMetricSnapshots().find((item) => item.contentId === "creator-real-title-contains-words");
    const dashboard = await service.dashboard();
    const storedContent = repo.listContents().find((item) => item.id === "creator-real-title-contains-words");
    assert.equal(storedSnapshot?.provenance?.trustedScopeEligible, true);
    assert.equal(storedContent?.dataDomain, "demo_seed");
    assert.equal(dashboard.contents.some((item) => item.id === "creator-real-title-contains-words"), false);
    assert.equal(dashboard.metricSnapshots.some((item) => item.contentId === "creator-real-title-contains-words"), false);
    assert.equal(dashboard.weeklyReview.metrics.totalViews, 0);
    assert.equal(dashboard.realDataScope.trustedContentCount, 0);
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("user trusted-scope curation excludes and restores real creator-center content without deleting rows", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-trust-curation-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    service.importPayload({
      source: "bilibili_creator_center",
      contents: [
        { id: "bilibili-curation-keep", title: "B站保留内容", platform: "bilibili", status: "published", format: "short_video", topic: "保留", publishedAt: "2026-06-03T09:00:00.000Z" },
        { id: "bilibili-curation-exclude", title: "B站用户排除内容", platform: "bilibili", status: "published", format: "short_video", topic: "排除", publishedAt: "2026-06-03T09:00:00.000Z" }
      ],
      metrics: [
        { id: "metric-bilibili-curation-keep", contentId: "bilibili-curation-keep", platform: "bilibili", capturedAt: "2026-06-03T10:00:00.000Z", views: 200, likes: 20, comments: 2, saves: 3, shares: 1, followersDelta: 0 },
        { id: "metric-bilibili-curation-exclude", contentId: "bilibili-curation-exclude", platform: "bilibili", capturedAt: "2026-06-03T10:00:00.000Z", views: 5000, likes: 5, comments: 1, saves: 1, shares: 1, followersDelta: 0 }
      ]
    });

    const before = await service.dashboard();
    assert.equal(before.realDataScope.trustedContentCount, 2);
    assert.equal(before.weeklyReview.metrics.totalViews, 5200);

    const excluded = service.updateContentTrustedScope({ contentId: "bilibili-curation-exclude", userExcludedFromTrustedScope: true, actor: "test" });
    const afterExclude = await service.dashboard();
    const saved = service.saveReview({ period: "weekly" });
    const excludedSnapshotIds = repo.listMetricSnapshots().filter((item) => item.contentId === "bilibili-curation-exclude").map((item) => item.id);
    const suggestionEvidence = afterExclude.postImportActionSuggestions.flatMap((item) => item.evidence);

    assert.equal(excluded.content.userExcludedFromTrustedScope, true);
    assert.equal(excluded.content.trustedScopeOverride, "exclude");
    assert.equal(repo.listContents().some((item) => item.id === "bilibili-curation-exclude"), true);
    assert.equal(repo.listMetricSnapshots().some((item) => item.contentId === "bilibili-curation-exclude"), true);
    assert.equal(afterExclude.contents.some((item) => item.id === "bilibili-curation-exclude"), false);
    assert.equal(afterExclude.metricSnapshots.some((item) => item.contentId === "bilibili-curation-exclude"), false);
    assert.equal(afterExclude.weeklyReview.metrics.totalViews, 200);
    assert.equal(afterExclude.monthlyReview.metrics.totalViews, 200);
    assert.equal(afterExclude.realDataScope.userExcludedContentCount, 1);
    assert.equal(afterExclude.realDataScope.userExcludedMetricSnapshotCount, 1);
    assert.equal(afterExclude.trustedScopeCuration.userExcludedContentCount, 1);
    assert.equal(afterExclude.trustedScopeCuration.items.find((item) => item.contentId === "bilibili-curation-exclude")?.includedInTrustedScope, false);
    assert.equal(saved.review.metricSnapshotIds.some((id) => excludedSnapshotIds.includes(id)), false);
    assert.equal(suggestionEvidence.some((item) => item.contentId === "bilibili-curation-exclude" || excludedSnapshotIds.includes(item.metricSnapshotId ?? "")), false);

    const restored = service.updateContentTrustedScope({ contentId: "bilibili-curation-exclude", userExcludedFromTrustedScope: false, actor: "test" });
    const afterRestore = await service.dashboard();
    assert.equal(restored.content.userExcludedFromTrustedScope, false);
    assert.equal(restored.content.trustedScopeOverride, undefined);
    assert.equal(afterRestore.contents.some((item) => item.id === "bilibili-curation-exclude"), true);
    assert.equal(afterRestore.metricSnapshots.some((item) => item.contentId === "bilibili-curation-exclude"), true);
    assert.equal(afterRestore.weeklyReview.metrics.totalViews, 5200);
    assert.equal(afterRestore.realDataScope.userExcludedContentCount, 0);
    assert.equal(afterRestore.trustedScopeCuration.items.find((item) => item.contentId === "bilibili-curation-exclude")?.includedInTrustedScope, true);
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("import request records CSV data but default review excludes it", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-import-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    const result = service.importRequest({
      mode: "csv",
      csv: [
        "id,title,platform,status,format,topic,views,likes,comments,saves,shares,followersDelta",
        "real-1,真实导入内容,douyin,published,short_video,真实数据,2400,120,12,33,9,7"
      ].join("\n")
    });
    assert.equal(result.run.status, "success");
    assert.ok(result.traceId.startsWith("import"));
    const snapshot = await service.dashboard();
    assert.ok(repo.listContents().some((item) => item.id === "real-1"));
    assert.equal(snapshot.contents.some((item) => item.id === "real-1"), false);
    assert.equal(snapshot.weeklyReview.metrics.totalViews, 0);
    assert.ok(snapshot.realDataScope.excludedSources.some((item) => item.source === "csv"));
    assert.ok(snapshot.logs.some((log) => log.event === "self_media.import" && log.traceId === result.traceId));
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("bilibili local export file import enters trusted content metrics without changing generic CSV trust", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-bilibili-local-export-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    const csv = [
      "稿件ID,BV号,标题,发布时间,播放量,点赞数,评论数,弹幕数,收藏数,分享数,投币数,涨粉,完播率,平均播放时长,选题",
      "bili-local-080,BV1local080,B站本地导出闭环,2026-06-01T09:00:00.000Z,1600,88,22,12,61,19,30,9,45%,32s,AI短片"
    ].join("\n");

    const preview = service.previewImportRequest({
      mode: "platform_local_file",
      platformLocalFile: { platform: "bilibili", csv }
    });
    assert.equal(preview.source, "bilibili_creator_center");
    assert.equal(preview.contentCount, 1);
    assert.equal(preview.realPreviewRows?.[0]?.mappingConfidence, "mature_reference");
    assert.ok(preview.warnings.some((item) => item.includes("bilibili_local_export")));

    const result = service.importRequest({
      mode: "platform_local_file",
      platformLocalFile: { platform: "bilibili", csv }
    });
    assert.equal(result.run.status, "success");
    assert.equal(result.run.source, "bilibili_creator_center");

    const savedSnapshot = repo.listMetricSnapshots().find((item) => item.contentId === "bili-local-080");
    const dashboard = await service.dashboard();
    assert.ok(savedSnapshot);
    assert.equal(savedSnapshot?.source, "bilibili_creator_center");
    assert.equal(savedSnapshot?.dataDomain, "user_work");
    assert.equal(savedSnapshot?.provenance?.trustedScopeEligible, true);
    assert.equal(repo.getEntity("contents", "bili-local-080")?.dataDomain, "user_work");
    assert.ok(dashboard.contents.some((item) => item.id === "bili-local-080"));
    assert.ok(dashboard.metricSnapshots.some((item) => item.contentId === "bili-local-080" && item.source === "bilibili_creator_center"));
    assert.equal(dashboard.weeklyReview.metrics.totalViews, 1600);
    assert.equal(dashboard.trustedAutoCaptureScheduler.schedulerEnabledCount, 0);
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("douyin local export file import enters trusted content metrics without pretending browser auto capture", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-douyin-local-export-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    const csv = [
      "作品ID,标题,发布时间,播放量,点赞数,评论数,收藏数,分享数,转发数,下载数,涨粉,完播率,平均播放时长,选题",
      "dy-local-082,抖音本地导出闭环,2026-06-01T09:00:00.000Z,1800,120,18,44,15,6,3,11,42%,19s,AI短片"
    ].join("\n");

    const preview = service.previewImportRequest({
      mode: "platform_local_file",
      platformLocalFile: { platform: "douyin", csv }
    });
    assert.equal(preview.source, "douyin_creator_center");
    assert.equal(preview.contentCount, 1);
    assert.equal(preview.realPreviewRows?.[0]?.mappingConfidence, "confirmed_official");
    assert.equal(preview.realPreviewRows?.[0]?.nativeMetrics["下载数"], "3");
    assert.ok(preview.warnings.some((item) => item.includes("douyin_local_export")));

    const result = service.importRequest({
      mode: "platform_local_file",
      platformLocalFile: { platform: "douyin", csv }
    });
    assert.equal(result.run.status, "success");
    assert.equal(result.run.source, "douyin_creator_center");

    const savedSnapshot = repo.listMetricSnapshots().find((item) => item.contentId === "dy-local-082");
    const dashboard = await service.dashboard();
    assert.ok(savedSnapshot);
    assert.equal(savedSnapshot?.source, "douyin_creator_center");
    assert.equal(savedSnapshot?.dataDomain, "user_work");
    assert.equal(savedSnapshot?.provenance?.trustedScopeEligible, true);
    assert.equal(repo.getEntity("contents", "dy-local-082")?.dataDomain, "user_work");
    assert.ok(dashboard.contents.some((item) => item.id === "dy-local-082"));
    assert.ok(dashboard.metricSnapshots.some((item) => item.contentId === "dy-local-082" && item.source === "douyin_creator_center"));
    assert.equal(dashboard.weeklyReview.metrics.totalViews, 1800);
    assert.equal(dashboard.trustedAutoCaptureScheduler.schedulerEnabledCount, 0);
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("xiaohongshu local export file import enters trusted content metrics without pretending web login auto capture", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-xiaohongshu-local-export-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    const csv = [
      "笔记ID,标题,发布时间,浏览量,点赞,评论,收藏,分享,涨粉,曝光量,互动量,互动率,流量来源,搜索词,选题",
      "xhs-local-084,小红书本地导出闭环,2026-06-01T09:00:00.000Z,900,66,11,80,12,5,2000,169,18%,搜索,AI工具,AI工具"
    ].join("\n");

    const preview = service.previewImportRequest({
      mode: "platform_local_file",
      platformLocalFile: { platform: "xiaohongshu", csv }
    });
    assert.equal(preview.source, "xiaohongshu_creator_center");
    assert.equal(preview.contentCount, 1);
    assert.equal(preview.realPreviewRows?.[0]?.mappingConfidence, "draft_realistic");
    assert.equal(preview.realPreviewRows?.[0]?.nativeMetrics["曝光量"], "2000");
    assert.ok(preview.warnings.some((item) => item.includes("xiaohongshu_local_export")));
    assert.ok(preview.realPreviewRows?.[0]?.warnings.some((item) => item.includes("draft_realistic_headers_need_real_export_confirmation")));

    const result = service.importRequest({
      mode: "platform_local_file",
      platformLocalFile: { platform: "xiaohongshu", csv }
    });
    assert.equal(result.run.status, "success");
    assert.equal(result.run.source, "xiaohongshu_creator_center");

    const savedSnapshot = repo.listMetricSnapshots().find((item) => item.contentId === "xhs-local-084");
    const dashboard = await service.dashboard();
    assert.ok(savedSnapshot);
    assert.equal(savedSnapshot?.source, "xiaohongshu_creator_center");
    assert.equal(savedSnapshot?.dataDomain, "user_work");
    assert.equal(savedSnapshot?.provenance?.trustedScopeEligible, true);
    const savedContent = repo.getEntity("contents", "xhs-local-084");
    assert.equal(savedContent?.dataDomain, "user_work");
    assert.equal(savedContent?.format, "image_text");
    assert.ok(dashboard.contents.some((item) => item.id === "xhs-local-084"));
    assert.ok(dashboard.metricSnapshots.some((item) => item.contentId === "xhs-local-084" && item.source === "xiaohongshu_creator_center"));
    assert.equal(dashboard.weeklyReview.metrics.totalViews, 900);
    assert.equal(dashboard.trustedAutoCaptureScheduler.schedulerEnabledCount, 0);
    assert.doesNotMatch(JSON.stringify(savedSnapshot), /raw request|cookie|token|header/i);
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("douyin local export xlsx import previews and saves without raw request persistence", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-douyin-local-xlsx-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    const xlsx = createMinimalXlsx([
      ["作品ID", "标题", "发布时间", "播放量", "点赞数", "评论数", "收藏数", "分享数", "转发数", "下载数"],
      ["dy-local-xlsx-082", "抖音 XLSX 本地导出闭环", "2026-06-01T09:00:00.000Z", "1999", "130", "19", "45", "16", "7", "4"]
    ]);
    const request = {
      mode: "platform_local_file" as const,
      platformLocalFile: {
        platform: "douyin" as const,
        fileName: "douyin-export.xlsx",
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        fileBase64: xlsx.toString("base64")
      }
    };

    const preview = service.previewImportRequest(request);
    assert.equal(preview.source, "douyin_creator_center");
    assert.equal(preview.contentCount, 1);
    assert.equal(preview.realPreviewRows?.[0]?.nativeMetrics["下载数"], "4");

    const result = service.importRequest(request);
    const dashboard = await service.dashboard();
    const savedSnapshots = repo.listMetricSnapshots().filter((item) => item.contentId === "dy-local-xlsx-082");
    assert.equal(result.run.status, "success");
    assert.equal(result.run.source, "douyin_creator_center");
    assert.equal(savedSnapshots.length, 1);
    assert.equal(savedSnapshots[0].source, "douyin_creator_center");
    assert.equal(savedSnapshots[0].views, 1999);
    assert.ok(dashboard.metricSnapshots.some((item) => item.contentId === "dy-local-xlsx-082" && item.source === "douyin_creator_center"));
    assert.equal(dashboard.trustedOperatingStatus.views >= 1999, true);
    assert.doesNotMatch(JSON.stringify(savedSnapshots), /fileBase64|raw request|cookie|token|header|下载数/i);
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("bilibili local export xlsx import previews and saves into dashboard without raw request persistence", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-bilibili-local-xlsx-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    const xlsx = createMinimalXlsx([
      ["稿件ID", "BV号", "标题", "发布时间", "播放量", "点赞数", "评论数", "弹幕数", "收藏数", "分享数", "投币数"],
      ["bili-local-xlsx-081", "BV1local081", "B站 XLSX 本地导出闭环", "2026-06-01T09:00:00.000Z", "1888", "99", "23", "13", "62", "20", "31"]
    ]);
    const request = {
      mode: "platform_local_file" as const,
      platformLocalFile: {
        platform: "bilibili" as const,
        fileName: "bilibili-export.xlsx",
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        fileBase64: xlsx.toString("base64")
      }
    };

    const preview = service.previewImportRequest(request);
    assert.equal(preview.source, "bilibili_creator_center");
    assert.equal(preview.contentCount, 1);
    assert.equal(preview.realPreviewRows?.[0]?.nativeMetrics["弹幕数"], "13");

    const result = service.importRequest(request);
    const dashboard = await service.dashboard();
    const savedSnapshots = repo.listMetricSnapshots().filter((item) => item.contentId === "bili-local-xlsx-081");
    assert.equal(result.run.status, "success");
    assert.equal(result.run.source, "bilibili_creator_center");
    assert.equal(savedSnapshots.length, 1);
    assert.equal(savedSnapshots[0].source, "bilibili_creator_center");
    assert.equal(savedSnapshots[0].views, 1888);
    assert.ok(dashboard.metricSnapshots.some((item) => item.contentId === "bili-local-xlsx-081" && item.source === "bilibili_creator_center"));
    assert.equal(dashboard.trustedOperatingStatus.views >= 1888, true);
    assert.doesNotMatch(JSON.stringify(savedSnapshots), /fileBase64|raw request|cookie|token|header|BV1local081|弹幕数/i);
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("manual import stays stored but does not enter default dashboard or reviews", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-manual-scope-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    const result = service.importRequest({
      mode: "manual",
      manual: {
        title: "手动补录内容",
        platform: "douyin",
        format: "short_video",
        topic: "历史补录",
        views: 1888,
        likes: 88,
        comments: 8,
        saves: 6,
        shares: 3
      }
    });
    const storedContentId = repo.listContents().find((item) => item.title === "手动补录内容")?.id;
    const snapshot = await service.dashboard();
    const saved = service.saveReview({ period: "weekly" });
    assert.equal(result.run.status, "success");
    assert.ok(storedContentId);
    assert.ok(repo.listMetricSnapshots().some((item) => item.contentId === storedContentId && item.source === "manual"));
    assert.equal(snapshot.contents.some((item) => item.id === storedContentId), false);
    assert.equal(snapshot.weeklyReview.metrics.totalViews, 0);
    assert.equal(saved.review.metricSnapshotIds.some((id) => id.includes(storedContentId)), false);
    assert.ok(snapshot.realDataScope.excludedSources.some((item) => item.source === "manual"));
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("content workbench shows all local drafts and source classifications without changing trusted totals", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-content-workbench-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    service.importPayload({
      source: "douyin_creator_center",
      contents: [{ id: "workbench-trusted", title: "工作台可信内容", platform: "douyin", status: "published", format: "short_video", topic: "内容工作台", publishedAt: "2026-06-04T09:00:00.000Z" }],
      metrics: [{ id: "metric-workbench-trusted", contentId: "workbench-trusted", platform: "douyin", capturedAt: "2026-06-04T10:00:00.000Z", views: 2100, likes: 210, comments: 21, saves: 20, shares: 10, followersDelta: 5 }]
    });
    service.importRequest({
      mode: "manual",
      manual: {
        title: "工作台手动导入",
        platform: "douyin",
        format: "short_video",
        topic: "手动补录",
        views: 9999,
        likes: 999,
        comments: 99,
        saves: 88,
        shares: 77
      }
    });
    service.importRequest({
      mode: "csv",
      csv: ["id,title,platform,views,likes", "workbench-csv,工作台 CSV 外部内容,douyin,8888,88"].join("\n")
    });
    const idea = service.createIdea({ title: "工作台 idea 转内容", platform: "video_account", rationale: "验证 idea 转内容进入 /content。" });
    const ideaContent = service.convertIdeaToContent({ id: idea.idea.id, scheduledAt: "2026-06-07T09:00:00.000Z" });
    const dashboard = await service.dashboard();
    const suggestion = dashboard.postImportActionSuggestions.find((item) => item.type === "reuse_high_performer");
    assert.ok(suggestion);
    const task = service.createActionItemFromPostImportSuggestion({ suggestionId: suggestion.id });
    const actionContent = service.createContentFromActionItem({ id: task.actionItem.id, scheduledAt: "2026-06-08T09:00:00.000Z" });
    const publishConfirmation = service.confirmPlatformVersionPublish({
      platformVersionId: actionContent.platformVersion.id,
      status: "published",
      happenedAt: new Date().toISOString(),
      note: "内容详情发布历史验证",
      confirmationSource: "manual"
    });

    const beforeTotals = {
      trustedContentCount: dashboard.realDataScope.trustedContentCount,
      trustedMetricSnapshotCount: dashboard.realDataScope.trustedMetricSnapshotCount,
      totalViews: dashboard.weeklyReview.metrics.totalViews
    };
    const afterDashboard = await service.dashboard();
    const workbench = await service.contentWorkbench();

    assert.deepEqual({
      trustedContentCount: afterDashboard.realDataScope.trustedContentCount,
      trustedMetricSnapshotCount: afterDashboard.realDataScope.trustedMetricSnapshotCount,
      totalViews: afterDashboard.weeklyReview.metrics.totalViews
    }, beforeTotals);
    assert.equal(afterDashboard.contents.some((item) => item.title === "工作台手动导入"), false);
    assert.equal(afterDashboard.contents.some((item) => item.id === "workbench-csv"), false);
    assert.equal(afterDashboard.publishRecords.some((item) => item.id === publishConfirmation.publishRecord.id), false);
    assert.ok(workbench.contents.some((item) => item.title === "工作台手动导入"));
    assert.ok(workbench.contents.some((item) => item.id === "workbench-csv"));
    assert.ok(workbench.contents.some((item) => item.id === ideaContent.content.id));
    assert.ok(workbench.contents.some((item) => item.id === actionContent.content.id));
    assert.equal(workbench.publishRecords.some((item) => item.id === publishConfirmation.publishRecord.id && item.confirmationSource === "manual"), true);
    assert.equal(workbench.summary.publishRecordCount, 1);
    assert.equal(workbench.contentRows.find((row) => row.content.title === "工作台手动导入")?.originKind, "manual_import");
    assert.equal(workbench.contentRows.find((row) => row.content.id === "workbench-csv")?.originKind, "external_untrusted");
    assert.equal(workbench.contentRows.find((row) => row.content.id === ideaContent.content.id)?.originKind, "idea_converted");
    assert.equal(workbench.contentRows.find((row) => row.content.id === actionContent.content.id)?.originKind, "action_item_generated");
    assert.equal(workbench.contentRows.find((row) => row.content.id === "workbench-trusted")?.dashboardReviewLabel, "进入运营看板");
    assert.equal(workbench.contentRows.find((row) => row.content.id === "workbench-csv")?.dashboardReviewLabel, "不进运营看板");
    assert.ok(workbench.summary.platformVersionCount >= 4);
    assert.ok(workbench.summary.queueCount >= 2);
    assert.ok(workbench.actionItems.some((item) => item.contentDraftId === actionContent.content.id));
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("failed import request is observable through import run and warning log", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-import-fail-"));
  try {
    const repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    const result = service.importRequest({ mode: "csv", csv: "" });
    assert.equal(result.run.status, "failed");
    assert.ok(result.run.errorMessage);
    assert.ok(repo.listImports().some((item) => item.id === result.run.id && item.status === "failed"));
    assert.ok(repo.listLogs().some((log) => log.event === "self_media.import_failed" && log.traceId === result.traceId));
    repo.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("import preview detects duplicates without creating import run", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-preview-"));
  try {
    const repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    await service.dashboard();
    const beforeRuns = repo.listImports().length;
    const preview = service.previewImportRequest({
      mode: "csv",
      preset: "douyin",
      csv: ["作品ID,标题,播放量,点赞数", "content-ai-short-001,重复内容预览,999,9"].join("\n")
    });
    assert.equal(preview.source, "csv");
    assert.equal(preview.contentCount, 1);
    assert.ok(preview.duplicateContentIds.includes("content-ai-short-001"));
    assert.equal(repo.listImports().length, beforeRuns);
    assert.ok(repo.listLogs().some((log) => log.event === "self_media.import_preview"));
    repo.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("service imports mediacrawler and n8n through unified request contract", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-connectors-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    const mediaCrawler = service.importRequest({
      mode: "mediacrawler",
      json: { platform: "douyin", items: [{ aweme_id: "mc-dy-1", desc: "MediaCrawler抖音内容", play_count: 1100, digg_count: 66 }] }
    });
    const n8n = service.importRequest({
      mode: "n8n",
      json: { executionId: "exec-contract", workflowName: "导入回收", items: [{ id: "n8n-contract-1", title: "n8n内容", platform: "wechat", views: 500 }] }
    });
    const snapshot = await service.dashboard();
    assert.equal(mediaCrawler.run.status, "success");
    assert.equal(n8n.run.status, "success");
    assert.ok(repo.listContents().some((item) => item.id === "mc-dy-1"));
    assert.ok(repo.listContents().some((item) => item.id === "n8n-contract-1"));
    assert.equal(snapshot.contents.some((item) => item.id === "mc-dy-1"), false);
    assert.equal(snapshot.contents.some((item) => item.id === "n8n-contract-1"), false);
    assert.equal(snapshot.weeklyReview.metrics.totalViews, 0);
    assert.ok(snapshot.realDataScope.excludedSources.some((item) => item.source === "mediacrawler"));
    assert.ok(snapshot.realDataScope.excludedSources.some((item) => item.source === "n8n"));
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("publish queue state machine accepts legal transitions and rejects illegal jumps", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-queue-"));
  try {
    const repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    repo.upsertEntity("queue", "queue-test", {
      id: "queue-test",
      contentId: "content-test",
      platform: "douyin",
      status: "draft",
      scheduledAt: "2026-06-02T09:00:00.000Z"
    });
    const accepted = service.updatePublishQueueStatus({ id: "queue-test", status: "needs_review" });
    const rejected = service.updatePublishQueueStatus({ id: "queue-test", status: "published" });
    assert.equal(accepted.ok, true);
    assert.equal(accepted.item?.status, "needs_review");
    assert.equal(rejected.ok, false);
    assert.ok(repo.listLogs().some((log) => log.event === "self_media.queue_transition_failed"));
    repo.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("idea can become draft content and enter publish queue", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-idea-content-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    const created = service.createIdea({ title: "AI表达训练", platform: "video_account", rationale: "每天一条真人表达。" });
    const converted = service.convertIdeaToContent({ id: created.idea.id, scheduledAt: "2026-06-04T09:00:00.000Z" });
    assert.equal(converted.idea.status, "produced");
    assert.equal(converted.content.status, "draft");
    assert.equal(converted.content.workOwnership, "user_owned_work");
    assert.equal(converted.content.dataDomain, "user_work");
    assert.equal(converted.queue.status, "draft");
    assert.ok(repo.listContents().some((item) => item.id === converted.content.id));
    assert.ok(repo.listQueue().some((item) => item.id === converted.queue.id));
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("monetization lead appears in review action context", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-lead-review-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    await service.dashboard();
    service.createLead({ source: "线下社群", demand: "AI短片咨询", nextAction: "发送案例并约时间", valueEstimate: 3000, status: "follow_up" });
    const snapshot = await service.dashboard();
    assert.ok(snapshot.leads.some((lead) => lead.demand === "AI短片咨询"));
    assert.ok(snapshot.weeklyReview.markdown.includes("活跃变现线索"));
    assert.ok(snapshot.weeklyReview.actions.some((action) => action.title.includes("发送案例并约时间")));
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("confirmed import creates platform versions and dated metric snapshots", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-v15-import-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    const result = service.importRequest({
      mode: "csv",
      preset: "douyin",
      csv: ["作品ID,标题,发布时间,播放量,点赞数", "v15-dy-1,V1.5导入,2026-06-01T09:00:00.000Z,1200,55"].join("\n")
    });
    assert.equal(result.run.status, "success");
    assert.ok(repo.listPlatformVersions().some((item) => item.id === "version-v15-dy-1-douyin"));
    assert.ok(repo.listMetricSnapshots().some((item) => item.platformVersionId === "version-v15-dy-1-douyin" && item.snapshotDate === "2026-06-01"));
    const preview = service.previewImportRequest({
      mode: "csv",
      preset: "douyin",
      csv: ["作品ID,标题,发布时间,播放量,点赞数", "v15-dy-1,V1.5导入,2026-06-01T09:00:00.000Z,1500,80"].join("\n")
    });
    assert.ok(preview.diff.some((item) => item.kind === "update"));
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("content can have multiple platform versions and rejects illegal status jumps", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-versions-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    repo.upsertEntity("contents", "content-v15-1", { id: "content-v15-1", title: "多平台内容", platform: "douyin", status: "draft", format: "short_video", topic: "V1.5" });
    const douyin = service.upsertPlatformVersion({ contentId: "content-v15-1", platform: "douyin", title: "抖音版本", body: "短文案" });
    const wechat = service.upsertPlatformVersion({ contentId: "content-v15-1", platform: "wechat", title: "公众号版本", body: "长文案" });
    const rejected = (() => {
      try {
        service.patchPlatformVersion({ id: douyin.version.id, status: "published" });
        return false;
      } catch {
        return true;
      }
    })();
    const ok = service.patchPlatformVersion({ id: douyin.version.id, status: "needs_review", checklist: { title: true, platformFit: true } });
    assert.equal(rejected, true);
    assert.equal(ok.version.status, "needs_review");
    assert.equal(repo.listPlatformVersions().filter((item) => item.contentId === "content-v15-1").length, 2);
    assert.ok(wechat.version.id);
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("calendar filters by platform and status from platform versions", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-calendar-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    service.upsertPlatformVersion({ contentId: "c1", platform: "douyin", title: "抖音排期", scheduledAt: "2026-06-03T09:00:00.000Z", status: "scheduled" });
    service.upsertPlatformVersion({ contentId: "c1", platform: "wechat", title: "公众号排期", scheduledAt: "2026-06-04T09:00:00.000Z", status: "draft" });
    const filtered = service.calendar({ view: "week", platform: "douyin", status: "scheduled" });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].platform, "douyin");
    assert.equal(filtered[0].status, "scheduled");
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("platform version patch updates scheduledAt in calendar results", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-calendar-patch-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    const created = service.upsertPlatformVersion({ contentId: "calendar-patch-content", platform: "douyin", title: "拖拽排期测试", scheduledAt: "2026-06-03T09:00:00.000Z", status: "scheduled" });
    service.patchPlatformVersion({ id: created.version.id, scheduledAt: "2026-06-05T09:00:00.000Z" });
    const calendarItem = service.calendar({ view: "week" }).find((item) => item.platformVersionId === created.version.id);
    assert.equal(calendarItem?.scheduledAt, "2026-06-05T09:00:00.000Z");
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("platform version schedule patch does not create publish records", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-schedule-patch-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    const created = service.upsertPlatformVersion({ contentId: "schedule-only-content", platform: "douyin", title: "只排期不发布", status: "needs_review" });
    const scheduled = service.patchPlatformVersion({ id: created.version.id, status: "scheduled", scheduledAt: "2026-06-03T09:00:00.000Z" });
    service.patchPlatformVersion({ id: scheduled.version.id, scheduledAt: "2026-06-04T09:00:00.000Z" });
    assert.throws(() => service.patchPlatformVersion({ id: scheduled.version.id, status: "published", publishedAt: "2026-06-04T10:00:00.000Z" }), /人工发布确认/);
    assert.throws(() => service.patchPlatformVersion({ id: scheduled.version.id, status: "failed", failureReason: "平台发布失败" }), /人工发布确认/);
    assert.equal(repo.listPublishRecords().length, 0);
    assert.equal(repo.listPlatformVersions().find((item) => item.id === created.version.id)?.scheduledAt, "2026-06-04T09:00:00.000Z");
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("manual publish confirmation creates an idempotent publish record", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-publish-confirm-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    const created = service.upsertPlatformVersion({ contentId: "confirm-content", platform: "douyin", title: "手动确认发布", status: "needs_review" });
    service.patchPlatformVersion({ id: created.version.id, status: "scheduled", scheduledAt: "2026-06-03T09:00:00.000Z" });
    const input = {
      platformVersionId: created.version.id,
      status: "published" as const,
      happenedAt: "2026-06-03T10:00:00.000Z",
      platformPostId: "douyin-post-001",
      platformUrl: "https://example.com/douyin-post-001",
      confirmationSource: "manual" as const,
      confirmedBy: "creator"
    };
    const confirmed = service.confirmPlatformVersionPublish(input);
    const repeated = service.confirmPlatformVersionPublish(input);
    assert.equal(confirmed.version.status, "published");
    assert.equal(confirmed.version.publishedAt, "2026-06-03T10:00:00.000Z");
    assert.equal(confirmed.version.checklist.humanConfirmed, true);
    assert.equal(confirmed.publishRecord.status, "published");
    assert.equal(confirmed.publishRecord.platformPostId, "douyin-post-001");
    assert.equal(confirmed.publishRecord.confirmationSource, "manual");
    assert.equal(repeated.idempotent, true);
    assert.equal(repeated.publishRecord.id, confirmed.publishRecord.id);
    assert.equal(repo.listPublishRecords().length, 1);
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("publish execution workbench guides manual publish refresh and confirmed metric matching", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-publish-metrics-loop-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    const draft = service.createCreatorVideoDraft({
      title: "发布到指标闭环",
      topic: "发布闭环",
      brief: "验证排期到点、人工确认发布、手动抓取后再人工匹配指标。",
      scheduledAt: "2026-06-06T09:00:00.000Z"
    });
    const douyinVersion = draft.platformVersions.find((item) => item.platform === "douyin");
    assert.ok(douyinVersion);

    const dueWorkbench = service.publishToMetricsWorkbench(new Date("2026-06-06T10:30:00.000Z"));
    assert.ok(dueWorkbench.executionItems.some((item) => item.platformVersionId === douyinVersion.id && item.timing === "overdue"));

    const beforeMetricCount = repo.listMetricSnapshots().length;
    const beforeAccountMetricCount = repo.listAccountMetricSnapshots().length;
    const confirmed = service.confirmPlatformVersionPublish({
      platformVersionId: douyinVersion.id,
      status: "published",
      happenedAt: "2026-06-06T10:40:00.000Z",
      confirmationSource: "manual",
      confirmedBy: "creator"
    });
    assert.equal(confirmed.version.status, "published");
    assert.equal(repo.listPublishRecords().length, 1);
    assert.equal(repo.listMetricSnapshots().length, beforeMetricCount);

    const refreshWorkbench = service.publishToMetricsWorkbench(new Date("2026-06-06T11:00:00.000Z"));
    assert.ok(refreshWorkbench.executionItems.some((item) => item.platformVersionId === douyinVersion.id && item.needsManualRefresh));
    assert.ok(refreshWorkbench.postPublishRefresh.some((item) => item.platformVersionId === douyinVersion.id));
    const refreshAssistant = refreshWorkbench.postPublishRecoveryItems.find((item) => item.platformVersionId === douyinVersion.id);
    assert.ok(refreshAssistant);
    assert.equal(refreshAssistant.matchStatus, "needs_capture");
    assert.equal(refreshAssistant.latestImportStatus, "never");
    assert.equal(refreshAssistant.recentlyCaptured, false);
    assert.match(refreshAssistant.recommendedRefreshAction, /抖音/);
    assert.ok(refreshAssistant.manualRefreshSteps.length >= 3);

    service.importPayload({
      source: "douyin_creator_center",
      contents: [{
        id: "dy-publish-loop-imported",
        title: douyinVersion.title,
        platform: "douyin",
        status: "published",
        format: "short_video",
        topic: "发布闭环",
        publishedAt: "2026-06-06T10:42:00.000Z"
      }],
      metrics: [{
        id: "metric-dy-publish-loop-imported",
        contentId: "dy-publish-loop-imported",
        platform: "douyin",
        capturedAt: "2026-06-06T11:30:00.000Z",
        views: 1234,
        likes: 88,
        comments: 9,
        saves: 18,
        shares: 7,
        followersDelta: 2
      }]
    }, { isTestFixture: false, operationKind: "platform_save", trustedScopeEligible: true });

    const candidateWorkbench = service.publishToMetricsWorkbench(new Date("2026-06-06T12:00:00.000Z"));
    const candidate = candidateWorkbench.matchCandidates.find((item) => item.localPlatformVersionId === douyinVersion.id && item.importedContentId === "dy-publish-loop-imported");
    assert.ok(candidate);
    assert.equal(candidate.status, "candidate");
    const candidateAssistant = candidateWorkbench.postPublishRecoveryItems.find((item) => item.platformVersionId === douyinVersion.id);
    assert.ok(candidateAssistant);
    assert.equal(candidateAssistant.matchStatus, "candidate_ready");
    assert.equal(candidateAssistant.latestImportStatus, "success");
    assert.equal(candidateAssistant.recentlyCaptured, true);
    assert.equal(candidateAssistant.matchCandidateCount > 0, true);
    assert.equal(repo.listMetricSnapshots().some((item) => item.contentId === draft.content.id), false);

    const matched = service.confirmPlatformContentMatch({
      localContentId: draft.content.id,
      localPlatformVersionId: douyinVersion.id,
      importedContentId: "dy-publish-loop-imported",
      metricSnapshotIds: candidate.metricSnapshotIds,
      confirmedBy: "creator"
    });
    assert.equal(matched.platformVersion.status, "published");
    assert.equal(matched.importedContent.userExcludedFromTrustedScope, true);
    assert.equal(matched.metricSnapshots.length, 1);
    assert.equal(matched.metricSnapshots[0].contentId, draft.content.id);
    assert.equal(matched.metricSnapshots[0].platformVersionId, douyinVersion.id);
    assert.equal(repo.listAccountMetricSnapshots().length, beforeAccountMetricCount);
    const attributedWorkbench = service.publishToMetricsWorkbench(new Date("2026-06-06T12:30:00.000Z"));
    const attributedAssistant = attributedWorkbench.postPublishRecoveryItems.find((item) => item.platformVersionId === douyinVersion.id);
    assert.ok(attributedAssistant);
    assert.equal(attributedAssistant.matchStatus, "attributed");
    assert.equal(attributedAssistant.attributionStatusLabel, "已归因到本地内容");
    assert.equal(attributedAssistant.metricSnapshotCount, 1);
    assert.equal(attributedWorkbench.postPublishRecoveryItems.some((item) => item.contentId === "dy-publish-loop-imported"), false);
    assert.equal(attributedWorkbench.publishHandoffPackages.some((item) => item.contentId === "dy-publish-loop-imported"), false);
    assert.doesNotMatch(JSON.stringify({ dueWorkbench, refreshWorkbench, candidateWorkbench, matched }), /\bcookie\b|\btoken\b|\bheaders?\b|raw payload|danmu|comment_content/i);
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("publish handoff packages prepare four official-backend manual publish flows without API calls", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-publish-handoff-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    const draft = service.createCreatorVideoDraft({
      title: "四平台发布交接包测试",
      topic: "发布交接",
      brief: "验证不能一键推草稿箱时，生成四个平台发布文案、标签、后台入口和人工状态回填。",
      scheduledAt: "2026-06-06T09:00:00.000Z"
    });

    const workbench = service.publishToMetricsWorkbench(new Date("2026-06-06T08:00:00.000Z"));
    const packages = workbench.publishHandoffPackages.filter((item) => item.contentId === draft.content.id);
    assert.deepEqual(packages.map((item) => item.platform).sort(), ["bilibili", "douyin", "video_account", "xiaohongshu"]);
    assert.equal(packages.some((item) => item.platform === "wechat"), false);
    assert.ok(packages.every((item) => item.defaultMode === "manual_backend"));
    assert.equal(packages.find((item) => item.platform === "douyin")?.capability.status, "future_official_api_candidate");
    assert.equal(packages.find((item) => item.platform === "bilibili")?.capability.status, "future_official_api_candidate");
    assert.equal(packages.find((item) => item.platform === "xiaohongshu")?.capability.status, "manual_backend_only");
    assert.equal(packages.find((item) => item.platform === "video_account")?.capability.status, "manual_backend_only");
    assert.ok(packages.every((item) => item.statusActions.includes("submitted_review") && item.statusActions.includes("published") && item.statusActions.includes("failed")));
    assert.ok(packages.every((item) => item.copy.publishText.includes("标题：") && item.copy.publishText.includes("封面备注：") && item.copy.tagsText.includes("#")));
    assert.ok(packages.every((item) => item.officialBackendUrl.startsWith("https://")));
    assert.doesNotMatch(JSON.stringify(workbench), /\bcookie\b|\btoken\b|\bpassword\b|\bheaders?\b|raw payload/i);

    const xhsPackage = packages.find((item) => item.platform === "xiaohongshu");
    assert.ok(xhsPackage);
    const submitted = service.confirmPlatformVersionPublish({
      platformVersionId: xhsPackage.platformVersionId,
      status: "submitted_review",
      happenedAt: "2026-06-06T09:30:00.000Z",
      confirmationSource: "manual",
      note: "已在小红书官方后台提交审核"
    });
    assert.equal(submitted.publishRecord.status, "submitted_review");
    assert.equal(submitted.version.status, "scheduled");
    assert.equal(submitted.version.publishedAt, undefined);
    assert.match(submitted.version.nextAction ?? "", /等待平台审核/);

    const published = service.confirmPlatformVersionPublish({
      platformVersionId: xhsPackage.platformVersionId,
      status: "published",
      happenedAt: "2026-06-06T10:30:00.000Z",
      confirmationSource: "manual",
      note: "审核通过后人工回填已发布"
    });
    assert.equal(published.version.status, "published");
    assert.equal(repo.listPublishRecords().filter((item) => item.platformVersionId === xhsPackage.platformVersionId).length, 2);
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("creator day workflow runs from schedule and platform drafts to handoff publish and metric match", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-creator-day-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    const scheduledAt = "2026-06-06T09:00:00.000Z";
    const discussion = service.createCreatorVideoDiscussion({
      title: "Creator daily production run",
      topic: "creator daily production",
      brief: "Schedule first, create discussion and platform versions, use handoff publishing, then recover metrics.",
      scheduledAt
    });
    const draft = service.createCreatorVideoDraft({
      title: discussion.idea.title,
      topic: discussion.idea.topic,
      brief: "Schedule first, create discussion and platform versions, use handoff publishing, then recover metrics.",
      scheduledAt
    });
    const douyinVersion = draft.platformVersions.find((item) => item.platform === "douyin");
    const xhsVersion = draft.platformVersions.find((item) => item.platform === "xiaohongshu");
    assert.ok(douyinVersion);
    assert.ok(xhsVersion);
    assert.equal(discussion.drafts.length, 4);
    assert.equal(draft.platformVersions.length, 4);

    const dueWorkbench = service.publishToMetricsWorkbench(new Date("2026-06-06T09:30:00.000Z"));
    const handoffPackages = dueWorkbench.publishHandoffPackages.filter((item) => item.contentId === draft.content.id);
    assert.deepEqual(handoffPackages.map((item) => item.platform).sort(), ["bilibili", "douyin", "video_account", "xiaohongshu"]);
    assert.equal(handoffPackages.some((item) => item.platform === "wechat"), false);
    assert.ok(dueWorkbench.executionItems.some((item) => item.platformVersionId === douyinVersion.id));

    const submitted = service.confirmPlatformVersionPublish({
      platformVersionId: xhsVersion.id,
      status: "submitted_review",
      happenedAt: "2026-06-06T09:40:00.000Z",
      confirmationSource: "manual",
      note: "Creator day flow: submitted review in official backend."
    });
    assert.equal(submitted.publishRecord.status, "submitted_review");
    assert.equal(submitted.version.status, "scheduled");

    const published = service.confirmPlatformVersionPublish({
      platformVersionId: douyinVersion.id,
      status: "published",
      happenedAt: "2026-06-06T09:50:00.000Z",
      confirmationSource: "manual",
      confirmedBy: "creator-day"
    });
    assert.equal(published.version.status, "published");

    const importedContentId = "dy-creator-day-real-work";
    const imported = service.importRequest({
      mode: "json",
      json: {
        source: "douyin_creator_center",
        contents: [{
          id: importedContentId,
          title: douyinVersion.title,
          platform: "douyin",
          status: "published",
          format: "short_video",
          topic: draft.content.topic,
          publishedAt: "2026-06-06T09:52:00.000Z"
        }],
        metrics: [{
          id: `metric-${importedContentId}`,
          contentId: importedContentId,
          platform: "douyin",
          capturedAt: "2026-06-06T10:30:00.000Z",
          views: 1888,
          likes: 96,
          comments: 12,
          saves: 28,
          shares: 9,
          followersDelta: 3
        }]
      }
    });
    assert.equal(imported.run.status, "success");

    const candidateWorkbench = service.publishToMetricsWorkbench(new Date("2026-06-06T11:00:00.000Z"));
    const candidate = candidateWorkbench.matchCandidates.find((item) => item.localPlatformVersionId === douyinVersion.id && item.importedContentId === importedContentId);
    assert.ok(candidate);
    assert.equal(candidate.score, 1);
    const recoveryItem = candidateWorkbench.postPublishRecoveryItems.find((item) => item.platformVersionId === douyinVersion.id);
    assert.ok(recoveryItem);
    assert.equal(recoveryItem.matchStatus, "candidate_ready");
    assert.equal(recoveryItem.latestImportStatus, "success");

    const matched = service.confirmPlatformContentMatch({
      localContentId: draft.content.id,
      localPlatformVersionId: douyinVersion.id,
      importedContentId,
      metricSnapshotIds: candidate.metricSnapshotIds,
      confirmedBy: "creator-day"
    });
    assert.equal(matched.metricSnapshots.length, 1);
    assert.equal(matched.metricSnapshots[0].contentId, draft.content.id);
    assert.equal(matched.metricSnapshots[0].platformVersionId, douyinVersion.id);
    assert.equal(repo.listAccountMetricSnapshots().length, 0);
    assert.doesNotMatch(JSON.stringify({ dueWorkbench, candidateWorkbench, matched }), /\bcookie\b|\btoken\b|\bpassword\b|\bheaders?\b|raw payload/i);
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("failed publish confirmation requires a reason and records manual failure semantics", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-publish-failed-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    const created = service.upsertPlatformVersion({ contentId: "confirm-failed-content", platform: "wechat", title: "失败确认", status: "needs_review" });
    service.patchPlatformVersion({ id: created.version.id, status: "scheduled", scheduledAt: "2026-06-03T09:00:00.000Z" });
    assert.throws(() => service.confirmPlatformVersionPublish({ platformVersionId: created.version.id, status: "failed", idempotencyKey: "failed-without-note" }), /必须提供原因/);
    const failed = service.confirmPlatformVersionPublish({
      platformVersionId: created.version.id,
      status: "failed",
      note: "平台审核未通过",
      confirmationSource: "manual",
      idempotencyKey: "failed-with-note"
    });
    assert.equal(failed.version.status, "failed");
    assert.equal(failed.version.failureReason, "平台审核未通过");
    assert.equal(failed.publishRecord.status, "failed");
    assert.equal(failed.publishRecord.note, "平台审核未通过");
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("platform version upsert is idempotent per content and platform", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-version-upsert-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    const first = service.upsertPlatformVersion({ contentId: "same-platform-content", platform: "wechat", title: "第一版", body: "A" });
    const second = service.upsertPlatformVersion({ contentId: "same-platform-content", platform: "wechat", title: "第二版", body: "B" });
    const versions = repo.listPlatformVersions().filter((item) => item.contentId === "same-platform-content" && item.platform === "wechat");
    assert.equal(second.version.id, first.version.id);
    assert.equal(second.version.body, "B");
    assert.equal(versions.length, 1);
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("creator video idea creates four platform drafts and optional schedule", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-creator-video-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    const result = service.createCreatorVideoDraft({
      title: "六月内容计划怎么做",
      topic: "六月内容计划",
      brief: "用一条真实内容拆解选题、脚本和封面。",
      scriptNotes: "开头先给结论，再讲三个步骤。",
      materialNotes: "保留时间线截图和最终成片画面。",
      scheduledAt: "2026-06-08T12:00:00.000Z"
    });
    assert.equal(result.platformVersions.length, 4);
    assert.deepEqual(new Set(result.platformVersions.map((item) => item.platform)), new Set(["douyin", "xiaohongshu", "video_account", "bilibili"]));
    assert.equal(result.queueItems.length, 4);
    assert.ok(result.platformVersions.every((item) => item.scheduledAt === "2026-06-08T12:00:00.000Z"));
    assert.ok(result.queueItems.every((item) => item.scheduledAt === "2026-06-08T12:00:00.000Z" && item.status === "scheduled"));
    assert.ok(result.drafts.every((draft) => draft.tags.length > 0 && draft.coverNote && /人工/.test(draft.platformAdvice)));
    assert.equal(result.content.workOwnership, "user_owned_work");
    assert.equal(result.content.dataDomain, "user_work");
    assert.ok(repo.listContents().some((item) => item.id === result.content.id && item.status === "scheduled"));
    assert.ok(repo.listPlatformVersions().every((item) => item.contentId !== result.content.id || item.status === "scheduled"));
    const workbench = await service.contentWorkbench();
    assert.ok(workbench.contentRows.some((row) => row.content.id === result.content.id && row.originKind === "local_draft"));
    const calendarItems = service.calendar().filter((item) => item.contentId === result.content.id && item.scheduledAt === "2026-06-08T12:00:00.000Z");
    assert.equal(calendarItems.length, 4);
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("production defaults isolate acceptance titles even when they look like real works", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-data-domain-isolation-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    const acceptance = service.createCreatorVideoDraft({
      title: "真实作品：六月内容计划",
      topic: "真实内容评估",
      brief: "072 验收测试创建，不能进入默认用户日历或看板。",
      scheduledAt: "2026-06-10T12:00:00.000Z"
    });
    const userWork = service.createCreatorVideoDraft({
      title: "用户作品：六月内容计划",
      topic: "六月内容计划",
      brief: "用户明确创建的真实作品排期。",
      scheduledAt: "2026-06-11T12:00:00.000Z"
    });

    assert.equal(acceptance.content.dataDomain, "acceptance_run");
    assert.equal(acceptance.content.acceptanceRunId, "title-classified-acceptance-run");
    assert.equal(acceptance.content.workOwnership, undefined);
    assert.equal(userWork.content.dataDomain, "user_work");
    assert.equal(userWork.content.workOwnership, "user_owned_work");

    const workbench = await service.contentWorkbench();
    assert.equal(workbench.contentRows.find((row) => row.content.id === acceptance.content.id)?.content.dataDomain, "acceptance_run");
    assert.equal(workbench.contentRows.find((row) => row.content.id === userWork.content.id)?.content.dataDomain, "user_work");

    const dashboard = await service.dashboard();
    assert.equal(dashboard.contents.some((item) => item.id === acceptance.content.id), false);
    assert.equal(dashboard.platformVersions.some((item) => item.contentId === acceptance.content.id), false);
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("default publish calendar excludes historical imports and acceptance-mislabeled user work", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-calendar-hygiene-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    service.importPayload({
      source: "bilibili_creator_center",
      contents: [{
        id: "bilibili-BV1u34y1y7hQ",
        title: "孤雏，随便唱唱",
        platform: "bilibili",
        status: "published",
        format: "short_video",
        topic: "历史 archive",
        publishedAt: "2022-02-19T13:00:00.000Z",
        workOwnership: "user_owned_work",
        dataDomain: "user_work"
      }],
      metrics: [{ id: "metric-bilibili-BV1u34y1y7hQ", contentId: "bilibili-BV1u34y1y7hQ", platform: "bilibili", capturedAt: "2026-06-06T13:00:00.000Z", views: 300, likes: 20, comments: 3, saves: 2, shares: 1, followersDelta: 0 }]
    });
    service.importPayload({
      source: "douyin_creator_center",
      contents: [{
        id: "douyin-historical-published-092",
        title: "抖音历史已发布内容",
        platform: "douyin",
        status: "published",
        format: "short_video",
        topic: "创作中心历史",
        publishedAt: "2024-05-01T09:00:00.000Z",
        scheduledAt: "2026-06-06T09:00:00.000Z",
        workOwnership: "user_owned_work",
        dataDomain: "user_work"
      }],
      metrics: [{ id: "metric-douyin-historical-published-092", contentId: "douyin-historical-published-092", platform: "douyin", capturedAt: "2026-06-06T09:30:00.000Z", views: 1200, likes: 80, comments: 8, saves: 5, shares: 4, followersDelta: 1 }]
    });
    repo.upsertEntity("contents", "content-creator-6e8eafb53993", {
      id: "content-creator-6e8eafb53993",
      title: "用户作品：六月内容计划",
      platform: "douyin",
      status: "scheduled",
      format: "short_video",
      topic: "六月内容计划",
      scheduledAt: "2026-06-06T01:00:00.000Z",
      notes: "用来确认默认日历只显示 user_work。",
      workOwnership: "user_owned_work",
      dataDomain: "user_work"
    });
    service.upsertPlatformVersion({
      contentId: "content-creator-6e8eafb53993",
      platform: "douyin",
      title: "用户作品：六月内容计划",
      status: "scheduled",
      scheduledAt: "2026-06-06T01:00:00.000Z"
    });
    repo.upsertEntity("contents", "unscheduled-user-work-092", {
      id: "unscheduled-user-work-092",
      title: "没有排期的真实草稿",
      platform: "douyin",
      status: "draft",
      format: "short_video",
      topic: "未排期",
      workOwnership: "user_owned_work",
      dataDomain: "user_work"
    });
    const unscheduled = service.upsertPlatformVersion({ contentId: "unscheduled-user-work-092", platform: "douyin", title: "没有排期的真实草稿", status: "draft" });
    const realScheduled = service.createCreatorVideoDraft({
      title: "真实未来发布计划",
      topic: "六月发布计划",
      brief: "用户主动计划的未来待发布作品。",
      scheduledAt: "2026-06-12T12:00:00.000Z"
    });

    assert.equal(service.calendar().some((item) => item.platformVersionId === unscheduled.version.id), false);
    const dashboard = await service.dashboard();
    assert.equal(dashboard.calendarItems.some((item) => item.contentId === "bilibili-BV1u34y1y7hQ"), false);
    assert.equal(dashboard.calendarItems.some((item) => item.contentId === "douyin-historical-published-092"), false);
    assert.equal(dashboard.calendarItems.some((item) => item.contentId === "content-creator-6e8eafb53993"), false);
    assert.equal(dashboard.calendarItems.filter((item) => item.contentId === realScheduled.content.id).length, 4);
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("trusted dashboard excludes acceptance and seed titles from imported metrics", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-import-data-domain-isolation-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    service.importPayload({
      source: "douyin_creator_center",
      contents: [
        { id: "trusted-user-work-real", title: "用户作品六月更新", platform: "douyin", status: "published", format: "short_video", topic: "六月内容", publishedAt: "2026-06-01T09:00:00.000Z" },
        { id: "acceptance-seed-work-072", title: "AI选题计划", platform: "douyin", status: "published", format: "short_video", topic: "072验收", publishedAt: "2026-06-01T09:00:00.000Z" }
      ],
      metrics: [
        { id: "metric-trusted-user-work-real", contentId: "trusted-user-work-real", platform: "douyin", capturedAt: "2026-06-02T09:00:00.000Z", views: 1200, likes: 100, comments: 10, saves: 8, shares: 6, followersDelta: 3 },
        { id: "metric-acceptance-seed-work-072", contentId: "acceptance-seed-work-072", platform: "douyin", capturedAt: "2026-06-02T09:00:00.000Z", views: 999999, likes: 999, comments: 99, saves: 88, shares: 77, followersDelta: 66 }
      ]
    });

    const dashboard = await service.dashboard();
    assert.equal(repo.listContents().find((item) => item.id === "trusted-user-work-real")?.dataDomain, "user_work");
    assert.equal(repo.listContents().find((item) => item.id === "acceptance-seed-work-072")?.dataDomain, "acceptance_run");
    assert.ok(dashboard.metricSnapshots.some((item) => item.contentId === "trusted-user-work-real"));
    assert.equal(dashboard.metricSnapshots.some((item) => item.contentId === "acceptance-seed-work-072"), false);
    assert.equal(dashboard.weeklyReview.metrics.totalViews, 1200);
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("creator copilot discusses rough idea, regenerates, and saves scheduled four platform drafts", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-creator-copilot-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    const first = service.createCreatorVideoDiscussion({
      brief: "准备一条讲我怎么用 AI 把一周自媒体数据变成选题和脚本的短视频。",
      materialNotes: "有看板截图和一张排期表。"
    });
    assert.equal(first.drafts.length, 4);
    assert.ok(first.idea.title);
    assert.ok(first.analysis.direction.includes(first.idea.topic));
    assert.ok(first.platformDifferences.every((item) => /人工确认/.test(item.manualCheck)));
    assert.ok(first.drafts.every((draft) => /需.*人工确认/.test(draft.incentiveTagAdvice)));
    assert.equal(repo.listContents().length, 0);

    const regenerated = service.createCreatorVideoDiscussion({
      ...first.idea,
      revisionPrompt: "面向新手，语气轻松，控制在 60 秒以内。",
      scheduledAt: "2026-06-09T12:30:00.000Z"
    });
    assert.ok(regenerated.analysis.tone.includes("轻松"));
    assert.ok(regenerated.analysis.duration.includes("60") || regenerated.analysis.duration.includes("90"));
    assert.ok(regenerated.drafts.some((draft) => draft.body.includes("本轮调整")));

    const saved = service.createCreatorVideoDraft(regenerated.idea);
    assert.equal(saved.platformVersions.length, 4);
    assert.equal(saved.content.dataDomain, "user_work");
    assert.ok(saved.content.notes.includes("creator_copilot_discussion:local_rule_v1"));
    assert.ok(repo.listPlatformVersions().every((item) => item.contentId !== saved.content.id || item.status === "scheduled"));
    assert.ok(service.calendar().some((item) => item.contentId === saved.content.id && item.scheduledAt === "2026-06-09T12:30:00.000Z"));
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("clear future schedules preserves publish records and metric snapshots", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-clear-future-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    const future = service.createCreatorVideoDraft({
      title: "未来排期清空测试",
      topic: "排期",
      brief: "验证清空只影响未来草稿排期。",
      scheduledAt: "2026-06-08T12:00:00.000Z"
    });
    const historical = service.upsertPlatformVersion({ contentId: "published-content", platform: "douyin", title: "历史发布", status: "needs_review" });
    service.patchPlatformVersion({ id: historical.version.id, status: "scheduled", scheduledAt: "2026-06-01T09:00:00.000Z" });
    service.confirmPlatformVersionPublish({
      platformVersionId: historical.version.id,
      status: "published",
      happenedAt: "2026-06-01T10:00:00.000Z",
      confirmationSource: "manual"
    });
    service.upsertMetricSnapshot({
      platformVersionId: historical.version.id,
      snapshotDate: "2026-06-02",
      views: 100,
      source: "douyin_creator_center"
    });
    const cleared = service.clearFutureSchedules(new Date("2026-06-05T00:00:00.000Z"));
    assert.equal(cleared.clearedPlatformVersionCount, 4);
    assert.equal(cleared.clearedQueueCount, 4);
    assert.equal(cleared.preservedPublishRecordCount, 1);
    assert.equal(cleared.preservedMetricSnapshotCount, 1);
    assert.ok(repo.listPlatformVersions().filter((item) => item.contentId === future.content.id).every((item) => item.status === "needs_review" && !item.scheduledAt));
    assert.equal(repo.listPublishRecords().length, 1);
    assert.equal(repo.listMetricSnapshots().length, 1);
    assert.equal(repo.listPlatformVersions().find((item) => item.id === historical.version.id)?.status, "published");
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("saved review stores action items and evidence-backed insights", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-saved-review-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    await service.dashboard();
    repo.upsertEntity("contents", "content-user-review-001", {
      id: "content-user-review-001",
      title: "用户周报复盘",
      platform: "douyin",
      status: "published",
      format: "short_video",
      topic: "周报复盘",
      dataDomain: "user_work",
      workOwnership: "user_owned_work"
    });
    const version = service.upsertPlatformVersion({ contentId: "content-user-review-001", platform: "douyin", title: "用户周报复盘", status: "scheduled" });
    service.upsertMetricSnapshot({ platformVersionId: version.version.id, snapshotDate: "2026-06-01", views: 2200, likes: 100, source: "douyin_creator_center" });
    const saved = service.saveReview({ period: "weekly" });
    assert.equal(saved.review.period, "weekly");
    assert.ok(saved.review.metricSnapshotIds.length >= 1);
    assert.ok(saved.actionItems.length >= 1);
    assert.ok(saved.review.insights.some((item) => item.evidenceRefs.length > 0));
    const updated = service.updateActionItem({ id: saved.actionItems[0].id, status: "doing", nextAction: "今天完成" });
    assert.equal(updated.actionItem.status, "doing");
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("monthly review save and action status update are visible in dashboard", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-monthly-review-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    await service.dashboard();
    const saved = service.saveReview({ period: "monthly" });
    const updated = service.updateActionItem({ id: saved.actionItems[0].id, status: "done", nextAction: "月度动作已完成" });
    const snapshot = await service.dashboard();
    assert.ok(snapshot.savedReviews.some((item) => item.id === saved.review.id && item.period === "monthly"));
    assert.ok(snapshot.actionItems.some((item) => item.id === updated.actionItem.id && item.status === "done"));
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("lead status and automation runs are traceable internal facts", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-automation-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    const lead = service.createLead({ source: "朋友介绍", demand: "AI工作流搭建", nextAction: "发送报价", valueEstimate: 5000 });
    const updatedLead = service.updateLead({ id: lead.lead.id, status: "contacted", nextAction: "等待回复" });
    const success = service.createAutomationRun({ kind: "n8n_import", status: "success", source: "n8n" });
    const retry = service.createAutomationRun({ kind: "local_runner", status: "retrying", errorMessage: "临时失败" });
    assert.equal(updatedLead.lead.status, "contacted");
    assert.ok(success.run.traceId.startsWith("automation"));
    assert.equal(retry.run.retryCount, 1);
    assert.equal(repo.listAutomationRuns().length, 2);
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
