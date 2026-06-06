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
  assert.match(contentScreen, /\/api\/self-media\/creator-drafts/);
  assert.match(contentScreen, /action: "discuss"/);
  assert.match(contentScreen, /creator-copilot-discussion/);
  assert.match(contentScreen, /分析并生成讨论稿/);
  assert.match(contentScreen, /按调整重新生成/);
  assert.match(contentScreen, /生成并保存四平台版本/);
  assert.match(contentScreen, /平台激励\/创作标签均为建议/);
  assert.match(contentScreen, /publish-execution-workbench/);
  assert.match(contentScreen, /今日\/近期待发布/);
  assert.match(contentScreen, /人工确认已发布/);
  assert.match(contentScreen, /记录发布失败/);
  assert.match(contentScreen, /记录发布阻塞/);
  assert.match(contentScreen, /去手动抓取最新数据/);
  assert.match(contentScreen, /ContentWorkbenchSnapshot/);
  assert.match(contentScreen, /\/api\/self-media\/content-workbench/);
  assert.match(contentScreen, /默认运营视图/);
  assert.match(contentScreen, /不进运营看板/);
  assert.match(contentScreen, /行动项草稿/);
  assert.match(contentScreen, /publishRecords/);
  assert.match(contentRoute, /getSelfMediaContentWorkbench/);
  assert.doesNotMatch(contentRoute, /getSelfMediaDashboard/);
  assert.match(contentWorkbenchApi, /getSelfMediaContentWorkbench/);
  assert.match(dashboardScreen, /打开内容草稿/);
  assert.match(dashboardScreen, /contentId=/);
  assert.match(dashboardScreen, /dashboard-publish-execution-workbench/);
  assert.match(dashboardScreen, /发布执行台/);
});

test("content workbench exposes filters sorting pagination and trusted-scope copy", () => {
  const contentScreen = read("src/domain/self-media/ui/screens/ContentPage.tsx");
  const contentPattern = read("src/domain/self-media/ui/patterns/ContentManagement.tsx");
  const contentRoute = read("src/app/content/page.tsx");
  assert.match(contentScreen, /content-workbench-filters/);
  assert.match(contentScreen, /显示范围/);
  assert.match(contentScreen, /operating_default/);
  assert.match(contentScreen, /运营优先/);
  assert.match(contentScreen, /全部本地\/诊断/);
  assert.match(contentScreen, /更新时间最近/);
  assert.match(contentScreen, /发布时间最近/);
  assert.match(contentScreen, /先看进入运营看板/);
  assert.match(contentScreen, /先看不进运营看板/);
  assert.match(contentScreen, /每页/);
  assert.match(contentScreen, /密度/);
  assert.match(contentScreen, /手动补录、外部导入和行动项草稿/);
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
  assert.match(calendarPattern, /calendar-confirm-publish/);
  assert.match(calendarPattern, /人工发布确认/);
  assert.match(calendarPattern, /只记录人工结果，便于复盘排期/);
  assert.match(calendarPattern, /calendar-reschedule-input/);
  assert.match(calendarPattern, /calendar-reschedule-save/);
  assert.match(calendarPattern, /修改排期时间/);
  assert.match(calendarPattern, /保存排期时间/);
  assert.match(calendarPattern, /const key = item\.contentId \|\| item\.platformVersionId/);
  assert.match(calendarPattern, /data-content-id=\{item\.contentId\}/);
  assert.match(calendarPattern, /PendingScheduleQueue/);
  assert.match(calendarPattern, /calendar-pending-schedule-queue/);
  assert.match(calendarPattern, /calendar-pending-draft-card/);
  assert.match(calendarPattern, /calendar-empty-real-queue-note/);
  assert.match(calendarPattern, /不用假排期占位/);
  assert.match(calendarScreen, /action: "confirm_publish"/);
  assert.match(calendarScreen, /日历人工确认发布/);
  assert.match(calendarScreen, /发布记录台账/);
  assert.match(calendarScreen, /publish-ledger/);
  assert.match(calendarScreen, /本地人工确认记录/);
  assert.match(calendarScreen, /pendingSchedulingItems/);
  assert.match(calendarScreen, /isDefaultSchedulingRow/);
  assert.match(calendarScreen, /defaultSchedulingOriginKinds/);
  assert.match(calendarScreen, /pendingItems=\{scope === "all_local" \? \[\] : pendingSchedulingItems\}/);
  assert.match(calendarRoute, /getSelfMediaContentWorkbench/);
  assert.match(calendarRoute, /<CalendarPage snapshot=\{snapshot\} workbench=\{workbench\}/);
  assert.match(calendarScreen, /versionId/);
  assert.match(calendarScreen, /clear_future_schedules/);
  assert.match(calendarScreen, /calendar-clear-future-schedules/);
  assert.match(calendarScreen, /calendarAnchorDate/);
  assert.match(calendarScreen, /anchorDate=\{calendarAnchorDate\}/);
  assert.match(calendarScreen, /计划新视频 \/ 新增排期/);
  assert.match(calendarScreen, /平台指标仍以创作者中心数据为准/);
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
  assert.match(dashboardScreen, /B站稿件内容/);
  assert.match(importPage, /创作者中心内容级真实数据/);
  assert.match(reviewsPage, /可信真实创作者中心内容级数据/);
  assert.match(overviewPage, /基于已回收的内容数据/);
  assert.match(overviewPage, /isPausedWechatAction/);
  assert.match(overviewPage, /operatorActionItems/);
  assert.doesNotMatch(overviewPage, /内部指标快照驱动|eyebrow="Status"|eyebrow="Focus"/);
  assert.doesNotMatch([dashboardScreen, contentScreen, importPage, reviewsPage, reviewPattern].join("\n"), /creator-center|archives 内容级指标|B站 archives/);
  assert.match(calendarPattern, />今天<\/em>/);
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
  assert.match(calendarPattern, /const key = item\.contentId \|\| item\.platformVersionId/);
  assert.match(calendarPattern, /calendar-content-schedule-inspector/);
  assert.match(calendarPattern, /versions\?: ContentPlatformVersion\[\]/);
  assert.doesNotMatch(calendarScreen, /Best times|Autolists|<button disabled type="button">List<\/button>|Publish ledger|rawDir|evidenceFile|pageReady|apiReady/);
  assert.doesNotMatch(calendarPattern, /showEmptySlots=\{true\}|demo\/fake|fixture/);
});

test("import page default view is data-only and folds diagnostics", () => {
  const importPage = read("src/domain/self-media/ui/screens/ImportPage.tsx");
  assert.match(importPage, /默认只看四平台真实导入动作、最近导入结果和数据新鲜度/);
  assert.match(importPage, /function PlatformDataHealthPanel/);
  assert.match(importPage, /function PlatformImportStatusPanel/);
  assert.match(importPage, /手动抓取最新数据/);
  assert.match(importPage, /发布后刷新/);
  assert.match(importPage, /post-publish-refresh/);
  assert.match(importPage, /平台内容匹配失败/);
  assert.match(importPage, /match_imported_content/);
  assert.match(importPage, /匹配到本地内容\/平台版本/);
  assert.match(importPage, /manual-refresh-boundary/);
  assert.match(importPage, /定时抓取设定/);
  assert.match(importPage, /scheduled-refresh-setting/);
  assert.match(importPage, /dataCaptureScheduleReliability/);
  assert.match(importPage, /data-capture-schedule-reliability/);
  assert.match(importPage, /下次建议抓取/);
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
    importPage.indexOf("<PlatformDataHealthPanel"),
    importPage.indexOf("<details className=\"analytics-data-section import-advanced-diagnostics\"")
  );
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

  const dashboardDefault = [
    dashboardScreen.slice(dashboardScreen.indexOf("function DailyOperatingChecklistPanel"), dashboardScreen.indexOf("function TrustedOperatingStrip")),
    dashboardScreen.slice(dashboardScreen.indexOf("function TrustedWeeklySummaryPanel"), dashboardScreen.indexOf("function accountMetricSourceLabel"))
  ].join("\n");
  const importDefault = importPage.slice(
    importPage.indexOf("<PlatformDataHealthPanel"),
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
    "今日数据动作",
    "数据服务",
    "数据新鲜度",
    "抓取节奏",
    "运营闭环",
    "数据一致性",
    "待处理行动项",
    "待审核草稿",
    "待发布排期",
    "最近发布记录",
    "周报摘要"
  ]) {
    assert.match(dashboardScreen, new RegExp(phrase));
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
