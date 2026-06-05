#!/usr/bin/env node
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { BilibiliPersonalProvider } from "../src/domain/self-media/providers/bilibili-personal-provider.ts";
import { importBilibiliPersonalCaptures } from "../src/domain/self-media/runtime/self-media-runtime.ts";

const DEFAULT_RAW_DIR = path.join(process.cwd(), ".local", "bilibili-personal-v0", "raw");
const DEFAULT_OUT_DIR = path.join(process.cwd(), ".local", "bilibili-personal-v1");

function parseArgs(argv) {
  const options = {
    rawDir: DEFAULT_RAW_DIR,
    outDir: DEFAULT_OUT_DIR,
    save: false
  };
  for (const arg of argv) {
    if (arg.startsWith("--raw-dir=")) options.rawDir = path.resolve(process.cwd(), arg.slice("--raw-dir=".length));
    else if (arg.startsWith("--out-dir=")) options.outDir = path.resolve(process.cwd(), arg.slice("--out-dir=".length));
    else if (arg === "--save") options.save = true;
  }
  return options;
}

function loadCaptures(rawDir) {
  return readdirSync(rawDir)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => {
      const capture = JSON.parse(readFileSync(path.join(rawDir, file), "utf8"));
      return { ...capture, file: capture.file ?? `raw/${file}` };
    });
}

function platformVersionIdFor(contentId) {
  return `platform-version-${contentId}`;
}

function summarizePayload(payload) {
  return {
    source: payload.source,
    contentCount: payload.contents.length,
    metricCount: payload.metrics.length,
    contents: payload.contents.map((item) => ({
      id: item.id,
      platformVersionId: platformVersionIdFor(item.id),
      title: item.title,
      platform: item.platform,
      format: item.format,
      publishedAt: item.publishedAt,
      notes: item.notes
    })),
    metrics: payload.metrics.map((item) => ({
      id: item.id,
      contentId: item.contentId,
      platformVersionId: platformVersionIdFor(item.contentId),
      platform: item.platform,
      capturedAt: item.capturedAt,
      views: item.views,
      likes: item.likes,
      comments: item.comments,
      saves: item.saves,
      shares: item.shares,
      followersDelta: item.followersDelta
    })),
    accountMetrics: payload.accountMetrics ?? [],
    dateKeyRows: payload.dateKeyRows ?? [],
    warnings: payload.warnings ?? []
  };
}

const options = parseArgs(process.argv.slice(2));
mkdirSync(options.outDir, { recursive: true });

const captures = loadCaptures(options.rawDir);
const payload = new BilibiliPersonalProvider().fromCaptures(captures);
const importResult = options.save ? await importBilibiliPersonalCaptures(captures) : undefined;
const preview = {
  generatedAt: new Date().toISOString(),
  rawDir: options.rawDir,
  saved: options.save,
  previewOnly: !options.save,
  payload: summarizePayload(payload),
  importResult
};
const outPath = path.join(options.outDir, "mapping-preview.json");
writeFileSync(outPath, JSON.stringify(preview, null, 2));
console.log(JSON.stringify({ outPath, source: payload.source, contentCount: payload.contents.length, metricCount: payload.metrics.length, saved: options.save, previewOnly: !options.save, warnings: payload.warnings ?? [] }, null, 2));
