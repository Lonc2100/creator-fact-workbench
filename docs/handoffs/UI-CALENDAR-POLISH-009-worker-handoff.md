# UI-CALENDAR-POLISH-009 Worker Handoff

## Task

- 任务名：UI-CALENDAR-POLISH-009
- 页面范围：只优化 `/calendar` 发布日历页面
- 禁区遵守：未修改 self-media types/service/repo/runtime/api，未改 dashboard/reviews/content/import/leads 页面结构，未拆回多平台多卡片

## 修改内容

- 保留“同一内容一张卡、多平台图标合并”的日历卡片结构。
- 将 calendar toolbar 控件统一为更克制的后台控件质感：40px 高度、12px 圆角、细边框、轻内阴影。
- 精修 This week / Month、平台筛选按钮、状态筛选、Best times、新建按钮之间的尺寸和层级。
- 缩短搜索提示文案，避免小宽度控件里文字被截断。
- 压实 week/month 日历格子和卡片：降低格子高度、卡片 padding、卡片阴影和标题字重。
- 月视图卡片增加专门的紧凑样式，减少卡片和格子里的留白。

## 修改文件

- `src/domain/self-media/ui/screens/CalendarPage.tsx`
- `src/app/globals.css`
- `docs/handoffs/UI-CALENDAR-POLISH-009-worker-handoff.md`

## 截图

- `.local/ui-calendar-polish-009.png`
- 浏览器截图指标：`scrollWidth=1440`，`clientWidth=1440`，无桌面横向溢出。

## 验证

- `npm run typecheck`：通过
- `git diff --check`：通过
- `npm run verify:harness`：通过

## 遗留问题

- 1440px 桌面宽度下 toolbar 仍是两行布局；Best times / 新建已右对齐，未出现横向溢出。
- 当前截图未发现明显卡片留白或字体粗硬问题；卡片标题已降低字重并压缩高度。
- 本任务未启用 Best times / 新建按钮能力，仍保持前端禁用态，不改后端/API。
