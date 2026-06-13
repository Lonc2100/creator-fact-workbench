#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const statePath = path.join(repoRoot, "docs/night-ops/state.json");

function usage() {
  return [
    "Usage:",
    "  node scripts/night-ops-orchestrator.mjs status",
    "  node scripts/night-ops-orchestrator.mjs advance",
    "  node scripts/night-ops-orchestrator.mjs prompt [taskId]",
    "  node scripts/night-ops-orchestrator.mjs complete <taskId> [commit]",
    "  node scripts/night-ops-orchestrator.mjs block <reason>",
    "",
    "This script only manages NightOps state files. It does not create threads, run heavy gates, save platform data, delete files, commit, or push.",
  ].join("\n");
}

function now() {
  return new Date().toISOString();
}

function readState() {
  return JSON.parse(fs.readFileSync(statePath, "utf8"));
}

function writeState(state) {
  state.updatedAt = now();
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function rel(value) {
  return path.relative(repoRoot, value).replaceAll(path.sep, "/");
}

function appendEvent(state, type, message, extra = {}) {
  state.events.push({ at: now(), type, message, ...extra });
}

function gitStatusShort() {
  try {
    return execFileSync("git", ["status", "--short"], { cwd: repoRoot, encoding: "utf8" })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch (error) {
    return [`git_status_failed:${error instanceof Error ? error.message : "unknown"}`];
  }
}

function currentTask(state) {
  return state.queue.find((task) => task.taskId === state.activeTaskId) ?? null;
}

function nextPendingTask(state) {
  return state.queue.find((task) => task.status === "pending") ?? null;
}

function taskById(state, taskId) {
  return state.queue.find((task) => task.taskId === taskId) ?? null;
}

function taskPrdPath(task) {
  return path.join(repoRoot, task.trellisTaskPath, "prd.md");
}

function promptForTask(task, state) {
  const prd = fs.existsSync(taskPrdPath(task)) ? fs.readFileSync(taskPrdPath(task), "utf8").trim() : "(missing PRD)";
  return [
    `create_goal: ${task.taskId}`,
    "",
    "你是 Self-media AI Workbench 的 NightOps Worker。",
    "工作目录只能是：",
    "D:\\codex work\\自媒体创作\\Data Collection and Background Analysis",
    "",
    `Active task: ${task.trellisTaskPath}`,
    "",
    "请先阅读：",
    "- AGENTS.md",
    "- docs/night-ops/state.json",
    "- docs/night-ops/state-machine.md",
    `- ${task.trellisTaskPath}/prd.md`,
    "- docs/handoffs/CURRENT-PLATFORM-STATUS.md",
    "- docs/trellis-parallel-workflow.md",
    "",
    "任务通俗说明：",
    task.summary,
    "",
    "PRD:",
    prd,
    "",
    "NightOps 安全红线：",
    ...state.stopGates.map((gate) => `- ${gate}`),
    "",
    "完成后：",
    `- 写 handoff 到 ${task.handoffPath}`,
    "- 只 stage 本任务允许范围内的文件，禁止 git add .",
    "- 需要登录、扫码、真实平台保存、删除文件、敏感材料或 PRD 改边界时立刻停止。",
  ].join("\n");
}

function commandStatus() {
  const state = readState();
  const active = currentTask(state);
  const pending = state.queue.filter((task) => task.status === "pending").length;
  const completed = state.queue.filter((task) => task.status === "done").length;
  const status = {
    phase: state.phase,
    activeTaskId: state.activeTaskId,
    activeTaskSummary: active?.summary ?? null,
    pending,
    completed,
    blockers: state.blockers,
    gitStatus: gitStatusShort(),
  };
  console.log(JSON.stringify(status, null, 2));
}

function commandAdvance() {
  const state = readState();
  if (state.phase === "blocked") {
    console.log(JSON.stringify({ status: "blocked", blockers: state.blockers }, null, 2));
    return;
  }

  const active = currentTask(state);
  if (active) {
    if (state.phase === "dispatch_worker") state.phase = "monitor";
    appendEvent(state, "advance_noop", `Active task remains ${active.taskId}.`, { taskId: active.taskId });
    writeState(state);
    console.log(JSON.stringify({ status: "active", phase: state.phase, taskId: active.taskId, handoffPath: active.handoffPath }, null, 2));
    return;
  }

  const next = nextPendingTask(state);
  if (!next) {
    state.phase = "closure";
    appendEvent(state, "closure_ready", "No pending NightOps tasks remain.");
    writeState(state);
    console.log(JSON.stringify({ status: "closure_ready", phase: state.phase }, null, 2));
    return;
  }

  next.status = "active";
  next.startedAt = now();
  state.activeTaskId = next.taskId;
  state.phase = "dispatch_worker";
  appendEvent(state, "task_selected", `Selected ${next.taskId}.`, { taskId: next.taskId, trellisTaskPath: next.trellisTaskPath });
  writeState(state);
  console.log(JSON.stringify({ status: "selected", phase: state.phase, taskId: next.taskId, prompt: promptForTask(next, state) }, null, 2));
}

function commandPrompt(taskId) {
  const state = readState();
  const task = taskId ? taskById(state, taskId) : currentTask(state) ?? nextPendingTask(state);
  if (!task) {
    console.log("No active or pending NightOps task.");
    return;
  }
  console.log(promptForTask(task, state));
}

function commandComplete(taskId, commit) {
  if (!taskId) throw new Error("complete requires <taskId>.");
  const state = readState();
  const task = taskById(state, taskId);
  if (!task) throw new Error(`Unknown taskId: ${taskId}`);
  task.status = "done";
  task.completedAt = now();
  if (commit) task.commit = commit;
  if (state.activeTaskId === taskId) {
    state.activeTaskId = null;
    state.activeWorkerThreadId = null;
  }
  if (!state.completedTasks.includes(taskId)) state.completedTasks.push(taskId);
  state.phase = "next_task";
  appendEvent(state, "task_completed", `Completed ${taskId}.`, { taskId, commit: commit ?? null });
  writeState(state);
  console.log(JSON.stringify({ status: "completed", taskId, nextPhase: state.phase }, null, 2));
}

function commandBlock(reason) {
  if (!reason) throw new Error("block requires a reason.");
  const state = readState();
  state.phase = "blocked";
  const blocker = { at: now(), reason, activeTaskId: state.activeTaskId };
  state.blockers.push(blocker);
  appendEvent(state, "blocked", reason, { activeTaskId: state.activeTaskId });
  writeState(state);
  console.log(JSON.stringify({ status: "blocked", blocker }, null, 2));
}

function main() {
  const [command, ...rest] = process.argv.slice(2);
  if (!command || command === "--help" || command === "-h") {
    console.log(usage());
    return;
  }
  if (command === "status") return commandStatus();
  if (command === "advance") return commandAdvance();
  if (command === "prompt") return commandPrompt(rest[0]);
  if (command === "complete") return commandComplete(rest[0], rest[1]);
  if (command === "block") return commandBlock(rest.join(" "));
  throw new Error(`Unknown command: ${command}`);
}

main();
