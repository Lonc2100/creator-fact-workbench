# DAILY-IMPORT-OPERATING-GATE-031 Worker Handoff

## Scope

新增日常平台运营 gate，把“健康检查 -> 四平台保存/操作 smoke -> trusted dashboard audit -> 总报告”收敛成单一命令。未采集平台数据，未删除数据库，未迁移或清理本地数据。

## Command

```bash
npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard
```

也支持 dashboard JSON 输入：

```bash
npm run gate:daily-platform-ops -- --dashboard-json=.local/some-dashboard.json
```

如果没有 `--dashboard-url` 或 `--dashboard-json`，gate 会先运行 `npm run smoke:platform-ops-with-health`，然后运行 trusted dashboard audit 并给出清晰失败原因：需要提供 dashboard URL 或 dashboard JSON 才能完成 API/UI 对账。

## Changes

- 新增 `scripts/daily-platform-ops-gate.mjs`：
  - 第一步固定运行 `npm run smoke:platform-ops-with-health`。
  - health gate 失败时阻断 trusted audit。
  - health gate 通过后运行 `npm run audit:trusted-dashboard -- --out-dir=.local/daily-platform-ops/trusted-dashboard-audit ...`。
  - 汇总子报告到：
    - `.local/daily-platform-ops/report.json`
    - `.local/daily-platform-ops/report.md`
- 新增 npm script：
  - `gate:daily-platform-ops`
- 报告安全边界：
  - 只记录命令、exit code、状态、汇总数字、mismatch 名称和阻断原因。
  - stdout/stderr 会截断并对 cookie/token/authorization/headers/raw payload 等敏感词脱敏。
  - 不写 raw payload、标题隐私、cookie、token、headers。

## Tests

新增 self-media contract 覆盖：

- health gate fail 时阻断 trusted audit。
- trusted dashboard audit mismatch 时 daily gate fail。
- health gate 与 trusted audit 都通过时 daily gate pass。

## Run Notes

- 这个命令不会启动 dev server。
- 如果使用 `--dashboard-url`，调用方需要先确保本地服务已运行，例如 `http://127.0.0.1:3200/api/self-media/dashboard` 可访问。
- 不继续公众号/微信后台。
- 不保存 B 站账号级指标。

## Validation

- `npm run test:self-media`：通过，85/85。
- `npm run typecheck`：通过。
- `npm run gate:daily-platform-ops`：已运行；health gate 通过，trusted dashboard audit 因未提供 `--dashboard-url`/`--dashboard-json` 失败，报告清晰提示需要 dashboard 输入。
- `git diff --check`：通过。

本次新增命令报告摘要：

- status: `fail`
- blocked: `false`
- step 1 `npm run smoke:platform-ops-with-health`: pass
- step 2 `npm run audit:trusted-dashboard -- --out-dir=.local/daily-platform-ops/trusted-dashboard-audit`: fail
- blocking reason: `trusted dashboard audit requires --dashboard-url=<url> or --dashboard-json=<path>; no service URL/input was provided`
- report: `.local/daily-platform-ops/report.json` / `.local/daily-platform-ops/report.md`

## Main Session Decision Needed

是。需要主会话判断是否把该 gate 升级为默认每日运营命令，以及是否要求运营前自动检查/启动 dashboard 服务。
