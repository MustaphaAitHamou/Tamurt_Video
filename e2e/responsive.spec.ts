import { expect, test } from "./fixtures";

for (const path of ["/", "/offres", "/catalogue", "/connexion"]) {
  test(`pas de défilement horizontal sur mobile : ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

test("le menu mobile est accessible", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Ouvrir le menu" })).toBeVisible();
});
