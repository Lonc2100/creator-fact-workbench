import { SqliteSelfMediaRepo } from "../repo";
import type { LogLevel, WorkbenchErrorKind, WorkbenchLog } from "../types";

export function createTraceId(scope: string) {
  return `${scope}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export function createWorkbenchError(kind: WorkbenchErrorKind, message: string, traceId: string, cause?: unknown) {
  return {
    kind,
    message,
    traceId,
    cause: cause instanceof Error ? cause.message : typeof cause === "string" ? cause : undefined
  };
}

export function writeLog(repo: SqliteSelfMediaRepo, input: Omit<WorkbenchLog, "id" | "createdAt"> & { id?: string; createdAt?: string }) {
  const log: WorkbenchLog = {
    id: input.id ?? `log-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    level: input.level,
    event: input.event,
    scope: input.scope,
    message: input.message,
    traceId: input.traceId,
    data: input.data,
    createdAt: input.createdAt ?? new Date().toISOString()
  };
  repo.appendLog(log);
  return log;
}

export function levelForError(kind: WorkbenchErrorKind): LogLevel {
  return kind === "validation" ? "warn" : "error";
}
