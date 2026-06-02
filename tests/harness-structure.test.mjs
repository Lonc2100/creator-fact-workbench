import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const layers = ["types", "config", "repo", "providers", "service", "runtime", "ui"];

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

test("every domain module has every Harness layer", () => {
  const tools = readdirSync(path.join(root, "src", "domain")).filter((name) => statSync(path.join(root, "src", "domain", name)).isDirectory());
  assert.ok(tools.length >= 1, "at least one domain tool is required");
  for (const tool of tools) for (const layer of layers) assert.equal(existsSync(path.join(root, "src", "domain", tool, layer)), true, `missing ${tool}/${layer}`);
});

test("App Wiring imports only Runtime or UI", () => {
  for (const file of listFiles("src/app").filter((item) => item.endsWith(".ts") || item.endsWith(".tsx"))) {
    for (const specifier of importsOf(file)) {
      const match = specifier.match(/^@\/domain\/[^/]+\/([^/]+)/);
      if (match) assert.ok(["runtime", "ui"].includes(match[1]), `${file} imports ${specifier}`);
    }
  }
});
