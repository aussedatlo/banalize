import { expect, test } from "../../fixtures";

/**
 * The bottom status bar surfaces the UI and core versions plus a backend health
 * dot. Against the live stack the dot is always online; we assert it reflects
 * that and that the shown core version matches what the core reports.
 */
test.describe("status bar", () => {
  test("shows the core version and an online health dot", async ({
    api,
    statusBar,
  }) => {
    let version!: string;

    await test.step("Given a live core reporting its version and health", async () => {
      // The core exposes its version and a liveness probe out-of-band.
      ({ version } = await api.getVersion());
      expect(version).toMatch(/^\d+\.\d+\.\d+/);
      expect((await api.getHealth()).status).toBe("ok");
    });

    await test.step("When the UI is opened", async () => {
      await statusBar.goto();
    });

    await test.step("Then the status bar shows both versions and an online dot", async () => {
      await statusBar.expectCoreVersion(version);
      await statusBar.expectUiVersion(/ui \d+\.\d+\.\d+/);
      await statusBar.expectOnline();
    });
  });
});
