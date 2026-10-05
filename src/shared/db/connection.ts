import postgres from "postgres";

let sql: postgres.Sql | undefined;

/**
 * Conexión única a Postgres (lazy, para que `next build` no necesite DATABASE_URL).
 * `prepare: false` mantiene compatibilidad con el pooler de Supabase en modo transacción.
 */
export function getSql(): postgres.Sql {
  if (!sql) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL no está definida. Ver .env.example.");
    }
    sql = postgres(url, { prepare: false, max: 10 });
  }
  return sql;
}

/** Cierra la conexión (tests y scripts). */
export async function closeSql(): Promise<void> {
  if (sql) {
    await sql.end({ timeout: 5 });
    sql = undefined;
  }
}
