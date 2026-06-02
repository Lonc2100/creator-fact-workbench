import type { Platform } from "../../types";
import { platformLabels, platformShortLabels, platformTone } from "../foundations/labels";
import { cx } from "../foundations/cx";

export function PlatformBadge({ platform, compact = false }: { platform: Platform; compact?: boolean }) {
  return (
    <span className={cx("platform-badge", platformTone[platform])}>
      <span className="platform-dot">{platformShortLabels[platform]}</span>
      {!compact && <span>{platformLabels[platform]}</span>}
    </span>
  );
}
