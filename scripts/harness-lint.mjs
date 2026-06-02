import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];
const layers = ["types", "config", "repo", "providers", "service", "runtime", "ui"];
const requiredFiles = [
  "docs/ui-harness/ARCHITECTURE.md",
  "docs/ui-harness/PAGE_BOUNDARIES.md",
  "docs/ui-harness/VISUAL_PRINCIPLES.md",
  "docs/ui-harness/QA_RUBRIC.md",
  "docs/ui-harness/REFERENCE_MANIFEST.md"
];
const allowedDirect = {
  types: ["types"],
  config: ["types", "config"],
  repo: ["types", "config", "repo"],
  providers: ["types", "config", "providers"],
  service: ["types", "config", "repo", "providers", "service"],
  runtime: ["types", "config", "service", "runtime"],
  ui: ["types", "runtime", "ui"]
};

function read(file) { return readFileSync(path.join(root, file), "utf8"); }
function listFiles(dir) {
  const absolute = path.join(root, dir);
  if (!existsSync(absolute)) return [];
  return readdirSync(absolute).flatMap((name) => {
    const full = path.join(absolute, name);
    const relative = path.relative(root, full).replaceAll("\\", "/");
    return statSync(full).isDirectory() ? listFiles(relative) : [relative];
  });
}
function importsOf(file) {
  const content = read(file);
  return [...content.matchAll(/import\s+(?:type\s+)?[\s\S]*?\s+from\s+["']([^"']+)["']/g), ...content.matchAll(/export\s+[\s\S]*?\s+from\s+["']([^"']+)["']/g)].map((match) => match[1]);
}
function layerOfFile(file) {
  const match = file.match(/^src\/domain\/([^/]+)\/([^/]+)\//);
  return match ? match[2] : undefined;
}
function resolveRelativeLayer(file, specifier) {
  if (!specifier.startsWith(".")) return undefined;
  const absolute = path.resolve(path.dirname(path.join(root, file)), specifier);
  return layerOfFile(path.relative(root, absolute).replaceAll("\\", "/"));
}
function layerOfAlias(specifier) {
  const match = specifier.match(/^@\/domain\/[^/]+\/([^/]+)/);
  return match ? match[1] : undefined;
}
function fail(message) { errors.push(message); }

for (const file of requiredFiles) {
  if (!existsSync(path.join(root, file))) fail(`Required UI Harness file is missing: ${file}`);
}

for (const file of listFiles("src/domain").filter((item) => item.endsWith(".ts") || item.endsWith(".tsx"))) {
  const sourceLayer = layerOfFile(file);
  if (!sourceLayer || !layers.includes(sourceLayer)) {
    fail(`Domain file is outside a known Harness layer: ${file}`);
    continue;
  }
  for (const specifier of importsOf(file)) {
    const targetLayer = layerOfAlias(specifier) ?? resolveRelativeLayer(file, specifier);
    if (targetLayer && !allowedDirect[sourceLayer].includes(targetLayer)) fail(`${file} imports ${specifier}; ${sourceLayer} cannot import ${targetLayer}`);
    if (["child_process", "node:child_process"].includes(specifier) && sourceLayer !== "providers") fail(`${file} imports ${specifier}; local commands must enter through Providers`);
  }
}

for (const file of listFiles("src/app").filter((item) => item.endsWith(".ts") || item.endsWith(".tsx"))) {
  for (const specifier of importsOf(file)) {
    const targetLayer = layerOfAlias(specifier);
    if (targetLayer && !["runtime", "ui"].includes(targetLayer)) fail(`${file} imports ${specifier}; App Wiring can only import Runtime or UI`);
  }
}

for (const file of listFiles("src/domain/self-media/ui").filter((item) => item.endsWith(".ts") || item.endsWith(".tsx"))) {
  const content = read(file);
  if (/src\/domain\/self-media\/ui\/(primitives|components|patterns)\//.test(file) && /\bfetch\s*\(/.test(content)) {
    fail(`${file} calls fetch; only UI screens may call API routes`);
  }
  for (const specifier of importsOf(file)) {
    const targetLayer = layerOfAlias(specifier) ?? resolveRelativeLayer(file, specifier);
    if (targetLayer && ["repo", "service", "providers", "config"].includes(targetLayer)) {
      fail(`${file} imports ${specifier}; UI cannot import ${targetLayer}`);
    }
  }
}

if (errors.length > 0) {
  console.error("harness-lint failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log("harness-lint passed");
