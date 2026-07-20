import type { PlatformKey, YoutubeIdType } from "../../data/channelConfig";
import type { ParsedChannel } from "./types";

const safeUrl = (input: string): URL | null => {
  if (!input || typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  // Accept URLs missing the protocol by prefixing https://
  const withProto = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    return new URL(withProto);
  } catch {
    return null;
  }
};

const hostMatches = (host: string, candidates: string[]): boolean =>
  candidates.some((c) => host === c || host.endsWith(`.${c}`));

/**
 * Parse a creator channel URL into a normalized { platform, identifier, idType }.
 * Returns null for unsupported hosts, malformed URLs, or missing identifiers.
 * Pure: no DOM, no fetch (CLAUDE.md rule 3).
 */
export function parseChannelUrl(input: string): ParsedChannel | null {
  const url = safeUrl(input);
  if (!url) return null;
  const host = url.hostname.toLowerCase();
  const segments = url.pathname.split("/").filter(Boolean);

  // Twitch: twitch.tv/<login>
  if (hostMatches(host, ["twitch.tv"])) {
    const login = segments[0];
    if (!login) return null;
    return {
      platform: "twitch" as PlatformKey,
      identifier: login,
      idType: "login",
    };
  }

  // YouTube: youtube.com / www.youtube.com / youtu.be
  if (hostMatches(host, ["youtube.com", "youtu.be"])) {
    if (segments.length === 0) return null;
    const first = segments[0];

    // /@handle
    if (first.startsWith("@")) {
      const handle = first.slice(1);
      if (!handle) return null;
      return {
        platform: "youtube" as PlatformKey,
        identifier: handle,
        idType: "handle" as YoutubeIdType,
      };
    }
    // /channel/UC...
    if (first === "channel" && segments[1]) {
      return {
        platform: "youtube" as PlatformKey,
        identifier: segments[1],
        idType: "channelId" as YoutubeIdType,
      };
    }
    // /user/name
    if (first === "user" && segments[1]) {
      return {
        platform: "youtube" as PlatformKey,
        identifier: segments[1],
        idType: "username" as YoutubeIdType,
      };
    }
    // /c/name — best-effort as handle (YouTube redirects /c/ to the handle)
    if (first === "c" && segments[1]) {
      return {
        platform: "youtube" as PlatformKey,
        identifier: segments[1],
        idType: "handle" as YoutubeIdType,
      };
    }
    return null;
  }

  return null;
}
