import { expect, test } from "@playwright/test";
import { logInAsAdmin } from "./admin";

test("the admin page shows who is on site now", async ({ page }) => {
  await logInAsAdmin(page);

  await expect(
    page.getByRole("heading", { name: "On site now" }),
  ).toBeVisible();
  await expect(page.getByText("Nobody is on site.")).toBeVisible();
});
