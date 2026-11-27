import { describe, expect, test } from "vitest";
import { createAttendance } from "./index";
import { createTestAttendance, createTestDatabase, storedPin } from "./testing";

const mondayMorning = new Date("2026-11-23T09:00:00Z");

/** The Attendance module plus its database, for the tests that look at the stored PIN. */
async function createAttendanceAndDatabase() {
  const db = await createTestDatabase();
  return { db, attendance: createAttendance({ db, timeZone: "Europe/London" }) };
}

/** Adds an Employee and returns their id, for tests about what happens next. */
async function addEmployee(
  attendance: Awaited<ReturnType<typeof createTestAttendance>>,
  name: string,
  pin = "1234",
) {
  const result = await attendance.addEmployee({ name, pin });
  if (!result.ok) {
    throw new Error(`Couldn't add ${name}: ${result.problems.join(", ")}`);
  }
  return result.employee.id;
}

describe("An Employee's PIN", () => {
  test("is stored only as a slow password hash, never in plain text", async () => {
    const { db, attendance } = await createAttendanceAndDatabase();

    const adaId = await addEmployee(attendance, "Ada Lovelace", "8642");

    const pin = await storedPin(db, adaId);
    expect(pin.stored).not.toContain("8642");
    expect(pin.stored).toMatch(/^scrypt\$/);
    expect(await pin.matches("8642")).toBe(true);
    expect(await pin.matches("8643")).toBe(false);
  });

  test("is hashed with a fresh salt, so two Employees sharing a PIN don't share a hash", async () => {
    const { db, attendance } = await createAttendanceAndDatabase();

    const adaId = await addEmployee(attendance, "Ada Lovelace", "1234");
    const graceId = await addEmployee(attendance, "Grace Hopper", "1234");

    const ada = await storedPin(db, adaId);
    const grace = await storedPin(db, graceId);
    expect(ada.stored).not.toEqual(grace.stored);
    expect(await grace.matches("1234")).toBe(true);
  });
});

describe("Adding an Employee", () => {
  test("adds an active Employee with a name and a 4-digit PIN", async () => {
    const attendance = await createTestAttendance();

    const result = await attendance.addEmployee({ name: "Ada Lovelace", pin: "1234" });

    expect(result).toMatchObject({ ok: true, employee: { name: "Ada Lovelace" } });
    expect(await attendance.listEmployees()).toEqual([
      { id: expect.any(String), name: "Ada Lovelace", deactivatedAt: null },
    ]);
  });

  test("trims spaces around the name", async () => {
    const attendance = await createTestAttendance();

    await attendance.addEmployee({ name: "  Ada Lovelace ", pin: "1234" });

    expect(await attendance.listEmployees()).toMatchObject([{ name: "Ada Lovelace" }]);
  });

  test.each(["", "123", "12345", "12a4", "١٢٣٤", " 1234", "12.4"])(
    "refuses the PIN %j, which isn't exactly 4 digits",
    async (pin) => {
      const attendance = await createTestAttendance();

      const result = await attendance.addEmployee({ name: "Ada Lovelace", pin });

      expect(result).toEqual({ ok: false, problems: ["pin-not-4-digits"] });
      expect(await attendance.listEmployees()).toEqual([]);
    },
  );

  test("refuses a blank name", async () => {
    const attendance = await createTestAttendance();

    const result = await attendance.addEmployee({ name: "   ", pin: "1234" });

    expect(result).toEqual({ ok: false, problems: ["name-missing"] });
    expect(await attendance.listEmployees()).toEqual([]);
  });

  test("reports a blank name and a bad PIN together", async () => {
    const attendance = await createTestAttendance();

    const result = await attendance.addEmployee({ name: "", pin: "12" });

    expect(result).toEqual({
      ok: false,
      problems: ["name-missing", "pin-not-4-digits"],
    });
  });

  test("lets two Employees share a PIN", async () => {
    const attendance = await createTestAttendance();

    const ada = await attendance.addEmployee({ name: "Ada Lovelace", pin: "1234" });
    const grace = await attendance.addEmployee({ name: "Grace Hopper", pin: "1234" });

    expect(ada.ok && grace.ok).toBe(true);
    expect(await attendance.listEmployees()).toMatchObject([
      { name: "Ada Lovelace" },
      { name: "Grace Hopper" },
    ]);
  });
});

describe("Renaming an Employee", () => {
  test("changes their name", async () => {
    const attendance = await createTestAttendance();
    const adaId = await addEmployee(attendance, "Ada Lovelase");

    const result = await attendance.renameEmployee(adaId, " Ada Lovelace ");

    expect(result).toEqual({ ok: true });
    expect(await attendance.listEmployees()).toEqual([
      { id: adaId, name: "Ada Lovelace", deactivatedAt: null },
    ]);
  });

  test("refuses a blank name and keeps the old one", async () => {
    const attendance = await createTestAttendance();
    const adaId = await addEmployee(attendance, "Ada Lovelace");

    const result = await attendance.renameEmployee(adaId, "  ");

    expect(result).toEqual({ ok: false, problems: ["name-missing"] });
    expect(await attendance.findEmployee(adaId)).toMatchObject({ name: "Ada Lovelace" });
  });

  test("refuses an Employee who doesn't exist", async () => {
    const attendance = await createTestAttendance();

    expect(
      await attendance.renameEmployee("00000000-0000-4000-8000-000000000000", "Ada"),
    ).toEqual({ ok: false, problems: ["employee-not-found"] });
    expect(await attendance.renameEmployee("not-an-id", "Ada")).toEqual({
      ok: false,
      problems: ["employee-not-found"],
    });
  });
});

describe("Setting a new PIN", () => {
  test("replaces the Employee's PIN", async () => {
    const { db, attendance } = await createAttendanceAndDatabase();
    const adaId = await addEmployee(attendance, "Ada Lovelace", "1234");

    const result = await attendance.setEmployeePin(adaId, "9876");

    expect(result).toEqual({ ok: true });
    const pin = await storedPin(db, adaId);
    expect(await pin.matches("9876")).toBe(true);
    expect(await pin.matches("1234")).toBe(false);
    expect(pin.stored).not.toContain("9876");
  });

  test.each(["", "987", "98765", "98x6"])(
    "refuses the PIN %j and keeps the old one",
    async (newPin) => {
      const { db, attendance } = await createAttendanceAndDatabase();
      const adaId = await addEmployee(attendance, "Ada Lovelace", "1234");

      const result = await attendance.setEmployeePin(adaId, newPin);

      expect(result).toEqual({ ok: false, problems: ["pin-not-4-digits"] });
      expect(await (await storedPin(db, adaId)).matches("1234")).toBe(true);
    },
  );

  test("may give an Employee the same PIN as a colleague", async () => {
    const attendance = await createTestAttendance();
    await addEmployee(attendance, "Ada Lovelace", "1234");
    const graceId = await addEmployee(attendance, "Grace Hopper", "5678");

    expect(await attendance.setEmployeePin(graceId, "1234")).toEqual({ ok: true });
  });

  test("refuses an Employee who doesn't exist", async () => {
    const attendance = await createTestAttendance();

    expect(
      await attendance.setEmployeePin("00000000-0000-4000-8000-000000000000", "1234"),
    ).toEqual({ ok: false, problems: ["employee-not-found"] });
  });
});

describe("Deactivating and reactivating an Employee", () => {
  test("Deactivating keeps the Employee in the list, marked with when they were Deactivated", async () => {
    const attendance = await createTestAttendance();
    const adaId = await addEmployee(attendance, "Ada Lovelace");
    const graceId = await addEmployee(attendance, "Grace Hopper");

    const result = await attendance.deactivateEmployee(adaId, mondayMorning);

    expect(result).toEqual({ ok: true });
    expect(await attendance.listEmployees()).toEqual([
      { id: adaId, name: "Ada Lovelace", deactivatedAt: mondayMorning },
      { id: graceId, name: "Grace Hopper", deactivatedAt: null },
    ]);
  });

  test("Deactivating an Employee who is already Deactivated keeps the first date", async () => {
    const attendance = await createTestAttendance();
    const adaId = await addEmployee(attendance, "Ada Lovelace");
    await attendance.deactivateEmployee(adaId, mondayMorning);

    const result = await attendance.deactivateEmployee(
      adaId,
      new Date("2026-11-24T09:00:00Z"),
    );

    expect(result).toEqual({ ok: true });
    expect(await attendance.findEmployee(adaId)).toMatchObject({
      deactivatedAt: mondayMorning,
    });
  });

  test("reactivating makes a Deactivated Employee active again, with the same id", async () => {
    const attendance = await createTestAttendance();
    const adaId = await addEmployee(attendance, "Ada Lovelace");
    await attendance.deactivateEmployee(adaId, mondayMorning);

    const result = await attendance.reactivateEmployee(adaId);

    expect(result).toEqual({ ok: true });
    expect(await attendance.listEmployees()).toEqual([
      { id: adaId, name: "Ada Lovelace", deactivatedAt: null },
    ]);
  });

  test("a Deactivated Employee can still be renamed and given a new PIN", async () => {
    const attendance = await createTestAttendance();
    const adaId = await addEmployee(attendance, "Ada Lovelace");
    await attendance.deactivateEmployee(adaId, mondayMorning);

    expect(await attendance.renameEmployee(adaId, "Ada King")).toEqual({ ok: true });
    expect(await attendance.setEmployeePin(adaId, "4321")).toEqual({ ok: true });
    expect(await attendance.findEmployee(adaId)).toEqual({
      id: adaId,
      name: "Ada King",
      deactivatedAt: mondayMorning,
    });
  });

  test("refuses an Employee who doesn't exist", async () => {
    const attendance = await createTestAttendance();
    const nobody = "00000000-0000-4000-8000-000000000000";

    expect(await attendance.deactivateEmployee(nobody, mondayMorning)).toEqual({
      ok: false,
      problems: ["employee-not-found"],
    });
    expect(await attendance.reactivateEmployee(nobody)).toEqual({
      ok: false,
      problems: ["employee-not-found"],
    });
  });
});

describe("Finding an Employee", () => {
  test("finds nobody for an unknown id or something that isn't an id", async () => {
    const attendance = await createTestAttendance();

    expect(await attendance.findEmployee("00000000-0000-4000-8000-000000000000")).toBeNull();
    expect(await attendance.findEmployee("../etc")).toBeNull();
  });
});
