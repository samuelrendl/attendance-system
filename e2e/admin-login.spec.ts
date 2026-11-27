import { expect, test } from "@playwright/test";
import { logInAsAdmin, seededAdmin } from "./admin";

test("the admin area without a session redirects to the login page", async ({
  page,
}) => {
  await page.goto("/admin");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Admin login" })).toBeVisible();
});

test("the Admin logs in with the seeded email and password", async ({ page }) => {
  await logInAsAdmin(page);

  await expect(page.getByRole("heading", { name: "On site now" })).toBeVisible();
});

test("a wrong password is refused", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(seededAdmin.email);
  await page.getByLabel("Password").fill("not-the-password");
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page.getByText("Wrong email or password.")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("after logging out, admin pages require login again", async ({ page }) => {
  await logInAsAdmin(page);

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login$/);
});
