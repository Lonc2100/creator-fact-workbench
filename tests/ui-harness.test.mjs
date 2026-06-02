import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(file) {
  return readFileSync(path.join(root, file), "utf8");
}

function listFiles(dir) {
  const absolute = path.join(root, dir);
  if (!existsSync(absolute)) return [];
  return readdirSync(absolute).flatMap((name) => {
    const full = path.join(absolute, name);
    const relative = path.relative(root, full).replaceAll("\\", "/");
    return statSync(full).isDirectory() ? listFiles(relative) : [relative];
  });
}

test("Self-media UI Harness source documents and routes exist", () => {
  for (const file of [
    "docs/ui-harness/ARCHITECTURE.md",
    "docs/ui-harness/PAGE_BOUNDARIES.md",
    "docs/ui-harness/VISUAL_PRINCIPLES.md",
    "docs/ui-harness/QA_RUBRIC.md",
    "docs/ui-harness/REFERENCE_MANIFEST.md",
    "src/app/calendar/page.tsx",
    "src/app/content/page.tsx",
    "src/app/import/page.tsx",
    "src/app/dashboard/page.tsx",
    "src/app/reviews/page.tsx",
    "src/app/leads/page.tsx",
    "src/app/ui-lab/page.tsx"
  ]) {
    assert.equal(existsSync(path.join(root, file)), true, `${file} missing`);
  }
});

test("UI Harness uses tokens and page boundary references", () => {
  const tokens = read("src/domain/self-media/ui/foundations/tokens.css");
  const architecture = read("docs/ui-harness/ARCHITECTURE.md");
  assert.match(tokens, /--sm-bg-app/);
  assert.match(tokens, /--sm-text-primary/);
  for (const phrase of ["Mixpost", "Metabase", "Evidence", "primitives -> components -> patterns -> screens"]) {
    assert.ok(architecture.includes(phrase), `architecture missing ${phrase}`);
  }
});

test("non-screen UI layers do not fetch or import backend layers", () => {
  for (const file of listFiles("src/domain/self-media/ui").filter((item) => item.endsWith(".ts") || item.endsWith(".tsx"))) {
    const content = read(file);
    if (/src\/domain\/self-media\/ui\/(primitives|components|patterns)\//.test(file)) assert.doesNotMatch(content, /\bfetch\s*\(/, `${file} must not fetch`);
    assert.doesNotMatch(content, /from\s+["'][^"']*(repo|service|providers|config)[^"']*["']/, `${file} must not import backend layers`);
  }
});
