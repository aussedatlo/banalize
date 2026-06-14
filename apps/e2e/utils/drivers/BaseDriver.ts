import { type Locator, type Page } from "@playwright/test";

/** Shared plumbing for the per-page drivers. */
export abstract class BaseDriver {
  constructor(protected readonly page: Page) {}

  /** Route this driver owns, e.g. "/configs". */
  protected abstract readonly path: string;

  /**
   * Navigate to the driver's page. We wait only for `domcontentloaded` — the app
   * holds persistent SSE connections (events/logs streams), so `networkidle`
   * would never fire.
   */
  async goto(): Promise<void> {
    await this.page.goto(this.path, { waitUntil: "domcontentloaded" });
  }

  protected byTestId(testId: string): Locator {
    return this.page.getByTestId(testId);
  }
}
