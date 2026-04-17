import { describe, it, expect } from "vitest";
import { parseNumber, clamp, daysUntil, fBRL, fPct } from "../../src/lib/format";

describe("parseNumber", () => {
  it("parses plain numbers", () => {
    expect(parseNumber(42)).toBe(42);
    expect(parseNumber(0)).toBe(0);
  });

  it("returns 0 for null/undefined/empty", () => {
    expect(parseNumber(null)).toBe(0);
    expect(parseNumber(undefined)).toBe(0);
    expect(parseNumber("")).toBe(0);
  });

  it("parses BR format 1.234,56", () => {
    expect(parseNumber("1.234,56")).toBe(1234.56);
    expect(parseNumber("1.234.567,89")).toBe(1234567.89);
  });

  it("parses comma-only as decimal (BR)", () => {
    expect(parseNumber("12,50")).toBe(12.5);
  });

  it("parses dot-only as decimal (US)", () => {
    expect(parseNumber("12.50")).toBe(12.5);
  });

  it("strips currency symbols", () => {
    expect(parseNumber("R$ 1.234,56")).toBe(1234.56);
  });

  it("returns 0 for Infinity/NaN numbers", () => {
    expect(parseNumber(Infinity)).toBe(0);
    expect(parseNumber(NaN)).toBe(0);
  });
});

describe("clamp", () => {
  it("clamps to range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });
});

describe("daysUntil", () => {
  it("returns Infinity for empty or invalid", () => {
    expect(daysUntil("")).toBe(Infinity);
    expect(daysUntil(null)).toBe(Infinity);
    expect(daysUntil("not-a-date")).toBe(Infinity);
    expect(daysUntil("2026-13-01")).toBe(Infinity);
  });

  it("returns 0 for past dates", () => {
    expect(daysUntil("2020-01-01")).toBe(0);
  });

  it("returns positive integer for future dates", () => {
    const future = new Date();
    future.setDate(future.getDate() + 5);
    const yyyy = future.getFullYear();
    const mm = String(future.getMonth() + 1).padStart(2, "0");
    const dd = String(future.getDate()).padStart(2, "0");
    expect(daysUntil(`${yyyy}-${mm}-${dd}`)).toBe(5);
  });
});

describe("fBRL", () => {
  it("formats as BRL", () => {
    expect(fBRL(1234.56).replace(/\u00A0/g, " ")).toBe("R$ 1.234,56");
  });

  it("handles invalid input", () => {
    expect(fBRL(null).replace(/\u00A0/g, " ")).toBe("R$ 0,00");
    expect(fBRL(Infinity).replace(/\u00A0/g, " ")).toBe("R$ 0,00");
  });
});

describe("fPct", () => {
  it("formats percentage", () => {
    expect(fPct(5.5)).toBe("5,50%");
    expect(fPct(0)).toBe("0,00%");
  });
});
