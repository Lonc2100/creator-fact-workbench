import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const manifest = "docs/references/vendor/REFERENCE_MANIFEST.md";
const vendors = [
  "postiz",
  "mixpost",
  "mediacrawler",
  "alwrity",
  "n8n",
  "directus",
  "baserow",
  "metabase",
  "evidence",
  "openai-harness",
  "github-spec-kit",
  "anthropic-agents",
  "google-adk-eval",
  "mcp",
  "azure-ai-well-architected"
];

test("vendor references are downloaded locally and recorded in manifest", () => {
  const content = readFileSync(path.join(root, manifest), "utf8");
  for (const vendor of vendors) {
    const dir = path.join(root, "docs", "references", "vendor", vendor);
    assert.equal(existsSync(dir), true, `missing vendor directory: ${vendor}`);
    assert.match(content, new RegExp(vendor.replace("-", "[- ]")), `manifest must mention ${vendor}`);
  }
  assert.match(content, /Local Reading Rule/);
});
