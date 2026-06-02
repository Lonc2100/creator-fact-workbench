# 主线框架规划

## 一句话版本

我们不是在做一个“随手拼起来的后台”，而是在做一个能长期被 AI 读懂、执行、审查、迭代的自媒体经营系统。

通俗讲，这个项目分两条线：

- 产品线：把自媒体从“发内容凭感觉”变成“采集、分析、发布、复盘、变现跟进”的闭环。
- 工程线：让 AI 每次接手时都知道项目在哪、要做什么、做到哪、怎么验收、谁来审查。

## 六层主框架

| 层级 | 采用什么 | 通俗解释 | 本项目怎么落地 |
| --- | --- | --- | --- |
| 主架构 | OpenAI Harness Engineering | 给 AI 一个长期可读、可执行、可审查的仓库骨架 | `AGENTS.md`、`ARCHITECTURE.md`、`docs/context/`、`docs/task-board.md`、`scripts/context-check.mjs` |
| 需求推进 | GitHub Spec Kit | 先写清楚 spec、plan、tasks、acceptance，再动手 | `docs/spec-governance.md` 规定所有大功能必须先对齐 |
| Agent 模式 | Anthropic Building Effective Agents | 能用工作流就别乱放权；需要时再让 Agent 自主探索 | Orchestrator 统一编排，Worker 执行，Explorer 研究，Auditor 审查 |
| Agent 运行时参考 | OpenAI Agents SDK / Google ADK | 借鉴 handoff、guardrails、tracing、eval，不急着接运行时 | 先用文档、任务板、测试模拟这些机制 |
| 外部工具协议 | MCP 思路 | 外部工具统一走 connector，不让业务层到处直连 | MediaCrawler、n8n、Metabase、Evidence 等都先通过 Providers 进入 |
| 质量体系 | Google ADK Eval + Azure AI Well-Architected | 每阶段要能评估、观测、安全、可靠、控成本 | `verify:harness`、任务验收、质量分、审计 Agent |

## 项目主链路

```text
信息采集 -> 内部存储 -> 分析判断 -> 选题规划 -> 内容生产 -> 发布排期 -> 数据回收 -> 周/月复盘 -> 变现跟进
```

这条链路是主线。任何功能如果不能放进这条链路，就先不要做。

## 当前阶段

当前处在“工程治理修正 + 自媒体后台骨架确认”阶段，还不是做炫酷 UI 的阶段。

完成标准：

- 目标目录唯一；
- 画布上下文隔离；
- 中文主线说明清楚；
- 每层大项有边界；
- Agent 团队分工落地；
- `npm run verify:harness` 通过。

## 参考来源

- OpenAI Harness Engineering: https://openai.com/index/harness-engineering/
- GitHub Spec Kit: https://github.github.com/spec-kit/index.html
- Anthropic Building Effective Agents: https://www.anthropic.com/research/building-effective-agents
- OpenAI Agents SDK: https://platform.openai.com/docs/guides/agents-sdk/
- Google ADK: https://adk.dev/
- MCP: https://modelcontextprotocol.io/specification/latest
- Azure AI Well-Architected: https://learn.microsoft.com/en-us/azure/well-architected/ai/design-principles
