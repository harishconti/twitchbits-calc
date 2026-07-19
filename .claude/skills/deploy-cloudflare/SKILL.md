---
name: deploy-cloudflare
description: Build, deploy to Cloudflare Pages, and smoke-test the Twitch Bits Hub. Use when deploying the site or verifying a deploy.
---

# Deploy to Cloudflare Pages

1. Ensure on branch `build/twitch-bits-hub` (or a feature branch off it).
2. `npm run build` — must succeed with `dist/` produced.
3. `npm test` — all pure-function tests must pass.
4. `npm run preview` and smoke-test `/`, `/twitch-bits-to-usd` (type → result count-up → copy → share), theme toggle persists across reload.
5. Push: `git push origin HEAD`.
6. Cloudflare Pages auto-builds on push (git-connected). Confirm the Pages deploy succeeded in the Cloudflare dashboard (or via `npx wrangler pages deployment list` if configured).
7. Open the `*.pages.dev` preview URL; re-run the smoke test there.
8. After a production deploy, refresh the sitemap in Google Search Console + Bing Webmaster.

If the build fails locally, do not push — fix first. Never deploy a red build.
