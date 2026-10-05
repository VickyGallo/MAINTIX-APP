import { drizzle } from "drizzle-orm/postgres-js";

import * as schema from "@/db/schema";

import { getSql } from "./connection";

/**
 * Cliente base para requests de usuario. En F1-T06 se envuelve con `db.rls(ctx)`,
 * que ejecuta cada consulta con el rol `authenticated` y los claims del usuario.
 * No usar directamente desde casos de uso: siempre a través del wrapper RLS.
 */
export function getClientDb() {
  return drizzle({ client: getSql(), schema });
}
