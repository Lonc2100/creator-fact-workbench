# 质量执行体系

## 目标

这个文件回答一个问题：后续怎么防止“文档很好看，执行偷工减料”。

质量体系分成五个闭环：

```text
可观测 -> 可验证 -> 可审查 -> 可清理 -> 可降复杂度
```

## 1. 可观测

参考 OpenAI Harness Engineering 的方向：应用、日志、指标、追踪记录要让 Codex 能读到，而不是只让人肉眼看。

本项目分阶段落地：

| 阶段 | 能力 | 验收 |
| --- | --- | --- |
| O0 | 本地命令输出可读 | `npm run verify:harness` 输出清晰 |
| O1 | 结构化日志 | 服务层和 provider 错误输出统一错误类型 |
| O2 | UI 可观察 | 用浏览器/Chrome DevTools 检查关键页面、截图、控制台错误 |
| O3 | 本地观测栈 | 日志、指标、trace 有本地查询入口 |
| O4 | Agent 审查可读 | Auditor 能读取日志、指标、trace、截图并给出审计结论 |

当前状态：O1。结构化日志、导入运行记录、错误分类和审计记录已落地；O2/O3 暂不一次性堆完整观测栈。

## 2. 可验证

每个大任务必须有：

- spec；
- task-board 条目；
- 验收命令；
- 测试或人工验收证据；
- handoff。

不允许只说“我觉得完成了”。

## 3. 可审查

Auditor 审查清单：

- 是否符合主链路；
- 是否符合 `Types -> Config -> Repo -> Providers -> Service -> Runtime -> UI`；
- 是否有越过 provider 直连外部工具；
- 是否有凭空分析而没有内部数据；
- 是否引入不必要复杂度；
- 是否跑了验收命令；
- 是否更新任务板和质量分。

## 4. 可清理

参考 Harness Engineering 的“entropy and garbage collection”思路：AI 项目会自然积累漂移，必须定期清理。

清理节奏：

- 每个 Phase 结束：一次小清理；
- 每周复盘：清理 stale docs、无用 TODO、重复模型、废弃路径；
- 每月复盘：更新质量分，决定是否做 strict slim refactor。

清理输出：

- 删除了什么复杂度；
- 保留了什么不变契约；
- 跑了什么验证；
- 还有什么风险。

## 5. 可降复杂度

新增能力前先问：

1. 这是真问题，还是提前想象的问题？
2. 现有层能不能解决？
3. 能否用配置、数据模型或测试解决，而不是新增框架？
4. 如果新增抽象，是否减少了真实重复？
5. 如果引入外部工具，是否统一通过 provider 接入？

## 阶段门槛

Phase 1 之前必须完成：

- self-media core model spec；
- core model contract tests；
- Auditor 第一次审查；
- O1 结构化错误与日志约定。

Phase 2 之前必须完成：

- 周/月复盘生成测试；
- UI 基础可观察检查；
- handoff 样本不少于 2 个。

Phase 3 之前必须完成：

- connector 契约测试；
- 本地观测方案设计；
- 一次 slim refactor 清理记录。
