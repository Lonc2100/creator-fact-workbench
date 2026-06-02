# CALENDAR-003 + EDITOR-001: 发布日历与平台版本编辑

## Spec

本阶段把内容管理和发布日历从只读展示升级为可操作工作台：

- 内容页负责内容库、内容详情、平台版本编辑。
- 发布日历页负责周/月排期、平台和状态筛选、拖拽改期、阻塞原因和下一步动作。
- 组件边界遵守 UI Harness：screen 层可以调用 API，patterns/components/primitives 只能接收 props 和 callbacks。

## Reference Notes

- Mixpost `CalendarMonth.vue`：月历由日期网格驱动，每个日期只展示当天 posts，避免把导入、复盘和日历揉在一起。
- Mixpost `CalendarPostItem.vue`：日历卡片只承载平台账号、时间、状态和摘要，详情动作放到预览/侧栏。
- Postiz analytics route：页面路由只组合专用业务组件，不在路由里混写分析逻辑。

## Implementation

- `PublishCalendar` 使用 `@dnd-kit/core`，拖拽只发出 `{ platformVersionId, scheduledAt }`。
- `CalendarPage` 接收拖拽意图后调用 `/api/self-media/content-versions`，非法状态跳转仍由 Service 拒绝。
- `PlatformVersionEditor` 支持标题、正文、脚本、封面备注、发布时间、checklist 和状态推进。
- `ContentPage` 负责保存和状态 PATCH，不让 editor pattern 直接 fetch。

## Acceptance

- `npm run test:ui-harness`
- `npm run test:self-media`
- `npm run test:smoke`
- 日历页不得出现导入 diff 或完整复盘报告。
- 内容编辑保存后 dashboard 能读到更新后的平台版本字段。
