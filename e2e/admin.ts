import { expect, type Page } from "@playwright/test";

/** The Admin created on first start, from the same environment variables as the app. */
export const seededAdmin = {
  email: process.env.ADMIN_EMAIL ?? "",
  password: process.env.ADMIN_INITIAL_PASSWORD ?? "",
};

export async function logInAsAdmin(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(seededAdmin.email);
  await page.getByLabel("Password").fill(seededAdmin.password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}
