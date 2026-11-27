import { expect, test, type Page } from "@playwright/test";
import { logInAsAdmin } from "./admin";

// Tests share one database, so each names its Employee and Kiosk uniquely.
function uniqueName(name: string) {
  return `${name} ${Math.random().toString(36).slice(2, 8)}`;
}

async function addEmployee(page: Page, name: string, pin: string) {
  await page.goto("/admin/employees");
  await page.getByLabel("Name", { exact: true }).filter({ visible: true }).fill(name);
  await page.getByLabel("PIN", { exact: true }).filter({ visible: true }).fill(pin);
  await page.getByRole("button", { name: "Add Employee" }).click();
  await expect(page.getByText(`Added ${name}.`)).toBeVisible();
}

async function activateThisDevice(page: Page) {
  await page.goto("/admin/kiosks");
  await page.getByRole("textbox", { name: "Kiosk name" }).fill(uniqueName("Front door tablet"));
  await page.getByRole("button", { name: "Activate this device" }).click();
  await expect(page).toHaveURL(/\/kiosk$/);
}

async function tap(page: Page, name: string, pin: string) {
  await page.getByRole("list", { name: "Employees" }).getByRole("button", { name }).click();
  await page.getByLabel("PIN", { exact: true }).fill(pin);
  await page.getByRole("button", { name: "OK" }).click();
}

const confirmation = (page: Page) => page.getByRole("status");

test("an Employee clocks in and out at an activated Kiosk", async ({ page }) => {
  const name = uniqueName("Ada");
  await logInAsAdmin(page);
  await addEmployee(page, name, "2468");
  await activateThisDevice(page);

  await tap(page, name, "2468");

  await expect(confirmation(page)).toContainText("Clocked in");
  await expect(confirmation(page)).toContainText(new RegExp(`${name} at \\d\\d:\\d\\d`));
  await expect(confirmation(page)).toContainText("Worked today: 0h 00m");
  // It returns to the name list by itself.
  await expect(page.getByRole("button", { name })).toBeVisible({ timeout: 10_000 });
  await expect(confirmation(page)).toHaveCount(0);

  // The Admin sees them On site now.
  await page.goto("/admin");
  await expect(page.getByRole("listitem").filter({ hasText: name })).toContainText(
    /Clocked in \d\d:\d\d/,
  );

  await page.goto("/kiosk");
  await tap(page, name, "2468");
  await expect(confirmation(page)).toContainText("Clocked out");
  await expect(confirmation(page)).toContainText("Worked today:");
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.getByRole("button", { name })).toBeVisible();

  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "On site now" })).toBeVisible();
  await expect(page.getByText(name)).toHaveCount(0);
});

test("a wrong PIN shows a plain error and records nothing", async ({ page }) => {
  const name = uniqueName("Grace");
  await logInAsAdmin(page);
  await addEmployee(page, name, "1357");
  await activateThisDevice(page);

  await tap(page, name, "0000");

  await expect(page.getByText("Wrong PIN. Try again.")).toBeVisible();
  await expect(confirmation(page)).toHaveCount(0);

  // The right PIN still clocks them in: the wrong one recorded nothing.
  await page.getByLabel("PIN", { exact: true }).fill("1357");
  await page.getByRole("button", { name: "OK" }).click();
  await expect(confirmation(page)).toContainText("Clocked in");

  // Clock out again, so nobody is left On site for other tests.
  await page.getByRole("button", { name: "Done" }).click();
  await tap(page, name, "1357");
  await expect(confirmation(page)).toContainText("Clocked out");
});
