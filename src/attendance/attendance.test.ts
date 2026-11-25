import { describe, expect, test } from "vitest";
import { createTestAttendance } from "./testing";

const mondayMorning = new Date("2026-11-23T09:00:00Z");

describe("On site now", () => {
  test("lists nobody when no Employee has clocked in", async () => {
    const attendance = await createTestAttendance();

    expect(await attendance.onSiteNow(mondayMorning)).toEqual([]);
  });
});

describe("Workplace time zone", () => {
  test("is refused when it isn't a real time zone", async () => {
    await expect(
      createTestAttendance({ timeZone: "Europe/Atlantis" }),
    ).rejects.toThrow('Unknown workplace time zone "Europe/Atlantis"');
  });
});
