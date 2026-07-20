import type { PlatformKey, YoutubeIdType } from "../../data/channelConfig";

export type { PlatformKey, YoutubeIdType };

export interface ParsedChannel {
  platform: PlatformKey;
  identifier: string; // twitch login, or youtube handle/channelId/username (no leading "@")
  idType: "login" | YoutubeIdType;
}

export interface ChannelStats {
  platform: PlatformKey;
  id: string; // twitch login or youtube channelId
  displayName: string;
  thumbnailUrl: string;
  broadcasterType?: string; // twitch only: "affiliate" | "partner" | ""
  subscribers?: number; // youtube only (undefined when hiddenSubscribers)
  hiddenSubscribers?: boolean; // youtube only
  lifetimeViews: number;
  videoCount?: number; // youtube only
  isLive?: boolean; // twitch only
  concurrentViewers?: number; // twitch only, when isLive
  fetchedAt: number; // epoch ms
}

// Raw upstream shapes (only the fields we read). Unknown/missing fields are tolerated.
export interface TwitchUserRaw {
  id?: string;
  login?: string;
  display_name?: string;
  broadcaster_type?: string;
  view_count?: number | string;
  profile_image_url?: string;
}
export interface TwitchStreamRaw {
  viewer_count?: number | string;
}
export interface YoutubeChannelRaw {
  id?: string;
  snippet?: {
    title?: string;
    thumbnails?: {
      default?: { url?: string };
      medium?: { url?: string };
      high?: { url?: string };
    };
  };
  statistics?: {
    subscriberCount?: number | string;
    viewCount?: number | string;
    videoCount?: number | string;
    hiddenSubscriberCount?: boolean;
  };
}
