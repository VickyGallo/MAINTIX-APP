import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

/**
 * Reglas de capas (specs/fase-00-fundaciones, F0-T07 y ADR-002).
 *
 * `no-restricted-imports` no fusiona configuraciones: el último bloque que
 * coincide con un archivo gana. Por eso cada alcance declara la lista completa
 * de restricciones que le aplican.
 */
const ADMIN_DB = {
  group: ["@/shared/db/admin", "**/shared/db/admin"],
  message:
    "adminDb ignora RLS. Solo se permite en la infraestructura de jobs/importer y en scripts (ADR-002).",
};
const INFRASTRUCTURE = {
  group: ["**/infrastructure", "**/infrastructure/**"],
  message: "Esta capa no puede depender de infrastructure (Clean Architecture).",
};
const APPLICATION = {
  group: ["**/application", "**/application/**"],
  message: "Esta capa no puede depender de application.",
};
const API = {
  group: ["**/modules/*/api", "**/modules/*/api/**", "../api", "../api/**"],
  message: "Esta capa no puede depender de la capa api.",
};
const DOMAIN = {
  group: ["**/domain", "**/domain/**"],
  message: "src/app solo importa la capa api de los módulos y @/ui.",
};
const DATA_ACCESS = {
  group: ["@/db", "@/db/**", "@/shared/db", "@/shared/db/**"],
  message: "Esta capa no accede a la base de datos directamente.",
};
const FRAMEWORKS = {
  group: [
    "next",
    "next/**",
    "react",
    "react/**",
    "react-dom",
    "react-dom/**",
    "drizzle-orm",
    "drizzle-orm/**",
    "postgres",
    "@supabase/**",
  ],
  message: "El dominio y los casos de uso no dependen de frameworks ni de la base de datos.",
};

const restrict = (...patterns) => ["error", { patterns }];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    files: ["**/*.{ts,tsx,mts,js,mjs}"],
    rules: { "no-restricted-imports": restrict(ADMIN_DB) },
  },
  {
    files: ["src/modules/*/domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": restrict(
        ADMIN_DB,
        INFRASTRUCTURE,
        APPLICATION,
        API,
        DATA_ACCESS,
        FRAMEWORKS,
      ),
    },
  },
  {
    files: ["src/modules/*/application/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": restrict(ADMIN_DB, INFRASTRUCTURE, API, DATA_ACCESS, FRAMEWORKS),
    },
  },
  {
    files: ["src/app/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": restrict(ADMIN_DB, INFRASTRUCTURE, APPLICATION, DOMAIN, DATA_ACCESS),
    },
  },
  {
    // Únicos lugares autorizados a usar adminDb.
    files: [
      "src/modules/jobs/infrastructure/**/*.ts",
      "src/modules/importer/infrastructure/**/*.ts",
      "scripts/**/*.{ts,mts}",
      "tests/**/*.ts",
    ],
    rules: { "no-restricted-imports": "off" },
  },
  globalIgnores([".next/**", "out/**", "build/**", "coverage/**", "next-env.d.ts", "legacy/**"]),
]);

export default eslintConfig;
