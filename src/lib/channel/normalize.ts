import type {
  ChannelStats,
  TwitchUserRaw,
  TwitchStreamRaw,
  YoutubeChannelRaw,
} from "./types";
import type { PlatformKey } from "../../data/channelConfig";

const toNumber = (n: number | string | undefined | null): number => {
  if (n == null) return 0;
  const v = typeof n === "string" ? Number.parseInt(n, 10) : n;
  return Number.isFinite(v) && v >= 0 ? v : 0;
};

const str = (s: unknown): string => (typeof s === "string" ? s : "");

/**
 * Normalize Twitch upstream payloads into ChannelStats.
 * `stream` is null/undefined when the channel is offline (empty /streams data array).
 * Pure: no DOM, no fetch (CLAUDE.md rule 3). Missing/NaN fields → neutral.
 */
export function normalizeTwitch(
  user: TwitchUserRaw,
  stream: TwitchStreamRaw | null | undefined,
  fetchedAt: number,
): ChannelStats {
  const isLive = !!stream && stream.viewer_count != null;
  return {
    platform: "twitch",
    id: str(user.login),
    displayName: str(user.display_name) || str(user.login),
    thumbnailUrl: str(user.profile_image_url),
    broadcasterType: str(user.broadcaster_type),
    lifetimeViews: toNumber(user.view_count),
    isLive,
    concurrentViewers: isLive ? toNumber(stream?.viewer_count) : undefined,
    fetchedAt: Number.isFinite(fetchedAt) ? fetchedAt : 0,
  };
}

type ThumbSet = {
  high?: { url?: string };
  medium?: { url?: string };
  default?: { url?: string };
};

const pickThumb = (snippet: YoutubeChannelRaw["snippet"]): string => {
  const t = snippet?.thumbnails as ThumbSet | undefined;
  if (!t) return "";
  return str(t.high?.url) || str(t.medium?.url) || str(t.default?.url);
};

/**
 * Normalize a YouTube Data API v3 channel resource into ChannelStats.
 * Pure: no DOM, no fetch (CLAUDE.md rule 3). Missing/NaN fields → neutral.
 */
export function normalizeYouTube(
  raw: YoutubeChannelRaw,
  fetchedAt: number,
): ChannelStats {
  const stats = raw?.statistics;
  const hidden = !!stats?.hiddenSubscriberCount;
  return {
    platform: "youtube" as PlatformKey,
    id: str(raw?.id),
    displayName: str(raw?.snippet?.title),
    thumbnailUrl: pickThumb(raw?.snippet),
    subscribers:
      hidden || stats?.subscriberCount == null
        ? undefined
        : toNumber(stats?.subscriberCount),
    hiddenSubscribers: hidden,
    lifetimeViews: toNumber(stats?.viewCount),
    videoCount: toNumber(stats?.videoCount) || undefined,
    fetchedAt: Number.isFinite(fetchedAt) ? fetchedAt : 0,
  };
}
