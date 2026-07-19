export function readShareParams(allowed: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    new URLSearchParams(window.location.search).forEach((v, k) => {
      if (allowed.includes(k)) out[k] = v;
    });
  } catch { /* non-browser */ }
  return out;
}

export function buildShareUrl(params: Record<string, string | number>): string {
  const u = new URL(window.location.href);
  u.search = '';
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => sp.set(k, String(v)));
  u.search = sp.toString();
  return u.toString();
}