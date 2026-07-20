// Single editable source of truth for channel import (CLAUDE.md rule 2).
// Upstream endpoints, URL patterns, and KV TTLs live here.

export type PlatformKey = "twitch" | "youtube";
export type YoutubeIdType = "handle" | "channelId" | "username";

export const CHANNEL_PLATFORMS: Record<
  PlatformKey,
  {
    label: string;
    urlHosts: string[]; // host substrings parseChannelUrl accepts
    kvTtlSeconds: number; // cache TTL for normalized stats
  }
> = {
  twitch: {
    label: "Twitch",
    urlHosts: ["twitch.tv"],
    kvTtlSeconds: 10 * 60, // 10 minutes
  },
  youtube: {
    label: "YouTube",
    urlHosts: ["youtube.com", "www.youtube.com", "youtu.be"],
    kvTtlSeconds: 60 * 60, // 1 hour
  },
};

export const TWITCH_ENDPOINTS = {
  token: "https://id.twitch.tv/oauth2/token",
  users: "https://api.twitch.tv/helix/users",
  streams: "https://api.twitch.tv/helix/streams",
} as const;

export const YOUTUBE_ENDPOINTS = {
  channels: "https://www.googleapis.com/youtube/v3/channels",
} as const;

// KV keys
export const KV_KEYS = {
  twitchAppToken: "twitch:app_token",
  channel: (platform: PlatformKey, id: string) =>
    `channel:${platform}:${id.toLowerCase()}`,
} as const;
