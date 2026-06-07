# BROWSER-AUTO-001 浏览器自动化稳定性诊断

## 目标

把浏览器自动化从“临时能不能点开”变成可重复诊断的本地能力。当前阶段不修复 Codex 全局插件配置，只在仓库内建立检测脚本和故障证据。

## 范围

- 检查 `agent-browser` CLI 是否可用。
- 检查技能文档声明的 `agent-browser skills get core` 是否匹配当前 CLI。
- 启动本地 fixture 页面，验证打开页面、snapshot、点击、eval、截图、console 读取。
- 把报告写入 `.local/browser-automation-report.json`，截图写入 `.local/browser-automation-fixture.png`。

## 非范围

- 不修改 Codex 全局配置。
- 不强制重装 Chrome 插件或 native host。
- 不自动登录抖音、小红书、B站、视频号后台。

## 验收

- `npm run check:browser` 能输出结构化报告。
- 报告能明确区分：CLI 可用、技能命令是否可用、本地页面操作是否可用。
- 失败时进程返回非零码，方便后续自动化任务在入口处阻断。
