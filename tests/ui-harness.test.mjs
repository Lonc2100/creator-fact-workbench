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

test("page boundaries keep calendar, import, and review workflows separated", () => {
  const calendar = read("src/domain/self-media/ui/screens/CalendarPage.tsx");
  const reviews = read("src/domain/self-media/ui/screens/ReviewsPage.tsx");
  const importPage = read("src/domain/self-media/ui/screens/ImportPage.tsx");
  assert.doesNotMatch(calendar, /Diff 预览|周复盘报告|EvidenceReviewReport|ImportDiffTable/, "calendar page must not mix import diff or review report");
  assert.doesNotMatch(reviews, /PublishCalendar|publish-calendar|Diff 预览|ImportDiffTable/, "review page must not include calendar drag area or import diff");
  assert.doesNotMatch(importPage, /PublishCalendar|EvidenceReviewReport|周复盘报告/, "import page must stay focused on import preview and runs");
});

test("interactive UI patterns expose callbacks instead of owning persistence", () => {
  const calendarPattern = read("src/domain/self-media/ui/patterns/PublishCalendar.tsx");
  const contentPattern = read("src/domain/self-media/ui/patterns/ContentManagement.tsx");
  const reviewPattern = read("src/domain/self-media/ui/patterns/EvidenceReviewReport.tsx");
  assert.match(calendarPattern, /onReschedule/);
  assert.match(contentPattern, /onSave/);
  assert.match(contentPattern, /onStatusPatch/);
  assert.match(reviewPattern, /onActionStatus/);
  for (const source of [calendarPattern, contentPattern, reviewPattern]) assert.doesNotMatch(source, /\bfetch\s*\(/);
});
