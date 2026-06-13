import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();

test("legacy data-collection scaffold is removed from active code paths", () => {
  const legacyPaths = [
    "src/domain/data-collection",
    "src/app/data-collection",
    "src/app/api/data-collection",
    "docs/product-specs/data-collection.md",
    "docs/exec-plans/active/data-collection-bootstrap.md"
  ];
  for (const item of legacyPaths) {
    assert.equal(existsSync(path.join(root, item)), false, `${item} should stay removed`);
  }
});

test("active product metadata points to self-media", () => {
  const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
  const template = JSON.parse(readFileSync(path.join(root, "harness-template.json"), "utf8"));
  assert.equal(pkg.name, "self-media-ai-workbench");
  assert.deepEqual(template.sampleTools, ["self-media"]);
  assert.equal(existsSync(path.join(root, "src/domain/self-media")), true);
});

test("entropy scanner is read-only and reports governance categories", () => {
  const result = spawnSync(process.execPath, ["scripts/entropy-governance-scan.mjs"], {
    cwd: root,
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const summary = JSON.parse(result.stdout);
  assert.equal(summary.status, "ok");
  assert.equal(typeof summary.dirtyBaseline.status, "string");
  assert.equal(typeof summary.staleDocs.driftCandidateCount, "number");
  assert.equal(typeof summary.entrypoints.candidateUnusedEntrypointCount, "number");
  assert.equal(typeof summary.codeDuplicates.duplicateBlockCount, "number");

  const report = JSON.parse(readFileSync(path.join(root, ".local/entropy-governance-scan/report.json"), "utf8"));
  assert.deepEqual(report.safety, {
    destructiveActions: false,
    fileDeletes: false,
    databaseWrites: false,
    reportOnly: true
  });
  assert.equal(Array.isArray(report.dirtyBaseline.unexpectedDirty), true);
  assert.equal(Array.isArray(report.staleDocs.driftCandidates), true);
  assert.equal(Array.isArray(report.entrypoints.candidateUnusedEntrypoints), true);
  assert.equal(Array.isArray(report.codeDuplicates.duplicateBlocks), true);

  const deleteCandidates = report.classification.deleteRequiresUserConfirmation.join("\n");
  assert.doesNotMatch(deleteCandidates, /\.local\/browser-profiles(?:\/|\n|$)/);

  if (existsSync(path.join(root, ".local/browser-profiles"))) {
    const sensitiveCandidates = report.classification.sensitiveOrLocalOnlyDoNotMoveWithoutDecision.join("\n");
    assert.match(sensitiveCandidates, /\.local\/browser-profiles(?:\/|\n|$)/);
  }
});

test("entropy scanner does not contain destructive cleanup operations", () => {
  const scanner = readFileSync(path.join(root, "scripts/entropy-governance-scan.mjs"), "utf8");
  assert.match(scanner, /new DatabaseSync\(dbPath, \{ readOnly: true \}\)/);
  assert.doesNotMatch(scanner, /\b(rmSync|unlinkSync|rmdirSync|git clean|Remove-Item|DELETE FROM|UPDATE entities|INSERT INTO)\b/i);
});
