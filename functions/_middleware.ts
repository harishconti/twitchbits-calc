import type { Env } from "./types";

const ALLOWED_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Same-origin guard: block cross-site calls to /api/* to prevent abuse.
// Browsers send Origin on cross-origin fetches; same-origin fetches may omit it.
export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, next } = context;
  const method = request.method.toUpperCase();

  if (!ALLOWED_METHODS.has(method)) {
    return json({ ok: false, error: "method-not-allowed" }, 405);
  }

  const origin =
    request.headers.get("Origin") || request.headers.get("Referer");
  if (origin) {
    const allowed = env.ORIGIN || new URL(request.url).origin;
    try {
      const o = new URL(origin);
      if (o.origin !== allowed) {
        return json({ ok: false, error: "forbidden-origin" }, 403);
      }
    } catch {
      return json({ ok: false, error: "forbidden-origin" }, 403);
    }
  }

  // CORS: same-origin only — do not add permissive Access-Control-Allow-Origin.
  return next();
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
