import { formatNumber, formatCurrency, parseAmount } from "../lib/format";
import { readShareParams, buildShareUrl } from "../lib/share";

export interface LinearConfig {
  tool: string;
  unitName: string;
  toUsd: (n: number) => number;
  fromUsd: (u: number) => number;
  region?: string;
  currency?: string;
  paramKey: string; // query-param key, e.g. 'bits'
  defaultAmount?: number;
}

export function countUp(
  from: number,
  to: number,
  durationMs: number,
  set: (v: number) => void,
): void {
  const prefersReduced =
    typeof matchMedia !== "undefined" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) {
    set(to);
    return;
  }
  const start = performance.now();
  const tick = (now: number) => {
    const p = Math.min(1, (now - start) / durationMs);
    const eased = 1 - Math.pow(1 - p, 3);
    set(from + (to - from) * eased);
    if (p < 1) requestAnimationFrame(tick);
    else set(to);
  };
  requestAnimationFrame(tick);
}

export function initLinearConverter(
  root: HTMLElement,
  config: LinearConfig,
): void {
  const input = root.querySelector<HTMLInputElement>("[data-amount]");
  const result = root.querySelector<HTMLElement>("[data-result]");
  const copyBtn = root.querySelector<HTMLButtonElement>("[data-copy]");
  const shareBtn = root.querySelector<HTMLButtonElement>("[data-share]");
  const currency = config.currency ?? "USD";
  let mode: "toUsd" | "fromUsd" = "toUsd";
  let lastUsd = 0;

  const renderResult = (usd: number) => {
    if (!result) return;
    countUp(lastUsd, usd, 150, (v) => {
      result.textContent = formatCurrency(v, currency);
    });
    lastUsd = usd;
  };

  const compute = () => {
    if (!input) return;
    const raw = parseAmount(input.value);
    input.setAttribute(
      "aria-invalid",
      raw <= 0 && input.value.trim() !== "" ? "true" : "false",
    );
    const usd = mode === "toUsd" ? config.toUsd(raw) : raw;
    renderResult(usd);
    syncShare(raw);
  };

  const syncShare = (amount: number) => {
    if (!shareBtn) return;
    shareBtn.dataset.shareUrl = buildShareUrl({ [config.paramKey]: amount });
  };

  // hydrate from URL
  const params = readShareParams([config.paramKey]);
  if (params[config.paramKey] !== undefined) {
    input!.value = formatNumber(Number(params[config.paramKey]));
  } else if (config.defaultAmount) {
    input!.value = formatNumber(config.defaultAmount);
  }

  input?.addEventListener("input", compute);

  root
    .querySelectorAll<HTMLButtonElement>("[data-tab-index]")
    .forEach((btn) => {
      btn.addEventListener("click", () => {
        mode = Number(btn.dataset.tabIndex) === 0 ? "toUsd" : "fromUsd";
        root
          .querySelectorAll("[data-tab-index]")
          .forEach((b) => b.classList.toggle("active", b === btn));
        if (input)
          input.value =
            mode === "toUsd"
              ? formatNumber(config.fromUsd(lastUsd))
              : formatNumber(lastUsd);
        // swap label + placeholder handled by component; here just recompute
        compute();
      });
    });

  copyBtn?.addEventListener("click", async () => {
    const text = `${input?.value ?? ""} ${config.unitName} = ${formatCurrency(lastUsd, currency)}`;
    try {
      await navigator.clipboard.writeText(text);
      copyBtn.dataset.copied = "true";
      copyBtn.textContent = "Copied ✓";
      setTimeout(() => {
        copyBtn.dataset.copied = "false";
        copyBtn.textContent = "Copy result";
      }, 1500);
    } catch {
      /* clipboard blocked */
    }
  });

  shareBtn?.addEventListener("click", async () => {
    const url = shareBtn.dataset.shareUrl ?? window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* blocked */
    }
  });

  compute();
}
