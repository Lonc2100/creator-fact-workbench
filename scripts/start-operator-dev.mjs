#!/usr/bin/env node
import { spawn } from "node:child_process";
import path from "node:path";

const port = process.env.OPERATOR_PORT || "3200";
const nextBin = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");

const child = spawn(process.execPath, [nextBin, "dev", "--hostname", "127.0.0.1", "--port", port], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    SELF_MEDIA_DB_PATH: process.env.SELF_MEDIA_DB_PATH || ".local/self-media.sqlite",
    SELF_MEDIA_SEED_MODE: process.env.SELF_MEDIA_SEED_MODE || "off",
    NEXT_DIST_DIR: process.env.NEXT_DIST_DIR || ".next-operator"
  },
  stdio: "inherit",
  windowsHide: false
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exitCode = code ?? 1;
});
