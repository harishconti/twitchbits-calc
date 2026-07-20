import type { Env } from "../types";
import { parseChannelUrl } from "../../src/lib/channel/parseUrl";
import {
  normalizeTwitch,
  normalizeYouTube,
} from "../../src/lib/channel/normalize";
import type { ChannelStats } from "../../src/lib/channel/types";
import {
  CHANNEL_PLATFORMS,
  TWITCH_ENDPOINTS,
  YOUTUBE_ENDPOINTS,
  KV_KEYS,
} from "../../src/data/channelConfig";
import {
  TWITCH_FIXTURES,
  YOUTUBE_FIXTURES,
} from "../../src/data/channelFixtures";

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const err = (error: string, status: number) =>
  json({ ok: false, error }, status);

// Single wrapped entry: Pages invokes onRequestGet; all thrown UpstreamErrors
// are mapped to the correct HTTP response here.
export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    return await handle(context);
  } catch (e) {
    const code = e instanceof UpstreamError ? e.code : "upstream-error";
    const status =
      code === "not-configured" ? 503 : code === "quota-exceeded" ? 429 : 502;
    return err(code, status);
  }
};

async function handle(
  context: Parameters<PagesFunction<Env>>[0],
): Promise<Response> {
  const { request, env } = context;
  const url = new URL(request.url);
  const rawUrl = url.searchParams.get("url") ?? "";
  const parsed = parseChannelUrl(rawUrl);
  if (!parsed) return err("invalid-url", 400);

  const cacheKey = KV_KEYS.channel(parsed.platform, parsed.identifier);

  // 1. KV cache hit
  const cached = await env.CHANNEL_CACHE.get(cacheKey, "json");
  if (cached) return json({ ok: true, stats: cached as ChannelStats });

  const useMock = env.USE_MOCK_UPSTREAM === "true";
  const stats = useMock
    ? await mockFetch(parsed)
    : await liveFetch(parsed, env);

  if (!stats) return err("not-found", 404);

  // 3. Write KV cache (best-effort; don't fail the request on KV write error)
  try {
    await env.CHANNEL_CACHE.put(cacheKey, JSON.stringify(stats), {
      expirationTtl: CHANNEL_PLATFORMS[parsed.platform].kvTtlSeconds,
    });
  } catch {
    // KV write failure is non-fatal; return the result uncached.
  }

  return json({ ok: true, stats });
}

// --- Live upstream ------------------------------------------------------

async function liveFetch(
  parsed: ReturnType<typeof parseChannelUrl>,
  env: Env,
): Promise<ChannelStats | null> {
  if (!parsed) return null;
  if (parsed.platform === "twitch") return liveTwitch(parsed.identifier, env);
  return liveYouTube(parsed, env);
}

async function getTwitchToken(env: Env): Promise<string> {
  const cached = await env.CHANNEL_CACHE.get(KV_KEYS.twitchAppToken, "text");
  if (cached) return cached;
  const res = await fetch(TWITCH_ENDPOINTS.token, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.TWITCH_CLIENT_ID,
      client_secret: env.TWITCH_CLIENT_SECRET,
      grant_type: "client_credentials",
    }),
  });
  if (!res.ok) throw new UpstreamError("twitch-token");
  const body = (await res.json()) as { access_token?: string };
  if (!body.access_token) throw new UpstreamError("twitch-token");
  // Cache ~50 days (token lives ~60 days); refresh on 401 at call sites.
  try {
    await env.CHANNEL_CACHE.put(KV_KEYS.twitchAppToken, body.access_token, {
      expirationTtl: 50 * 24 * 60 * 60,
    });
  } catch {
    // Token cache write failure is non-fatal; return the token uncached.
  }
  return body.access_token;
}

async function liveTwitch(
  login: string,
  env: Env,
): Promise<ChannelStats | null> {
  if (!env.TWITCH_CLIENT_ID || !env.TWITCH_CLIENT_SECRET)
    throw new UpstreamError("not-configured");
  const token = await getTwitchToken(env);
  const headers = {
    Authorization: `Bearer ${token}`,
    "Client-Id": env.TWITCH_CLIENT_ID,
  };

  const usersRes = await fetch(
    `${TWITCH_ENDPOINTS.users}?login=${encodeURIComponent(login)}`,
    { headers },
  );
  if (usersRes.status === 401) {
    // token expired — purge and surface a retryable error
    try {
      await env.CHANNEL_CACHE.delete(KV_KEYS.twitchAppToken);
    } catch {
      // Purge failure is non-fatal; the expired token will simply be re-fetched.
    }
    throw new UpstreamError("twitch-token");
  }
  if (usersRes.status === 429) throw new UpstreamError("quota-exceeded");
  if (!usersRes.ok) throw new UpstreamError("upstream-error");
  const usersBody = (await usersRes.json()) as { data?: unknown[] };
  const user = (usersBody.data?.[0] as Record<string, unknown>) ?? null;
  if (!user) return null;

  const streamsRes = await fetch(
    `${TWITCH_ENDPOINTS.streams}?user_login=${encodeURIComponent(login)}`,
    { headers },
  );
  const streamsBody = (await streamsRes.json()) as { data?: unknown[] };
  const stream = (streamsBody.data?.[0] as Record<string, unknown>) ?? null;

  return normalizeTwitch(user as never, stream as never, Date.now());
}

async function liveYouTube(
  parsed: NonNullable<ReturnType<typeof parseChannelUrl>>,
  env: Env,
): Promise<ChannelStats | null> {
  if (!env.YOUTUBE_API_KEY) throw new UpstreamError("not-configured");
  const filter =
    parsed.idType === "handle"
      ? `forHandle=${encodeURIComponent("@" + parsed.identifier)}`
      : parsed.idType === "channelId"
        ? `id=${encodeURIComponent(parsed.identifier)}`
        : `forUsername=${encodeURIComponent(parsed.identifier)}`;
  const u = `${YOUTUBE_ENDPOINTS.channels}?part=snippet,statistics&${filter}&key=${encodeURIComponent(env.YOUTUBE_API_KEY)}`;
  const res = await fetch(u);
  if (res.status === 429) throw new UpstreamError("quota-exceeded");
  if (res.status === 403) throw new UpstreamError("quota-exceeded");
  if (!res.ok) throw new UpstreamError("upstream-error");
  const body = (await res.json()) as { items?: unknown[] };
  const item = (body.items?.[0] as Record<string, unknown>) ?? null;
  if (!item) return null;
  return normalizeYouTube(item as never, Date.now());
}

// --- Mock upstream (dev / smoke) ---------------------------------------

async function mockFetch(
  parsed: NonNullable<ReturnType<typeof parseChannelUrl>>,
): Promise<ChannelStats | null> {
  if (parsed.platform === "twitch") {
    const fx = TWITCH_FIXTURES[parsed.identifier.toLowerCase()];
    if (!fx) return null;
    return normalizeTwitch(fx.user, fx.stream, Date.now());
  }
  const fx = YOUTUBE_FIXTURES[parsed.identifier.toLowerCase()];
  if (!fx) return null;
  return normalizeYouTube(fx, Date.now());
}

// --- Error type ---------------------------------------------------------

class UpstreamError extends Error {
  code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}
