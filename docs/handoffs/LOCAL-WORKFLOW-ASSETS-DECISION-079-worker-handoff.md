# LOCAL-WORKFLOW-ASSETS-DECISION-079 worker handoff

## 任务结论

本轮将 `.agents/`、`.codex/`、`.trellis/` 判定为默认本地工作流资产，不作为产品代码或项目必需资产提交。已在仓库根 `.gitignore` 精确补充三条顶层目录规则，避免后续继续污染工作区：

- `.agents/`
- `.codex/`
- `.trellis/`

没有删除、移动、重写这三个目录中的任何文件；没有提交敏感配置。

## 必读上下文

- `AGENTS.md`：当前仓库是自媒体平台工作区，安全约束要求禁止脚本批量删除文件或目录；本任务未执行删除。
- `docs/handoffs/LOCAL-WORKFLOW-ASSETS-POLICY-048-auditor-handoff.md`：048 已提示 `.agents/.codex/.trellis` 需治理；`.codex` hooks/config 有安全风险，`.trellis` 中 spec/workflow/task 可能有项目价值但必须经显式提升。
- `docs/handoffs/ENTROPY-GOVERNANCE-SCAN-073-worker-handoff.md` 与 `.local/entropy-governance-scan/report.json`：073 扫描确认这三个目录是未跟踪本地工作流熵源，需要归类和隔离。

## 文件树摘要

| 路径 | 文件数 | 目录数 | 约大小 | 顶层内容 |
| --- | ---: | ---: | ---: | --- |
| `.agents/` | 35 | 16 | 130.08 KiB | `skills/` |
| `.codex/` | 7 | 3 | 47.63 KiB | `agents/`, `hooks/`, `skills/`, `config.toml`, `hooks.json` |
| `.trellis/` | 81 | 17 | 512.40 KiB | `.runtime/`, `scripts/`, `spec/`, `tasks/`, `workspace/`, `.developer`, `.gitignore`, `.template-hashes.json`, `.version`, `config.yaml`, `workflow.md` |

扩展名分布：`.md` 54、`.py` 30、`.pyc` 19、`.jsonl` 6、`.json` 6、`.toml` 4、`.yaml` 1、`.version` 1、`.developer` 1、目录 36。

## 分类决策

| 范围 | 分类 | 是否项目必需 | 是否应忽略 | 敏感风险 | 处理 |
| --- | --- | --- | --- | --- | --- |
| `.agents/skills/**` | `local-personal`, `generated`, `should-ignore` | 否 | 是 | 中：会改变本地 agent 行为 | 保留在本机，不提交；若有项目规则，改写到 `AGENTS.md` 或 `docs/` 后再审查 |
| `.codex/config.toml` | `local-personal`, `sensitive-risk`, `should-ignore` | 否 | 是 | 高：可能含本机路径、工具偏好、运行策略 | 保留本机，不提交 |
| `.codex/hooks.json`, `.codex/hooks/**` | `local-personal`, `sensitive-risk`, `should-ignore` | 否 | 是 | 高：hook 是可执行自动化入口 | 保留本机，不提交；项目级 hook 需单独安全评审 |
| `.codex/agents/**`, `.codex/skills/**` | `local-personal`, `generated`, `should-ignore` | 否 | 是 | 中：本地 agent profile/技能会影响执行 | 保留本机，不提交 |
| `.trellis/.runtime/**` | `generated`, `should-ignore` | 否 | 是 | 低到中：运行缓存和状态 | 保留本机，不提交 |
| `.trellis/workspace/**` | `local-personal`, `generated`, `should-ignore` | 否 | 是 | 中：可能含本地执行日志和上下文 | 保留本机，不提交 |
| `.trellis/tasks/*/*.jsonl` | `generated`, `should-ignore` | 否 | 是 | 中：执行回放和日志 | 保留本机，不提交 |
| `.trellis/tasks/*/prd.md`, `.trellis/tasks/*/task.json` | `project-required` candidate, `local-personal`, `should-ignore` | 默认否 | 是 | 中：可能混入验收/本地流程上下文 | 当前不直接提交；如需项目化，提升到 `docs/product-specs/` 或 `docs/handoffs/` |
| `.trellis/spec/**`, `.trellis/workflow.md` | `project-required` candidate, `should-ignore` | 默认否 | 是 | 低到中 | 当前不直接提交；如需作为项目工作流，提升到普通文档路径并独立审查 |
| `.trellis/scripts/**` | `local-personal`, `generated`, `sensitive-risk`, `should-ignore` | 否 | 是 | 中：工具引擎副本，可能改变执行行为 | 保留本机，不提交；项目脚本应进入 `scripts/` 并经审查 |
| `.trellis/config.yaml`, `.developer`, `.template-hashes.json`, `.version`, `.gitignore` | `local-personal`, `generated`, `sensitive-risk`, `should-ignore` | 否 | 是 | 中：本地工具配置/版本/模板指纹 | 保留本机，不提交 |

## 准入规则

1. `.agents/`、`.codex/`、`.trellis/` 默认都是本地工作流目录，继续放在本机即可。
2. 不从这些隐藏目录直接提交项目规则、产品需求、执行脚本或 hook。
3. 若其中内容确实成为项目必需资产，必须通过后续任务显式提升到普通项目路径：
   - 项目规则：`AGENTS.md` 或 `docs/agent-playbook.md`
   - 产品/功能规格：`docs/product-specs/`
   - 交接与验收证据：`docs/handoffs/`
   - 项目脚本：`scripts/`
4. 提升时需要逐文件审查，不得批量移动，不得带入本机密钥、个人路径、hook、运行日志、`.pyc`、`.jsonl` 回放或工具缓存。

## 状态与验证

变更前 `git status -sb` 显示：

- `.agents/`
- `.codex/`
- `.trellis/`

均为未跟踪目录。`git ls-files -- .agents .codex .trellis` 未发现已跟踪文件。

本轮只计划提交：

- `.gitignore`
- `docs/handoffs/LOCAL-WORKFLOW-ASSETS-DECISION-079-worker-handoff.md`

验证命令：

- `git status -sb`：`.agents/`、`.codex/`、`.trellis/` 不再作为未跟踪目录出现在普通状态中。
- `git status --ignored -sb -- .agents .codex .trellis`：三者均显示为 ignored：`!! .agents/`、`!! .codex/`、`!! .trellis/`。
- `git diff --cached --name-only`：仅包含 `.gitignore` 与本 handoff。
- `git diff --cached --check`：通过，无输出。
- `git diff --check`：通过，无输出。

## 残留风险

- 工作区仍存在大量历史未跟踪 handoff/spec/script 文件和若干已修改文件，属于本任务之外的既有脏状态；本轮不回滚、不批量清理。
- `.trellis/spec` 与 `.trellis/workflow.md` 可能包含有价值的流程知识，但本轮选择先隔离，避免隐藏工具目录与产品代码混在一起；后续如需复用，应按准入规则提升到 `docs/`。
