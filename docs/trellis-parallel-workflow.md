# Trellis 多会话并行工作法

## 一句话原理

Trellis 像“任务文件夹 + 规范注入器”：主会话把任务写进 `.trellis/tasks/`，子会话只拿一个任务包做事；规范放在 `.trellis/spec/`，避免每个会话都靠聊天记忆。

## 当前已接入

- Trellis 初始化：`.trellis/`
- Codex agent/skill 文件：`.codex/`、`.agents/skills/`
- 项目规范：`.trellis/spec/frontend/`
- 并行规则：`.trellis/spec/guides/self-media-parallel-sessions.md`
- 试点任务：
  - `.trellis/tasks/06-03-review-panel-ui`
  - `.trellis/tasks/06-03-calendar-ui`
  - `.trellis/tasks/06-03-dashboard-ui`

## 什么时候适合开新会话

适合：

- 一个页面可以独立改完。
- 一个 UI pattern 可以独立优化。
- 一个平台采集器可以独立研究。
- 任务只改 1-3 个明确文件。
- 一个长闭环审计/验证任务可以独立完成：读上下文、执行、验证、诊断、保存证据、写 handoff、给下一步建议。

不适合：

- 要改核心类型、Service、Repo、Runtime。
- 要改 `package.json`。
- 要改状态机或数据模型。
- 多个页面/API 都依赖同一个新字段。
- 要同时跑多个重型浏览器/E2E/Next/DB smoke gate，且没有隔离端口、隔离 sqlite、隔离 `NEXT_DIST_DIR`。

## 长闭环 Worker 规则

长闭环 Worker 的目标是减少人工频繁介入。任务包或用户指令给出边界后，Worker 应自己完成：

1. 读取指定文档和当前状态。
2. 执行允许范围内的实现、审计或验证。
3. 按顺序运行验收命令。
4. 失败时先诊断原因，并区分代码问题、环境竞争、已知 paused scope、预期 warning。
5. 保存截图、报告路径、命令结果等必要证据。
6. 写 handoff，把风险和下一步建议说清楚。

这类任务可以是只读验收、bundle 审计、截图回归、产品复核或明确文件范围的 UI polish。它们可以长，但必须边界窄、产物清楚、验证可复现。

浏览器/E2E 串行纪律：

- `smoke:platform-operations-e2e`、`smoke:platform-ops-with-health`、`smoke:operating-*`、`smoke:draft-review-ui-e2e`、`e2e:content-curation` 默认不要并行。
- 固定 3200 operator 服务只作为明确健康的 live target 使用；临时 E2E 服务必须使用隔离端口和隔离 `NEXT_DIST_DIR`。
- 写 sqlite 的 smoke 必须使用隔离 DB；不能让并行任务共享真实 `.local/self-media.sqlite`。
- 如果一个任务已经在跑 browser/Next/DB gate，其他 Worker 应先做纯文档、静态审计、单文件读写或等待主会话安排。

## Worker 用时与补扫协议

Trellis 子会话默认要减少人工微介入。任务包应按工作量分级：

- `micro`：单文件清理、只读存在性核验、明确小范围修正。允许短于 15 分钟。
- `normal`：常规实现、审计、协议文档、bundle 归属或轻量验证。
- `long-cycle`：重型验证、跨文件归属、平台闭环、browser/E2E/Next/sqlite dry-run。

handoff 必须记录：

- Started
- Finished
- Elapsed
- Workload class
- `<15min explanation or extra-depth pass>`

如果 `normal` 或 `long-cycle` 低于 15 分钟，Worker 必须追加一次补扫，或说明继续做会越界。补扫可以是：

- 复查 `git diff` 和允许文件；
- 搜索相邻规范、handoff 或 task-board 证据；
- 补 include/exclude/unresolved 矩阵；
- 补失败诊断、风险边界或下一步建议；
- 复跑轻量验证。

不要为了“满足时间”启动重型 browser/E2E/Next/sqlite/live 3200 gate。重型 gate 默认串行，只有主会话明确安排隔离端口、隔离 sqlite、隔离 `NEXT_DIST_DIR` 时才可并行。

这套规则不是拖时间式奖惩。任务太短时，主会话应优先合并任务、加长规划、要求补 handoff 或补只读审计，而不是让 Worker 空转。

## 新会话启动模板

把下面内容复制给新会话，并替换任务路径：

```text
你是 Self-media AI Workbench 的 Worker。
工作目录只能是：
D:\codex work\自媒体创作\Data Collection and Background Analysis

Active task: .trellis/tasks/06-03-review-panel-ui

请先阅读：
AGENTS.md
.trellis/tasks/06-03-review-panel-ui/prd.md
.trellis/tasks/06-03-review-panel-ui/implement.jsonl 中列出的规范文件

只允许修改 PRD 里允许的文件。
禁止修改 PRD 里禁止的核心文件。

完成后运行验收命令，并写 handoff 到 PRD 指定路径。
```

## 极简启动模板

如果任务包和 handoff 规则已经写好，用户只需要复制这一句：

```text
请执行 TASK-ID。按 docs/handoffs/README.md 的 Short Chat Protocol 回报，详细内容写 handoff。
```

Worker 必须自己读取 `AGENTS.md`、任务包、PRD 和 `docs/handoffs/README.md`，不能要求用户重复粘贴长版规则。

Worker 完成后，聊天只回四行短状态；截图、文件清单、风险和验证细节全部写进 handoff。

## 主会话验收流程

Worker 完成后回到主会话：

1. 读 Worker handoff。
2. 看 `git diff`。
3. 检查是否越界改了核心文件。
4. 运行 `npm run verify:harness`。
5. 必要时运行 `npm run test:smoke` 或 `npm run verify:o2`。
6. 主会话决定是否合并、返工或进入下一任务。

## 三个试点任务

复盘面板：

```text
Active task: .trellis/tasks/06-03-review-panel-ui
```

发布日历：

```text
Active task: .trellis/tasks/06-03-calendar-ui
```

数据看板：

```text
Active task: .trellis/tasks/06-03-dashboard-ui
```

## 核心纪律

多会话不是“同时乱改”，而是“同时做互不重叠的小任务”。核心文件永远由主会话统一协调。
