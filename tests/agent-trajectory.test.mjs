import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

test("current phase has task board rows, specs, handoffs, and auditor evidence", () => {
  const taskBoard = read("docs/task-board.md");
  for (const id of ["CONNECTOR-001", "PUBLISH-001", "O2-SMOKE", "AGENT-TRAJECTORY-AUDIT", "PREVIEW-001", "IDEA-001", "CONTENT-001", "PUBLISH-002", "REVIEW-003", "LEAD-001", "V15-MODEL-001", "V15-API-001", "V15-O2-001"]) {
    assert.ok(taskBoard.includes(`| ${id} |`), `${id} is missing from task board`);
    assert.match(taskBoard, new RegExp(`${id}.*Done`), `${id} is not marked Done`);
  }
  for (const file of [
    "docs/product-specs/connector-001.md",
    "docs/product-specs/publish-001.md",
    "docs/product-specs/o2-smoke.md",
    "docs/product-specs/agent-trajectory-audit.md",
    "docs/product-specs/preview-001.md",
    "docs/product-specs/idea-001.md",
    "docs/product-specs/content-001.md",
    "docs/product-specs/review-003.md",
    "docs/product-specs/lead-001.md",
    "docs/product-specs/v1.5-publish-data-loop.md",
    "docs/handoffs/CONNECTOR-001-explorer-notes.md",
    "docs/handoffs/CONNECTOR-001-worker-handoff.md",
    "docs/handoffs/AUD-002-connector-publish-o2-report.md",
    "docs/handoffs/V1-SPRINT-A-D-worker-handoff.md",
    "docs/handoffs/AUD-003-v1-mainline-report.md",
    "docs/handoffs/V1.5-explorer-notes.md",
    "docs/handoffs/V1.5-worker-handoff.md",
    "docs/handoffs/AUD-004-v1.5-backend-report.md"
  ]) {
    assert.ok(existsSync(file), `${file} missing`);
  }
});

test("auditor handoff records verification commands and boundary checks", () => {
  const report = read("docs/handoffs/AUD-002-connector-publish-o2-report.md");
  for (const phrase of ["Providers", "Runtime/Service", "illegal transitions", "npm run verify:harness", "npm run test:smoke"]) {
    assert.ok(report.includes(phrase), `auditor report missing ${phrase}`);
  }
});
