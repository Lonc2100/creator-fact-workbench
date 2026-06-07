# UI Calendar Next Chat Handoff 007

## 用户最新判断

- `UI-CALENDAR-METRICOOL-006` 的像素复刻方向没有做好，用户明确反馈“改得更难看”。
- 主要问题：
  - 日期头和格子比例不对，头部过高，卡片和格子关系松散。
  - 卡片固定宽度导致格子内留白很大。
  - 文字排版没有明显提升。
  - 同一时间格出现多个卡片和 `+30 / +103` 这种更多数量提示，不符合当前真实发布体量。
  - 同一条内容在多个平台发布，应该是一张内容卡里展示多个平台图标，而不是拆成多张平台版本卡。
  - 下个会话要继续做 UI 时，先从产品逻辑和比例修正开始，不要继续凭感觉调色。

## 本轮已修正

- `PublishCalendar` 新增 `CalendarCardGroup`，先按 `contentId` 聚合，再进入日历画布。
- 周视图时间格现在显示“内容卡”，而不是每个平台版本一张卡。
- 卡片首行展示同一内容对应的多个平台图标。
- 时间格不再显示 `+30 / +103` 这类更多数量提示，避免测试数据污染视觉。
- 卡片宽度从固定 `114px` 调整到 `min(100%, 148px)`，更贴近格子比例。
- 周视图日期头增加专用覆盖，避免被通用 `.calendar-day-head` 的高头部样式覆盖。
- 日期头高度从视觉上压低，画布比例比 006 更顺。
- 验证截图：
  - `.local/calendar-handoff-007-desktop.png`

## 修改文件

- `src/domain/self-media/ui/patterns/PublishCalendar.tsx`
- `src/app/globals.css`
- `docs/handoffs/UI-CALENDAR-HANDOFF-007-next-chat.md`

## 当前可检查地址

- `http://127.0.0.1:3220/calendar`

## 已验证

- `npm run typecheck`
- `git diff --check`
- `npm run verify:harness`
- `SMOKE_BASE_URL=http://127.0.0.1:3220 npm run test:smoke`
- 手动启动新端口 `3220`，`/calendar` 返回 200。
- Playwright 截图生成成功：`.local/calendar-handoff-007-desktop.png`。
- 说明：C 盘临时目录只剩约 100MB，第一次 `verify:harness` 因测试临时 SQLite 写入 C 盘失败；已将本次验证的 `TEMP/TMP` 临时切到项目内 `.local/tmp` 后通过。

## 尚未完成

- 视觉仍未达到 Metricool 级别，只是修掉了 006 的明显错误。
- 平台图标虽然来自 `simple-icons`，但质感仍不如 Metricool，需要下一轮专门做图标规范。
- 卡片标题、备注、平台图标、时间之间的字体比例还需要继续精修。
- Toolbar 的平台 icon rail 和 `This week / Month` 控件需要对照用户认可的参考图再微调。
- 月视图没有继续优化。

## 下个会话建议主线

1. 先读本文件，不要重新翻整段长对话。
2. 打开 `.local/calendar-handoff-007-desktop.png` 和用户最后发的 Metricool 对比图。
3. 不要再新增复杂架构，继续只改 `/calendar`。
4. 下一轮目标应命名为 `UI-CALENDAR-METRICOOL-008`。
5. 优先级：
   - 固化“内容卡”模型：一条内容一张卡，多平台图标在卡片内。
   - 精修卡片字体比例：平台图标 14-16px，时间 9-10px，标题 12-13px，备注 9-10px。
   - 精修卡片横竖比例和格子关系：卡片跟随列宽，避免固定窄卡造成大留白。
   - 进一步降低测试数据噪声，真实标题不足时用内容计划标题兜底。
   - 参考 Metricool 只做视觉比例和信息层级，不复制私有 CSS 或素材。

## 给下个会话的话术

请从 `D:\codex work\自媒体创作\Data Collection and Background Analysis\docs\handoffs\UI-CALENDAR-HANDOFF-007-next-chat.md` 接着做。不要重新规划大架构，只继续优化 `/calendar`。重点是把发布日历做成“同一内容一张卡、多平台图标合并、卡片贴合格子、字体层级精致”的 Metricool-like 日历。先查看 `.local/calendar-handoff-007-desktop.png` 和用户最后发的 Metricool 对比图，再实施 `UI-CALENDAR-METRICOOL-008`。
