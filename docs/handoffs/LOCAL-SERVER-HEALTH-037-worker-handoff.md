# LOCAL-SERVER-HEALTH-037 Worker Handoff

## Summary

新增只读本地服务健康检查命令：

```powershell
npm run check:local-server-health -- --ports=3200,3201
```

该命令检查每个端口的 TCP 监听、`/api/self-media/dashboard`、`/api/self-media/reports/trusted-weekly-safe`，只输出 trusted totals 摘要、响应耗时和 nextAction。不会打印完整 dashboard JSON，不会打印 safe weekly markdown 全文，不杀进程、不删除文件、不自动启动服务。

本机实跑结果已复现目标问题：3200 TCP listening 但 dashboard/safe API timeout；3201 healthy。报告建议使用：

```powershell
--dashboard-url=http://127.0.0.1:3201/api/self-media/dashboard
```

## Modified Files

- `package.json`
  - 新增 `check:local-server-health` script。
- `scripts/local-server-health.mjs`
  - 新增只读健康检查脚本。
  - 支持默认 `3200,3201`，以及 `--ports=3200,3201,xxxx`。
  - 输出 `.local/local-server-health/report.json` 与 `.local/local-server-health/report.md`。
  - safe API 响应执行敏感词扫描，不保存 raw payload / cookie / token / headers / private / secret / comment_content / danmu_text / contentId / safe markdown 全文。
- `tests/self-media-contract.test.ts`
  - 增加 healthy、listening timeout、not listening、safe API sensitive scan 四个回归测试。
- `docs/runbooks/self-media-daily-ops.md`
  - daily gate 前增加 local server health 检查步骤。
  - 3200 listening 但 API timeout 时引导使用健康端口或重启 dev server。
- `docs/handoffs/CURRENT-PLATFORM-STATUS.md`
  - 增加当前事实、standing command、daily runbook 衔接和 guardrail。

## Output Evidence

- `.local/local-server-health/report.json`
- `.local/local-server-health/report.md`

当前报告摘要：

- status: `pass`
- healthyPorts: `3201`
- preferredDashboardUrl: `http://127.0.0.1:3201/api/self-media/dashboard`
- 3200: TCP listening, dashboard API timeout, safe weekly API timeout
- 3201: dashboard API pass, safe weekly API pass
- trusted totals: content `19`, snapshots `19`, views `344412`, engagement `4259`

## Validation

- `npm run check:local-server-health -- --ports=3200,3201` PASS
  - 写入 `.local/local-server-health/report.json` / `report.md`
  - 当前 3200 listening but API timeout；3201 healthy
- `npm run test:self-media` PASS
  - 111 tests pass
- `npm run typecheck` PASS
- `npm run verify:harness` PASS
- `git diff --check` PASS

## Boundaries

- 未删除任何 DB。
- 未删除任何文件。
- 未杀进程。
- 未自动启动服务。
- 未改采集器。
- 未改公众号。
- 未保存 B站账号级指标。
- 未输出完整 dashboard JSON 或 safe weekly markdown 全文。

## External Reference Checked

- Node.js TCP client API: https://nodejs.org/api/net.html
- Node.js `AbortSignal.timeout`: https://nodejs.org/api/globals.html#abortsignaltimeoutdelay

## Needs Main Session Judgment

是。
