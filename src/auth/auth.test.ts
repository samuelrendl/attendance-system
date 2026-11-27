import { describe, expect, test } from "vitest";
import type { AdminAuth } from "./index";
import { cookiesFrom, createTestAdminAuth } from "./testing";

const admin = { email: "admin@example.com", initialPassword: "first-password" };

async function withAdmin() {
  const auth = await createTestAdminAuth();
  await auth.ensureAdmin(admin);
  return auth;
}

async function logInAsAdmin(auth: AdminAuth) {
  const login = await auth.logIn({
    email: admin.email,
    password: admin.initialPassword,
  });
  if (!login.ok) throw new Error("expected the Admin to log in");
  return cookiesFrom(login.headers);
}

describe("Creating the Admin on first start", () => {
  test("creates the Admin, who can then log in", async () => {
    const auth = await createTestAdminAuth();

    expect(await auth.ensureAdmin(admin)).toEqual({ created: true });

    const login = await auth.logIn({
      email: "admin@example.com",
      password: "first-password",
    });
    expect(login.ok).toBe(true);
  });

  test("later starts neither duplicate nor overwrite the Admin", async () => {
    const auth = await withAdmin();

    expect(
      await auth.ensureAdmin({
        email: "someone-else@example.com",
        initialPassword: "another-password",
      }),
    ).toEqual({ created: false });

    expect(
      await auth.logIn({ email: "admin@example.com", password: "first-password" }),
    ).toMatchObject({ ok: true });
    expect(
      await auth.logIn({
        email: "someone-else@example.com",
        password: "another-password",
      }),
    ).toEqual({ ok: false });
  });

  test("refuses an initial password shorter than 8 characters", async () => {
    const auth = await createTestAdminAuth();

    await expect(
      auth.ensureAdmin({ email: "admin@example.com", initialPassword: "short" }),
    ).rejects.toThrow("at least 8 characters");
  });
});

describe("Logging in", () => {
  test("is refused with the wrong password", async () => {
    const auth = await withAdmin();

    expect(
      await auth.logIn({ email: "admin@example.com", password: "wrong-password" }),
    ).toEqual({ ok: false });
  });

  test("gives a session that identifies the Admin", async () => {
    const auth = await withAdmin();

    const cookies = await logInAsAdmin(auth);

    expect(await auth.getAdmin(cookies)).toMatchObject({
      email: "admin@example.com",
    });
  });

  test("there is no Admin session without logging in", async () => {
    const auth = await withAdmin();

    expect(await auth.getAdmin(new Headers())).toBeNull();
  });
});

describe("Logging out", () => {
  test("ends the Admin session", async () => {
    const auth = await withAdmin();
    const cookies = await logInAsAdmin(auth);

    await auth.logOut(cookies);

    expect(await auth.getAdmin(cookies)).toBeNull();
  });

  test("without a session does nothing", async () => {
    const auth = await withAdmin();

    await expect(auth.logOut(new Headers())).resolves.toBeUndefined();
  });
});

describe("Public sign-up", () => {
  test("is disabled, so no second Admin can be created", async () => {
    const auth = await withAdmin();

    await expect(
      auth.betterAuth.api.signUpEmail({
        body: {
          name: "Intruder",
          email: "intruder@example.com",
          password: "intruder-password",
        },
      }),
    ).rejects.toThrow();
    expect(
      await auth.logIn({
        email: "intruder@example.com",
        password: "intruder-password",
      }),
    ).toEqual({ ok: false });
  });
});

describe("Resetting the Admin's password", () => {
  test("sets a new password and retires the old one", async () => {
    const auth = await withAdmin();

    expect(await auth.resetAdminPassword("second-password")).toMatchObject({
      email: "admin@example.com",
    });

    expect(
      await auth.logIn({ email: "admin@example.com", password: "second-password" }),
    ).toMatchObject({ ok: true });
    expect(
      await auth.logIn({ email: "admin@example.com", password: "first-password" }),
    ).toEqual({ ok: false });
  });

  test("ends every existing Admin session", async () => {
    const auth = await withAdmin();
    const cookies = await logInAsAdmin(auth);

    await auth.resetAdminPassword("second-password");

    expect(await auth.getAdmin(cookies)).toBeNull();
  });

  test("refuses a password shorter than 8 characters", async () => {
    const auth = await withAdmin();

    await expect(auth.resetAdminPassword("short")).rejects.toThrow(
      "at least 8 characters",
    );
    expect(
      await auth.logIn({ email: "admin@example.com", password: "first-password" }),
    ).toMatchObject({ ok: true });
  });

  test("fails when there is no Admin yet", async () => {
    const auth = await createTestAdminAuth();

    await expect(auth.resetAdminPassword("second-password")).rejects.toThrow(
      "There is no Admin yet",
    );
  });
});
