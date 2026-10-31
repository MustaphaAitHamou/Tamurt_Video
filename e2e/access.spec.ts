import { expect, storageStatePath, test } from "./fixtures";

test.describe("visiteur", () => {
  test("l'espace client exige une connexion", async ({ page }) => {
    await page.goto("/compte");
    await expect(page).toHaveURL(/\/connexion\?next=%2Fcompte/);
  });

  test("la connexion refuse un mot de passe erroné", async ({ page }) => {
    await page.goto("/connexion");
    await page.locator('input[name="email"]').fill("membre@tamurt.test");
    await page.locator('input[name="password"]').fill("Mauvais-mot-de-passe-1");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "incorrect" })).toBeVisible();
  });

  test("le lecteur demande de se connecter", async ({ page }) => {
    await page.goto("/regarder/cuisine-de-nos-meres");
    await expect(page.getByText("Connectez-vous pour regarder ce contenu.").first()).toBeVisible();
  });
});

test.describe("membre gratuit", () => {
  test.use({ storageState: storageStatePath("member") });
  test("le back-office lui est invisible (404)", async ({ page }) => {
    const response = await page.goto("/admin");
    expect(response?.status()).toBe(404);
  });
  test("les demandes de films sont réservées aux membres Premium", async ({ page }) => {
    await page.goto("/demandes");
    await expect(
      page.getByText("Les demandes et les votes sont réservés aux membres Premium.").first(),
    ).toBeVisible();
    await page.goto("/demandes/nouvelle");
    await expect(page).toHaveURL(/\/demandes$/);
  });
});

test.describe("gestionnaire des droits", () => {
  test.use({ storageState: storageStatePath("rights") });
  test("accède aux droits mais pas aux abonnements", async ({ page }) => {
    await page.goto("/admin/droits");
    await expect(page.getByRole("heading", { name: "Droits et licences" })).toBeVisible();
    await page.goto("/admin/abonnements");
    await expect(page).toHaveURL(/\/admin\/acces-refuse/);
  });
});
