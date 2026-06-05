import { siBilibili, siTiktok, siWechat, siXiaohongshu } from "simple-icons";
import type { Platform } from "../../types";
import { platformLabels, platformTone } from "../foundations/labels";
import { cx } from "../foundations/cx";

const platformIconPaths: Partial<Record<Platform, string>> = {
  douyin: siTiktok.path,
  xiaohongshu: siXiaohongshu.path,
  wechat: siWechat.path,
  video_account: siWechat.path,
  bilibili: siBilibili.path
};

export function PlatformIcon({ platform, size = "md" }: { platform: Platform; size?: "sm" | "md" | "lg" }) {
  const path = platformIconPaths[platform];
  return (
    <span aria-hidden="true" className={cx("platform-logo", `platform-logo-${platform}`, `platform-logo-${size}`)}>
      <svg viewBox="0 0 24 24" role="img">
        {path ? <path d={path} /> : <path d="M12 2.6 14.7 9l6.9.6-5.2 4.5 1.6 6.8-6-3.6-6 3.6 1.6-6.8-5.2-4.5L9.3 9 12 2.6Z" />}
      </svg>
    </span>
  );
}

export function PlatformBadge({ platform, compact = false }: { platform: Platform; compact?: boolean }) {
  return (
    <span className={cx("platform-badge", platformTone[platform])}>
      <PlatformIcon platform={platform} size={compact ? "sm" : "md"} />
      {!compact && <span>{platformLabels[platform]}</span>}
    </span>
  );
}
