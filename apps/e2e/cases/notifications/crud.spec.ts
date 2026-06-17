import { expect, test } from "../../fixtures";
import { uniqueSuffix } from "../../utils/utils";

test.describe("notifier CRUD", () => {
  test("create an email notifier via the UI, verify it persists, test it, then delete", async ({
    notifications,
    api,
  }) => {
    const recipient = `alerts-${uniqueSuffix()}@example.com`;

    await test.step("Given the notifications page is empty", async () => {
      await notifications.goto();
      await notifications.expectEmpty();
    });

    await test.step("When an email notifier is created via the UI", async () => {
      await notifications.createEmailNotifier({
        recipient,
        server: "smtp.example.com",
        port: 587,
        username: "bot@example.com",
        password: "hunter2",
        events: ["ban", "unban"],
      });
    });

    await test.step("Then it is listed and persisted in the core", async () => {
      await notifications.expectNotifierVisible(recipient);
      const fromApi = await api.listNotifiers();
      const created = fromApi.find((n) =>
        JSON.stringify(n.email_config ?? {}).includes(recipient),
      );
      expect(created).toBeDefined();
    });

    await test.step("When the notifier is tested", async () => {
      await notifications.testNotifier(recipient);
    });

    await test.step("Then a delivery result is surfaced", async () => {
      // Delivery fails against the dummy SMTP host, but the channel round-trips
      // and surfaces a message.
      await expect(notifications.testResult(recipient)).toBeVisible({
        timeout: 15_000,
      });
    });

    await test.step("When the notifier is deleted", async () => {
      await notifications.deleteNotifier(recipient);
    });

    await test.step("Then it is gone from the core", async () => {
      await expect
        .poll(async () =>
          (await api.listNotifiers()).some((n) =>
            JSON.stringify(n.email_config ?? {}).includes(recipient),
          ),
        )
        .toBe(false);
    });
  });

  test("create a Signal notifier via the UI", async ({
    notifications,
    api,
  }) => {
    const server = `http://signal-${uniqueSuffix()}.example.com/v2/send`;

    await test.step("Given the notifications page", async () => {
      await notifications.goto();
    });

    await test.step("When a Signal notifier is created via the UI", async () => {
      await notifications.createSignalNotifier({
        server,
        number: "+33612345678",
        recipients: "+33687654321",
        events: ["ban"],
      });
    });

    await test.step("Then it is listed and persisted in the core", async () => {
      await notifications.expectNotifierVisible(server);
      const fromApi = await api.listNotifiers();
      expect(
        fromApi.some((n) =>
          JSON.stringify(n.signal_config ?? {}).includes(server),
        ),
      ).toBe(true);
    });
  });
});
