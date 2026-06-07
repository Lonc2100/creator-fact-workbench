# THIRD-PLATFORM-CAPTURE-MVP-084 Handoff

## 结论

第三个平台选择小红书。本轮没有把“小红书网页登录后刷新本系统即可自动抓取”写成能力，也没有保存 cookie/token/header/raw request。实现路径是：用户从小红书创作服务平台人工导出或复制内容级表格，本地上传/粘贴，先预览字段，再人工确认，最后保存为可信内容指标。

保存后的来源为 `xiaohongshu_creator_center`，内容格式为 `image_text`，数据域为 `user_work`，并进入默认可信内容指标口径。

## 官方/权威资料

- 小红书开放平台入口：https://open.xiaohongshu.com/
- 小红书创作服务平台入口：https://creator.xiaohongshu.com/
- 小红书 Ark 开放文档 Quick Start：https://school.xiaohongshu.com/en/open/quick-start/summary.html
- 小红书 Ark 入口：https://ark.xiaohongshu.com/ark/home

公开可读的 Ark 文档入口展示了 sandbox、App-key/App-secret、API 测试、商品/库存/订单等开放平台对接路径，属于需要平台能力、应用参数和审核/测试的 API 集成范畴。未在公开资料中确认一个面向本项目场景的稳定个人创作者笔记内容级数据 API。因此产品默认能力保持为本地导出/复制表格，不声明官方 API 自动抓取。

## 实现范围

- 扩展 `platform_local_file` 请求类型，允许 `xiaohongshu`。
- 新增本地平台导入元信息表：
  - 抖音：`douyin_creator_center`，`short_video`
  - 小红书：`xiaohongshu_creator_center`，`image_text`
  - B站：`bilibili_creator_center`，`short_video`
- Import 页面新增“小红书本地导出回收 MVP”面板：
  - 上传 CSV/XLSX
  - 粘贴 CSV
  - 预览字段
  - 勾选本人导出确认
  - 保存到看板
  - 打开 `/dashboard`
- 小红书 CSV preset 仍标记为 `draft_realistic`，预览行提示需要真实导出样本确认。
- 保存时追加合规 warning：用户主动从小红书创作服务平台导出或复制内容级表格后本地导入；不读取网页登录态，不保存 cookie/token/header/raw request。

## 文件

- `src/domain/self-media/types/self-media-types.ts`
- `src/domain/self-media/service/self-media-service.ts`
- `src/domain/self-media/ui/screens/ImportPage.tsx`
- `tests/self-media-contract.test.ts`
- `tests/ui-harness.test.mjs`

## 验证

- `npm run typecheck` PASS
- `npm run test:ui-harness` PASS
- `npm run test:self-media` PASS after rerun; first run passed the new Xiaohongshu case but hit unrelated/flaky Windows temp/dashboard assertions, then full reruns passed 139/139.
- `npm run build` PASS

待提交前还需执行：

- `git diff --check`

## 注意

工作区进入本任务前已有 unrelated dirty files 和未跟踪文件；本任务不回滚、不 stage：

- `docs/generated/template-doctor-report.md`
- `scripts/smoke-self-media.mjs`
- `src/domain/self-media/ui/screens/LeadsPage.tsx`
- `src/domain/self-media/ui/screens/UiLabPage.tsx`
- `tests/agent-trajectory.test.mjs`
- `docs/handoffs/PAUSED-WECHAT-EXACT-REMOVE-084-worker-handoff.md`
- `scripts/check-browser-automation.mjs`
