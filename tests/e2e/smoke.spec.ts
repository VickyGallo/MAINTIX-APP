import { expect, test } from "@playwright/test";

test("la home muestra la marca Maintix", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Maintix" })).toBeVisible();
  await expect(page).toHaveTitle(/Maintix/);
});
