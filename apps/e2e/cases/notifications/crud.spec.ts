import { expect, test } from "../../fixtures";
import { uniqueSuffix } from "../../utils/utils";

test.describe("notifier CRUD", () => {
  test("create an email notifier via the UI, verify it persists, test it, then delete", async ({
    notifications,
    api,
  }) => {
    const recipient = `alerts-${uniqueSuffix()}@example.com`;

    await notifications.goto();
    await notifications.expectEmpty();

    await notifications.createEmailNotifier({
      recipient,
      server: "smtp.example.com",
      port: 587,
      username: "bot@example.com",
      password: "hunter2",
      events: ["ban", "unban"],
    });
    await notifications.expectNotifierVisible(recipient);

    // Persisted in the core.
    const fromApi = await api.listNotifiers();
    const created = fromApi.find((n) =>
      JSON.stringify(n.email_config ?? {}).includes(recipient),
    );
    expect(created).toBeDefined();

    // Test button reports a result (delivery fails against the dummy SMTP host,
    // but the channel round-trips and surfaces a message).
    await notifications.testNotifier(recipient);
    await expect(notifications.testResult(recipient)).toBeVisible({
      timeout: 15_000,
    });

    await notifications.deleteNotifier(recipient);
    await expect
      .poll(async () =>
        (await api.listNotifiers()).some((n) =>
          JSON.stringify(n.email_config ?? {}).includes(recipient),
        ),
      )
      .toBe(false);
  });

  test("create a Signal notifier via the UI", async ({
    notifications,
    api,
  }) => {
    const server = `http://signal-${uniqueSuffix()}.example.com/v2/send`;

    await notifications.goto();
    await notifications.createSignalNotifier({
      server,
      number: "+33612345678",
      recipients: "+33687654321",
      events: ["ban"],
    });
    await notifications.expectNotifierVisible(server);

    const fromApi = await api.listNotifiers();
    expect(
      fromApi.some((n) =>
        JSON.stringify(n.signal_config ?? {}).includes(server),
      ),
    ).toBe(true);
  });
});
