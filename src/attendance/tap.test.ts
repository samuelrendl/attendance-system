import { describe, expect, test } from "vitest";
import type { Attendance } from "./index";
import { createTestAttendance } from "./testing";

// Europe/London is on GMT in November, so these UTC times are also local times.
const at = (isoLocal: string) => new Date(`${isoLocal}Z`);

const KIOSK_ID = "00000000-0000-4000-8000-000000000001";

async function addEmployee(attendance: Attendance, name = "Ada", pin = "1234") {
  const added = await attendance.addEmployee({ name, pin });
  if (!added.ok) throw new Error(`Couldn't add ${name}: ${added.problems}`);
  return added.employee;
}

function tapper(attendance: Attendance, employeeId: string, pin = "1234") {
  return (isoLocal: string, tappedPin = pin) =>
    attendance.tap({ employeeId, pin: tappedPin, kioskId: KIOSK_ID, now: at(isoLocal) });
}

describe("Tap at the Kiosk", () => {
  test("clocks in an Employee who isn't On site", async () => {
    const attendance = await createTestAttendance();
    const ada = await addEmployee(attendance);
    const tap = tapper(attendance, ada.id);

    const result = await tap("2026-11-23T09:00:00");

    expect(result).toMatchObject({
      outcome: "clocked-in",
      employee: { id: ada.id, name: "Ada" },
      at: at("2026-11-23T09:00:00"),
      minutesToday: 0,
    });
    expect(await attendance.onSiteNow(at("2026-11-23T09:05:00"))).toEqual([
      { employeeId: ada.id, name: "Ada", clockIn: at("2026-11-23T09:00:00") },
    ]);
  });

  test("clocks out an Employee who is On site, with the hours worked today", async () => {
    const attendance = await createTestAttendance();
    const ada = await addEmployee(attendance);
    const tap = tapper(attendance, ada.id);
    const clockIn = await tap("2026-11-23T09:00:00");

    const result = await tap("2026-11-23T17:15:00");

    expect(result).toMatchObject({
      outcome: "clocked-out",
      employee: { id: ada.id, name: "Ada" },
      at: at("2026-11-23T17:15:00"),
      minutesToday: 8 * 60 + 15,
    });
    expect(result.outcome === "clocked-out" && result.timeEntryId).toBe(
      clockIn.outcome === "clocked-in" && clockIn.timeEntryId,
    );
    expect(await attendance.onSiteNow(at("2026-11-23T17:20:00"))).toEqual([]);
  });

  test("clocks in again after clocking out", async () => {
    const attendance = await createTestAttendance();
    const ada = await addEmployee(attendance);
    const tap = tapper(attendance, ada.id);
    await tap("2026-11-23T09:00:00");
    await tap("2026-11-23T12:00:00");

    expect(await tap("2026-11-23T12:30:00")).toMatchObject({ outcome: "clocked-in" });
  });

  test("clocks out an Employee whose Clock in is just under 16 hours ago", async () => {
    const attendance = await createTestAttendance();
    const ada = await addEmployee(attendance);
    const tap = tapper(attendance, ada.id);
    await tap("2026-11-23T08:00:00");

    expect(await tap("2026-11-23T23:59:59")).toMatchObject({
      outcome: "clocked-out",
      minutesToday: 15 * 60 + 59,
    });
  });

  test("clocks in an Employee whose open Time entry is just over 16 hours old, a Missed clock-out", async () => {
    const attendance = await createTestAttendance();
    const ada = await addEmployee(attendance);
    const tap = tapper(attendance, ada.id);
    const missed = await tap("2026-11-23T08:00:00");

    const result = await tap("2026-11-24T00:00:01");

    expect(result).toMatchObject({ outcome: "clocked-in", minutesToday: 0 });
    expect(result.outcome === "clocked-in" && result.timeEntryId).not.toBe(
      missed.outcome === "clocked-in" && missed.timeEntryId,
    );
  });

  test("the morning after a Missed clock-out, clocks in, then out of the new Time entry", async () => {
    const attendance = await createTestAttendance();
    const ada = await addEmployee(attendance);
    const tap = tapper(attendance, ada.id);
    await tap("2026-11-23T09:00:00"); // forgot to clock out

    expect(await tap("2026-11-24T09:00:00")).toMatchObject({ outcome: "clocked-in" });
    expect(await tap("2026-11-24T17:00:00")).toMatchObject({
      outcome: "clocked-out",
      minutesToday: 8 * 60,
    });
  });

  test("an overnight Time entry is closed by the morning tap and belongs to the earlier day", async () => {
    const attendance = await createTestAttendance();
    const ada = await addEmployee(attendance);
    const tap = tapper(attendance, ada.id);
    await tap("2026-11-23T22:00:00");

    // Its 8 hours count on Monday, the day of its Clock in...
    expect(await tap("2026-11-24T06:00:00")).toMatchObject({
      outcome: "clocked-out",
      minutesToday: 8 * 60,
    });
    // ...so a short Time entry later on Tuesday is all of Tuesday's hours.
    await tap("2026-11-24T07:00:00");
    expect(await tap("2026-11-24T07:30:00")).toMatchObject({
      outcome: "clocked-out",
      minutesToday: 30,
    });
  });

  test("lunch out and back in gives two Time entries, and the gap isn't counted", async () => {
    const attendance = await createTestAttendance();
    const ada = await addEmployee(attendance);
    const tap = tapper(attendance, ada.id);

    expect(await tap("2026-11-23T09:00:00")).toMatchObject({ outcome: "clocked-in", minutesToday: 0 });
    expect(await tap("2026-11-23T12:30:00")).toMatchObject({ outcome: "clocked-out", minutesToday: 210 });
    expect(await tap("2026-11-23T13:15:00")).toMatchObject({ outcome: "clocked-in", minutesToday: 210 });
    expect(await tap("2026-11-23T17:30:00")).toMatchObject({
      outcome: "clocked-out",
      minutesToday: 7 * 60 + 45,
    });
  });

  test("counts hours today in the workplace time zone, not UTC", async () => {
    const attendance = await createTestAttendance({ timeZone: "Pacific/Auckland" });
    const ada = await addEmployee(attendance);
    const tap = tapper(attendance, ada.id);
    // Auckland is UTC+13 in November: these are 08:00–10:00 and 11:00–12:00 on Tuesday 24th,
    // though the first one is still Monday the 23rd in UTC.
    await tap("2026-11-23T19:00:00");
    await tap("2026-11-23T21:00:00");
    await tap("2026-11-23T22:00:00");

    expect(await tap("2026-11-23T23:00:00")).toMatchObject({
      outcome: "clocked-out",
      minutesToday: 3 * 60,
    });
  });

  test("counts whole minutes and doesn't round up", async () => {
    const attendance = await createTestAttendance();
    const ada = await addEmployee(attendance);
    const tap = tapper(attendance, ada.id);
    await tap("2026-11-23T09:00:00");

    expect(await tap("2026-11-23T09:59:59")).toMatchObject({ minutesToday: 59 });
  });

  test("a wrong PIN is refused and records nothing", async () => {
    const attendance = await createTestAttendance();
    const ada = await addEmployee(attendance, "Ada", "1234");
    const tap = tapper(attendance, ada.id);

    expect(await tap("2026-11-23T09:00:00", "4321")).toEqual({
      outcome: "wrong-pin",
      employee: { id: ada.id, name: "Ada" },
    });
    expect(await attendance.onSiteNow(at("2026-11-23T09:01:00"))).toEqual([]);
    // The next right PIN is still the first Clock in.
    expect(await tap("2026-11-23T09:02:00")).toMatchObject({ outcome: "clocked-in" });
  });

  test("a wrong PIN doesn't clock out an Employee who is On site", async () => {
    const attendance = await createTestAttendance();
    const ada = await addEmployee(attendance);
    const tap = tapper(attendance, ada.id);
    await tap("2026-11-23T09:00:00");

    expect(await tap("2026-11-23T17:00:00", "0000")).toMatchObject({ outcome: "wrong-pin" });
    expect(await attendance.onSiteNow(at("2026-11-23T17:01:00"))).toHaveLength(1);
  });

  test("checks the PIN of the Employee who was picked, even when PINs are shared", async () => {
    const attendance = await createTestAttendance();
    const ada = await addEmployee(attendance, "Ada", "1234");
    const grace = await addEmployee(attendance, "Grace", "1234");

    await tapper(attendance, ada.id)("2026-11-23T09:00:00");

    expect(await attendance.onSiteNow(at("2026-11-23T09:01:00"))).toEqual([
      expect.objectContaining({ employeeId: ada.id }),
    ]);
    expect(await tapper(attendance, grace.id)("2026-11-23T09:05:00")).toMatchObject({
      outcome: "clocked-in",
      employee: { name: "Grace" },
    });
  });

  test("a Deactivated Employee can't tap", async () => {
    const attendance = await createTestAttendance();
    const ada = await addEmployee(attendance);
    await attendance.deactivateEmployee(ada.id, at("2026-11-22T12:00:00"));

    expect(await tapper(attendance, ada.id)("2026-11-23T09:00:00")).toEqual({
      outcome: "unknown-employee",
    });
    expect(await attendance.onSiteNow(at("2026-11-23T09:01:00"))).toEqual([]);
  });

  test("a Deactivated Employee who was On site can't clock out", async () => {
    const attendance = await createTestAttendance();
    const ada = await addEmployee(attendance);
    const tap = tapper(attendance, ada.id);
    await tap("2026-11-23T09:00:00");
    await attendance.deactivateEmployee(ada.id, at("2026-11-23T10:00:00"));

    expect(await tap("2026-11-23T17:00:00")).toEqual({ outcome: "unknown-employee" });
  });

  test("a reactivated Employee can tap again", async () => {
    const attendance = await createTestAttendance();
    const ada = await addEmployee(attendance);
    await attendance.deactivateEmployee(ada.id, at("2026-11-22T12:00:00"));
    await attendance.reactivateEmployee(ada.id);

    expect(await tapper(attendance, ada.id)("2026-11-23T09:00:00")).toMatchObject({
      outcome: "clocked-in",
    });
  });

  test("an Employee who doesn't exist can't tap", async () => {
    const attendance = await createTestAttendance();

    expect(
      await tapper(attendance, "00000000-0000-4000-8000-00000000abcd")("2026-11-23T09:00:00"),
    ).toEqual({ outcome: "unknown-employee" });
    expect(await tapper(attendance, "not-an-id")("2026-11-23T09:00:00")).toEqual({
      outcome: "unknown-employee",
    });
  });

  test("taps by different Employees don't affect each other", async () => {
    const attendance = await createTestAttendance();
    const ada = await addEmployee(attendance, "Ada");
    const grace = await addEmployee(attendance, "Grace");
    await tapper(attendance, ada.id)("2026-11-23T09:00:00");

    expect(await tapper(attendance, grace.id)("2026-11-23T09:30:00")).toMatchObject({
      outcome: "clocked-in",
    });
    expect(await tapper(attendance, ada.id)("2026-11-23T12:00:00")).toMatchObject({
      outcome: "clocked-out",
      minutesToday: 180,
    });
  });
});

describe("Employees on the Kiosk", () => {
  test("lists active Employees by name, with whether each is On site", async () => {
    const attendance = await createTestAttendance();
    const grace = await addEmployee(attendance, "Grace");
    const ada = await addEmployee(attendance, "Ada");
    const linus = await addEmployee(attendance, "Linus");
    await tapper(attendance, grace.id)("2026-11-23T09:00:00");
    await tapper(attendance, linus.id)("2026-11-22T09:00:00"); // a Missed clock-out by Monday

    expect(await attendance.listKioskEmployees(at("2026-11-23T10:00:00"))).toEqual([
      { id: ada.id, name: "Ada", onSite: false },
      { id: grace.id, name: "Grace", onSite: true },
      { id: linus.id, name: "Linus", onSite: false },
    ]);
  });

  test("leaves out Deactivated Employees", async () => {
    const attendance = await createTestAttendance();
    const ada = await addEmployee(attendance, "Ada");
    const grace = await addEmployee(attendance, "Grace");
    await attendance.deactivateEmployee(grace.id, at("2026-11-22T12:00:00"));

    expect(await attendance.listKioskEmployees(at("2026-11-23T10:00:00"))).toEqual([
      { id: ada.id, name: "Ada", onSite: false },
    ]);
  });
});

describe("On site now", () => {
  test("lists On site Employees with their Clock in time, earliest first", async () => {
    const attendance = await createTestAttendance();
    const ada = await addEmployee(attendance, "Ada");
    const grace = await addEmployee(attendance, "Grace");
    const linus = await addEmployee(attendance, "Linus");
    await tapper(attendance, grace.id)("2026-11-23T08:30:00");
    await tapper(attendance, ada.id)("2026-11-23T09:00:00");
    await tapper(attendance, linus.id)("2026-11-23T09:15:00");
    await tapper(attendance, linus.id)("2026-11-23T09:45:00"); // went home

    expect(await attendance.onSiteNow(at("2026-11-23T10:00:00"))).toEqual([
      { employeeId: grace.id, name: "Grace", clockIn: at("2026-11-23T08:30:00") },
      { employeeId: ada.id, name: "Ada", clockIn: at("2026-11-23T09:00:00") },
    ]);
  });

  test("includes a Clock in exactly 16 hours ago and excludes one just over, a Missed clock-out", async () => {
    const attendance = await createTestAttendance();
    const ada = await addEmployee(attendance, "Ada");
    await tapper(attendance, ada.id)("2026-11-23T08:00:00");

    expect(await attendance.onSiteNow(at("2026-11-24T00:00:00"))).toHaveLength(1);
    expect(await attendance.onSiteNow(at("2026-11-24T00:00:01"))).toEqual([]);
  });
});
