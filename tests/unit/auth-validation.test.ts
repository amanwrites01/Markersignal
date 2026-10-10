import { describe, expect, it } from "vitest";
import { loginSchema, safeNext } from "@/lib/validation/auth";

describe("loginSchema", () => {
  it("validates creator login input", () => {
    const res = loginSchema.safeParse({
      email: "creator@example.com",
      password: "Password@123",
      role: "creator",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.role).toBe("creator");
      expect(res.data.email).toBe("creator@example.com");
    }
  });

  it("validates brand login input", () => {
    const res = loginSchema.safeParse({
      email: "brand@example.com",
      password: "Password@123",
      role: "brand",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.role).toBe("brand");
    }
  });

  it("allows login input without role (legacy backward compatibility)", () => {
    const res = loginSchema.safeParse({
      email: "anyone@example.com",
      password: "Password@123",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.role).toBeUndefined();
    }
  });

  it("rejects invalid roles", () => {
    const res = loginSchema.safeParse({
      email: "anyone@example.com",
      password: "Password@123",
      role: "admin",
    });
    expect(res.success).toBe(false);
  });
});

describe("safeNext", () => {
  it("accepts same-origin relative paths", () => {
    expect(safeNext("/creator/dashboard")).toBe("/creator/dashboard");
    expect(safeNext("/brand/dashboard")).toBe("/brand/dashboard");
  });

  it("rejects open redirects", () => {
    expect(safeNext("https://evil.com", "/fallback")).toBe("/fallback");
    expect(safeNext("//evil.com", "/fallback")).toBe("/fallback");
    expect(safeNext("/\\evil.com", "/fallback")).toBe("/fallback");
  });
});
