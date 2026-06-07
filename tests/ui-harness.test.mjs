import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(file) {
  return readFileSync(path.join(root, file), "utf8");
}

function listFiles(dir) {
  const absolute = path.join(root, dir);
  if (!existsSync(absolute)) return [];
  return readdirSync(absolute).flatMap((name) => {
    const full = path.join(absolute, name);
    const relative = path.relative(root, full).replaceAll("\\", "/");
    return statSync(full).isDirectory() ? listFiles(relative) : [relative];
  });
}

test("Self-media UI Harness source documents and routes exist", () => {
  for (const file of [
    "docs/ui-harness/ARCHITECTURE.md",
    "docs/ui-harness/PAGE_BOUNDARIES.md",
    "docs/ui-harness/VISUAL_PRINCIPLES.md",
    "docs/ui-harness/QA_RUBRIC.md",
    "docs/ui-harness/REFERENCE_MANIFEST.md",
    "src/app/calendar/page.tsx",
    "src/app/content/page.tsx",
    "src/app/api/self-media/creator-drafts/route.ts",
    "src/app/import/page.tsx",
    "src/app/dashboard/page.tsx",
    "src/app/reviews/page.tsx",
    "src/app/leads/page.tsx",
    "src/app/ui-lab/page.tsx"
  ]) {
    assert.equal(existsSync(path.join(root, file)), true, `${file} missing`);
  }
});

test("UI Harness uses tokens and page boundary references", () => {
  const tokens = read("src/domain/self-media/ui/foundations/tokens.css");
  const architecture = read("docs/ui-harness/ARCHITECTURE.md");
  assert.match(tokens, /--sm-bg-app/);
  assert.match(tokens, /--sm-text-primary/);
  for (const phrase of ["Mixpost", "Metabase", "Evidence", "primitives -> components -> patterns -> screens"]) {
    assert.ok(architecture.includes(phrase), `architecture missing ${phrase}`);
  }
});

test("non-screen UI layers do not fetch or import backend layers", () => {
  for (const file of listFiles("src/domain/self-media/ui").filter((item) => item.endsWith(".ts") || item.endsWith(".tsx"))) {
    const content = read(file);
    if (/src\/domain\/self-media\/ui\/(primitives|components|patterns)\//.test(file)) assert.doesNotMatch(content, /\bfetch\s*\(/, `${file} must not fetch`);
    assert.doesNotMatch(content, /from\s+["'][^"']*(repo|service|providers|config)[^"']*["']/, `${file} must not import backend layers`);
  }
});

test("page boundaries keep calendar, import, and review workflows separated", () => {
  const calendar = read("src/domain/self-media/ui/screens/CalendarPage.tsx");
  const reviews = read("src/domain/self-media/ui/screens/ReviewsPage.tsx");
  const importPage = read("src/domain/self-media/ui/screens/ImportPage.tsx");
  assert.doesNotMatch(calendar, /Diff 预览|周复盘报告|EvidenceReviewReport|ImportDiffTable/, "calendar page must not mix import diff or review report");
  assert.doesNotMatch(reviews, /PublishCalendar|publish-calendar|Diff 预览|ImportDiffTable/, "review page must not include calendar drag area or import diff");
  assert.doesNotMatch(importPage, /PublishCalendar|EvidenceReviewReport|周复盘报告/, "import page must stay focused on import preview and runs");
});

test("interactive UI patterns expose callbacks instead of owning persistence", () => {
  const calendarPattern = read("src/domain/self-media/ui/patterns/PublishCalendar.tsx");
  const contentPattern = read("src/domain/self-media/ui/patterns/ContentManagement.tsx");
  const reviewPattern = read("src/domain/self-media/ui/patterns/EvidenceReviewReport.tsx");
  assert.match(calendarPattern, /onReschedule/);
  assert.match(contentPattern, /onSave/);
  assert.match(contentPattern, /onStatusPatch/);
  assert.match(contentPattern, /onReviewDraft/);
  assert.match(contentPattern, /onConfirmPublish/);
  assert.match(reviewPattern, /onActionStatus/);
  for (const source of [calendarPattern, contentPattern, reviewPattern]) assert.doesNotMatch(source, /\bfetch\s*\(/);
});

test("content draft review UI keeps manual review and publish confirmation explicit", () => {
  const contentPattern = read("src/domain/self-media/ui/patterns/ContentManagement.tsx");
  const contentScreen = read("src/domain/self-media/ui/screens/ContentPage.tsx");
  const dashboardScreen = read("src/domain/self-media/ui/screens/DashboardPage.tsx");
  const contentRoute = read("src/app/content/page.tsx");
  const contentWorkbenchApi = read("src/app/api/self-media/content-workbench/route.ts");
  assert.match(contentPattern, /review-content-draft/);
  assert.match(contentPattern, /content-title-input/);
  assert.match(contentPattern, /content-topic-input/);
  assert.match(contentPattern, /version-next-action-input/);
  assert.match(contentPattern, /publish-confirmation-strip/);
  assert.match(contentPattern, /这里只记录人工发布结果/);
  assert.match(contentPattern, /content-publish-history/);
  assert.match(contentPattern, /发布历史 · 只读/);
  assert.match(contentPattern, /confirmationSource/);
  assert.match(contentPattern, /failureReason/);
  assert.match(contentPattern, /平台指标仍以创作者中心数据为准/);
  assert.match(contentPattern, /运营内容列表/);
  assert.match(contentPattern, /dashboardReviewLabel/);
  assert.match(contentPattern, /originLabel/);
  assert.match(contentPattern, /标签建议/);
  assert.match(contentPattern, /platformAdvice/);
  assert.match(contentScreen, /action: "review_draft"/);
  assert.match(contentScreen, /action: "confirm_publish"/);
  assert.match(contentScreen, /creator-new-video-panel/);
  assert.match(contentScreen, /当前任务 \/ 下一步动作/);
  assert.match(contentScreen, /引用到日历/);
  assert.match(contentScreen, /手动发布助手/);
  assert.match(contentScreen, /\/api\/self-media\/creator-drafts/);
  assert.match(contentScreen, /action: "discuss"/);
  assert.match(contentScreen, /creator-copilot-discussion/);
  assert.match(contentScreen, /分析并生成讨论稿/);
  assert.match(contentScreen, /按调整重新生成/);
  assert.match(contentScreen, /生成并保存四平台版本/);
  assert.match(contentScreen, /requestedScheduledAtFromUrl/);
  assert.match(contentScreen, /useRef/);
  assert.match(contentScreen, /scheduleInputRef\.current\?\.value \|\| scheduledAt/);
  assert.match(contentScreen, /new URLSearchParams\(window\.location\.search\)\.get\("scheduledAt"\)/);
  assert.match(contentScreen, /localDateTimeInputValue/);
  assert.match(contentScreen, /保存后校验失败/);
  assert.match(contentScreen, /persistedVersions\.length !== body\.platformVersions\.length/);
  assert.match(contentScreen, /保存后未在系统中查到完整内容和四平台版本/);
  assert.match(contentScreen, /await onCreated\(body\);\s+setResult\(body\);/);
  assert.match(contentScreen, /setResult\(null\)/);
  assert.match(contentScreen, /平台激励\/创作标签均为建议/);
  assert.match(contentScreen, /publish-execution-workbench/);
  assert.match(contentScreen, /手动发布助手/);
  assert.match(contentScreen, /selectedContentId \? allPackages\.filter/);
  assert.match(contentScreen, /current\.contentRows\.some\(\(row\) => row\.content\.id === selectedContentId\)/);
  assert.match(contentScreen, /不是自动发布/);
  assert.match(contentScreen, /publish-handoff-not-scheduled/);
  assert.match(contentScreen, /人工确认已发布/);
  assert.match(contentScreen, /记录发布失败/);
  assert.match(contentScreen, /记录发布阻塞/);
  assert.match(contentScreen, /去手动抓取最新数据/);
  assert.match(contentScreen, /ContentWorkbenchSnapshot/);
  assert.match(contentScreen, /\/api\/self-media\/content-workbench/);
  assert.match(contentScreen, /默认只显示真实用户作品/);
  assert.match(contentScreen, /isUserWorkContentRow/);
  assert.match(contentScreen, /dataDomain === "user_work"/);
  assert.match(contentScreen, /content-acceptance-data-pool/);
  assert.match(contentScreen, /本地验收\/测试内容/);
  assert.match(contentScreen, /requestedAcceptanceRunIdFromUrl/);
  assert.match(contentScreen, /acceptanceRunId/);
  assert.match(contentScreen, /不进运营看板/);
  assert.match(contentScreen, /行动项草稿仍可在诊断筛选里查看/);
  assert.match(contentScreen, /publishRecords/);
  assert.match(contentRoute, /getSelfMediaContentWorkbench/);
  assert.doesNotMatch(contentRoute, /getSelfMediaDashboard/);
  assert.match(contentWorkbenchApi, /getSelfMediaContentWorkbench/);
  assert.match(dashboardScreen, /DashboardSecondaryOperationsPanel/);
  assert.match(dashboardScreen, /dashboard-secondary-operations/);
  assert.match(dashboardScreen, /任务、发布台账和行动项默认收起，不占用数据看板/);
});

test("content workbench exposes filters sorting pagination and trusted-scope copy", () => {
  const contentScreen = read("src/domain/self-media/ui/screens/ContentPage.tsx");
  const contentPattern = read("src/domain/self-media/ui/patterns/ContentManagement.tsx");
  const contentRoute = read("src/app/content/page.tsx");
  assert.match(contentScreen, /content-workbench-filters/);
  assert.match(contentScreen, /显示范围/);
  assert.match(contentScreen, /operating_default/);
  assert.match(contentScreen, /真实作品/);
  assert.match(contentScreen, /运营优先/);
  assert.match(contentScreen, /全部本地\/诊断/);
  assert.match(contentScreen, /更新时间最近/);
  assert.match(contentScreen, /发布时间最近/);
  assert.match(contentScreen, /先看进入运营看板/);
  assert.match(contentScreen, /先看不进运营看板/);
  assert.match(contentScreen, /每页/);
  assert.match(contentScreen, /密度/);
  assert.match(contentScreen, /手动补录、外部导入、验收内容和行动项草稿/);
  assert.match(contentScreen, /filterRows/);
  assert.match(contentScreen, /pageSize/);
  assert.match(contentPattern, /content-table-compact/);
  assert.match(contentPattern, /没有符合当前筛选条件的内容/);
  assert.doesNotMatch(contentRoute, /getSelfMediaDashboard/);
  assert.doesNotMatch(contentScreen, /\/api\/self-media\/dashboard/);
  assert.doesNotMatch(contentScreen, /confirm_publish.*platform API|providerRunId:|platformUrl:|platformPostId:/);
});

test("calendar publish confirmation stays manual and explicit", () => {
  const calendarPattern = read("src/domain/self-media/ui/patterns/PublishCalendar.tsx");
  const calendarScreen = read("src/domain/self-media/ui/screens/CalendarPage.tsx");
  const calendarRoute = read("src/app/calendar/page.tsx");
  const formatHelpers = read("src/domain/self-media/ui/foundations/format.ts");
  assert.match(calendarPattern, /calendar-confirm-publish/);
  assert.match(calendarPattern, /人工发布确认/);
  assert.match(calendarPattern, /只记录人工结果，便于复盘排期/);
  assert.match(calendarPattern, /手动发布助手/);
  assert.match(calendarPattern, /calendar-publish-not-ready/);
  assert.match(calendarPattern, /calendar-confirm-not-ready/);
  assert.match(calendarPattern, /calendar-reschedule-input/);
  assert.match(calendarPattern, /calendar-reschedule-save/);
  assert.match(calendarPattern, /修改排期时间/);
  assert.match(calendarPattern, /保存排期时间/);
  assert.match(calendarPattern, /calendarCardGroupKey/);
  assert.match(calendarPattern, /dateKey\(new Date\(item\.scheduledAt\)\)/);
  assert.match(calendarPattern, /timeSlotFor\(item\.scheduledAt\)/);
  assert.match(calendarPattern, /groupCalendarCards\(items, view\)/);
  assert.match(calendarPattern, /data-content-id=\{item\.contentId\}/);
  assert.match(calendarPattern, /data-calendar-empty-hour=\{hour\}/);
  assert.match(calendarPattern, /data-calendar-target-at/);
  assert.match(calendarPattern, /weekTimeSlotsForItems/);
  assert.doesNotMatch(calendarPattern, /Math\.abs\(slot - hour\)/);
  assert.match(calendarPattern, /dropTargetFromEvent/);
  assert.match(calendarPattern, /event\.over\?\.id/);
  assert.match(calendarPattern, /aria-label=\{`新增排期/);
  assert.match(calendarPattern, /PendingScheduleQueue/);
  assert.match(calendarPattern, /calendar-pending-schedule-queue/);
  assert.match(calendarPattern, /calendar-pending-draft-card/);
  assert.match(calendarPattern, /calendar-empty-real-queue-note/);
  assert.match(calendarPattern, /不用假排期占位/);
  assert.match(calendarPattern, /localDateTimeInputValue/);
  assert.match(calendarPattern, /isoFromLocalDateTime/);
  assert.match(formatHelpers, /localDateTimeInputValue/);
  assert.match(formatHelpers, /date\.getHours\(\)/);
  assert.match(formatHelpers, /isoFromLocalDateTime/);
  assert.doesNotMatch([calendarPattern, calendarScreen, formatHelpers].join("\n"), /toISOString\(\)\.slice\(0,\s*16\)/);
  assert.match(calendarScreen, /action: "confirm_publish"/);
  assert.match(calendarScreen, /日历人工确认发布/);
  assert.match(calendarScreen, /排期保存后校验失败/);
  assert.match(calendarScreen, /persisted\.scheduledAt !== input\.scheduledAt/);
  assert.match(calendarScreen, /发布记录台账/);
  assert.match(calendarScreen, /publish-ledger/);
  assert.match(calendarScreen, /本地人工确认记录/);
  assert.match(calendarScreen, /pendingSchedulingItems/);
  assert.match(calendarScreen, /isDefaultSchedulingRow/);
  assert.match(calendarScreen, /isDefaultUserWorkCalendarContent/);
  assert.match(calendarScreen, /dataDomain === "user_work"/);
  assert.match(calendarScreen, /dataDomain === "acceptance_run"/);
  assert.match(calendarScreen, /dataDomain === "demo_seed"/);
  assert.doesNotMatch(calendarScreen, /operator_owned_work/);
  assert.match(calendarScreen, /CalendarDraftPoolPanel/);
  assert.match(calendarScreen, /calendar-draft-pool/);
  assert.match(calendarScreen, /素材池 \/ 待排草稿/);
  assert.match(calendarScreen, /pendingItems=\{\[\]\}/);
  assert.match(calendarScreen, /isAcceptanceOrTestCalendarText/);
  assert.match(calendarScreen, /本地验收数据 \/ 测试内容/);
  assert.match(calendarScreen, /calendar-acceptance-data-pool/);
  assert.match(calendarScreen, /072|测试|验收|creator day workflow|MAINLINE/i);
  assert.match(calendarScreen, /真实作品：六月内容计划|我的真实作品070测试|AI选题计划|AI短片复盘|小雏菊|想拍一条短视频/);
  assert.doesNotMatch(calendarScreen, /我的真实作品\/i/);
  assert.match(calendarPattern, /点击空白时间格创建作品排期/);
  assert.match(calendarRoute, /getSelfMediaContentWorkbench/);
  assert.match(calendarRoute, /<CalendarPage snapshot=\{snapshot\} workbench=\{workbench\}/);
  assert.match(calendarScreen, /versionId/);
  assert.match(calendarScreen, /clear_future_schedules/);
  assert.match(calendarScreen, /calendar-clear-future-schedules/);
  assert.match(calendarScreen, /calendarAnchorDate/);
  assert.match(calendarScreen, /anchorDate=\{calendarAnchorDate\}/);
  assert.match(calendarScreen, /requestedVersionIdFromUrl/);
  assert.match(calendarScreen, /setInspectorOpen\(true\)/);
  assert.match(calendarScreen, /计划新视频 \/ 新增排期/);
  assert.match(calendarScreen, /新增排期/);
  assert.match(calendarScreen, /calendar-create-schedule-input/);
  assert.match(calendarScreen, /contentCreateHref/);
  assert.match(calendarScreen, /scheduledAt=\$\{encodeURIComponent\(scheduledAt\)\}/);
  assert.match(calendarScreen, /calendar-create-content-link/);
  assert.match(calendarScreen, /localDateTimeInputValue\(createSlotAt\)/);
  assert.match(calendarScreen, /onCreateAt=\{\(scheduledAt\) => \{/);
  assert.match(calendarScreen, /setCreateSlotAt\(scheduledAt\)/);
  assert.match(calendarScreen, /setInspectorOpen\(false\)/);
  assert.match(calendarScreen, /onSelect=\{\(id\) => \{\s+setCreateSlotAt\(undefined\);\s+setSelectedId\(id\);\s+setInspectorOpen\(true\);/);
  assert.match(calendarPattern, /calendar-card-drag-handle/);
  assert.match(calendarPattern, /onClick=\{openDetail\}/);
  assert.match(calendarScreen, /showEmptySlots=\{scope === "operating"\}/);
  assert.match(calendarScreen, /历史发布记录/);
  assert.match(calendarScreen, /人工发布台账默认收起，不占用作品排期主屏/);
  assert.match(calendarScreen, /publishRecords/);
  assert.doesNotMatch(calendarScreen, /providerRunId:|platformUrl:|platformPostId:/);
});

test("operator UX polish keeps default copy Chinese and quiet", () => {
  const dashboardScreen = read("src/domain/self-media/ui/screens/DashboardPage.tsx");
  const metricDashboard = read("src/domain/self-media/ui/patterns/MetricDashboardGrid.tsx");
  const contentScreen = read("src/domain/self-media/ui/screens/ContentPage.tsx");
  const contentPattern = read("src/domain/self-media/ui/patterns/ContentManagement.tsx");
  const calendarScreen = read("src/domain/self-media/ui/screens/CalendarPage.tsx");
  const calendarPattern = read("src/domain/self-media/ui/patterns/PublishCalendar.tsx");
  const importPage = read("src/domain/self-media/ui/screens/ImportPage.tsx");
  const reviewsPage = read("src/domain/self-media/ui/screens/ReviewsPage.tsx");
  const reviewPattern = read("src/domain/self-media/ui/patterns/EvidenceReviewReport.tsx");
  const sidebarNav = read("src/domain/self-media/ui/components/SidebarNav.tsx");
  const overviewPage = read("src/domain/self-media/ui/screens/OverviewPage.tsx");
  const selfMediaService = read("src/domain/self-media/service/self-media-service.ts");

  for (const [label, source] of [
    ["dashboard", dashboardScreen],
    ["metrics", metricDashboard],
    ["content", contentPattern],
    ["calendar", calendarPattern],
    ["import", importPage],
    ["reviews", reviewPattern],
    ["sidebar", sidebarNav]
  ]) {
    assert.doesNotMatch(source, /eyebrow="(?:Data actions|Weekly summary|Post-import actions|Operating tasks|Source \/ Platform|Evidence Table|History|Review Window|Action Items|Run details|Advanced import|Manual preview|Editor)"/, `${label} keeps old English eyebrow copy`);
  }

  for (const phrase of ["运营提醒", "本周复盘", "导入建议", "行动推进"]) assert.match(dashboardScreen, new RegExp(phrase));
  assert.match(metricDashboard, /eyebrow="来源平台"/);
  assert.match(metricDashboard, /参与看板和复盘/);
  assert.match(importPage, /eyebrow="运行记录"/);
  assert.match(importPage, /eyebrow="手动导入"/);
  assert.match(importPage, /eyebrow="字段预览"/);
  assert.match(reviewPattern, /eyebrow="指标证据"/);
  assert.match(reviewPattern, /eyebrow="历史记录"/);
  assert.match(reviewPattern, /eyebrow="复盘窗口"/);
  assert.match(reviewPattern, /eyebrow="行动安排"/);
  assert.match(reviewPattern, /bestPlatformLabel/);
  assert.match(reviewPattern, /稿件内容级指标/);
  assert.doesNotMatch(reviewPattern, /<b>\{liveReview\.metrics\.bestPlatform\}<\/b>|archives 内容级指标/);
  assert.match(contentPattern, /contentFormatLabels/);
  assert.match(contentPattern, /短视频/);
  assert.doesNotMatch(contentPattern, /<small>\{item\.format\}<\/small>/);
  assert.match(contentScreen, /variant=\{item\.userExcludedFromTrustedScope \? "secondary" : "ghost"\}/);
  assert.match(contentScreen, /"不进看板"/);
  assert.match(contentScreen, /创作者中心内容/);
  assert.match(contentScreen, /data-testid="publish-handoff-package"/);
  assert.match(contentScreen, /selectedContentId/);
  assert.match(contentScreen, /requestedContentId/);
  assert.match(contentScreen, /params\.get\("contentId"\)/);
  assert.match(contentScreen, /setSelectedContentId\(requestedContentId\)/);
  assert.match(contentScreen, /pkg\.contentId === selectedContentId/);
  assert.match(contentScreen, /data-content-id=\{pkg\.contentId\}/);
  assert.match(contentScreen, /data-platform-version-id=\{pkg\.platformVersionId\}/);
  assert.match(contentScreen, /copy-publish-text/);
  assert.match(contentScreen, /copy-tags/);
  assert.match(contentScreen, /open-official-backend/);
  assert.match(contentScreen, /record-submitted-review/);
  assert.match(selfMediaService, /未来可接官方 API/);
  assert.match(selfMediaService, /默认人工后台发布/);
  assert.match(dashboardScreen, /B站稿件内容/);
  assert.match(importPage, /创作者中心内容级真实数据/);
  assert.match(reviewsPage, /可信真实创作者中心内容级数据/);
  assert.match(overviewPage, /基于已回收的内容数据/);
  assert.match(overviewPage, /isPausedWechatAction/);
  assert.match(overviewPage, /operatorActionItems/);
  assert.doesNotMatch(overviewPage, /内部指标快照驱动|eyebrow="Status"|eyebrow="Focus"/);
  assert.doesNotMatch([dashboardScreen, contentScreen, importPage, reviewsPage, reviewPattern].join("\n"), /creator-center|archives 内容级指标|B站 archives/);
  assert.match(calendarPattern, />今天<\/em>/);
  assert.match(calendarPattern, /data-testid="calendar-publish-handoff"/);
  assert.match(calendarPattern, /calendar-open-official-backend/);
  assert.match(calendarPattern, /calendar-submit-review/);
  assert.match(calendarScreen, /submitted_review/);
  assert.match(sidebarNav, /自媒体运营后台/);
  assert.doesNotMatch(sidebarNav, /\/ui-lab|界面规范|UI Lab/);
  assert.doesNotMatch(sidebarNav, /Self-media operating system|UI Lab|Design lab|label: "Home"|label: "Create"|label: "Plan"|label: "Data"|label: "Review"/);

  const workflowCopy = [
    contentPattern.slice(0, contentPattern.indexOf('<div className="publish-confirmation-strip">')),
    contentScreen,
    calendarPattern.slice(0, calendarPattern.indexOf("export function PlatformVersionInspector")),
    calendarScreen.slice(calendarScreen.indexOf("export function CalendarPage"))
  ].join("\n");
  assert.doesNotMatch(workflowCopy, /不调用真实平台 API|不会作为运营看板和复盘的指标证据|发布记录不会作为运营指标证据/);
});

test("content and calendar default views hide internal labels and require explicit diagnostics", () => {
  const contentScreen = read("src/domain/self-media/ui/screens/ContentPage.tsx");
  const contentPattern = read("src/domain/self-media/ui/patterns/ContentManagement.tsx");
  const calendarScreen = read("src/domain/self-media/ui/screens/CalendarPage.tsx");
  const calendarPattern = read("src/domain/self-media/ui/patterns/PublishCalendar.tsx");

  assert.match(contentScreen, /sourceFilter, setSourceFilter.*operating_default/s);
  assert.match(contentScreen, /isOperatingContentRow/);
  assert.match(contentScreen, /全部本地\/诊断/);
  assert.match(contentPattern, /operatorText/);
  assert.match(contentPattern, /来源细节已隐藏/);
  assert.doesNotMatch(contentPattern, /sourceKinds\.join|trustedMetricSnapshotCount\} trusted|localMetricSnapshotCount\} local|<small>\{version\.id\}<\/small>|trusted metric evidence|Publish history|Platform Versions|Content Workbench/);
  assert.doesNotMatch(contentScreen, /local_workflow|trusted totals|manual、csv、external|action refs|全本地内容/);

  assert.match(calendarScreen, /CalendarScope/);
  assert.match(calendarScreen, /isOperatingCalendarItem/);
  assert.match(calendarScreen, /默认运营排期/);
  assert.match(calendarScreen, /全部本地\/诊断/);
  assert.match(calendarPattern, /暂无可行动排期/);
  assert.match(calendarPattern, /items\.length === 0 && pendingItems\.length === 0 && !showEmptySlots/);
  assert.match(calendarPattern, /calendarCardGroupKey/);
  assert.match(calendarPattern, /calendar-content-schedule-inspector/);
  assert.match(calendarPattern, /versions\?: ContentPlatformVersion\[\]/);
  assert.doesNotMatch(calendarScreen, /Best times|Autolists|<button disabled type="button">List<\/button>|Publish ledger|rawDir|evidenceFile|pageReady|apiReady/);
  assert.doesNotMatch(calendarPattern, /showEmptySlots=\{true\}|demo\/fake|fixture/);
});

test("import page default view is data-only and folds diagnostics", () => {
  const importPage = read("src/domain/self-media/ui/screens/ImportPage.tsx");
  assert.match(importPage, /第一屏只告诉你怎么手动抓取、预览保存和回收发布后指标/);
  assert.match(importPage, /ImportFirstViewportGuide/);
  assert.match(importPage, /import-first-viewport-guide/);
  assert.match(importPage, /现在怎么导入 \/ 抓取数据/);
  assert.match(importPage, /手动导入/);
  assert.match(importPage, /浏览器辅助/);
  assert.match(importPage, /官方 API 授权/);
  assert.match(importPage, /为什么登录抖音\/视频号网页后，刷新本系统不会自动更新/);
  assert.match(importPage, /网页登录状态不会自动被本系统读取/);
  assert.match(importPage, /platform-capture-reality-matrix/);
  assert.match(importPage, /当前是否有自动抓取/);
  assert.match(importPage, /自动抓取一律显示未启用/);
  assert.match(importPage, /连接平台：待接入 OAuth/);
  assert.match(importPage, /连接平台：待官方能力确认/);
  assert.match(importPage, /未确认公开稳定个人创作者数据 API/);
  assert.match(importPage, /未确认稳定创作者内容级数据 API/);
  assert.match(importPage, /账号指标 preview-only/);
  assert.match(importPage, /trustedAutoCaptureScheduler/);
  assert.match(importPage, /当前模式/);
  assert.match(importPage, /抓取状态/);
  assert.match(importPage, /最近抓取/);
  assert.match(importPage, /下一次抓取/);
  assert.match(importPage, /人工操作/);
  assert.match(importPage, /可信定时已启用/);
  assert.match(importPage, /自动抓取：/);
  assert.match(importPage, /check-capture-auth-status/);
  assert.match(importPage, /官方 API 未接入或未授权；浏览器辅助会话未连接/);
  assert.match(importPage, /没有凭证时不会宣称每小时自动抓/);
  assert.match(importPage, /最近采集/);
  assert.match(importPage, /平台需补抓/);
  assert.match(importPage, /平台有发布后回收/);
  assert.match(importPage, /bilibili-local-file-mvp/);
  assert.match(importPage, /B站本地导出回收 MVP/);
  assert.match(importPage, /platform_local_file/);
  assert.match(importPage, /bilibili_creator_center/);
  assert.match(importPage, /账号总览仍然 preview-only/);
  assert.match(importPage, /bilibili-local-file-preview/);
  assert.match(importPage, /bilibili-local-file-save/);
  assert.match(importPage, /四平台同步与数据新鲜度/);
  assert.match(importPage, /function PlatformDataHealthPanel/);
  assert.match(importPage, /function PlatformImportStatusPanel/);
  assert.match(importPage, /手动抓取最新数据/);
  assert.match(importPage, /发布后回收当前任务/);
  assert.match(importPage, /post-publish-refresh/);
  assert.match(importPage, /postPublishRecoveryItems/);
  assert.match(importPage, /currentRecoveryItems/);
  assert.match(importPage, /currentCandidates/);
  assert.match(importPage, /isPausedWechatRecoveryText/);
  assert.match(importPage, /post-publish-recovery-assistant/);
  assert.match(importPage, /待回收内容/);
  assert.match(importPage, /建议刷新动作/);
  assert.match(importPage, /最近导入状态/);
  assert.match(importPage, /匹配 \/ 归因/);
  assert.match(importPage, /平台内容匹配失败/);
  assert.match(importPage, /match_imported_content/);
  assert.match(importPage, /匹配到本地内容\/平台版本/);
  assert.match(importPage, /manual-refresh-boundary/);
  assert.match(importPage, /手动检查节奏/);
  assert.match(importPage, /scheduled-refresh-setting/);
  assert.match(importPage, /dataCaptureScheduleReliability/);
  assert.match(importPage, /data-capture-schedule-reliability/);
  assert.match(importPage, /下次建议检查/);
  assert.match(importPage, /当前没有后台守护、小时级任务或开机自动抓取/);
  assert.match(importPage, /Windows 计划任务只提供草案/);
  assert.match(importPage, /不是平台自动回调/);
  assert.match(importPage, /import-advanced-diagnostics/);
  assert.match(importPage, /高级诊断与手动导入/);
  assert.match(importPage, /OperationHistoryTable history=\{history\}/);
  assert.match(importPage, /OperationHistoryTable history=\{currentSnapshot\.operationHistory\} showDiagnostics testId="platform-operation-history-diagnostics-table"/);
  assert.match(importPage, /showDiagnostics && <th>来源<\/th>/);
  assert.match(importPage, /showDiagnostics && <th>Run ID<\/th>/);
  assert.match(importPage, /showDiagnostics && <td><code>\{item\.runId\}<\/code><\/td>/);
  assert.match(importPage, /function operatorWarningLabel/);
  assert.match(importPage, /已跳过非本人作品/);
  assert.match(importPage, /已跳过私密互动/);
  assert.match(importPage, /已跳过非公开\/不可用内容/);
  assert.match(importPage, /operation-warning-diagnostics/);
  assert.match(importPage, /showDiagnostics \? item\.warningSummary : operatorWarningLabel\(item\.warningSummary\)/);
  assert.match(importPage, /item\.lastMessage \? operatorWarningLabel\(item\.lastMessage\) : "无"/);

  const defaultRender = importPage.slice(
    importPage.indexOf("<ImportFirstViewportGuide"),
    importPage.indexOf("<details className=\"analytics-data-section\">")
  );
  assert.doesNotMatch(defaultRender, /<option value="wechat">公众号<\/option>/);
  const advancedRender = importPage.slice(importPage.indexOf("<details className=\"analytics-data-section import-advanced-diagnostics\""));
  for (const pattern of [/daily-self-media-ops-preflight/, /--preflight-health/, /preferredDashboardUrl/, /safeWeekly=/, /trustedData=/, /pageReady=/, /\brawDir\b/, /\brunId\b/, /\brun\s*id\b/i, /douyin_creator_center/, /xiaohongshu_creator_center/, /video_account_creator_center/, /bilibili_creator_center/, /private message endpoints/i, /redacted/i, /provider source id/i, /objectId/]) {
    assert.doesNotMatch(defaultRender, pattern, `import default view exposes ${pattern}`);
  }
  assert.match(advancedRender, /DailySelfMediaOpsPanel/);
  assert.match(advancedRender, /DailyGateStatusPanel/);
  assert.match(advancedRender, /TrustedAuditPanel/);
  for (const pattern of [/daily-self-media-ops-preflight/, /--preflight-health/, /preferredDashboardUrl/, /safeWeekly=/, /trustedData=/, /pageReady=/, /\brawDir\b/, /\brunId\b/]) {
    assert.match(importPage, pattern, `import diagnostics implementation missing ${pattern}`);
  }
  assert.doesNotMatch(importPage, /Stop-Process|Remove-Item|npm run dev/);
});

test("reviews default view emphasizes conclusions metrics evidence and actions", () => {
  const reviewsPage = read("src/domain/self-media/ui/screens/ReviewsPage.tsx");
  const reviewPattern = read("src/domain/self-media/ui/patterns/EvidenceReviewReport.tsx");
  assert.match(reviewsPage, /默认只看可信真实四平台内容级数据，先读结论、指标、证据和行动项/);
  for (const phrase of ["本周结论", "复盘指标来源", "证据表格", "下轮行动项"]) {
    assert.match(reviewPattern, new RegExp(phrase));
  }
  assert.match(reviewPattern, /reviews-advanced-diagnostics/);
  assert.match(reviewPattern, /复盘原文/);
  assert.match(reviewPattern, /isPausedWechatAction/);
  assert.match(reviewPattern, /isPausedWechatEvidenceInsight/);
  assert.match(reviewPattern, /operatorActionItems/);
  assert.match(reviewPattern, /operatorEvidenceInsights/);
  assert.match(reviewPattern, /evidenceWithRefs = operatorEvidenceInsights\.filter/);
  assert.doesNotMatch(reviewPattern, /const evidenceWithRefs = snapshot\.evidenceInsights\.filter/);
  assert.match(reviewPattern, /公众号\|微信后台\|wechat\|wechat_official/);
  const reviewSidebar = reviewPattern.slice(
    reviewPattern.indexOf("<aside className=\"review-sidebar\">"),
    reviewPattern.indexOf("</aside>")
  );
  assert.doesNotMatch(reviewSidebar, /复盘历史|当前周期/);
  assert.doesNotMatch(reviewPattern, /可追溯证据 refs|Imported Metric Snapshots|AccountMetricSnapshot/);
  const defaultRender = reviewsPage.slice(reviewsPage.indexOf("<PageHeader"), reviewsPage.indexOf("<EvidenceReviewReport"));
  assert.doesNotMatch(defaultRender, /report\.json|report\.md|D:\\|npm run|http:\/\/127\.0\.0\.1|\/api\/self-media\/dashboard|runId|rawDir|evidenceFile|pageReady|apiReady|smoke|fixture|demo\/fake/i);
});

test("daily ops green state keeps dashboard import reviews defaults free of diagnostics", () => {
  const dashboardScreen = read("src/domain/self-media/ui/screens/DashboardPage.tsx");
  const importPage = read("src/domain/self-media/ui/screens/ImportPage.tsx");
  const reviewsPage = read("src/domain/self-media/ui/screens/ReviewsPage.tsx");
  const reviewPattern = read("src/domain/self-media/ui/patterns/EvidenceReviewReport.tsx");
  const forbidden = /report\.json|report\.md|D:\\|npm run|http:\/\/127\.0\.0\.1|\/api\/self-media|runId|rawDir|evidenceFile|preflight|pageReady|apiReady|\bcommand\b|exitCode|smoke|fixture|demo\/fake|\bcookie\b|\btoken\b|\bheaders?\b|comment_content|danmu_text|danmu/i;

  const dashboardDefault = dashboardScreen.slice(
    dashboardScreen.indexOf("<AppShell active=\"/dashboard\">"),
    dashboardScreen.indexOf("<DashboardSecondaryOperationsPanel")
  );
  const importDefault = importPage.slice(
    importPage.indexOf("<ImportFirstViewportGuide"),
    importPage.indexOf("<details className=\"analytics-data-section import-advanced-diagnostics\"")
  );
  const reviewsDefault = [
    reviewsPage.slice(reviewsPage.indexOf("<PageHeader"), reviewsPage.indexOf("<EvidenceReviewReport")),
    reviewPattern.slice(reviewPattern.indexOf("<Panel className=\"review-summary-panel\""), reviewPattern.indexOf("<details className=\"analytics-data-section review-advanced-diagnostics\"")),
    reviewPattern.slice(reviewPattern.indexOf("<aside className=\"review-sidebar\">"), reviewPattern.indexOf("</aside>"))
  ].join("\n");

  assert.match(dashboardScreen, /dashboard-advanced-diagnostics/);
  assert.match(importPage, /import-advanced-diagnostics/);
  assert.match(reviewPattern, /reviews-advanced-diagnostics/);
  assert.doesNotMatch(dashboardDefault, forbidden, "dashboard default exposes daily ops diagnostics after green state");
  assert.doesNotMatch(importDefault, forbidden, "import default exposes daily ops diagnostics after green state");
  assert.doesNotMatch(reviewsDefault, forbidden, "reviews default exposes daily ops diagnostics after green state");
});

test("dashboard default view is data-only and folds internal diagnostics", () => {
  const dashboardScreen = read("src/domain/self-media/ui/screens/DashboardPage.tsx");
  const metricDashboard = read("src/domain/self-media/ui/patterns/MetricDashboardGrid.tsx");
  const panelPrimitive = read("src/domain/self-media/ui/primitives/Panel.tsx");
  assert.match(dashboardScreen, /DailyOperatingChecklistPanel/);
  assert.match(dashboardScreen, /daily-operating-checklist/);
  assert.match(dashboardScreen, /DashboardSecondaryOperationsPanel/);
  assert.match(dashboardScreen, /dashboard-secondary-operations/);
  assert.match(dashboardScreen, /任务、发布台账和行动项默认收起/);
  assert.match(dashboardScreen, /DashboardAdvancedDiagnosticsPanel/);
  assert.match(dashboardScreen, /dashboard-advanced-diagnostics/);
  assert.match(panelPrimitive, /\.\.\.sectionProps/);
  for (const testId of [
    "dashboard-trusted-status",
    "dashboard-weekly-summary"
  ]) {
    assert.match(dashboardScreen, new RegExp(testId));
  }
  for (const testId of [
    "dashboard-real-data-scope",
    "dashboard-kpi-total-views",
    "dashboard-platform-distribution",
    "dashboard-platform-distribution-row",
    "dashboard-platform-engagement-row",
    "dashboard-content-ranking",
    "dashboard-content-ranking-row"
  ]) {
    assert.match(metricDashboard, new RegExp(testId));
  }
  for (const phrase of [
    "总曝光",
    "平台曝光占比",
    "平台互动对比",
    "内容表现排行"
  ]) {
    assert.match(metricDashboard, new RegExp(phrase));
  }
  assert.match(dashboardScreen, /title="周报摘要"/);
  const dashboardDefaultRender = dashboardScreen.slice(
    dashboardScreen.indexOf("<AppShell active=\"/dashboard\">"),
    dashboardScreen.indexOf("<DashboardSecondaryOperationsPanel")
  );
  for (const workflowPattern of [/StartCreatorDayFlowPanel/, /DailyOperatingChecklistPanel/, /PublishExecutionDashboardPanel/, /PostImportActionSuggestionsPanel/, /ActionTasksOperatingPanel/]) {
    assert.doesNotMatch(dashboardDefaultRender, workflowPattern, "dashboard default should stay data and charts only");
  }
  assert.match(dashboardScreen, /businessIssueSummary/);
  assert.match(dashboardScreen, /台账不改变曝光和互动指标/);
  assert.match(dashboardScreen, /return "需复核"/);
  assert.doesNotMatch(dashboardScreen, /最近审计/);
  const dailyPanel = dashboardScreen.slice(
    dashboardScreen.indexOf("function DailyOperatingChecklistPanel"),
    dashboardScreen.indexOf("function TrustedOperatingStrip")
  );
  const weeklyPanel = dashboardScreen.slice(
    dashboardScreen.indexOf("function TrustedWeeklySummaryPanel"),
    dashboardScreen.indexOf("function accountMetricSourceLabel")
  );
  const advancedPanel = dashboardScreen.slice(
    dashboardScreen.indexOf("function DashboardAdvancedDiagnosticsPanel"),
    dashboardScreen.indexOf("const suggestionTypeLabels")
  );
  const forbiddenDefaultDiagnostics = [
    /\.local/,
    /report\.json/,
    /report\.md/,
    /D:\\/,
    /npm run/,
    /http:\/\/127\.0\.0\.1/,
    /\/api\/self-media/,
    /\bpreflight\b/i,
    /\bpageReady\b/,
    /\bapiReady\b/,
    /\brunId\b/,
    /\brawDir\b/,
    /\bevidenceFile\b/,
    /\bsmoke\b/i,
    /\bfixture\b/i,
    /\bcommand\b/i,
    /\bexitCode\b/i,
    /ops gate/i,
    /daily platform ops/i,
    /demo\/fake/i
  ];
  for (const pattern of forbiddenDefaultDiagnostics) {
    assert.doesNotMatch(dailyPanel, pattern, `daily operating panel exposes ${pattern}`);
    assert.doesNotMatch(weeklyPanel, pattern, `weekly summary panel exposes ${pattern}`);
  }
  assert.match(dashboardScreen, /const dailySelfMediaOpsCommand = "npm run/);
  assert.match(advancedPanel, /dailySelfMediaOpsCommand/);
  assert.match(dashboardScreen, /const operatorDashboardApiUrl = "http:\/\/127\.0\.0\.1/);
  assert.match(advancedPanel, /operatorDashboardApiUrl/);
  assert.match(advancedPanel, /pageReady/);
  assert.match(advancedPanel, /apiReady/);
  assert.doesNotMatch(dashboardScreen, /sync:wechat|import:douyin|discover:xiaohongshu|confirm_publish.*fetch/);
});

test("dashboard number audit live mode is read-only against existing 3200", () => {
  const script = read("scripts/dashboard-number-trust-audit.mjs");
  assert.match(script, /const DEFAULT_LIVE_BASE_URL = "http:\/\/127\.0\.0\.1:3200"/);
  assert.match(script, /const live = hasFlag\(argv, "live"\)/);
  assert.match(script, /mode: live \? "live" : "fixture"/);
  assert.match(script, /baseUrl: \(argValue\(argv, "base-url"\) \?\? DEFAULT_LIVE_BASE_URL\)\.replace/);
  assert.match(script, /if \(options\.live\) \{\s+await waitForReady\(baseUrl\);\s+\} else \{\s+await seedDatabase\(\);\s+server = await startServer\(\);/);
  assert.match(script, /runTrustedAudit\(baseUrl, \{ live: options\.live \}\)/);
  assert.match(script, /const env = options\.live \? process\.env : \{ \.\.\.process\.env, SELF_MEDIA_DB_PATH: DB_PATH, SELF_MEDIA_SEED_MODE: "off" \}/);
  assert.match(script, /liveReadOnly: options\.live === true/);
  assert.match(script, /dbPath: options\.live \? null : DB_PATH/);
  assert.match(script, /nextDistDir: options\.live \? null : NEXT_DIST_DIR/);
  assert.match(script, /fixtureDatabaseCreated: options\.live \? false : true/);
  assert.match(script, /realDatabaseWrites: false/);
  assert.match(script, /serverStarted: options\.live \? false : true/);
  assert.match(script, /databaseDeletion: false/);
});
