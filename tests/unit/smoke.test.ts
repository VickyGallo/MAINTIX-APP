import { describe, expect, it } from "vitest";

describe("smoke (unit)", () => {
  it("resuelve el alias @/ hacia src/", async () => {
    const mod = await import("@/app/page");
    expect(typeof mod.default).toBe("function");
  });
});
