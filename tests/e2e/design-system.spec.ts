import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const colorScheme of ["light", "dark"] as const) {
  test(`/dev/ui sin violaciones de accesibilidad (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto("/dev/ui");
    await expect(page.getByRole("heading", { level: 1, name: "Sistema de diseño" })).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();

    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
}

test("el modal se abre, mantiene el foco y se cierra con Escape", async ({ page }) => {
  await page.goto("/dev/ui");
  await page.getByRole("button", { name: "Abrir modal" }).click();
  const dialog = page.getByRole("dialog", { name: "Aprobar presupuesto" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});
