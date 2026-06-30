import { test } from "../../fixtures";

test.describe("config regex validation", () => {
  test("the create dialog validates the regex against the backend as you type", async ({
    configs,
  }) => {
    await test.step("Given the create dialog is open", async () => {
      await configs.goto();
      await configs.openCreateDialog();
    });

    await test.step("When a regex without the <IP> placeholder is entered, it is invalid and submit is blocked", async () => {
      await configs.fillRegex("Failed password");
      await configs.expectRegexInvalid("<IP>");
      await configs.expectSubmitDisabled();
    });

    await test.step("When a non-compiling regex is entered, the compile error is shown", async () => {
      await configs.fillRegex("(<IP>");
      await configs.expectRegexInvalid("does not compile");
    });

    await test.step("When a usable pattern is entered, the field flips to valid", async () => {
      await configs.fillRegex("Failed password .* from <IP>");
      await configs.expectRegexValid();
    });
  });
});
