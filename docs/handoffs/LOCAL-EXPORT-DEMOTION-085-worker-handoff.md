# LOCAL-EXPORT-DEMOTION-085 Handoff

## 结论

已把 `/import` 的抖音 / 小红书 / B站“本地导出”入口从默认主线降级为折叠兜底。页面默认第一屏现在强调“登录抓取优先”，本地导出只作为登录抓取不可用或平台后台支持导出时的备用方案。

## 改动

- `/import` 顶部文案改为登录抓取优先。
- 新增默认主入口面板 `login-capture-primary`：
  - 打开平台后台并登录
  - 检查授权 / 浏览器辅助会话
  - 预览后保存
- 新增默认折叠兜底区 `local-export-fallback`。
- 抖音 / 小红书 / B站本地导出面板仍保留原能力，但移动到 `local-export-fallback` 内，不再排在页面最前面。
- UI harness 增加顺序检查：`login-capture-primary` 和 `post-publish-refresh` 在 `local-export-fallback` 之前。

## 验证

- `npm run typecheck` PASS
- `npm run test:ui-harness` PASS
- `npm run build` PASS
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page` PASS
- `git diff --check` PASS

## Live 3200 检查

- URL：`http://localhost:3200/import`
- DOM：
  - `login-capture-primary` 存在。
  - `local-export-fallback` 存在且默认 `open=false`。
  - `douyin-local-file-mvp`、`xiaohongshu-local-file-mvp`、`bilibili-local-file-mvp` 仍存在。
  - 页面无 `Application error`。
- 视觉截图：
  - `.local/visual-checks/LOCAL-EXPORT-DEMOTION-085-import-1280x900.png`
  - 首屏显示“登录抓取优先”，没有把三平台本地导出表单放在页面前部。

## 注意

live 检查时发现 3200 原进程是旧 `next start`，浏览器报旧 chunk 加载错误。已重新 `npm run build`，只停止并重启了原 3200 进程，随后 live health 通过。

本任务未 stage / 未处理的并行脏文件包括但不限于：

- `docs/generated/template-doctor-report.md`
- `scripts/smoke-self-media.mjs`
- `src/domain/self-media/providers/douyin-personal-provider.ts`
- `src/domain/self-media/service/self-media-service.ts`
- `src/domain/self-media/types/self-media-types.ts`
- `src/domain/self-media/ui/screens/LeadsPage.tsx`
- `src/domain/self-media/ui/screens/UiLabPage.tsx`
- `tests/agent-trajectory.test.mjs`
- `docs/handoffs/AUTHED-BROWSER-CAPTURE-ARCHITECTURE-085-architect-handoff.md`
- `scripts/check-browser-automation.mjs`
- `src/app/api/self-media/platform-imports/browser-capture/`
