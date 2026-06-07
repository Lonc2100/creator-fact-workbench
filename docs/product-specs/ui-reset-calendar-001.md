# UI-RESET-CALENDAR-001：发布日历硬重设

## 目标

把 `/calendar` 从卡片堆叠页改成真正的运营排期工具。

## 范围

- 不改后端模型。
- 不改 Runtime/API。
- 不接真实发布 API。
- 只重做日历页 UI 结构和相关 CSS。

## 新结构

```text
Page header
Toolbar: 周/月、平台筛选、状态筛选、新建排期入口
Calendar board:
  左侧平台列
  顶部日期列
  中间排期格
Right inspector:
  平台版本详情
  发布检查
  阻塞原因
  下一步动作
```

## 验收标准

- 背景干净，不出现全局网格。
- 1440px 宽度下，日期标题不挤压、不截断。
- 一眼能看出每个平台每天有没有排期。
- 右侧详情只显示当前选中平台版本。
- 页面不出现导入 diff、复盘报告或数据看板模块。
- `npm run verify:harness` 通过。
- 浏览器打开 `/calendar` 无 console error。
