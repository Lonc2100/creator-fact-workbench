# UI-ART-DIRECTION-003 创作者后台高级感方向

## 用户参考

用户给出的方向不是继续做传统 SaaS，而是：

- Slack/Nicelydoneclub：左侧分两层导航，不同层级用不同色深区分。
- 暗色创作者社区卡片：首页概览可用卡片矩阵，但颜色需要收敛到本项目调性。
- ActiveCollab：学习大标题、说明文字和插画色块的亲和力。
- Linear：学习克制、高级、协调的颜色与组件节奏。
- Metricool：发布日历要有创作者工具感，卡片圆弧、平台图标和文字密度要友好。

## 关键词

简洁、专业、创作者、有趣、克制、高级、拒绝老式 SaaS 土味、拒绝 AI 拼装感。

## 本阶段落地

- 全局 AppShell 改为双层侧栏：深色快捷 rail + 浅色分组导航。
- 主题 token 从重米白/棕色改为暖白、深墨紫、柔和灰棕，并保留一个小的荧光创作者点缀。
- 通用 Panel、Button、PageHeader 统一向 Apple/Linear 的轻边界、清晰留白和低噪声靠拢。
- 不改后端，不改业务 API，不重写页面逻辑。

## 页面映射

- 总览：首页可以后续学习暗色创作者卡片矩阵，但必须控制色彩，避免变成海报墙。
- 发布日历：继续向 Metricool 靠拢，重点优化平台图标、卡片圆弧、时间和状态层级。
- 数据看板：保留 Metabase 的数据组织，但视觉上减少米白糊感。
- 复盘页：保留 Evidence 报告结构，后续进一步学习 Linear 的列表密度和状态表达。

## 验收

- 侧栏可见双层结构。
- UI Lab、Dashboard、Reviews、Calendar 不出现明显布局破坏。
- `npm run verify:harness` 和 `npm run test:smoke` 通过。
