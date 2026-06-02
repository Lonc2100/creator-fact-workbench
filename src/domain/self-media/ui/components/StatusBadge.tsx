import type { ContentStatus, ImportDiffKind, PlatformVersionStatus, PublishQueueStatus, ReviewActionStatus } from "../../types";
import { contentStatusLabels, diffKindLabels, platformVersionStatusLabels, queueStatusLabels, actionStatusLabels, statusTone } from "../foundations/labels";
import { Badge } from "../primitives/Badge";

type StatusKind = PlatformVersionStatus | PublishQueueStatus | ReviewActionStatus | ImportDiffKind | ContentStatus;

function labelFor(status: StatusKind) {
  if (status in platformVersionStatusLabels) return platformVersionStatusLabels[status as PlatformVersionStatus];
  if (status in queueStatusLabels) return queueStatusLabels[status as PublishQueueStatus];
  if (status in actionStatusLabels) return actionStatusLabels[status as ReviewActionStatus];
  if (status in diffKindLabels) return diffKindLabels[status as ImportDiffKind];
  if (status in contentStatusLabels) return contentStatusLabels[status as ContentStatus];
  return status;
}

export function StatusBadge({ status }: { status: StatusKind }) {
  return <Badge tone={statusTone(status)}>{labelFor(status)}</Badge>;
}
