import { expect, test } from "../../fixtures";
import { type Route } from "../../utils/drivers/SidebarDriver";

const ROUTES: { route: Route; heading: string }[] = [
  { route: "dashboard", heading: "" },
  { route: "configs", heading: "Configs" },
  { route: "events", heading: "Events" },
  { route: "offenders", heading: "Offenders" },
  { route: "notifications", heading: "Notifications" },
  { route: "logs", heading: "Logs" },
];

test.describe("sidebar navigation", () => {
  test("every nav link loads its page", async ({ page, sidebar }) => {
    await page.goto("/dashboard");

    for (const { route, heading } of ROUTES) {
      await sidebar.navigateTo(route);
      await expect(page).toHaveURL(new RegExp(`/${route}$`));
      await sidebar.expectActive(route);
      if (heading) {
        await expect(
          page.getByRole("heading", { name: heading, level: 2 }),
        ).toBeVisible();
      }
    }
  });
});
