// Mock upstream payloads for local dev + smoke testing the Function end-to-end
// without real API keys (USE_MOCK_UPSTREAM=true). Not shipped to the browser
// (only imported by functions/api/channel.ts, which runs server-side).
import type {
  TwitchUserRaw,
  TwitchStreamRaw,
  YoutubeChannelRaw,
} from "../lib/channel/types";

export const TWITCH_FIXTURES: Record<
  string,
  { user: TwitchUserRaw; stream: TwitchStreamRaw | null }
> = {
  shroud: {
    user: {
      id: "1",
      login: "shroud",
      display_name: "shroud",
      broadcaster_type: "partner",
      view_count: 12345,
      profile_image_url: "https://mockcdn.example/shroud.png",
    },
    stream: { viewer_count: 4200 },
  },
  ninja: {
    user: {
      id: "2",
      login: "ninja",
      display_name: "Ninja",
      broadcaster_type: "partner",
      view_count: 99999,
      profile_image_url: "https://mockcdn.example/ninja.png",
    },
    stream: null,
  },
};

export const YOUTUBE_FIXTURES: Record<string, YoutubeChannelRaw> = {
  mrbeast: {
    id: "UC1",
    snippet: {
      title: "MrBeast",
      thumbnails: { medium: { url: "https://mockcdn.example/mrbeast.png" } },
    },
    statistics: {
      subscriberCount: "50000000",
      viewCount: "25000000000",
      videoCount: "800",
      hiddenSubscriberCount: false,
    },
  },
};

export const MOCK_NOT_FOUND = "__mock_not_found__";
