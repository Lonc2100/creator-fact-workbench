import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];
const required = [
  "docs/context/index.md",
  "docs/context/current-state.md",
  "docs/context/engineering-principles.md",
  "docs/context/user-preferences.md",
  "docs/context/external-knowledge.md",
  "docs/context/decisions.md",
  "docs/context/llms.txt",
  "docs/mainline-framework.md",
  "docs/workflow-boundaries.md",
  "docs/agent-team-setup.md",
  "docs/quality-execution-system.md",
  "docs/golden-principles.md",
  "docs/references/vendor/REFERENCE_MANIFEST.md",
  "docs/architecture/current-stage.md",
  "docs/spec-governance.md",
  "docs/task-board.md",
  "docs/cleanup-manifest.md",
  "docs/exec-plans/active/engineering-governance-correction.md"
];
function read(file) { return readFileSync(path.join(root, file), "utf8"); }
for (const file of required) if (!existsSync(path.join(root, file))) errors.push(`Missing context file: ${file}`);
if (!read("AGENTS.md").includes("docs/context/index.md")) errors.push("AGENTS.md must point to docs/context/index.md");
if (!read("AGENTS.md").includes("Data Collection and Background Analysis")) errors.push("AGENTS.md must define the active project root");
if (!read("AGENTS.md").includes("not a canvas product")) errors.push("AGENTS.md must exclude canvas context");
if (!read("AGENTS.md").includes("## 核心必读")) errors.push("AGENTS.md must keep a short core read section");
if (!read("AGENTS.md").includes("## 按需深入")) errors.push("AGENTS.md must use progressive disclosure for deeper docs");
const principles = read("docs/context/engineering-principles.md");
for (const token of ["Simple First, Agent Last", "UI -> Runtime -> Service -> Provider -> external tool", "Read Before You Write", "Fail Loud"]) {
  if (!principles.includes(token)) errors.push(`engineering-principles.md must include: ${token}`);
}
if (!read("docs/agent-playbook.md").includes("Agent Boundary")) errors.push("agent-playbook.md must define the agent boundary");
for (const [file, tokens] of [
  ["docs/mainline-framework.md", ["OpenAI Harness Engineering", "GitHub Spec Kit", "MCP", "Google ADK Eval", "Azure AI Well-Architected"]],
  ["docs/workflow-boundaries.md", ["Postiz", "Mixpost", "MediaCrawler", "ALwrity", "Metabase", "Evidence"]],
  ["docs/agent-team-setup.md", ["Orchestrator", "Worker", "Explorer", "Auditor", "handoff"]],
  ["docs/quality-execution-system.md", ["可观测", "Chrome DevTools", "日志", "指标", "trace", "Auditor"]],
  ["docs/golden-principles.md", ["AGENTS 是地图", "当前契约优先", "小步收敛", "抽象必须还债", "Slim Refactor"]],
  ["docs/references/vendor/REFERENCE_MANIFEST.md", ["Postiz", "Mixpost", "MediaCrawler", "ALwrity", "Metabase", "Evidence", "Local Reading Rule"]],
  ["docs/architecture/current-stage.md", ["self-media", "No canvas", "Phase Gate"]],
  ["docs/spec-governance.md", ["spec -> plan -> tasks -> acceptance", "OpenSpec", "Spec Kit"]],
  ["docs/task-board.md", ["GOV-001", "CORE-001", "REVIEW-001"]],
  ["docs/cleanup-manifest.md", ["Do not batch delete", "Parent Directory Candidates"]],
  ["docs/agent-playbook.md", ["Orchestrator", "Worker", "Explorer", "Auditor", "Task Lifecycle"]]
]) {
  const content = read(file);
  for (const token of tokens) if (!content.includes(token)) errors.push(`${file} must include: ${token}`);
}
if (errors.length > 0) {
  console.error("context-check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log("context-check passed");
