import { expect, test } from "../../fixtures";
import { slugify } from "../../utils/drivers/ConfigsDriver";
import { uniqueSuffix } from "../../utils/utils";

test.describe("config CRUD", () => {
  test("create a config via the UI, see it listed and persisted, then delete it", async ({
    configs,
    configDetail,
    api,
  }) => {
    const name = `SSH Brute Force ${uniqueSuffix()}`;
    const id = slugify(name);

    await test.step("Given the configs page is empty", async () => {
      await configs.goto();
      await configs.expectEmpty();
    });

    await test.step("When a config is created via the UI", async () => {
      await configs.createConfig({
        name,
        param: "/var/log/auth.log",
        regex: "Failed password .* from <IP>",
        maxMatches: 5,
      });
    });

    await test.step("Then it is listed, persisted in the core, and links to its detail page", async () => {
      await configs.expectConfigVisible(id);

      // Persisted in the core, not just rendered optimistically.
      const fromApi = await api.listConfigs();
      expect(fromApi.map((c) => c.id)).toContain(id);

      // The card links through to the detail page.
      await configs.openConfig(id);
      await configDetail.expectName(name);
    });

    await test.step("When it is deleted from the list", async () => {
      await configs.goto();
      await configs.deleteConfig(id);
    });

    await test.step("Then it is gone everywhere", async () => {
      await expect
        .poll(async () => (await api.listConfigs()).map((c) => c.id))
        .not.toContain(id);
    });
  });
});
