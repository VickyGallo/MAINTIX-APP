import { ESLint } from "eslint";
import { beforeAll, describe, expect, it } from "vitest";

/**
 * Verifica las reglas de capas de eslint.config.mjs (F0-T07).
 * Se lintea código en memoria con rutas ficticias: no hace falta que los archivos existan.
 */
let eslint: ESLint;

beforeAll(async () => {
  eslint = new ESLint({ cwd: process.cwd() });
  // La primera ejecución carga la configuración y los plugins (varios segundos).
  await eslint.lintText("export {};\n", { filePath: "src/warmup.ts" });
}, 60_000);

async function restrictedImportErrors(filePath: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath });
  return (result?.messages ?? [])
    .filter((m) => m.ruleId === "no-restricted-imports")
    .map((m) => m.message);
}

const cases: Array<{ name: string; file: string; code: string; allowed: boolean }> = [
  {
    name: "domain no importa infrastructure",
    file: "src/modules/tickets/domain/ticket.ts",
    code: 'import { repo } from "../infrastructure/ticket-repository";\nexport const x = repo;\n',
    allowed: false,
  },
  {
    name: "domain no importa application",
    file: "src/modules/tickets/domain/ticket.ts",
    code: 'import { createTicket } from "@/modules/tickets/application/create-ticket";\nexport const x = createTicket;\n',
    allowed: false,
  },
  {
    name: "domain no importa frameworks",
    file: "src/modules/tickets/domain/ticket.ts",
    code: 'import { eq } from "drizzle-orm";\nexport const x = eq;\n',
    allowed: false,
  },
  {
    name: "domain puede importar otros archivos de domain",
    file: "src/modules/tickets/domain/ticket.ts",
    code: 'import { Money } from "./money";\nexport const x = Money;\n',
    allowed: true,
  },
  {
    name: "application no importa infrastructure",
    file: "src/modules/tickets/application/create-ticket.ts",
    code: 'import { repo } from "@/modules/tickets/infrastructure/ticket-repository";\nexport const x = repo;\n',
    allowed: false,
  },
  {
    name: "application puede importar domain",
    file: "src/modules/tickets/application/create-ticket.ts",
    code: 'import { Ticket } from "../domain/ticket";\nexport const x = Ticket;\n',
    allowed: true,
  },
  {
    name: "src/app no importa adminDb",
    file: "src/app/api/v1/tickets/route.ts",
    code: 'import { adminDb } from "@/shared/db/admin";\nexport const x = adminDb;\n',
    allowed: false,
  },
  {
    name: "src/app no importa infrastructure",
    file: "src/app/(fm)/tickets/page.tsx",
    code: 'import { repo } from "@/modules/tickets/infrastructure/ticket-repository";\nexport const x = repo;\n',
    allowed: false,
  },
  {
    name: "src/app puede importar la capa api y la UI",
    file: "src/app/api/v1/tickets/route.ts",
    code: 'import { listTickets } from "@/modules/tickets/api/list-tickets";\nimport { Button } from "@/ui/button";\nexport const x = [listTickets, Button];\n',
    allowed: true,
  },
  {
    name: "la capa api no importa adminDb",
    file: "src/modules/tickets/api/list-tickets.ts",
    code: 'import { adminDb } from "@/shared/db/admin";\nexport const x = adminDb;\n',
    allowed: false,
  },
  {
    name: "la infraestructura de jobs sí puede usar adminDb",
    file: "src/modules/jobs/infrastructure/runner.ts",
    code: 'import { adminDb } from "@/shared/db/admin";\nexport const x = adminDb;\n',
    allowed: true,
  },
  {
    name: "la infraestructura de otros módulos no puede usar adminDb",
    file: "src/modules/tickets/infrastructure/ticket-repository.ts",
    code: 'import { adminDb } from "@/shared/db/admin";\nexport const x = adminDb;\n',
    allowed: false,
  },
];

describe("reglas de capas (eslint)", () => {
  it.each(cases)("$name", async ({ file, code, allowed }) => {
    const errors = await restrictedImportErrors(file, code);
    if (allowed) {
      expect(errors).toEqual([]);
    } else {
      expect(errors.length).toBeGreaterThan(0);
    }
  });
});
