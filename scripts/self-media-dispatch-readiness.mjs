#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const defaults = {
  queueDir: "docs/handoffs/dispatch-queue",
  write: true,
};

function parseArgs(argv) {
  const args = { ...defaults };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--queue-dir") {
      args.queueDir = argv[++i];
    } else if (arg === "--no-write") {
      args.write = false;
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/self-media-dispatch-readiness.mjs",
    "",
    "Options:",
    "  --queue-dir <path>  Dispatch queue directory.",
    "  --no-write          Print readiness only; do not write report/ledger files.",
    "",
    "This script never creates Codex threads, never runs heavy gates, and never saves platform data.",
  ].join("\n");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function isQueueItem(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof value.taskId === "string" &&
      Array.isArray(value.requiredReading) &&
      Array.isArray(value.allowedFiles) &&
      Array.isArray(value.forbiddenFiles) &&
      Array.isArray(value.validationCommands)
  );
}

function toPosixPath(value) {
  return value.split(path.sep).join("/");
}

function listQueueFiles(queueDir) {
  const fullDir = path.resolve(repoRoot, queueDir);
  if (!fs.existsSync(fullDir)) {
    return [];
  }
  return fs
    .readdirSync(fullDir)
    .filter((name) => name.endsWith(".json"))
    .filter((name) => !name.startsWith("dispatch-readiness"))
    .sort()
    .map((name) => path.join(fullDir, name));
}

function titleFromTaskId(taskId) {
  return taskId
    .replace(/^MAINLINE-/, "")
    .toLowerCase()
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function workerThreadTitle(item) {
  const number = item.taskId.match(/-(\d+)$/)?.[1] ?? item.taskId;
  const label = titleFromTaskId(item.taskId).replace(/\s+\d+$/, "");
  return `Worker ${number} - ${label}`;
}

function missingUserData(item) {
  if (!/video account/i.test(`${item.objective} ${item.userGateReason ?? ""}`)) {
    return [];
  }
  return [
    "视频号作品标题",
    "发布时间",
    "稳定作品 ID 或链接",
    "播放/曝光/浏览",
    "点赞",
    "评论",
    "收藏/转发/分享等可用字段",
  ];
}

function classify(item) {
  if (item.needs_user_gate || item.dispatchStatus === "waiting_user_gate") {
    return {
      readiness: "blocked_by_user_gate",
      canDispatch: false,
      reason: item.userGateReason || "Queue item requires a user gate before dispatch.",
      missingUserData: missingUserData(item),
    };
  }
  if (item.dispatchStatus && !["ready", "queued", "candidate_generated"].includes(item.dispatchStatus)) {
    return {
      readiness: "blocked_by_status",
      canDispatch: false,
      reason: `Queue status is ${item.dispatchStatus}.`,
      missingUserData: [],
    };
  }
  return {
    readiness: "ready_for_main_ops_dispatch",
    canDispatch: true,
    reason: "No queue-level user gate or blocking status was found.",
    missingUserData: [],
  };
}

function buildPrompt(item, state) {
  return [
    `create_goal: ${item.taskId}`,
    "",
    item.objective,
    "",
    "通俗说明：",
    item.plainLanguage,
    "",
    "Required reading:",
    ...item.requiredReading.map((entry) => `- ${entry}`),
    "",
    "Allowed files:",
    ...item.allowedFiles.map((entry) => `- ${entry}`),
    "",
    "Forbidden files:",
    ...item.forbiddenFiles.map((entry) => `- ${entry}`),
    "",
    "Validation commands:",
    ...item.validationCommands.map((entry) => `- ${entry}`),
    "",
    `Handoff path: ${item.handoffPath}`,
    `User gate state: ${state.readiness}`,
    `User gate reason: ${state.reason}`,
    "",
    "Safety gates:",
    ...item.safetyGates.map((entry) => `- ${entry}`),
    "",
    "Heavy gates must remain serial:",
    ...item.heavyGatesSerial.map((entry) => `- ${entry}`),
    "",
    "Do not save real platform data until the user explicitly confirms preview rows. Do not save password/cookie/token/header/storageState/raw request/raw response/screenshot/HAR/trace.",
  ].join("\n");
}

function summarizeItem(item, filePath) {
  const state = classify(item);
  return {
    taskId: item.taskId,
    queueFile: toPosixPath(path.relative(repoRoot, filePath)),
    dedupeKey: item.dedupeKey,
    dispatchStatus: item.dispatchStatus,
    needs_user_gate: Boolean(item.needs_user_gate),
    readiness: state.readiness,
    canDispatch: state.canDispatch,
    reason: state.reason,
    missingUserData: state.missingUserData,
    suggestedThreadTitle: workerThreadTitle(item),
    threadToolPlan: state.canDispatch
      ? {
          tool: "create_thread",
          target: "project local or approved worktree",
          note: "Main/Ops session must call the Codex thread tool manually after checking heavy-gate conflicts.",
        }
      : {
          tool: "none",
          note: "Do not create or send a Worker thread until the user gate is satisfied.",
        },
    prompt: buildPrompt(item, state),
  };
}

function renderReport({ generatedAt, items }) {
  const lines = [
    "# Self-media Dispatch Readiness",
    "",
    `Generated at: ${generatedAt}`,
    "Mode: read queue and prepare main/Ops dispatch prompt only",
    "",
  ];
  if (items.length === 0) {
    lines.push("No queue items found.");
    return lines.join("\n") + "\n";
  }

  for (const item of items) {
    lines.push(
      `## ${item.taskId}`,
      "",
      `- Queue file: ${item.queueFile}`,
      `- Dedupe key: ${item.dedupeKey}`,
      `- Dispatch status: ${item.dispatchStatus}`,
      `- Readiness: ${item.readiness}`,
      `- Can dispatch: ${item.canDispatch}`,
      `- Suggested thread title: ${item.suggestedThreadTitle}`,
      `- Reason: ${item.reason}`,
      ""
    );
    if (item.missingUserData.length > 0) {
      lines.push("Missing user data:", "", ...item.missingUserData.map((entry) => `- ${entry}`), "");
    }
    lines.push(
      "Thread tool plan:",
      "",
      `- Tool: ${item.threadToolPlan.tool}`,
      `- Note: ${item.threadToolPlan.note}`,
      "",
      "Prompt for main/Ops thread dispatch:",
      "",
      "```text",
      item.prompt,
      "```",
      ""
    );
  }
  while (lines.at(-1) === "") {
    lines.pop();
  }
  return lines.join("\n") + "\n";
}

function renderLedger({ generatedAt, items }) {
  const lines = [
    "# Dispatch Ledger",
    "",
    "This ledger is a lightweight dispatch record. It is not an automation daemon.",
    "",
    "| Timestamp | Task ID | Dedupe key | Status | Thread ID | Note |",
    "| --- | --- | --- | --- | --- | --- |",
  ];
  for (const item of items) {
    const status = item.canDispatch ? "ready" : item.readiness;
    const note = item.canDispatch ? "Main/Ops may dispatch after heavy-gate check." : item.reason;
    lines.push(`| ${generatedAt} | ${item.taskId} | ${item.dedupeKey} | ${status} |  | ${note} |`);
  }
  return lines.join("\n") + "\n";
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const queueFiles = listQueueFiles(args.queueDir);
  const generatedAt = new Date().toISOString();
  const items = queueFiles
    .map((filePath) => ({ filePath, data: readJson(filePath) }))
    .filter(({ data }) => isQueueItem(data))
    .map(({ filePath, data }) => summarizeItem(data, filePath));
  const readiness = {
    generatedAt,
    generatedBy: "scripts/self-media-dispatch-readiness.mjs",
    queueDir: args.queueDir,
    items,
  };

  if (args.write) {
    const outDir = path.resolve(repoRoot, args.queueDir);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(
      path.join(outDir, "dispatch-readiness.json"),
      `${JSON.stringify(readiness, null, 2)}\n`,
      "utf8"
    );
    fs.writeFileSync(path.join(outDir, "dispatch-readiness.md"), renderReport({ generatedAt, items }), "utf8");
    fs.writeFileSync(path.join(outDir, "dispatch-ledger.md"), renderLedger({ generatedAt, items }), "utf8");
  }

  console.log(
    JSON.stringify(
      {
        status: "readiness_generated",
        wroteFiles: args.write,
        queueDir: args.queueDir,
        itemCount: items.length,
        readyCount: items.filter((item) => item.canDispatch).length,
        blockedCount: items.filter((item) => !item.canDispatch).length,
        reports: args.write
          ? [
              `${args.queueDir}/dispatch-readiness.json`,
              `${args.queueDir}/dispatch-readiness.md`,
              `${args.queueDir}/dispatch-ledger.md`,
            ]
          : [],
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
