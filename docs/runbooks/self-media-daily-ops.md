# Self-media Daily Ops Runbook

这份手册给日常运营使用。照着做，不需要理解代码。

## 每天先确认

- 不跑公众号：不要运行 `check:wechat`、`sync:wechat`、`discover:wechat-backend`。
- 不保存 B站账号级指标：`preview:bilibili-account-metrics` 只能看诊断，不能当保存命令。
- 不删除 DB：不要删除、清空、迁移 `.local/*.sqlite`。需要清理数据库时，先交给主会话确认备份方案。
- 日常口径只看 trusted real creator-center 内容级数据。
- B站只看 archives/work 内容级指标，不把账号总览数据加进内容总量。

## 1. 打开服务

在项目根目录运行：

```powershell
npm run dev
```

打开：

- `http://127.0.0.1:3200/dashboard`
- `http://127.0.0.1:3200/import`
- `http://127.0.0.1:3200/content/`
- `http://127.0.0.1:3200/reviews`

注意：内容页优先用 `/content/`。如果 `/content` 出现 404，直接改成 `/content/`。

## 2. 跑 daily gate

服务打开后，另开一个 PowerShell 窗口先确认哪个本地服务真正可用：

```powershell
npm run check:local-server-health
```

这个命令是默认诊断模式：只读检查本地候选端口的 TCP 监听、dashboard API、safe weekly API，并写 `.local/local-server-health/report.json` 与 `.local/local-server-health/report.md`。它不会杀进程、不会删除文件、不会自动启动服务，也不会打印完整 dashboard JSON 或 safe weekly markdown 全文。诊断模式即使没有健康端口，也会正常退出并输出报告，方便你先看发生了什么。

daily gate / audit / ops 前推荐使用严格模式：

```powershell
npm run check:local-server-health -- --strict --require-trusted-data --check-page
```

严格模式仍然只读，但如果没有 `healthyPorts` 会返回非 0；适合作为每日运营前置 gate。报告里分开看：

- `listening`：端口是否 TCP 监听。
- `dashboard API`：`/api/self-media/dashboard` 是否 ready。
- `safe weekly API`：`/api/self-media/reports/trusted-weekly-safe` 是否 ready 且通过敏感字段扫描。
- `timeout`：端口监听但 API 超时，常见于卡住的 dev server。
- `old_route`：端口监听但 API 路由 404，常见于旧构建或跑错项目。
- `trusted-data-ready`：API 背后的 DB 是否有非 0 trusted 内容和快照，避免采用空库/隔离库。
- `page-ready`：可选页面探测，确认 `/dashboard` 页面本身可打开，避免采用 API 正常但页面路由不可用的端口。
- `preferredDashboardUrl`：后续 audit / daily / ops 命令应该优先使用的 dashboard API；strict preflight 只会采用 API、safe weekly、trusted-data、page 都 ready 的端口。

如果报告里 `preferred dashboard URL` 是 3200，运行：

```powershell
npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard
```

如果报告提示 3200 正在监听但 dashboard API timeout，同时 3201 健康，就把 daily gate 的 URL 换成报告里的健康端口，例如：

```powershell
npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3201/api/self-media/dashboard
```

如果要跑完整每日运营闭环，先用 strict health 找到 `preferredDashboardUrl`，再传给 one-command：

```powershell
npm run ops:daily-self-media -- --dashboard-url=http://127.0.0.1:3201/api/self-media/dashboard
```

也可以显式让 one-command 自己先做严格健康预检；这个预检默认不启用，只有加 `--preflight-health` 才会运行：

```powershell
npm run ops:daily-self-media -- --preflight-health
```

`--preflight-health` 会先运行 `check:local-server-health --strict --require-trusted-data --check-page`，把子报告写到 `.local/daily-self-media-ops/local-server-health/report.json`，通过时自动采用报告里的 `preferredDashboardUrl`。如果没有健康端口，one-command 会只写 `.local/daily-self-media-ops/report.json` 和 `report.md` 的阻塞原因，不继续读取旧的 weekly/audit/gate 子报告。这个预检仍然只读：不杀进程、不删除文件、不启动服务。

如果需要同时开多个 Next dev server，给临时服务设置独立构建目录，避免多个进程共享 `.next` 缓存：

```powershell
$env:NEXT_DIST_DIR=".next-dev-3211"
npm run dev -- --port 3211
```

临时浏览器/E2E 验证也使用隔离 DB 和隔离 `NEXT_DIST_DIR`；不要为了释放端口自动 kill 旧进程。

通过时应该看到 gate PASS。然后到 `/import` 看“daily gate status”，到 `/dashboard` 看可信运营状态条。

这个命令会：

- 检查平台数据健康。
- 跑隔离烟测库，不写真实运营 DB。
- 跑 trusted dashboard audit。
- 写 `.local/daily-platform-ops/` 报告。

这个命令不会：

- 从浏览器采集平台数据。
- 保存公众号数据。
- 保存 B站账号级指标。
- 删除 DB。

## 3. 真实采集刷新闭环

这一节只用于你已经人工登录平台、手动完成真实采集之后的检查和保存。不让命令自动打开真实平台登录页，不读取密码、cookie、token、header，不把 raw payload 贴到文档或聊天里。

每日刷新顺序：

1. 先打开 `/dashboard`，看开场只读检查：哪些平台今天可以先看数据，哪些建议刷新，哪些必须刷新。
2. 进入 `/import`，看 `今日建议刷新`。
3. 抖音：点明确的手动按钮打开创作者中心，登录后切到作品详情/数据页，回到系统预览，确认后再保存。
4. 小红书：点明确的手动按钮打开创作服务平台，优先使用内容分析表格，预览每行笔记数据，确认后再保存。
5. B站：从创作中心导出或复制当前稿件级表格，必须带 BV/稿件 ID、标题、发布时间和内容级指标；预览通过后再确认保存。
6. 视频号：默认手动更新，准备作品级标题、发布时间、播放/曝光、点赞、评论、收藏、分享等数据，粘贴或上传后预览确认。
7. 导入保存后回到 `/dashboard` 看可信内容/指标快照变化；导入数据不应进入 `/calendar` 的未来发布主日历。

先看哪些平台真实采集已经超过 72 小时：

```powershell
npm run check:real-capture-freshness
```

它只读取本地报告和 raw 目录文件时间，输出 `.local/real-capture-freshness/report.json` 与 `.local/real-capture-freshness/report.md`。结论里要分开看：

- 最近真实采集时间：来自四个平台 raw 采集文件的本地修改时间。
- 最近 smoke 时间：来自保存烟测报告，只能证明保存链路可用，不能证明平台数据新鲜。
- 最近 audit 时间：来自 dashboard audit / daily gate 报告，只能证明当前 dashboard 口径被审计过。
- 数据超过 72 小时：以真实采集时间判断，不用 smoke 时间代替。

人工采集后，按平台先 preview，再决定是否保存：

```powershell
npm run import:douyin
npm run import:xiaohongshu
npm run import:video-account
npm run import:bilibili
```

preview 摘要确认无误后，只保存这四个平台的内容级真实数据：

```powershell
npm run import:douyin -- --save
npm run import:xiaohongshu -- --save
npm run import:video-account -- --save
npm run import:bilibili -- --save
```

保存后跑完整检查：

```powershell
npm run health:platform-data
npm run check:real-capture-freshness
npm run audit:trusted-dashboard -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard
npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard
```

刷新闭环中仍然不要运行公众号命令，不保存 B站账号级指标，不删除 DB，不展示 raw payload。

## 4. 看 dashboard

打开 `http://127.0.0.1:3200/dashboard`。

每天只看这些：

- trusted real creator-center 是否为当前默认口径。
- daily gate 是否通过。
- trusted 内容数、快照数、曝光、互动是否符合预期。
- 四个平台是否还在内容级贡献里：抖音、小红书、视频号、B站。
- B站是否仍是内容级 archives，不要把账号趋势当内容表现。

如果 dashboard 和你刚跑的 audit 数字不一致，重新跑：

```powershell
npm run audit:trusted-dashboard -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard
```

## 5. 看 import

打开 `http://127.0.0.1:3200/import`。

每天只看这些：

- daily gate status。
- daily self-media ops 里的 strict preflight 状态：disabled / pass / fail / missing。
- platform data health。
- trusted audit status。
- 最近 operation history。
- 平台 preview/save 状态。

不要从这里启动公众号相关工作。健康面板是只读状态，不代表会自动采集或自动保存。

## 6. 排除旧内容

打开：

```text
http://127.0.0.1:3200/content/
```

在“运营看板可信内容”里找到要隐藏的旧内容，点击：

```text
排除出运营看板
```

这会把内容从默认 dashboard/reviews/suggestions 口径里拿掉，但不会删除数据库里的内容、指标或快照。

排除后马上重新审计：

```powershell
npm run audit:trusted-dashboard -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard
```

然后检查：

- `/dashboard` 数字下降。
- `/reviews` 总曝光/总互动下降。
- audit 通过。
- `/content/` 里该内容显示“已排除”。

## 7. 恢复内容

打开：

```text
http://127.0.0.1:3200/content/
```

在已排除内容行点击：

```text
恢复
```

恢复后重新审计：

```powershell
npm run audit:trusted-dashboard -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard
```

然后检查：

- `/dashboard` 数字回升。
- `/reviews` 总曝光/总互动回升。
- audit 通过。
- `/content/` 里该内容重新显示“进入看板”。

## 命令安全表

| 命令 | 日常用途 | 对运营 DB 的影响 | 会写什么 | 日常结论 |
| --- | --- | --- | --- | --- |
| `npm run dev` | 打开本地服务 | 连接默认 DB；空库时可能初始化样例/基础数据 | Next 缓存、可能有日志/初始化数据 | 可用 |
| `npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard` | 每日主门禁 | 不应写真实运营 DB | gate 报告、health 报告、隔离 smoke DB | 每天跑 |
| `npm run audit:trusted-dashboard -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard` | 重新核对 dashboard/API/DB 口径 | 只读 DB | `.local/trusted-dashboard-audit/` 报告 | 安全 |
| `npm run health:platform-data` | 生成平台健康报告 | 不写运营内容数据 | `.local/platform-data-health/report.json` | 安全 |
| `npm run check:real-capture-freshness` | 查看哪些平台真实采集超过 72 小时 | 不写运营 DB，不打开浏览器 | `.local/real-capture-freshness/` 报告 | 安全 |
| `npm run check:local-server-health` | 确认本地端口是否真正可用于 dashboard/audit/daily gate | 不写运营 DB、不启动/停止服务 | `.local/local-server-health/report.json` 与 `report.md` | 安全 |
| `npm run check:local-server-health -- --strict --require-trusted-data --check-page` | 每日运营前置 gate；无健康端口、只有空/隔离 DB 端口、旧路由端口或页面不可用端口时非 0 | 不写运营 DB、不启动/停止服务 | `.local/local-server-health/report.json` 与 `report.md` | 推荐 daily/audit/ops 前先跑 |
| `npm run ops:daily-self-media -- --preflight-health` | 显式 strict health + trusted-data + page preflight + 每日 one-command | 不写运营 DB、不启动/停止服务；通过后自动采用 `preferredDashboardUrl` | `.local/daily-self-media-ops/report.*` 与 `.local/daily-self-media-ops/local-server-health/report.json` | 需要自动选健康端口时跑 |
| `npm run check:local-data-quarantine` | 查看本地数据分类 | 只读 DB | quarantine 报告 | 安全 |
| `npm run check:clean-profile` | 查看 clean profile 状态 | 只读/检查 clean profile | clean-profile 报告 | 安全 |
| `npm run e2e:content-curation` | 验证排除/恢复 UI | 不写真实运营 DB | 隔离 DB、截图、E2E 报告 | 需要验证时跑，不和其他 E2E 并行 |
| `npm run smoke:platforms-save` | 四平台保存烟测 | 不应写真实运营 DB | 隔离 smoke DB 和报告 | 回归验证用 |
| `npm run smoke:platform-operations-e2e` | `/import` E2E 烟测 | 不应写真实运营 DB | 隔离 smoke DB、截图、报告 | 回归验证用 |
| `npm run import:bilibili -- --save` | 保存 B站 archives 内容级数据 | 会写运营 DB | 内容、平台版本、内容级指标快照、import run | 只在明确要保存真实 B站内容级数据时跑 |
| `npm run import:douyin -- --save` | 保存抖音内容级数据 | 会写运营 DB | 内容、平台版本、内容级指标快照、import run | 只在明确要保存真实抖音数据时跑 |
| `npm run import:xiaohongshu -- --save` | 保存小红书内容级数据 | 会写运营 DB | 内容、平台版本、内容级指标快照、import run | 只在明确要保存真实小红书数据时跑 |
| `npm run import:video-account -- --save` | 保存视频号内容级数据 | 会写运营 DB | 内容、平台版本、内容级指标快照、import run | 只在明确要保存真实视频号数据时跑 |
| `npm run preview:bilibili-account-metrics` | 预览 B站账号级诊断 | 不应保存账号快照 | preview 报告 | 只看，不保存 |
| `npm run check:wechat` | 公众号检查 | 公众号暂停 | 检查输出 | 日常不要跑 |
| `npm run sync:wechat` | 公众号同步 | 会尝试写公众号数据 | 公众号 import/sync 记录 | 禁止日常跑 |
| `npm run discover:wechat-backend` | 公众号后台发现 | 公众号暂停 | 浏览器/发现证据 | 禁止日常跑 |

## 故障处理

### audit missing

现象：

- `/dashboard` 或 `/import` 显示 audit missing、未审计、not run。

处理：

```powershell
npm run audit:trusted-dashboard -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard
```

然后刷新 `/dashboard` 和 `/import`。

如果命令提示缺少 dashboard URL，不要省略 `--dashboard-url=...`。

### daily gate fail

现象：

- daily gate 状态为 fail。
- `/import` 显示 blocking reasons。

处理：

1. 先看 `/import` 的 daily gate status 和 platform data health。
2. 打开 `.local/daily-platform-ops/report.md`。
3. 如果是 health fail，先运行：

```powershell
npm run health:platform-data
```

4. 如果是 trusted audit mismatch，运行：

```powershell
npm run audit:trusted-dashboard -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard
```

5. 不要为了解决 gate fail 删除 DB。

### 3200 不通

现象：

- `http://127.0.0.1:3200/dashboard` 打不开。
- daily gate 报 dashboard API 连接失败。
- 3200 端口显示在监听，但 `/api/self-media/dashboard` 超时。

处理：

1. 先运行：

```powershell
npm run check:local-server-health
```

2. 如果报告显示 3200 not listening，确认 `npm run dev` 窗口还在运行。
3. 如果窗口已经停了，重新运行：

```powershell
npm run dev
```

4. 如果报告显示 3200 listening 但 dashboard API timeout，且 3201 healthy，daily gate / audit / ops 使用报告给出的健康端口：

```powershell
npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3201/api/self-media/dashboard
```

5. 如果要跑完整 daily ops：

```powershell
npm run ops:daily-self-media -- --dashboard-url=http://127.0.0.1:3201/api/self-media/dashboard
```

6. 如果想让 one-command 自动采用健康端口，可以运行：

```powershell
npm run ops:daily-self-media -- --preflight-health
```

7. 如果没有健康端口，preflight 会让 daily ops 清晰失败并写父报告阻塞原因；先不要杀进程。回到每个正在运行的 dev server 窗口，人工确认它是不是本项目、是不是已经卡住、是不是仍有未完成工作。
8. 人工确认后，可以在对应窗口用 `Ctrl+C` 停掉旧 dev server，再重新运行 `npm run dev`。本检查命令和 preflight 都不会自动 kill，也不会自动重启。
9. 如果报告显示 `old_route`，说明端口在监听但 API 路由像是旧构建、旧项目或错误服务；人工确认窗口标题、工作目录和启动命令后再停掉重启。
10. 如果 3200 被占用，交给主会话确认当前占用的是不是正在运行的工作台，不要随手杀进程。

### 内容页 404

现象：

- `/content` 打开 404。

处理：

```text
http://127.0.0.1:3200/content/
```

使用带结尾斜杠的 `/content/`。

### 排除后数字没降

处理：

1. 确认点的是“排除出运营看板”，不是普通内容编辑。
2. 刷新 `/dashboard` 和 `/reviews`。
3. 重新跑 audit。
4. 如果 audit 通过但 UI 没刷新，重开页面。
5. 如果 audit fail，交给主会话看 `.local/trusted-dashboard-audit/report.json`。

### 恢复后数字没回升

处理：

1. 确认 `/content/` 里该行显示“进入看板”。
2. 重新跑 audit。
3. 刷新 `/dashboard` 和 `/reviews`。
4. 不要用数据库删除或手动改 sqlite 来恢复。

## 日常结束前

保存这三件事到当天工作记录：

- daily gate 是 pass 还是 fail。
- trusted 内容数、快照数、曝光、互动。
- 今天排除/恢复了几条内容。

不要记录真实标题、raw payload、cookie、token、请求头、评论正文或弹幕文本。
