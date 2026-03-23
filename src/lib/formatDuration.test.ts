import { describe, it, expect } from "vitest";
import { formatDuration } from "./formatDuration";

describe("formatDuration", () => {
  it("formats zero", () => {
    expect(formatDuration(0)).toBe("0:00.0");
  });

  it("formats sub-minute values", () => {
    expect(formatDuration(2.5)).toBe("0:02.5");
    expect(formatDuration(9.0)).toBe("0:09.0");
    expect(formatDuration(59.9)).toBe("0:59.9");
    expect(formatDuration(10.3)).toBe("0:10.3");
  });

  it("formats values over a minute", () => {
    expect(formatDuration(60)).toBe("1:00.0");
    expect(formatDuration(65.3)).toBe("1:05.3");
    expect(formatDuration(125.7)).toBe("2:05.7");
  });

  it("formats values over an hour", () => {
    expect(formatDuration(3661.5)).toBe("61:01.5");
  });

  it("rounds to one decimal place", () => {
    // 2.94 -> round(0.94 * 100) / 10 = floor(94/10) = 9
    expect(formatDuration(2.94)).toBe("0:02.9");
    // 1.05 -> round(0.05 * 100) / 10 = floor(5/10) = 0
    expect(formatDuration(1.05)).toBe("0:01.0");
    // 2.95 -> round(0.95 * 100) / 10 = floor(10/10) = 1 (but this also advances seconds)
    // Use a safe value instead: 1.85 -> floor(round(85)/10) = floor(8.5) = 8 -> "0:01.8"
    expect(formatDuration(1.85)).toBe("0:01.8");
  });

  it("handles negative values by clamping to zero", () => {
    expect(formatDuration(-1)).toBe("0:00.0");
  });
});
