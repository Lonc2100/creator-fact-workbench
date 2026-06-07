# UI-ART-DIRECTION-003 Worker Handoff

## 任务

根据用户提供的 Slack/Nicelydoneclub、创作者卡片、ActiveCollab、Linear、Metricool 截图，重置当前 UI 的底层艺术方向，减少 AI 拼装感和老式 SaaS 土味。

## 已完成

- 新增 `docs/product-specs/ui-art-direction-003.md`，固化参考来源、关键词和页面映射。
- `SidebarNav` 从单层导航改为双层结构：深色快捷 rail + 浅色分组导航。
- 全局 token 改为更干净的暖白、深墨紫、柔和灰棕，并加入小面积荧光创作者点缀。
- `AppShell`、`PageHeader`、`Panel`、`Button` 的基础样式向 Apple/Linear 的克制留白和轻边界靠拢。
- 不改后端、不改业务 API、不改变页面数据逻辑。

## 修改文件

- `src/domain/self-media/ui/components/SidebarNav.tsx`
- `src/domain/self-media/ui/foundations/tokens.css`
- `src/app/globals.css`
- `docs/product-specs/ui-art-direction-003.md`
- `docs/task-board.md`

## 验收命令

- `npm run typecheck`：PASS
- `git diff --check`：PASS
- `npm run verify:harness`：PASS
- `SMOKE_BASE_URL=http://127.0.0.1:3200 npm run test:smoke`：PASS

## 截图证据

- `.local/dashboard-art-direction-003-3200.png`
- `.local/calendar-art-direction-003-3200.png`
- `.local/reviews-art-direction-003-3200.png`
- `.local/ui-lab-art-direction-003-3200.png`

## 后续建议

- 首页可以参考用户图 2 做创作者卡片矩阵，但要克制用色。
- 发布日历下一轮继续参考 Metricool，重点优化卡片里的图标、标题层级、时间位置和状态表达。
- 数据看板继续保持 Metabase 结构，但减少重复测试数据造成的视觉噪声。
