# 自媒体 AI 工作台 Agent 地图

本项目根目录是 `D:\codex work\自媒体创作\Data Collection and Background Analysis`。

本项目是“自媒体后台管理与复盘工作台”，not a canvas product。不要读取、迁移、引用 `D:\codex work\desk work` 的画布项目上下文。

## 安全约束

禁止使用脚本批量删除文件或目录。必须删除时，只能对明确路径逐个执行 `Remove-Item`。如果删除范围变成批量清理，先停下来让用户确认。

## 核心必读

1. Read `docs/context/index.md`.
2. Read `ARCHITECTURE.md`.
3. Read `docs/mainline-framework.md`.
4. Read `docs/task-board.md`.

## 按需深入

- 做具体功能前：读 `docs/spec-governance.md` 和对应 `docs/product-specs/`。
- 改架构或模块边界前：读 `docs/workflow-boundaries.md` 和 `docs/architecture/current-stage.md`。
- 调用外部工具前：读 `docs/workflow-boundaries.md` 的 connector 边界。
- 启动多 Agent 协作前：读 `docs/agent-team-setup.md` 和 `docs/agent-playbook.md`。
- 启动多会话并行前：读 `docs/trellis-parallel-workflow.md`，并让每个 Worker 只执行一个 `.trellis/tasks/` 任务包。
- 做审查、复盘、清理前：读 `docs/quality-execution-system.md` 和 `docs/golden-principles.md`。
- 接续阶段任务前：读 active exec plan。

## 固定代码路线

业务模块必须沿着 `Types -> Config -> Repo -> Providers -> Service -> Runtime -> UI` 单向推进。

通俗讲：

- `Types` 先定义“我们到底记录什么”；
- `Repo` 负责“信息存在哪里”；
- `Providers` 负责“外部工具怎么接进来”；
- `Service` 负责“业务规则怎么判断”；
- `Runtime` 负责“把功能变成可调用动作”；
- `UI` 负责“人怎么使用和审核”。

## Agent 工作规则

开始实现前，必须先对齐 active spec、任务板条目、验收命令、handoff 路径。需求模糊时，把模糊点写进 active exec plan，不靠聊天记忆硬猜。

Trellis 只负责多会话任务包和规范注入，不替代本项目 Harness 架构。Worker 不能越过任务 PRD 的允许文件范围；需要改核心 Types/Service/Repo/Runtime/package 时，先停下交给主会话 Orchestrator。

## 复杂度规则

默认选择能满足质量要求的最简单方案。新增抽象、依赖、Agent、后台服务、自动化流程前，必须说明它解决了什么真实复杂度，并在任务验收里证明收益。
