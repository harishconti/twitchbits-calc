import { describe, it, expect } from "vitest";
import { parseChannelUrl } from "../src/lib/channel/parseUrl";
import {
  normalizeTwitch,
  normalizeYouTube,
} from "../src/lib/channel/normalize";

describe("parseChannelUrl", () => {
  it("parses a twitch.tv login URL", () => {
    expect(parseChannelUrl("https://twitch.tv/shroud")).toEqual({
      platform: "twitch",
      identifier: "shroud",
      idType: "login",
    });
  });
  it("parses a twitch.tv URL without protocol", () => {
    expect(parseChannelUrl("twitch.tv/shroud")).toEqual({
      platform: "twitch",
      identifier: "shroud",
      idType: "login",
    });
  });
  it("parses a youtube @handle URL", () => {
    expect(parseChannelUrl("https://www.youtube.com/@MrBeast")).toEqual({
      platform: "youtube",
      identifier: "MrBeast",
      idType: "handle",
    });
  });
  it("parses a youtube /channel/UC... URL", () => {
    expect(
      parseChannelUrl("https://youtube.com/channel/UCX6OQ3DkcsbYNE6H8u7q3dA"),
    ).toEqual({
      platform: "youtube",
      identifier: "UCX6OQ3DkcsbYNE6H8u7q3dA",
      idType: "channelId",
    });
  });
  it("parses a youtube /user/name URL", () => {
    expect(parseChannelUrl("https://www.youtube.com/user/Google")).toEqual({
      platform: "youtube",
      identifier: "Google",
      idType: "username",
    });
  });
  it("best-effort parses /c/name as a handle (strips @)", () => {
    expect(parseChannelUrl("https://youtube.com/c/Google")).toEqual({
      platform: "youtube",
      identifier: "Google",
      idType: "handle",
    });
  });
  it("strips a trailing slash and query string", () => {
    expect(parseChannelUrl("https://twitch.tv/shroud/")).toEqual({
      platform: "twitch",
      identifier: "shroud",
      idType: "login",
    });
    expect(parseChannelUrl("https://www.youtube.com/@MrBeast?view=1")).toEqual({
      platform: "youtube",
      identifier: "MrBeast",
      idType: "handle",
    });
  });
  it("returns null for unsupported hosts", () => {
    expect(parseChannelUrl("https://twitter.com/shroud")).toBeNull();
    expect(parseChannelUrl("https://kick.com/shroud")).toBeNull();
  });
  it("returns null for malformed URLs and non-URLs", () => {
    expect(parseChannelUrl("not a url")).toBeNull();
    expect(parseChannelUrl("https://twitch.tv/")).toBeNull();
    expect(parseChannelUrl("https://youtube.com/")).toBeNull();
    expect(parseChannelUrl("")).toBeNull();
  });
});

describe("normalizeTwitch", () => {
  const now = 1700000000000;
  it("maps a live broadcaster with viewers", () => {
    const stats = normalizeTwitch(
      {
        id: "1",
        login: "shroud",
        display_name: "shroud",
        broadcaster_type: "partner",
        view_count: 12345,
        profile_image_url: "https://img/shroud.png",
      },
      { viewer_count: 4200 },
      now,
    );
    expect(stats).toEqual({
      platform: "twitch",
      id: "shroud",
      displayName: "shroud",
      thumbnailUrl: "https://img/shroud.png",
      broadcasterType: "partner",
      lifetimeViews: 12345,
      isLive: true,
      concurrentViewers: 4200,
      fetchedAt: now,
    });
  });
  it("maps an offline broadcaster (no stream)", () => {
    const stats = normalizeTwitch(
      {
        id: "1",
        login: "shroud",
        display_name: "shroud",
        broadcaster_type: "",
        view_count: 0,
        profile_image_url: "https://img/shroud.png",
      },
      null,
      now,
    );
    expect(stats.isLive).toBe(false);
    expect(stats.concurrentViewers).toBeUndefined();
    expect(stats.lifetimeViews).toBe(0);
    expect(stats.broadcasterType).toBe("");
  });
  it("guards missing/NaN fields to neutral", () => {
    const stats = normalizeTwitch({}, undefined, now);
    expect(stats.id).toBe("");
    expect(stats.displayName).toBe("");
    expect(stats.thumbnailUrl).toBe("");
    expect(stats.lifetimeViews).toBe(0);
    expect(stats.isLive).toBe(false);
  });
  it("parses numeric strings from the API", () => {
    const stats = normalizeTwitch(
      {
        login: "x",
        display_name: "X",
        view_count: "999",
        profile_image_url: "u",
      },
      { viewer_count: "50" },
      now,
    );
    expect(stats.lifetimeViews).toBe(999);
    expect(stats.concurrentViewers).toBe(50);
  });
});

describe("normalizeYouTube", () => {
  const now = 1700000000000;
  it("maps a public channel with visible subscribers", () => {
    const stats = normalizeYouTube(
      {
        id: "UC1",
        snippet: {
          title: "MrBeast",
          thumbnails: { medium: { url: "https://img/mr.png" } },
        },
        statistics: {
          subscriberCount: "50000000",
          viewCount: "25000000000",
          videoCount: "800",
          hiddenSubscriberCount: false,
        },
      },
      now,
    );
    expect(stats).toEqual({
      platform: "youtube",
      id: "UC1",
      displayName: "MrBeast",
      thumbnailUrl: "https://img/mr.png",
      subscribers: 50000000,
      hiddenSubscribers: false,
      lifetimeViews: 25000000000,
      videoCount: 800,
      fetchedAt: now,
    });
  });
  it("respects hiddenSubscriberCount", () => {
    const stats = normalizeYouTube(
      {
        id: "UC1",
        snippet: { title: "Hidden" },
        statistics: { viewCount: "100", hiddenSubscriberCount: true },
      },
      now,
    );
    expect(stats.subscribers).toBeUndefined();
    expect(stats.hiddenSubscribers).toBe(true);
    expect(stats.lifetimeViews).toBe(100);
  });
  it("picks the best available thumbnail (high > medium > default)", () => {
    const hi = normalizeYouTube(
      {
        id: "1",
        snippet: {
          title: "t",
          thumbnails: { high: { url: "H" }, medium: { url: "M" } },
        },
      },
      now,
    );
    expect(hi.thumbnailUrl).toBe("H");
    const md = normalizeYouTube(
      {
        id: "1",
        snippet: {
          title: "t",
          thumbnails: { medium: { url: "M" }, default: { url: "D" } },
        },
      },
      now,
    );
    expect(md.thumbnailUrl).toBe("M");
    const def = normalizeYouTube(
      {
        id: "1",
        snippet: { title: "t", thumbnails: { default: { url: "D" } } },
      },
      now,
    );
    expect(def.thumbnailUrl).toBe("D");
  });
  it("guards missing statistics/snippet to neutral", () => {
    const stats = normalizeYouTube({}, now);
    expect(stats.id).toBe("");
    expect(stats.displayName).toBe("");
    expect(stats.thumbnailUrl).toBe("");
    expect(stats.lifetimeViews).toBe(0);
    expect(stats.subscribers).toBeUndefined();
  });
  it("parses numeric strings", () => {
    const stats = normalizeYouTube(
      {
        id: "1",
        snippet: { title: "t" },
        statistics: {
          subscriberCount: "123",
          viewCount: "456",
          videoCount: "789",
        },
      },
      now,
    );
    expect(stats.subscribers).toBe(123);
    expect(stats.lifetimeViews).toBe(456);
    expect(stats.videoCount).toBe(789);
  });
});
