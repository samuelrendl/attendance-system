import { expect, test, type Page } from "@playwright/test";
import { logInAsAdmin } from "./admin";

// Hidden copies of visited pages stay in the DOM (Cache Components keeps them
// in <Activity>), so look fields up among the visible ones only.
function field(page: Page, label: string) {
  return page.getByLabel(label, { exact: true }).filter({ visible: true });
}

test("the Admin adds, renames, re-PINs, Deactivates and reactivates an Employee", async ({
  page,
}) => {
  // Tests share one database, so give this Employee a name of its own.
  const name = `Ada ${Date.now()}`;
  const renamed = `${name} King`;

  await logInAsAdmin(page);
  await page.getByRole("link", { name: "Employees" }).click();
  await expect(page.getByRole("heading", { name: "Employees", level: 1 })).toBeVisible();

  await field(page, "Name").fill(name);
  await field(page, "PIN").fill("1234");
  await page.getByRole("button", { name: "Add Employee" }).click();
  await expect(page.getByText(`Added ${name}.`)).toBeVisible();

  const row = page.getByRole("link", { name: new RegExp(`^${name}`) });
  await expect(row).toContainText("Active");
  await row.click();
  await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();

  await field(page, "Name").fill(renamed);
  await page.getByRole("button", { name: "Save name" }).click();
  await expect(page.getByRole("heading", { name: renamed, level: 1 })).toBeVisible();

  await field(page, "New PIN").fill("9876");
  await page.getByRole("button", { name: "Set PIN" }).click();
  await expect(page.getByText("New PIN set.")).toBeVisible();
  await expect(page.getByText("9876")).toHaveCount(0);

  await page.getByRole("button", { name: "Deactivate" }).click();
  await expect(page.getByRole("button", { name: "Reactivate" })).toBeVisible();

  await page.getByRole("link", { name: "All Employees" }).click();
  await expect(page.getByRole("link", { name: new RegExp(`^${renamed}`) })).toContainText(
    "Deactivated",
  );

  await page.getByRole("link", { name: new RegExp(`^${renamed}`) }).click();
  await page.getByRole("button", { name: "Reactivate" }).click();
  await expect(page.getByRole("button", { name: "Deactivate" })).toBeVisible();
});
