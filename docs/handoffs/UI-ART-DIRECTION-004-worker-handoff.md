# UI-ART-DIRECTION-004 Worker Handoff

## 任务

落实首页卡片矩阵和 Metricool 风格发布日历卡片，减少普通后台 KPI 拼盘和毛坯工具卡感。

## 已完成

- `/` 首页改为创作者卡片矩阵：深色主运营状态卡、发布节奏、数据增长、内容资产、复盘行动、线索机会。
- 首页保留 `今日工作入口` 文本合约，并把入口转化为更日常可用的工作台卡片。
- `/calendar` 发布卡片重做：圆角、轻阴影、平台/时间/标题/状态/进度层级更清晰。
- 空排期入口从虚线按钮改为柔和占位块。
- 日历网格线降低存在感，今日列使用轻微荧光提示。
- 日历默认锚点改为排期最多的日期/周，避免打开时落在空周。
- 未修改后端、API、Repo/Service/Runtime。

## 修改文件

- `src/domain/self-media/ui/screens/OverviewPage.tsx`
- `src/domain/self-media/ui/patterns/PublishCalendar.tsx`
- `src/app/globals.css`
- `docs/product-specs/ui-art-direction-004.md`
- `docs/task-board.md`

## 验收命令

- `npm run typecheck`：PASS
- `git diff --check`：PASS
- `npm run verify:harness`：PASS
- `SMOKE_BASE_URL=http://127.0.0.1:3200 npm run test:smoke`：PASS

## 截图证据

- `.local/overview-art-direction-004-3200.png`
- `.local/calendar-art-direction-004-3200.png`
- `.local/dashboard-art-direction-004-3200.png`
- `.local/reviews-art-direction-004-3200.png`
