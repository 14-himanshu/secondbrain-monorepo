import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

// @ts-ignore puppeteer-extra exposes plugin APIs at runtime.
puppeteer.use(StealthPlugin());

export interface RenderedPageSnapshot {
  finalUrl: string;
  html: string;
  text: string;
}

const BLOCKED_RESOURCE_TYPES = new Set(["font", "image", "media", "stylesheet"]);

export const renderPageSnapshot = async (
  url: string,
  options?: { timeoutMs?: number; extraDelayMs?: number }
): Promise<RenderedPageSnapshot | null> => {
  const timeoutMs = options?.timeoutMs ?? 20000;
  const extraDelayMs = options?.extraDelayMs ?? 1200;
  let browser: any = null;

  try {
    // @ts-ignore puppeteer-extra proxies the launch API at runtime.
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    );
    await page.setViewport({ width: 1366, height: 900 });
    await page.setRequestInterception(true);
    page.on("request", (request: any) => {
      if (BLOCKED_RESOURCE_TYPES.has(request.resourceType())) {
        void request.abort();
        return;
      }
      void request.continue();
    });

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    await page.waitForNetworkIdle({ idleTime: 600, timeout: Math.max(4000, timeoutMs / 2) }).catch(() => null);
    await new Promise((resolve) => setTimeout(resolve, extraDelayMs));

    const snapshot = await page.evaluate(() => {
      const clone = document.body?.cloneNode(true) as HTMLElement | null;
      if (clone) {
        clone
          .querySelectorAll("script, style, noscript, nav, footer, header, aside, form, dialog, svg, button")
          .forEach((node) => node.remove());
      }

      return {
        finalUrl: window.location.href,
        html: document.documentElement.outerHTML,
        text: (clone?.innerText || document.body?.innerText || "").replace(/\s+/g, " ").trim(),
      };
    });

    return snapshot;
  } catch (error) {
    console.warn("[BROWSER_RENDER_FAILED]", (error as Error).message);
    return null;
  } finally {
    if (browser) {
      await browser.close().catch(() => null);
    }
  }
};
