import { describe, expect, it } from "vitest";

describe("supabase client", () => {
  it("initialises without throwing when env vars are absent", async () => {
    // This import must not throw — if VITE_SUPABASE_URL is undefined the
    // createClient call previously crashed the entire test suite in CI.
    await expect(import("./client")).resolves.toBeDefined();
  });

  it("exports a supabase client object", async () => {
    const { supabase } = await import("./client");
    expect(supabase).toBeDefined();
    expect(typeof supabase.from).toBe("function");
  });
});
