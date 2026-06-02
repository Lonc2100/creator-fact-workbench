import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

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
