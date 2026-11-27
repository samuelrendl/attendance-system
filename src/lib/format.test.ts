import { describe, expect, test } from "vitest";
import { formatDuration, formatTime } from "./format";

describe("formatDuration", () => {
  test("shows hours and minutes", () => {
    expect(formatDuration(7 * 60 + 45)).toBe("7h 45m");
    expect(formatDuration(8 * 60 + 5)).toBe("8h 05m");
    expect(formatDuration(0)).toBe("0h 00m");
    expect(formatDuration(30 * 60)).toBe("30h 00m");
  });
});

describe("formatTime", () => {
  test("shows the 24-hour time in the workplace time zone", () => {
    const instant = new Date("2026-11-23T17:30:00Z");
    expect(formatTime(instant, "Europe/London")).toBe("17:30");
    expect(formatTime(instant, "Pacific/Auckland")).toBe("06:30");
  });
});
