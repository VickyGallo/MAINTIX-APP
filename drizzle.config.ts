import { defineConfig } from "drizzle-kit";

/**
 * drizzle-kit genera las migraciones SQL en supabase/migrations (formato de nombre de Supabase).
 * Las aplica la CLI de Supabase (`pnpm db:reset` en local), así existe un único registro de
 * migraciones por entorno. Ver ADR-002.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema",
  out: "./supabase/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
  },
  schemaFilter: ["public", "app"],
  migrations: {
    prefix: "supabase",
  },
  entities: {
    roles: {
      provider: "supabase",
    },
  },
  strict: true,
  verbose: true,
});
