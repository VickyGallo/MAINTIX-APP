import { drizzle } from "drizzle-orm/postgres-js";

import * as schema from "@/db/schema";

import { getSql } from "./connection";

/**
 * ⚠️ adminDb se conecta con el rol `postgres`, que IGNORA RLS.
 * Solo se permite en la infraestructura de jobs e importador, en scripts y en tests
 * (regla de lint en eslint.config.mjs, ADR-002).
 */
export function getAdminDb() {
  return drizzle({ client: getSql(), schema });
}
