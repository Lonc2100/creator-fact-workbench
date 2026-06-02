import { SelfMediaService } from "../service";
import type {
  ActionItemPatchRequest,
  AutomationRunRequest,
  CalendarQuery,
  ContentPlatformVersionRequest,
  CsvImportPreset,
  IdeaCreateRequest,
  IdeaStatusRequest,
  IdeaToContentRequest,
  ImportRequest,
  LeadCreateRequest,
  LeadPatchRequest,
  MetricSnapshotRequest,
  PlatformVersionPatchRequest,
  PublishQueueTransitionRequest,
  SaveReviewRequest
} from "../types";

export async function getSelfMediaDashboard() {
  const service = new SelfMediaService();
  return service.dashboard();
}

export async function importSelfMediaJson(input: unknown) {
  const service = new SelfMediaService();
  return service.importJson(input);
}

export async function importSelfMediaCsv(input: string) {
  const service = new SelfMediaService();
  return service.importCsv(input);
}

export async function importSelfMediaRequest(input: ImportRequest) {
  const service = new SelfMediaService();
  return service.importRequest(input);
}

export async function previewSelfMediaImport(input: ImportRequest) {
  const service = new SelfMediaService();
  return service.previewImportRequest(input);
}

export async function getSelfMediaImportTemplate(preset: CsvImportPreset = "generic") {
  const service = new SelfMediaService();
  return service.csvTemplate(preset);
}

export async function updateSelfMediaPublishQueue(input: PublishQueueTransitionRequest) {
  const service = new SelfMediaService();
  return service.updatePublishQueueStatus(input);
}

export async function createSelfMediaIdea(input: IdeaCreateRequest) {
  const service = new SelfMediaService();
  return service.createIdea(input);
}

export async function updateSelfMediaIdea(input: IdeaStatusRequest) {
  const service = new SelfMediaService();
  return service.updateIdeaStatus(input);
}

export async function convertSelfMediaIdeaToContent(input: IdeaToContentRequest) {
  const service = new SelfMediaService();
  return service.convertIdeaToContent(input);
}

export async function createSelfMediaLead(input: LeadCreateRequest) {
  const service = new SelfMediaService();
  return service.createLead(input);
}

export async function upsertSelfMediaPlatformVersion(input: ContentPlatformVersionRequest) {
  const service = new SelfMediaService();
  return service.upsertPlatformVersion(input);
}

export async function patchSelfMediaPlatformVersion(input: PlatformVersionPatchRequest) {
  const service = new SelfMediaService();
  return service.patchPlatformVersion(input);
}

export async function getSelfMediaCalendar(input: CalendarQuery) {
  const service = new SelfMediaService();
  await service.ensureSeedData();
  return service.calendar(input);
}

export async function upsertSelfMediaMetricSnapshot(input: MetricSnapshotRequest) {
  const service = new SelfMediaService();
  return service.upsertMetricSnapshot(input);
}

export async function saveSelfMediaReview(input: SaveReviewRequest) {
  const service = new SelfMediaService();
  return service.saveReview(input);
}

export async function updateSelfMediaActionItem(input: ActionItemPatchRequest) {
  const service = new SelfMediaService();
  return service.updateActionItem(input);
}

export async function updateSelfMediaLead(input: LeadPatchRequest) {
  const service = new SelfMediaService();
  return service.updateLead(input);
}

export async function createSelfMediaAutomationRun(input: AutomationRunRequest) {
  const service = new SelfMediaService();
  return service.createAutomationRun(input);
}
