import { describe, expect, test } from "vitest";
import { createAttendance, schema, type Attendance } from "./index";
import { createTestAttendance, createTestDatabase } from "./testing";

const mondayMorning = new Date("2026-11-23T08:30:00Z");
const mondayAfternoon = new Date("2026-11-23T14:00:00Z");
const tuesdayMorning = new Date("2026-11-24T08:30:00Z");

describe("Activating a Kiosk", () => {
  test("gives a device token that resolves to the new Kiosk", async () => {
    const attendance = await createTestAttendance();

    const activated = await attendance.activateKiosk({
      name: "Front door tablet",
      now: mondayMorning,
    });

    expect(activated.ok).toBe(true);
    if (!activated.ok) return;
    expect(await attendance.resolveKiosk(activated.token)).toEqual({
      id: activated.kiosk.id,
      name: "Front door tablet",
      activatedAt: mondayMorning,
    });
  });

  test("trims the name", async () => {
    const attendance = await createTestAttendance();

    const { kiosk } = await activate(attendance, "  Front door tablet  ");

    expect(kiosk.name).toBe("Front door tablet");
  });

  test("is refused without a name, and no Kiosk is created", async () => {
    const attendance = await createTestAttendance();

    expect(
      await attendance.activateKiosk({ name: "   ", now: mondayMorning }),
    ).toEqual({ ok: false, error: "missing-name" });
    expect(await attendance.listKiosks()).toEqual([]);
  });
});

describe("The device token", () => {
  // A storage property, so this one test looks at the stored row directly:
  // anyone who reads the database (or a backup) must not be able to act as a Kiosk.
  test("is stored only as a hash, never as itself", async () => {
    const db = await createTestDatabase();
    const attendance = createAttendance({ db, timeZone: "Europe/London" });

    const { token } = await activate(attendance, "Front door tablet");

    const stored = JSON.stringify(await db.select().from(schema.kiosk));
    expect(stored).toContain("Front door tablet");
    expect(stored).not.toContain(token);
  });
});

describe("Resolving a device token", () => {
  test("finds no Kiosk for a token that was never issued", async () => {
    const attendance = await createTestAttendance();
    await activate(attendance, "Front door tablet");

    expect(await attendance.resolveKiosk("not-a-real-device-token")).toBeNull();
  });

  test("finds no Kiosk once that Kiosk is revoked", async () => {
    const attendance = await createTestAttendance();
    const { kiosk, token } = await activate(attendance, "Front door tablet");

    await attendance.revokeKiosk({ kioskId: kiosk.id, now: mondayAfternoon });

    expect(await attendance.resolveKiosk(token)).toBeNull();
  });
});

describe("Several Kiosks", () => {
  test("can be active at once, each with its own device token", async () => {
    const attendance = await createTestAttendance();
    const frontDoor = await activate(attendance, "Front door tablet");
    const backDoor = await activate(attendance, "Back door tablet");

    expect(frontDoor.token).not.toEqual(backDoor.token);
    expect((await attendance.resolveKiosk(frontDoor.token))?.name).toBe("Front door tablet");
    expect((await attendance.resolveKiosk(backDoor.token))?.name).toBe("Back door tablet");
  });

  test("revoking one leaves the others working", async () => {
    const attendance = await createTestAttendance();
    const frontDoor = await activate(attendance, "Front door tablet");
    const backDoor = await activate(attendance, "Back door tablet");

    await attendance.revokeKiosk({ kioskId: frontDoor.kiosk.id, now: mondayAfternoon });

    expect(await attendance.resolveKiosk(frontDoor.token)).toBeNull();
    expect((await attendance.resolveKiosk(backDoor.token))?.name).toBe("Back door tablet");
  });
});

describe("Listing Kiosks", () => {
  test("shows every Kiosk, newest first, with its activation date and revoked state", async () => {
    const attendance = await createTestAttendance();
    await activate(attendance, "Front door tablet", mondayMorning);
    const backDoor = await activate(attendance, "Back door tablet", mondayAfternoon);
    await attendance.revokeKiosk({ kioskId: backDoor.kiosk.id, now: tuesdayMorning });

    expect(await attendance.listKiosks()).toEqual([
      {
        id: backDoor.kiosk.id,
        name: "Back door tablet",
        activatedAt: mondayAfternoon,
        revokedAt: tuesdayMorning,
      },
      {
        id: expect.any(String),
        name: "Front door tablet",
        activatedAt: mondayMorning,
        revokedAt: null,
      },
    ]);
  });

  test("keeps the first revoked time when a Kiosk is revoked twice", async () => {
    const attendance = await createTestAttendance();
    const { kiosk } = await activate(attendance, "Front door tablet");

    await attendance.revokeKiosk({ kioskId: kiosk.id, now: mondayAfternoon });
    await attendance.revokeKiosk({ kioskId: kiosk.id, now: tuesdayMorning });

    expect(await attendance.listKiosks()).toEqual([
      expect.objectContaining({ name: "Front door tablet", revokedAt: mondayAfternoon }),
    ]);
  });
});

async function activate(attendance: Attendance, name: string, now = mondayMorning) {
  const activated = await attendance.activateKiosk({ name, now });
  if (!activated.ok) throw new Error(`Couldn't activate "${name}": ${activated.error}`);
  return activated;
}
