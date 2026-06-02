import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const generatedDir = path.join(root, "docs", "generated");
const errors = [];
const warnings = [];
const checks = [];

function readJson(file) { return JSON.parse(readFileSync(path.join(root, file), "utf8")); }
function exists(file) { return existsSync(path.join(root, file)); }
function isDirectory(file) { return exists(file) && statSync(path.join(root, file)).isDirectory(); }
function listDirectories(file) { return exists(file) ? readdirSync(path.join(root, file)).filter((name) => isDirectory(path.join(file, name))) : []; }

function addCheck(name, status, detail) {
  checks.push({ name, status, detail });
  if (status === "block") errors.push(`${name}: ${detail}`);
  if (status === "warn") warnings.push(`${name}: ${detail}`);
}

const template = readJson("harness-template.json");
const pkg = readJson("package.json");
const missingFiles = (template.requiredFiles ?? []).filter((item) => !exists(item));
addCheck("Required files", missingFiles.length === 0 ? "pass" : "block", missingFiles.length === 0 ? "All required files exist." : `Missing: ${missingFiles.join(", ")}`);
const missingScripts = (template.requiredScripts ?? []).filter((item) => !pkg.scripts?.[item]);
addCheck("Required package scripts", missingScripts.length === 0 ? "pass" : "block", missingScripts.length === 0 ? "All required scripts exist." : `Missing: ${missingScripts.join(", ")}`);

const missingLayers = [];
const tools = listDirectories("src/domain");
for (const tool of tools) {
  for (const layer of template.domainLayers ?? []) {
    if (!isDirectory(path.join("src/domain", tool, layer))) missingLayers.push(`src/domain/${tool}/${layer}`);
  }
}
if (tools.length === 0) missingLayers.push("No domain tools found under src/domain");
addCheck("Domain layer structure", missingLayers.length === 0 ? "pass" : "block", missingLayers.length === 0 ? "All domain tools have the Harness layers." : `Missing: ${missingLayers.join(", ")}`);

const verdict = errors.length === 0 ? "pass" : "block";
const report = [
  "# Template Doctor Report",
  "",
  `Generated at: ${new Date().toISOString()}`,
  `Template: ${template.name} ${template.version}`,
  `Verdict: ${verdict}`,
  "",
  "## Checks",
  "",
  ...checks.map((item) => `- ${item.status.toUpperCase()} ${item.name}: ${item.detail}`),
  "",
  "## Blocking Items",
  "",
  errors.length === 0 ? "None." : errors.map((item) => `- ${item}`).join("\n"),
  "",
  "## Warnings",
  "",
  warnings.length === 0 ? "None." : warnings.map((item) => `- ${item}`).join("\n")
].join("\n");
mkdirSync(generatedDir, { recursive: true });
writeFileSync(path.join(generatedDir, "template-doctor-report.md"), report, "utf8");
console.log(report);
process.exit(verdict === "pass" ? 0 : 1);
