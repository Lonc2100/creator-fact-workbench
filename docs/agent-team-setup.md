# 团队 Agent 设置

## 核心原则

主会话是 Orchestrator，只保留主线判断和阶段状态。具体执行、研究、审计可以拆给临时 Agent，执行完写 handoff，然后上下文可以丢弃。

这样做是为了避免上下文越滚越大，后面忘记主线、混进旧项目、或者一直停留在中等阶段。

## 四个角色

| 角色 | 做什么 | 不做什么 | 输出物 |
| --- | --- | --- | --- |
| Orchestrator | 定方向、拆任务、维护任务板、决定阶段推进 | 不沉迷执行细节 | `docs/task-board.md`、active exec plan |
| Worker | 按任务包实现代码、文档、测试 | 不擅自改架构方向 | 修改文件、验证命令、handoff |
| Explorer | 查资料、读优秀项目、总结可借鉴能力 | 不直接改主代码 | `docs/context/` 研究记录 |
| Auditor | 独立审查边界、测试、风险、证据 | 不直接写业务实现 | 审计 handoff 和整改建议 |

## 标准流程

```text
Orchestrator 对齐任务
-> Worker 执行
-> Explorer 在卡点或复杂资料时介入
-> Worker 写 handoff
-> Auditor 审查
-> Orchestrator 决定 Done / 返工 / Blocked
```

## 任务包必须包含

- 任务 ID；
- 目标；
- 范围和不做什么；
- 必读文件；
- 可修改文件；
- 验收命令；
- handoff 路径；
- 是否允许查外部资料。

## handoff 必须包含

- task ID；
- 完成内容；
- 修改文件；
- 验证命令和结果；
- 已知问题；
- 下一步建议；
- 是否需要 Orchestrator 决策。

## 当前落实状态

已落实：

- `AGENTS.md` 指定主会话读序和项目边界。
- `docs/task-board.md` 存任务状态。
- `docs/agent-playbook.md` 定义角色与 handoff。
- `docs/spec-governance.md` 规定 spec -> plan -> tasks -> acceptance。
- `scripts/context-check.mjs` 会检查关键治理文件。
- `docs/handoffs/` 用来保存阶段交接。

还未落实：

- 真正启动独立 Worker / Explorer / Auditor 子会话。
- 还没有 agent trajectory 测试。
- 还没有每个子 Agent 的真实 handoff 样本。

下一步建议：

- 创建 `docs/handoffs/`。
- Phase 1 开始时，由 Orchestrator 先写 `CORE-001` 任务包。
- Worker 实现 self-media core model。
- Auditor 做第一次独立审计。
