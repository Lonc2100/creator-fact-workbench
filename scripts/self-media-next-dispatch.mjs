#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const defaults = {
  handoff: "docs/handoffs/MAINLINE-VIDEO-ACCOUNT-MANUAL-UPDATE-CYCLE-125-worker-handoff.md",
  status: "docs/handoffs/CURRENT-PLATFORM-STATUS.md",
  outDir: "docs/handoffs/dispatch-queue",
  dryRun: true,
  write: true,
};

function parseArgs(argv) {
  const args = { ...defaults };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--from-handoff") {
      args.handoff = argv[++i];
    } else if (arg === "--status") {
      args.status = argv[++i];
    } else if (arg === "--out-dir") {
      args.outDir = argv[++i];
    } else if (arg === "--no-write") {
      args.write = false;
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--dry-run") {
      args.dryRun = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/self-media-next-dispatch.mjs --dry-run",
    "",
    "Options:",
    "  --from-handoff <path>  Source worker handoff to inspect.",
    "  --status <path>        Current platform status doc to reference.",
    "  --out-dir <path>       Queue/report output directory.",
    "  --no-write             Print JSON only; do not write queue/report files.",
    "",
    "This script never creates Codex threads, never runs validations, and never saves platform data.",
  ].join("\n");
}

function readText(relativePath) {
  const fullPath = path.resolve(repoRoot, relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Required input not found: ${relativePath}`);
  }
  return fs.readFileSync(fullPath, "utf8");
}

function hashJson(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);
}

function toPosixPath(value) {
  return value.split(path.sep).join("/");
}

function buildVideoAccountCandidate({ handoffPath, statusPath, handoffText }) {
  const mentionsVideoAccountGap =
    /Video Account still needs|视频号.*(?:需要|缺)|stable work ID\/link|稳定.*(?:作品 ID|作品ID|链接)/i.test(handoffText);
  const savedNoNewRows = /Saved:\s*no|保存.*no|没有保存新视频号数据/i.test(handoffText);

  if (!mentionsVideoAccountGap || !savedNoNewRows) {
    return null;
  }

  const taskId = "MAINLINE-VIDEO-ACCOUNT-MANUAL-DATA-INTAKE-127";
  const handoffTarget = "docs/handoffs/MAINLINE-VIDEO-ACCOUNT-MANUAL-DATA-INTAKE-127-worker-handoff.md";
  const objective =
    "When the user provides a current owned Video Account content-level row or export, run the manual update path through preview, explicit user confirmation, save, freshness update, dashboard check, and calendar non-pollution check.";
  const base = {
    schemaVersion: 1,
    taskId,
    dispatchStatus: "waiting_user_gate",
    needs_user_gate: true,
    userGateReason:
      "Saving real Video Account data requires user-provided owned content-level data with a stable work ID/link and explicit confirmation before save.",
    objective,
    plainLanguage:
      "视频号自动抓取仍不承诺。等用户提供一条或多条当前视频号作品级数据后，Worker 才能从 /dashboard -> /import 的视频号手动更新入口预览、请用户确认并保存。",
    requiredReading: [
      "AGENTS.md",
      statusPath,
      handoffPath,
      "docs/runbooks/self-media-daily-ops.md",
      "docs/trellis-parallel-workflow.md",
    ],
    allowedFiles: [
      handoffTarget,
      "docs/handoffs/dispatch-queue/*.json",
      "docs/handoffs/dispatch-queue/*.md",
      "Only if UI copy is unclear: src/domain/self-media/ui/screens/ImportPage.tsx",
      "Only if tests need copy/testid alignment: tests/ui-harness.test.mjs",
      "Only if provider validation rejects a valid user-provided export shape: tests/self-media-contract.test.ts",
    ],
    forbiddenFiles: [
      ".local/**",
      ".agents/**",
      ".codex/**",
      ".trellis/**",
      ".runtime/**",
      "docs/generated/template-doctor-report.md",
      "scripts/smoke-self-media.mjs",
      "src/domain/self-media/ui/screens/LeadsPage.tsx",
      "src/domain/self-media/ui/screens/UiLabPage.tsx",
      "tests/agent-trajectory.test.mjs",
      "docs/handoffs/MEDIACRAWLER-ADAPTER-AUDIT-094-worker-handoff.md",
      "scripts/check-browser-automation.mjs",
    ],
    validationCommands: [
      "git diff --check",
      "npm run typecheck",
      "npm run test:self-media",
      "npm run test:ui-harness",
      "NEXT_DIST_DIR=.next-build-127-main npm run build",
      "npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page",
      "npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard",
    ],
    handoffPath: handoffTarget,
    safetyGates: [
      "Stop for user login, QR code, captcha, or platform risk-control checks.",
      "Stop before saving real platform data; user must explicitly confirm the preview rows.",
      "Stop before deleting files or folders.",
      "Stop before force push.",
      "Stop if sensitive material appears: password, cookie, token, header, storageState, raw request, raw response, screenshot, HAR, trace.",
      "Stop if the task needs to redefine PRD scope or promote Video Account automatic capture.",
      "Stop if another active Worker is editing the same files or running heavy gates.",
    ],
    heavyGatesSerial: [
      "live 3200 checks",
      "browser/E2E flows",
      "sqlite writes",
      "Next build",
      "daily platform ops gate",
    ],
    dispatchInstructions: {
      recommendedAutomationLevel: 2,
      createThread: false,
      reason:
        "Queue generation is safe, but real-data save and heavy gates require an Orchestrator/Ops gate before dispatch.",
      promptTemplate:
        "create_goal: MAINLINE-VIDEO-ACCOUNT-MANUAL-DATA-INTAKE-127\n\nUse the dispatch queue task package at docs/handoffs/dispatch-queue/MAINLINE-VIDEO-ACCOUNT-MANUAL-DATA-INTAKE-127.json. Do not save real Video Account data until the user provides current owned content-level rows and explicitly confirms the preview.",
    },
  };
  return {
    ...base,
    dedupeKey: hashJson({ taskId, objective, handoffPath }),
  };
}

function renderReport({ generatedAt, sourceHandoff, outputPath, candidate }) {
  const lines = [
    "# Self-media Dispatch Queue Report",
    "",
    `Generated at: ${generatedAt}`,
    `Source handoff: ${sourceHandoff}`,
    "Mode: dry-run queue generation only",
    "",
  ];

  if (!candidate) {
    lines.push("No dispatch candidate was generated.");
    return lines.join("\n") + "\n";
  }

  lines.push(
    "## Candidate",
    "",
    `- Task: ${candidate.taskId}`,
    `- Status: ${candidate.dispatchStatus}`,
    `- Needs user gate: ${candidate.needs_user_gate}`,
    `- Dedupe key: ${candidate.dedupeKey}`,
    `- Queue file: ${outputPath}`,
    "",
    "## Safety",
    "",
    "- The script did not create a Codex thread.",
    "- The script did not run platform capture, save data, delete files, commit, or push.",
    "- Dispatch remains a main-session/Ops decision.",
    "",
    "## Next Manual Step",
    "",
    "Read the queue file, confirm the user gate is satisfied, then create or send a Codex thread prompt manually through the main/Ops session."
  );
  return lines.join("\n") + "\n";
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const handoffText = readText(args.handoff);
  readText(args.status);
  const generatedAt = new Date().toISOString();
  const candidate = buildVideoAccountCandidate({
    handoffPath: args.handoff,
    statusPath: args.status,
    handoffText,
  });

  const outDir = path.resolve(repoRoot, args.outDir);
  const outputPath = candidate ? toPosixPath(path.join(args.outDir, `${candidate.taskId}.json`)) : "";
  const reportRelativePath = toPosixPath(path.join(args.outDir, "latest-report.md"));

  const payload = candidate
    ? {
        ...candidate,
        source: {
          generatedAt,
          generatedBy: "scripts/self-media-next-dispatch.mjs",
          sourceHandoff: args.handoff,
          statusDoc: args.status,
        },
      }
    : null;

  if (args.write) {
    fs.mkdirSync(outDir, { recursive: true });
    if (payload) {
      fs.writeFileSync(path.resolve(repoRoot, outputPath), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    }
    fs.writeFileSync(
      path.resolve(repoRoot, reportRelativePath),
      renderReport({
        generatedAt,
        sourceHandoff: args.handoff,
        outputPath,
        candidate: payload,
      }),
      "utf8"
    );
  }

  console.log(
    JSON.stringify(
      {
        status: payload ? "candidate_generated" : "no_candidate",
        dryRun: args.dryRun,
        wroteFiles: args.write,
        queueFile: payload ? outputPath : null,
        reportFile: args.write ? reportRelativePath : null,
        taskId: payload?.taskId ?? null,
        needs_user_gate: payload?.needs_user_gate ?? null,
      },
      null,
      2
    )
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
