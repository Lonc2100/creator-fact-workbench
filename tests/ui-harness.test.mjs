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
  const contentComposerLibrary = read("src/domain/self-media/ui/patterns/ContentComposerLibraryPanels.tsx");
  const dashboardScreen = read("src/domain/self-media/ui/screens/DashboardPage.tsx");
  const contentRoute = read("src/app/content/page.tsx");
  const contentWorkbenchApi = read("src/app/api/self-media/content-workbench/route.ts");
  assert.match(contentComposerLibrary, /ContentModeSwitch/);
  assert.match(contentComposerLibrary, /ContentComposerPanel/);
  assert.match(contentComposerLibrary, /ContentLibraryPanel/);
  assert.match(contentComposerLibrary, /创作/);
  assert.match(contentComposerLibrary, /内容库/);
  assert.match(contentComposerLibrary, /先把今天的新内容写出来/);
  assert.match(contentComposerLibrary, /管理已保存的内容资产/);
  assert.match(contentScreen, /requestedContentModeFromUrl/);
  assert.match(contentScreen, /const \[mode, setMode\] = useState<ContentPageMode>/);
  assert.match(contentScreen, /<ContentModeSwitch/);
  assert.match(contentScreen, /mode === "composer"/);
  assert.match(contentScreen, /<ContentComposerPanel>/);
  assert.match(contentScreen, /<ContentLibraryPanel>/);
  assert.match(contentScreen, /setMode\("library"\)/);
  assert.match(contentScreen, /mode === "library" && <p className="operation-message"/);
  assert.match(contentScreen, /title="内容工作台"/);
  assert.match(contentScreen, /先创作新内容，再到内容库管理平台版本、排期和人工发布/);
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
  assert.match(contentScreen, /scheduleInputRef\.current\?\.value \?\? scheduledAt/);
  assert.match(contentScreen, /onInput=\{\(event\) => syncScheduledAt\(event\.currentTarget\.value\)\}/);
  assert.match(contentScreen, /creator-video-schedule-preview/);
  assert.match(contentScreen, /将排期到/);
  assert.match(contentScreen, /requestedScheduleIso/);
  assert.match(contentScreen, /snapshot\.queue\.filter\(\(item\) => item\.contentId === body\.content\.id\)/);
  assert.match(contentScreen, /已填写未来发布时间，但发布日历没有完整生成四个平台排期/);
  assert.match(contentScreen, /四平台版本已保存，并已加入发布日历/);
  assert.match(contentScreen, /新视频已保存并加入发布日历/);
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
  assert.match(contentScreen, /隔离数据/);
  assert.match(contentScreen, /requestedAcceptanceRunIdFromUrl/);
  assert.match(contentScreen, /acceptanceRunId/);
  assert.match(contentScreen, /不进运营看板/);
  assert.match(contentScreen, /行动项草稿仍可在本地内容筛选里查看/);
  assert.match(contentScreen, /publishRecords/);
  const composerRender = contentScreen.slice(
    contentScreen.indexOf('mode === "composer"'),
    contentScreen.indexOf("<ContentLibraryPanel>")
  );
  assert.match(composerRender, /CreatorVideoPanel/);
  assert.doesNotMatch(composerRender, /ContentTable|ContentDetail|PlatformVersionEditor|PublishExecutionWorkbenchPanel|TrustedScopeCurationPanel|content-workbench-filters|content-acceptance-data-pool/);
  const libraryRender = contentScreen.slice(contentScreen.indexOf("<ContentLibraryPanel>"));
  assert.match(libraryRender, /ContentTable/);
  assert.match(libraryRender, /ContentDetail/);
  assert.match(libraryRender, /PlatformVersionEditor/);
  assert.match(libraryRender, /PublishExecutionWorkbenchPanel/);
  assert.match(libraryRender, /TrustedScopeCurationPanel/);
  assert.match(libraryRender, /content-workbench-filters/);
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
  assert.match(contentScreen, /全部本地内容/);
  assert.match(contentScreen, /更新时间最近/);
  assert.match(contentScreen, /发布时间最近/);
  assert.match(contentScreen, /先看进入运营看板/);
  assert.match(contentScreen, /先看不进运营看板/);
  assert.match(contentScreen, /每页/);
  assert.match(contentScreen, /密度/);
  assert.match(contentScreen, /手动补录、外部导入、历史样例和行动项草稿/);
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
  const calendarSchedulingPanels = read("src/domain/self-media/ui/patterns/CalendarSchedulingPanels.tsx");
  const calendarScreen = read("src/domain/self-media/ui/screens/CalendarPage.tsx");
  const calendarRoute = read("src/app/calendar/page.tsx");
  const formatHelpers = read("src/domain/self-media/ui/foundations/format.ts");
  const selfMediaService = read("src/domain/self-media/service/self-media-service.ts");
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
  assert.match(calendarScreen, /item\.status === "draft" \|\| item\.status === "needs_review" \|\| item\.status === "scheduled"/);
  assert.doesNotMatch(calendarScreen, /item\.status === "published" \|\| item\.status === "failed" \|\| item\.status === "blocked"/);
  assert.match(selfMediaService, /function isDefaultPublishCalendarContent/);
  assert.match(selfMediaService, /function isDefaultPublishCalendarVersion/);
  assert.match(selfMediaService, /calendarHygieneTextPattern/);
  assert.doesNotMatch(selfMediaService, /scheduledAt:\s*version\.scheduledAt\s*\?\?\s*new Date\(\)\.toISOString\(\)/);
  assert.doesNotMatch(calendarScreen, /operator_owned_work/);
  assert.match(calendarScreen, /CalendarDraftPoolPanel/);
  assert.match(calendarScreen, /calendar-draft-pool/);
  assert.match(calendarScreen, /素材池 \/ 待排草稿/);
  assert.match(calendarSchedulingPanels, /pendingItems=\{\[\]\}/);
  assert.match(calendarScreen, /isAcceptanceOrTestCalendarText/);
  assert.match(calendarScreen, /隔离数据/);
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
  assert.match(calendarSchedulingPanels, /showEmptySlots/);
  assert.match(calendarScreen, /历史发布记录/);
  assert.match(calendarScreen, /人工发布台账默认收起，不占用作品排期主屏/);
  assert.match(calendarScreen, /publishRecords/);
  assert.match(calendarSchedulingPanels, /CalendarScheduleGrid/);
  assert.match(calendarSchedulingPanels, /data-testid="calendar-primary-schedule"/);
  assert.match(calendarSchedulingPanels, /CalendarSecondarySections/);
  assert.match(calendarSchedulingPanels, /data-testid="calendar-secondary-sections"/);
  assert.match(calendarSchedulingPanels, /搜索未来排期标题/);
  assert.match(calendarSchedulingPanels, /showEmptySlots/);
  assert.match(calendarScreen, /isFutureSchedule/);
  assert.match(calendarScreen, /isFutureSchedule\(item\.scheduledAt\)/);
  assert.match(calendarScreen, /const platformFilters = operatingPlatformFilters/);
  assert.match(calendarScreen, /const statusFilters = operatingStatusFilters/);
  assert.match(calendarScreen, /CalendarScheduleGrid/);
  assert.match(calendarScreen, /CalendarSecondarySections/);
  assert.match(calendarScreen, /同一内容多平台合并显示/);
  assert.match(calendarScreen, /素材池、历史台账和更多记录默认收起/);
  assert.match(calendarScreen, /全部本地记录/);
  assert.doesNotMatch(calendarScreen, /data-testid="calendar-scope-filter"/);
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
  const reviewFocusSurface = read("src/domain/self-media/ui/patterns/ReviewFocusSurface.tsx");
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
    ["review focus", reviewFocusSurface],
    ["sidebar", sidebarNav]
  ]) {
    assert.doesNotMatch(source, /eyebrow="(?:Data actions|Weekly summary|Post-import actions|Operating tasks|Source \/ Platform|Evidence Table|History|Review Window|Action Items|Run details|Advanced import|Manual preview|Editor)"/, `${label} keeps old English eyebrow copy`);
  }

  for (const phrase of ["运营提醒", "本周复盘", "导入建议", "行动推进"]) assert.match(dashboardScreen, new RegExp(phrase));
  assert.match(metricDashboard, /eyebrow="来源平台"/);
  assert.match(metricDashboard, /只展示内容级可信指标/);
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
  assert.match(selfMediaService, /手动发布为主/);
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
  for (const navLabel of ["总览", "导入", "内容", "发布日历", "数据看板", "周月复盘"]) assert.match(sidebarNav, new RegExp(navLabel));
  assert.doesNotMatch(sidebarNav, /\/leads|label: "线索"|Users/);
  assert.doesNotMatch(sidebarNav, /Self-media operating system|UI Lab|Design lab|label: "Home"|label: "Create"|label: "Plan"|label: "Data"|label: "Review"/);
  assert.doesNotMatch(overviewPage, /href="\/leads"/);
  assert.match(overviewPage, /href="\/reviews#review-lead-followups"/);

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
  const calendarSchedulingPanels = read("src/domain/self-media/ui/patterns/CalendarSchedulingPanels.tsx");

  assert.match(contentScreen, /sourceFilter, setSourceFilter.*operating_default/s);
  assert.match(contentScreen, /isOperatingContentRow/);
  assert.match(contentScreen, /全部本地内容/);
  assert.match(contentPattern, /operatorText/);
  assert.match(contentPattern, /来源细节已隐藏/);
  assert.doesNotMatch(contentPattern, /sourceKinds\.join|trustedMetricSnapshotCount\} trusted|localMetricSnapshotCount\} local|<small>\{version\.id\}<\/small>|trusted metric evidence|Publish history|Platform Versions|Content Workbench/);
  assert.doesNotMatch(contentScreen, /local_workflow|trusted totals|manual、csv、external|action refs|全本地内容/);

  assert.match(calendarScreen, /CalendarScope/);
  assert.match(calendarScreen, /isOperatingCalendarItem/);
  assert.match(calendarScreen, /isFutureSchedule/);
  assert.match(calendarScreen, /未来作品什么时候发布/);
  assert.match(calendarScreen, /全部本地记录/);
  assert.match(calendarSchedulingPanels, /CalendarScheduleGrid/);
  assert.match(calendarSchedulingPanels, /CalendarSecondarySections/);
  assert.match(calendarSchedulingPanels, /data-testid="calendar-primary-schedule"/);
  assert.match(calendarSchedulingPanels, /data-testid="calendar-secondary-sections"/);
  assert.match(calendarSchedulingPanels, /计划新视频 \/ 新增排期/);
  assert.match(calendarPattern, /暂无可行动排期/);
  assert.match(calendarPattern, /items\.length === 0 && pendingItems\.length === 0 && !showEmptySlots/);
  assert.match(calendarPattern, /calendarCardGroupKey/);
  assert.match(calendarPattern, /calendar-content-schedule-inspector/);
  assert.match(calendarPattern, /versions\?: ContentPlatformVersion\[\]/);
  assert.doesNotMatch(calendarScreen, /calendar-scope-filter|默认运营排期|全部本地\/诊断/);
  assert.doesNotMatch(calendarScreen, /Best times|Autolists|<button disabled type="button">List<\/button>|Publish ledger|rawDir|evidenceFile|pageReady|apiReady/);
  assert.doesNotMatch(calendarPattern, /showEmptySlots=\{true\}|demo\/fake|fixture/);
});

test("import page default view is data-only and folds diagnostics", () => {
  const importPage = read("src/domain/self-media/ui/screens/ImportPage.tsx");
  const importOverview = read("src/domain/self-media/ui/patterns/ImportPlatformOverview.tsx");
  assert.match(importPage, /title="数据更新"/);
  assert.match(importPage, /手动更新平台数据，预览后确认保存/);
  assert.match(importPage, /ImportPlatformOverview/);
  assert.match(importPage, /expandedImportPanel/);
  assert.match(importPage, /openImportPanel/);
  assert.match(importPage, /syncImportPanel/);
  assert.match(importOverview, /import-platform-overview/);
  assert.match(importOverview, /今天怎么更新数据/);
  assert.match(importOverview, /手动更新平台数据，预览后确认保存/);
  assert.match(importOverview, /不会自动打开任何平台窗口/);
  assert.match(importOverview, /data-testid=\{`import-platform-card-\$\{card\.key\}`\}/);
  assert.match(importOverview, /key: "douyin"/);
  assert.match(importOverview, /key: "xiaohongshu"/);
  assert.match(importOverview, /key: "video_account"/);
  assert.match(importOverview, /key: "bilibili"/);
  assert.match(importOverview, /登录抓取可用/);
  assert.match(importOverview, /内容分析表格可用/);
  assert.match(importOverview, /手动更新为主/);
  assert.match(importOverview, /内容级导入可用/);
  assert.match(importOverview, /账号指标仍 preview-only/);
  assert.match(importOverview, /视频号手动更新证据/);
  assert.match(importOverview, /B站内容级导入证据/);
  assert.match(importOverview, /打开抖音更新/);
  assert.match(importOverview, /打开小红书更新/);
  assert.match(importOverview, /手动更新视频号/);
  assert.match(importOverview, /导入 B站数据/);
  assert.match(importOverview, /import-first-screen-boundary/);
  assert.match(importOverview, /ImportPlatformFlowState/);
  assert.match(importOverview, /import-platform-freshness-warning/);
  assert.match(importOverview, /哪些数据建议刷新/);
  assert.match(importOverview, /today-refresh-checklist/);
  assert.match(importOverview, /today-refresh-row/);
  assert.match(importOverview, /今日建议刷新/);
  assert.match(importOverview, /暂无最近刷新记录，建议先补一次内容级数据/);
  assert.match(importOverview, /登录创作者中心后回到这里重新检查\/预览/);
  assert.match(importOverview, /切到内容分析表格页后读取/);
  assert.match(importOverview, /准备作品级数据，手动粘贴或上传后预览/);
  assert.match(importOverview, /导入当前稿件级表格/);
  assert.match(importOverview, /24 小时内新鲜/);
  assert.match(importOverview, /24-72 小时建议刷新/);
  assert.match(importOverview, /超过 72 小时需要刷新/);
  assert.match(importOverview, /数据新鲜/);
  assert.match(importOverview, /建议刷新/);
  assert.match(importOverview, /需要刷新/);
  assert.match(importOverview, /可刷新/);
  assert.match(importOverview, /需要登录/);
  assert.match(importOverview, /当前平台暂不支持自动抓取/);
  assert.match(importOverview, /import-platform-next-step/);
  assert.match(importOverview, /import-platform-freshness/);
  assert.match(importOverview, /import-platform-check-status/);
  assert.match(importOverview, /这些提示只提醒你补抓，不会制造假数据/);
  assert.doesNotMatch(importOverview, /\/api\/self-media|runId|rawDir|evidenceFile|storageState|password|cookie|token|header/i);
  assert.match(importPage, /login-capture-detail-panel/);
  assert.match(importPage, /douyin-import-update-detail/);
  assert.match(importPage, /xiaohongshu-import-update-detail/);
  assert.match(importPage, /video_account-import-update-detail/);
  assert.match(importPage, /bilibili-import-update-detail/);
  assert.match(importPage, /登录抓取状态与手动刷新/);
  assert.match(importPage, /抖音更新详情/);
  assert.match(importPage, /小红书更新详情/);
  assert.match(importPage, /发布后数据回收/);
  assert.match(importPage, /登录抓取/);
  assert.match(importPage, /本地导出兜底/);
  assert.match(importPage, /importCaptureStates/);
  assert.match(importPage, /runLoginCaptureAutoRefresh\("manual", false\)/);
  assert.match(importPage, /需要切到作品\/数据页面/);
  assert.match(importPage, /已抓到预览，等待确认保存/);
  assert.match(importPage, /请先在打开的抖音创作者中心登录/);
  assert.match(importPage, /请切到数据看板 \/ 内容分析 \/ 笔记数据表格/);
  assert.match(importPage, /视频号主路径是手动录入或粘贴内容级数据/);
  assert.match(importPage, /B站可导入稿件内容级表格/);
  assert.match(importPage, /切到作品管理页/);
  assert.match(importPage, /请切到作品管理页再抓/);
  assert.match(importPage, /连接平台：待接入 OAuth/);
  assert.match(importPage, /连接平台：待官方能力确认/);
  assert.match(importPage, /未确认公开稳定个人创作者数据 API/);
  assert.match(importPage, /官方能力待确认，个人创作者不默认假设可用/);
  assert.match(importPage, /视频号手动更新为主/);
  assert.match(importPage, /账号指标 preview-only/);
  assert.match(importPage, /trustedAutoCaptureScheduler/);
  assert.match(importPage, /login-flow-primary/);
  assert.match(importPage, /推荐主入口/);
  assert.match(importPage, /检查登录抓取状态/);
  assert.match(importPage, /本地导出兜底/);
  assert.match(importPage, /local-export-fallback/);
  assert.match(importPage, /CSV \/ XLSX 仍可用，但不是推荐路线/);
  assert.ok(importPage.indexOf("login-flow-primary") < importPage.indexOf("local-export-fallback"));
  assert.ok(importPage.indexOf("post-publish-refresh") < importPage.indexOf("local-export-fallback"));
  assert.match(importPage, /当前模式/);
  assert.match(importPage, /抓取状态/);
  assert.match(importPage, /最近抓取/);
  assert.match(importPage, /下一次抓取/);
  assert.match(importPage, /人工操作/);
  assert.match(importPage, /自动抓取：/);
  assert.match(importOverview, /data-testid=\{`import-platform-open-\$\{card\.key\}`\}/);
  assert.match(importPage, /还没有连接好。请打开平台后台，登录后切到作品管理页/);
  assert.match(importPage, /login-capture-auto-refresh/);
  assert.match(importPage, /登录抓取状态检查/);
  assert.match(importPage, /进入本页只刷新本机登录 profile 状态/);
  assert.match(importPage, /不会自动打开抖音\/小红书\/视频号窗口/);
  assert.match(importPage, /login-capture-auto-refresh-button/);
  assert.match(importPage, /打开抖音作品管理页/);
  assert.match(importPage, /打开小红书笔记管理页/);
  assert.match(importPage, /需要切到.*作品管理页/);
  assert.match(importPage, /需要切到.*笔记管理页/);
  assert.match(importPage, /手动打开后台并刷新/);
  assert.match(importPage, /login-capture-startup-check/);
  assert.match(importPage, /启动检查/);
  assert.doesNotMatch(importPage, /runLoginCaptureAutoRefresh\("startup"/);
  assert.doesNotMatch(importPage, /runLoginCaptureAutoRefresh\("focus_return"/);
  assert.match(importPage, /startupAutoRefreshStarted/);
  assert.match(importPage, /returnRefreshPromptLastShownAt/);
  assert.match(importPage, /shouldPromptLoginCaptureRefreshOnReturn/);
  assert.match(importPage, /visibilitychange/);
  assert.match(importPage, /document\.visibilityState/);
  assert.match(importPage, /useRef/);
  assert.match(importPage, /login-capture-auto-refresh-results/);
  assert.match(importPage, /login-capture-next-step/);
  assert.match(importPage, /检测到你回到本页，可点击/);
  assert.match(importPage, /\/api\/self-media\/browser-capture\/auto-refresh/);
  assert.match(importPage, /runLoginCaptureAutoRefresh\("manual", true\)/);
  assert.match(importPage, /body: JSON\.stringify\({ platforms: "all", autoOpen, trigger }\)/);
  assert.match(importPage, /trigger/);
  assert.match(importPage, /openedWindowCount/);
  assert.match(importPage, /autoOpenEnabled/);
  assert.match(importPage, /已按你的点击打开作品\/笔记管理入口/);
  assert.match(importPage, /setDouyinBrowserResult\(preview\)/);
  assert.match(importPage, /setXiaohongshuBrowserResult\(preview\)/);
  assert.match(importPage, /不会静默保存/);
  assert.match(importPage, /authed-browser-profile-manager/);
  assert.match(importPage, /本机登录会话/);
  assert.match(importPage, /每个平台使用独立本机会话/);
  assert.match(importPage, /未打开/);
  assert.match(importPage, /等待登录/);
  assert.match(importPage, /已登录可能可用/);
  assert.match(importPage, /会话过期/);
  assert.match(importPage, /抓取失败/);
  assert.match(importPage, /\/api\/self-media\/browser-capture/);
  assert.match(importPage, /douyin-login-browser-flow/);
  assert.match(importPage, /id="douyin-authed-browser-capture-mvp"/);
  assert.match(importPage, /抖音登录后读取作品/);
  assert.doesNotMatch(importPage, /\.local\/browser-profiles\/douyin|\.local\/browser-profiles\/xiaohongshu/);
  assert.match(importPage, /作品管理\/数据表现/);
  assert.match(importPage, /douyin-login-browser-login-confirm/);
  assert.match(importPage, /douyin-login-browser-save-confirm/);
  assert.match(importPage, /douyin-login-browser-open/);
  assert.match(importPage, /douyin-login-browser-status/);
  assert.match(importPage, /douyin-login-browser-read/);
  assert.match(importPage, /douyin-login-browser-open-detail/);
  assert.match(importPage, /AI 点开首条作品详情/);
  assert.match(importPage, /open_first_visible_detail/);
  assert.match(importPage, /douyin-login-browser-detail-read/);
  assert.match(importPage, /从当前作品详情页预览/);
  assert.match(importPage, /capture_current_detail_preview/);
  assert.match(importPage, /douyin-login-browser-save/);
  assert.match(importPage, /douyin-login-browser-close/);
  assert.match(importPage, /douyin-login-browser-dashboard-link/);
  assert.match(importPage, /\/api\/self-media\/platform-imports\/browser-capture\/douyin/);
  assert.match(importPage, /canSaveAuthedBrowserRow/);
  assert.match(importPage, /nativeIdConfidenceLabel/);
  assert.match(importPage, /sourcePageKindLabel/);
  assert.match(importPage, /可保存候选/);
  assert.match(importPage, /保存后进入数据看板/);
  assert.match(importPage, /douyinBrowserSaveCandidateCount > 0/);
  assert.match(importPage, /不会自动保存账号总览或敏感互动内容/);
  assert.match(importPage, /读取结果只保存内容级可信指标/);
  assert.match(importPage, /xiaohongshu-login-browser-flow/);
  assert.match(importPage, /小红书登录后读取笔记/);
  assert.match(importPage, /小红书创作服务平台/);
  assert.match(importPage, /数据看板 \/ 内容分析 \/ 笔记数据/);
  assert.match(importPage, /读取内容分析表格/);
  assert.match(importPage, /来自小红书创作者后台内容分析表格/);
  assert.match(importPage, /每行一条笔记/);
  assert.match(importPage, /保存前人工确认/);
  assert.match(importPage, /公开推荐页、非本人内容或私密互动/);
  assert.match(importPage, /xiaohongshu-login-browser-login-confirm/);
  assert.match(importPage, /xiaohongshu-login-browser-save-confirm/);
  assert.match(importPage, /xiaohongshu-login-browser-open/);
  assert.match(importPage, /xiaohongshu-login-browser-status/);
  assert.match(importPage, /xiaohongshu-login-browser-read/);
  assert.match(importPage, /xiaohongshu-login-browser-open-detail/);
  assert.match(importPage, /AI 点开首条笔记详情/);
  assert.match(importPage, /open_first_visible_detail/);
  assert.match(importPage, /xiaohongshu-login-browser-detail-read/);
  assert.match(importPage, /从当前笔记详情页预览/);
  assert.match(importPage, /xiaohongshu-login-browser-save/);
  assert.match(importPage, /xiaohongshu-login-browser-close/);
  assert.match(importPage, /xiaohongshu-login-browser-dashboard-link/);
  assert.match(importPage, /xiaohongshu-authed-browser-preview/);
  assert.match(importPage, /\/api\/self-media\/platform-imports\/browser-capture\/xiaohongshu/);
  assert.match(importPage, /xiaohongshuBrowserSaveCandidateCount > 0/);
  assert.match(importPage, /不会自动保存公开推荐页、非本人内容或私密互动/);
  assert.match(importPage, /读取结果只保存内容级可信指标/);
  assert.match(importPage, /douyin-local-file-mvp/);
  assert.match(importPage, /抖音本地导出回收 MVP/);
  assert.match(importPage, /官方能力需要授权和权限开通/);
  assert.match(importPage, /网页登录刷新不会自动抓取系统数据/);
  assert.match(importPage, /douyin-local-file-upload/);
  assert.match(importPage, /douyin-local-file-confirm/);
  assert.match(importPage, /douyin-local-file-preview/);
  assert.match(importPage, /douyin-local-file-save/);
  assert.match(importPage, /douyin-local-file-dashboard-link/);
  assert.match(importPage, /bilibili-local-file-mvp/);
  assert.match(importPage, /xiaohongshu-local-file-mvp/);
  assert.match(importPage, /小红书本地导出回收 MVP/);
  assert.match(importPage, /xiaohongshu_creator_center/);
  assert.match(importPage, /小红书创作服务平台导出的内容级表格/);
  assert.match(importPage, /xiaohongshu-local-file-upload/);
  assert.match(importPage, /xiaohongshu-local-file-confirm/);
  assert.match(importPage, /xiaohongshu-local-file-preview/);
  assert.match(importPage, /xiaohongshu-local-file-save/);
  assert.match(importPage, /xiaohongshu-local-file-dashboard-link/);
  assert.match(importPage, /video-account-local-file-mvp/);
  assert.match(importPage, /视频号手动更新/);
  assert.match(importPage, /手动更新为主/);
  assert.match(importPage, /登录抓取需扫码，暂不作为每日自动流程/);
  assert.match(importPage, /官方能力待确认，个人创作者不默认假设可用/);
  assert.match(importPage, /后续探索：尝试登录抓取/);
  assert.match(importPage, /video_account_creator_center/);
  assert.match(importPage, /视频号助手手动更新的内容级表格/);
  assert.match(importPage, /video-account-local-file-upload/);
  assert.match(importPage, /video-account-local-file-csv/);
  assert.match(importPage, /videoAccountLocalExportPlaceholder/);
  assert.match(importPage, /video-account-manual-field-guide/);
  assert.match(importPage, /作品标题、发布时间、播放\/曝光、点赞、评论、收藏、分享/);
  assert.match(importPage, /今天从视频号助手确认过/);
  assert.match(importPage, /没有今天确认过的数据时先不要保存/);
  assert.match(importPage, /视频号新鲜度已按手动更新证据刷新/);
  assert.match(importPage, /刷新视频号数据状态/);
  assert.match(importPage, /video-account-local-file-confirm/);
  assert.match(importPage, /video-account-local-file-preview/);
  assert.match(importPage, /video-account-local-file-save/);
  assert.match(importPage, /video-account-local-file-dashboard-link/);
  assert.match(importPage, /B站内容级导入/);
  assert.match(importPage, /bilibiliLocalExportPlaceholder/);
  assert.match(importPage, /bilibili-content-import-field-guide/);
  assert.match(importPage, /稿件 ID\/BV 号、标题、发布时间、播放、点赞、评论、弹幕、收藏、分享、投币/);
  assert.match(importPage, /今天从 B站创作中心确认过/);
  assert.match(importPage, /没有当前确认过的稿件数据时先不要保存/);
  assert.match(importPage, /B站新鲜度已按内容级导入证据刷新/);
  assert.match(importPage, /刷新 B站数据状态/);
  assert.doesNotMatch(importPage, /sampleBilibiliLocalExportCsv|sampleVideoAccountLocalExportCsv/);
  assert.match(importPage, /platform_local_file/);
  assert.match(importPage, /bilibili_creator_center/);
  assert.match(importPage, /账号总览仍然 preview-only/);
  assert.match(importPage, /bilibili-local-file-upload/);
  assert.match(importPage, /bilibili-local-file-confirm/);
  assert.match(importPage, /bilibili-local-file-preview/);
  assert.match(importPage, /bilibili-local-file-save/);
  assert.match(importPage, /bilibili-local-file-dashboard-link/);
  assert.match(importPage, /确认保存到看板/);
  assert.match(importPage, /不保存登录凭证或网页请求内容/);
  assert.match(importPage, /平台原生字段/);
  assert.match(importPage, /normalizedMetricLabels/);
  assert.match(importPage, /字段格式需要按真实导出表人工确认/);
  assert.doesNotMatch(importPage, /Native metrics|本地原始字段/);
  assert.match(importPage, /四平台同步与数据新鲜度/);
  assert.match(importPage, /function PlatformDataHealthPanel/);
  assert.match(importPage, /function PlatformImportStatusPanel/);
  assert.match(importPage, /登录抓取/);
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
  assert.match(importPage, /AuthedBrowserProfileManager/);
  assert.ok(importPage.indexOf("import-advanced-diagnostics") < importPage.indexOf("<AuthedBrowserProfileManager"));
  assert.match(importPage, /更多设置与手动导入/);
  assert.match(importPage, /data-testid="platform-sync-freshness-detail"/);
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

  assert.doesNotMatch(importOverview, /官方 API 授权|本地导出兜底|为什么登录抖音|网页登录状态|CaptureRealityMatrix|platform-capture-reality-matrix|发布后回收|raw|\/api/i);

  const defaultRender = importPage.slice(
    importPage.indexOf("<ImportPlatformOverview"),
    importPage.indexOf("<details\n          className=\"analytics-data-section import-update-detail\"")
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

test("reviews default view emphasizes recent performance top content and focused actions", () => {
  const reviewsPage = read("src/domain/self-media/ui/screens/ReviewsPage.tsx");
  const reviewPattern = read("src/domain/self-media/ui/patterns/EvidenceReviewReport.tsx");
  const reviewFocusSurface = read("src/domain/self-media/ui/patterns/ReviewFocusSurface.tsx");
  assert.match(reviewsPage, /先看最近表现、Top 内容和少量行动项/);
  assert.match(reviewsPage, /ReviewFocusSurface/);
  assert.match(reviewsPage, /reviews-full-detail/);
  assert.match(reviewFocusSurface, /reviews-focus-surface/);
  assert.match(reviewFocusSurface, /review-top-content/);
  assert.match(reviewFocusSurface, /review-priority-actions/);
  assert.match(reviewFocusSurface, /review-lead-followups/);
  assert.match(reviewFocusSurface, /近 7 天/);
  assert.match(reviewFocusSurface, /近 30 天/);
  assert.match(reviewFocusSurface, /slice\(0, 5\)/);
  assert.match(reviewFocusSurface, /href="\/leads"/);
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
  const defaultRender = [
    reviewsPage.slice(reviewsPage.indexOf("<PageHeader"), reviewsPage.indexOf("<EvidenceReviewReport")),
    reviewFocusSurface
  ].join("\n");
  assert.doesNotMatch(defaultRender, /report\.json|report\.md|D:\\|npm run|http:\/\/127\.0\.0\.1|\/api\/self-media\/dashboard|runId|rawDir|evidenceFile|pageReady|apiReady|smoke|fixture|demo\/fake/i);
});

test("daily ops green state keeps dashboard import reviews defaults free of diagnostics", () => {
  const dashboardScreen = read("src/domain/self-media/ui/screens/DashboardPage.tsx");
  const importPage = read("src/domain/self-media/ui/screens/ImportPage.tsx");
  const reviewsPage = read("src/domain/self-media/ui/screens/ReviewsPage.tsx");
  const reviewPattern = read("src/domain/self-media/ui/patterns/EvidenceReviewReport.tsx");
  const reviewFocusSurface = read("src/domain/self-media/ui/patterns/ReviewFocusSurface.tsx");
  const forbidden = /report\.json|report\.md|D:\\|npm run|http:\/\/127\.0\.0\.1|\/api\/self-media|runId|rawDir|evidenceFile|preflight|pageReady|apiReady|\bcommand\b|exitCode|smoke|fixture|demo\/fake|\bcookie\b|\btoken\b|\bheaders?\b|comment_content|danmu_text|danmu/i;

  const dashboardDefault = dashboardScreen.slice(
    dashboardScreen.indexOf("<AppShell active=\"/dashboard\">"),
    dashboardScreen.indexOf("<DashboardSecondaryOperationsPanel")
  );
  const importDefault = importPage.slice(
    importPage.indexOf("<ImportPlatformOverview"),
    importPage.indexOf("<details\n          className=\"analytics-data-section import-update-detail\"")
  );
  const reviewsDefault = [
    reviewsPage.slice(reviewsPage.indexOf("<PageHeader"), reviewsPage.indexOf("<EvidenceReviewReport")),
    reviewFocusSurface
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
    "内容表现排行",
    "作品发布时间窗口",
    "最近作品优先",
    "最新快照",
    "最近保存",
    "最近抓取/保存"
  ]) {
    assert.match(metricDashboard, new RegExp(phrase));
  }
  assert.match(metricDashboard, /dashboard-recency-7/);
  assert.match(metricDashboard, /dashboard-recency-30/);
  assert.match(metricDashboard, /entriesForPublishedWindow/);
  assert.match(metricDashboard, /latestEntryByContent/);
  assert.match(dashboardScreen, /title="周报摘要"/);
  const dashboardDefaultRender = dashboardScreen.slice(
    dashboardScreen.indexOf("<AppShell active=\"/dashboard\">"),
    dashboardScreen.indexOf("<DashboardSecondaryOperationsPanel")
  );
  for (const workflowPattern of [/StartCreatorDayFlowPanel/, /AccountMetricTrendPanel/, /DailyOperatingChecklistPanel/, /PublishExecutionDashboardPanel/, /PostImportActionSuggestionsPanel/, /ActionTasksOperatingPanel/]) {
    assert.doesNotMatch(dashboardDefaultRender, workflowPattern, "dashboard default should stay data and charts only");
  }
  assert.match(dashboardScreen, /businessIssueSummary/);
  assert.match(dashboardScreen, /台账不改变曝光和互动指标/);
  assert.match(dashboardScreen, /realCaptureFreshnessWindowLabel/);
  assert.match(dashboardScreen, /DashboardFreshnessNotice/);
  assert.match(dashboardScreen, /dashboard-freshness-notice/);
  assert.match(dashboardScreen, /开场只读检查/);
  assert.match(dashboardScreen, /dashboardStartupFreshnessSummary/);
  assert.match(dashboardScreen, /dashboard-freshness-platform-summary/);
  assert.match(dashboardScreen, /首次进入看板或导入页会检查数据新鲜度/);
  assert.match(dashboardScreen, /不会打开平台窗口，也不会静默保存/);
  assert.match(dashboardScreen, /今天可以先看数据/);
  assert.match(dashboardScreen, /去导入页刷新/);
  assert.match(dashboardScreen, /24 小时内有真实抓取，数据新鲜/);
  assert.match(dashboardScreen, /真实抓取超过 24 小时，建议刷新/);
  assert.match(dashboardScreen, /真实抓取超过 72 小时，需要刷新/);
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

test("douyin authed browser capture route keeps credential material outside the import contract", () => {
  const route = read("src/app/api/self-media/platform-imports/browser-capture/douyin/route.ts");
  const selector = read("src/domain/self-media/providers/creator-center-row-selector.ts");
  const provider = read("src/domain/self-media/providers/authed-browser-profile-provider.ts");
  assert.match(route, /chromium\.launchPersistentContext/);
  assert.match(route, /authedBrowserProfileDir\("douyin"\)/);
  assert.match(route, /resolveAuthedBrowserTargetUrl\("douyin", target\)/);
  assert.match(route, /body\.target \?\? "works_page"/);
  assert.match(provider, /douyin: "https:\/\/creator\.douyin\.com\/creator-micro\/content\/manage"/);
  assert.doesNotMatch(route, /browser\.newContext|storageState\s*\(|cookies\s*\(|setExtraHTTPHeaders|request\.headers|response\.text\(\)/);
  assert.match(route, /blockedInputKeys = \["cookie", "token", "password", "header", "headers", "authorization", "raw", "request", "response", "storage", "storageState", "screenshot", "har", "trace", "credential"\]/);
  assert.match(route, /extractVisibleRows/);
  assert.match(route, /selectDouyinCreatorCenterRows/);
  assert.match(route, /extractCurrentDetailRow/);
  assert.match(route, /selectDouyinCreatorCenterDetailRow/);
  assert.match(route, /openFirstVisibleDetail/);
  assert.match(route, /open_first_visible_detail/);
  assert.match(route, /page\.mouse\.click/);
  assert.match(route, /发布\|删除\|提交\|审核\|修改\|编辑\|授权\|开通\|支付\|上传\|私信/);
  assert.match(route, /capture_current_detail_preview/);
  assert.match(route, /CreatorCenterDomCandidate/);
  assert.match(route, /childCandidateCount/);
  assert.match(route, /hasTrustedCreatorCenterRowShape/);
  assert.match(selector, /sourcePageKind: "creator_center_owned_works"/);
  assert.match(selector, /sourcePageKind: "creator_center_owned_detail"/);
  assert.match(selector, /owned_creator_center_detail/);
  assert.match(selector, /nativeIdConfidence/);
  assert.match(selector, /isNoisyContainer/);
  assert.match(selector, /noisy_visible_dom_title/);
  assert.match(selector, /fallback_text_hash/);
  assert.match(route, /saveCandidateRows/);
  assert.match(route, /no_creator_center_owned_save_candidates/);
  assert.match(route, /importDouyinBrowserVisibleRows/);
  assert.match(route, /loginState === "logged_in_or_accessible"/);
  assert.match(route, /accountMetricsExcluded: true/);
  assert.doesNotMatch(route, /action:\s*"save"|userConfirmedContentMetrics:\s*true|storageState\s*\(|cookies\s*\(|setExtraHTTPHeaders|request\.headers|response\.text\(\)|screenshot\s*\(|tracing\./);
});

test("xiaohongshu authed browser capture route keeps login material and public recommendations outside the import contract", () => {
  const route = read("src/app/api/self-media/platform-imports/browser-capture/xiaohongshu/route.ts");
  const selector = read("src/domain/self-media/providers/creator-center-row-selector.ts");
  const config = read("src/domain/self-media/config/self-media-config.ts");
  const provider = read("src/domain/self-media/providers/authed-browser-profile-provider.ts");
  assert.match(route, /chromium\.launchPersistentContext/);
  assert.match(route, /authedBrowserProfileDir\("xiaohongshu"\)/);
  assert.match(route, /resolveAuthedBrowserTargetUrl\("xiaohongshu", target\)/);
  assert.match(route, /body\.target \?\? "works_page"/);
  assert.match(config, /startUrl: "https:\/\/creator\.xiaohongshu\.com\/new\/note-manager"/);
  assert.match(provider, /xiaohongshu: "https:\/\/creator\.xiaohongshu\.com\/new\/note-manager"/);
  assert.doesNotMatch(route, /storageState\s*\(|cookies\s*\(|setExtraHTTPHeaders|request\.headers|response\.text\(\)/);
  assert.match(route, /blockedInputKeys = \["cookie", "token", "password", "header", "headers", "authorization", "raw", "request", "response", "storage", "storageState", "screenshot", "har", "trace", "credential"\]/);
  assert.match(route, /extractVisibleRows/);
  assert.match(route, /selectXiaohongshuCreatorCenterRows/);
  assert.match(route, /extractCurrentDetailRow/);
  assert.match(route, /selectXiaohongshuCreatorCenterDetailRow/);
  assert.match(route, /openFirstVisibleDetail/);
  assert.match(route, /open_first_visible_detail/);
  assert.match(route, /page\.mouse\.click/);
  assert.match(route, /发布\|删除\|提交\|审核\|修改\|编辑\|授权\|开通\|支付\|上传\|私信/);
  assert.match(route, /capture_current_detail_preview/);
  assert.match(route, /CreatorCenterDomCandidate/);
  assert.match(route, /childCandidateCount/);
  assert.match(route, /hasTrustedCreatorCenterRowShape/);
  assert.match(selector, /sourcePageKind: "creator_center_owned_works"/);
  assert.match(selector, /sourcePageKind: "creator_center_owned_detail"/);
  assert.match(selector, /owned_creator_center_detail/);
  assert.match(selector, /nativeIdConfidence/);
  assert.match(selector, /isNoisyContainer/);
  assert.match(selector, /noisy_visible_dom_title/);
  assert.match(selector, /notes-request/);
  assert.match(route, /saveCandidateRows/);
  assert.match(route, /no_creator_center_owned_save_candidates/);
  assert.match(route, /creator\.xiaohongshu\.com/);
  assert.match(route, /wrong_page/);
  assert.match(route, /publicRecommendationExcluded: true/);
  assert.match(selector, /发现\|探索\|搜索\|推荐\|热门\|话题/);
  assert.match(route, /importXiaohongshuBrowserVisibleRows/);
  assert.match(route, /loginState === "logged_in_or_accessible"/);
  assert.doesNotMatch(route, /action:\s*"save"|userConfirmedContentMetrics:\s*true|storageState\s*\(|cookies\s*\(|setExtraHTTPHeaders|request\.headers|response\.text\(\)|screenshot\s*\(|tracing\./);
});

test("browser capture profile route exposes local-only session controls", () => {
  const route = read("src/app/api/self-media/browser-capture/route.ts");
  const provider = read("src/domain/self-media/providers/authed-browser-profile-provider.ts");
  const config = read("src/domain/self-media/config/self-media-config.ts");
  assert.match(route, /GET\(request: Request\)/);
  assert.match(route, /POST\(request: Request\)/);
  assert.match(route, /openAuthedBrowserProfile/);
  assert.match(route, /confirmAuthedBrowserProfileLogin/);
  assert.match(route, /blockedInputKeys = \["cookie", "token", "password", "header", "headers", "authorization", "raw", "request", "response", "storage", "storageState", "screenshot", "har", "trace", "credential"\]/);
  assert.match(provider, /\.local\/browser-profiles/);
  assert.match(provider, /noCookieTokenHeaderInBusinessDb: true/);
  assert.match(provider, /noStorageStateExport: true/);
  assert.match(provider, /noSensitiveLoginMaterialInDocsTestsOrGit: true/);
  assert.match(config, /profileDirRef: "\.local\/browser-profiles\/douyin"/);
  assert.match(config, /profileDirRef: "\.local\/browser-profiles\/xiaohongshu"/);
  assert.match(config, /platform: "xiaohongshu",[\s\S]*captureMvpEnabled: true/);
  assert.match(config, /profileDirRef: "\.local\/browser-profiles\/video_account"/);
  assert.match(config, /profileDirRef: "\.local\/browser-profiles\/bilibili"/);
});

test("browser capture auto refresh is user-triggered preview only", () => {
  const route = read("src/app/api/self-media/browser-capture/auto-refresh/route.ts");
  assert.match(route, /mode: "user_triggered_preview_only"/);
  assert.match(route, /trigger = body\.trigger === "startup" \? "startup" : body\.trigger === "focus_return" \? "focus_return" : "manual"/);
  assert.match(route, /const autoOpen = trigger === "manual" && body\.autoOpen === true/);
  assert.match(route, /target: action === "open" \? "works_page" : undefined/);
  assert.match(route, /需要作品\/笔记页/);
  assert.match(route, /进入“作品管理”/);
  assert.match(route, /进入“笔记管理”/);
  assert.match(route, /autoOpenEnabled: autoOpen/);
  assert.match(route, /点击“手动打开后台并刷新”后再预览/);
  assert.match(route, /已按手动操作打开/);
  assert.match(route, /openedWindowCount/);
  assert.match(route, /openedWindow/);
  assert.match(route, /previewOnly: true/);
  assert.match(route, /userMustConfirmSave: true/);
  assert.match(route, /noSilentBackgroundCapture: true/);
  assert.match(route, /localExportFallbackOnly: true/);
  assert.match(route, /bilibiliAccountMetricsPreviewOnly: true/);
  assert.match(route, /capture_preview/);
  assert.match(route, /postCapture\(origin, profile\.platform, "open"\)/);
  assert.match(route, /canAttemptPreview/);
  assert.match(route, /waiting_login/);
  assert.match(route, /session_maybe_available/);
  assert.match(route, /capture_failed/);
  assert.match(route, /userConfirmedLogin: true/);
  assert.match(route, /视频号手动更新为主/);
  assert.match(route, /登录抓取需扫码，暂不作为每日自动流程/);
  assert.match(route, /video_account_manual_update_primary/);
  assert.match(route, /blockedInputKeys = \["cookie", "token", "password", "header", "headers", "raw", "request", "response", "storage", "screenshot", "har", "trace", "credential"\]/);
  assert.doesNotMatch(route, /action:\s*"save"|userConfirmedContentMetrics:\s*true|storageState\s*\(|cookies\s*\(|setExtraHTTPHeaders|request\.headers|response\.text\(\)|screenshot\s*\(|tracing\./);
});
