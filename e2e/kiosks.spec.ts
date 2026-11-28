import { expect, test, type Page } from "@playwright/test";
import { logInAsAdmin } from "./admin";

const DAY_MS = 24 * 60 * 60 * 1000;

// The database is shared by every test run against the server, so each test
// names its Kiosks uniquely.
function uniqueName(name: string) {
  return `${name} ${Math.random().toString(36).slice(2, 8)}`;
}

async function activateThisDevice(page: Page, name: string) {
  await page.goto("/admin/kiosks");
  await page.getByRole("textbox", { name: "Kiosk name" }).fill(name);
  await page.getByRole("button", { name: "Activate this device" }).click();
  await expect(page).toHaveURL(/\/kiosk$/);
}

async function expectKiosk(page: Page, name: string) {
  await expect(page.getByRole("heading", { name: "Clock in or out" })).toBeVisible();
  await expect(page.getByText(name)).toBeVisible();
}

async function expectNotAKiosk(page: Page) {
  await expect(
    page.getByRole("heading", { name: "This device is not a Kiosk" }),
  ).toBeVisible();
}

test("a browser that was never activated is not a Kiosk", async ({ page }) => {
  await page.goto("/kiosk");

  await expectNotAKiosk(page);
});

test("the Admin activates this device as a Kiosk, which keeps working after logging out", async ({
  page,
}) => {
  const name = uniqueName("Front door tablet");
  await logInAsAdmin(page);

  await activateThisDevice(page, name);
  await expectKiosk(page, name);

  const [cookie] = (await page.context().cookies()).filter(
    (c) => c.name === "kiosk_device",
  );
  expect(cookie.httpOnly).toBe(true);
  expect(cookie.expires * 1000).toBeGreaterThan(Date.now() + 399 * DAY_MS);
  // Each Kiosk request sets the cookie again, so its expiry keeps moving on.
  const response = await page.request.get("/kiosk");
  expect(response.headers()["set-cookie"]).toContain("kiosk_device=");
  expect(response.headers()["set-cookie"]).toMatch(/Max-Age=34560000/i);

  await page.goto("/admin");
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/kiosk");
  await expectKiosk(page, name);
});

test("several Kiosks are active at once, and revoking one stops only that device", async ({
  browser,
}) => {
  const frontDoorName = uniqueName("Front door tablet");
  const backDoorName = uniqueName("Back door tablet");
  const frontDoor = await (await browser.newContext()).newPage();
  const backDoor = await (await browser.newContext()).newPage();

  await logInAsAdmin(frontDoor);
  await activateThisDevice(frontDoor, frontDoorName);
  await logInAsAdmin(backDoor);
  await activateThisDevice(backDoor, backDoorName);

  await frontDoor.goto("/admin/kiosks");
  const kiosks = frontDoor.getByRole("list", { name: "Kiosks" });
  const backDoorRow = kiosks.getByRole("listitem", { name: backDoorName });
  await expect(kiosks.getByRole("listitem", { name: frontDoorName })).toContainText(
    "Activated",
  );
  await expect(backDoorRow).toContainText("Activated");

  await backDoorRow.getByRole("button", { name: "Revoke" }).click();
  await expect(backDoorRow).toContainText("Revoked");

  await backDoor.goto("/kiosk");
  await expectNotAKiosk(backDoor);
  await frontDoor.goto("/kiosk");
  await expectKiosk(frontDoor, frontDoorName);

  await frontDoor.context().close();
  await backDoor.context().close();
});

test("a blank Kiosk name is refused", async ({ page }) => {
  await logInAsAdmin(page);
  await page.goto("/admin/kiosks");

  await page.getByRole("textbox", { name: "Kiosk name" }).fill("   ");
  await page.getByRole("button", { name: "Activate this device" }).click();

  await expect(page.getByText("Give the Kiosk a name.")).toBeVisible();
  await page.goto("/kiosk");
  await expectNotAKiosk(page);
});
