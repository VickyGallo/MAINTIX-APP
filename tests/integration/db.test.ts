import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { getAdminDb } from "@/shared/db/admin";
import { closeSql } from "@/shared/db/connection";

/**
 * Requiere Supabase local en ejecución (`pnpm db:start`) y DATABASE_URL definida.
 */
describe("conexión a la base de datos", () => {
  afterAll(async () => {
    await closeSql();
  });

  it("ejecuta select 1", async () => {
    const rows = await getAdminDb().execute<{ ok: number }>(sql`select 1 as ok`);
    expect(rows[0]?.ok).toBe(1);
  });
});
