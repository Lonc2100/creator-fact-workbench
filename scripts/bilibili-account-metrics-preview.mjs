#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { previewBilibiliAccountMetricSnapshots } from "../src/domain/self-media/providers/bilibili-personal-provider.ts";

const DEFAULT_INPUT = path.join(process.cwd(), ".local", "bilibili-personal-v1", "mapping-preview.json");
const DEFAULT_OUT_DIR = path.join(process.cwd(), ".local", "bilibili-account-metrics-v0");

function parseArgs(argv) {
  const options = {
    input: DEFAULT_INPUT,
    outDir: DEFAULT_OUT_DIR
  };
  for (const arg of argv) {
    if (arg.startsWith("--input=")) options.input = path.resolve(process.cwd(), arg.slice("--input=".length));
    else if (arg.startsWith("--out-dir=")) options.outDir = path.resolve(process.cwd(), arg.slice("--out-dir=".length));
  }
  return options;
}

function readPreviewPayload(inputPath) {
  const preview = JSON.parse(readFileSync(inputPath, "utf8"));
  const payload = preview.payload ?? {};
  return {
    generatedAt: preview.generatedAt,
    source: payload.source,
    accountMetrics: Array.isArray(payload.accountMetrics) ? payload.accountMetrics : [],
    dateKeyRows: Array.isArray(payload.dateKeyRows) ? payload.dateKeyRows : []
  };
}

const options = parseArgs(process.argv.slice(2));
const input = readPreviewPayload(options.input);
const preview = previewBilibiliAccountMetricSnapshots({
  accountMetrics: input.accountMetrics,
  dateKeyRows: input.dateKeyRows
});

const output = {
  generatedAt: new Date().toISOString(),
  input: {
    path: path.relative(process.cwd(), options.input).replaceAll("\\", "/"),
    generatedAt: input.generatedAt,
    source: input.source
  },
  saved: false,
  previewOnly: true,
  source: preview.source,
  candidateCount: preview.candidates.length,
  rejectedCount: preview.rejected.length,
  candidates: preview.candidates,
  rejected: preview.rejected,
  diagnostics: preview.diagnostics
};

mkdirSync(options.outDir, { recursive: true });
const outPath = path.join(options.outDir, "account-preview.json");
writeFileSync(outPath, JSON.stringify(output, null, 2));

console.log(JSON.stringify({
  outPath,
  source: output.source,
  saved: output.saved,
  previewOnly: output.previewOnly,
  candidateCount: output.candidateCount,
  rejectedCount: output.rejectedCount,
  dateKeyDiagnostics: output.diagnostics.inputDateKeyRowCount
}, null, 2));
