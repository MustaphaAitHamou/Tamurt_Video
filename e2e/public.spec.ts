import { expect, test } from "./fixtures";

test.describe("pages publiques", () => {
  test("l'accueil présente la phase fondatrice avec honnêteté", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Construisons ensemble");
    await expect(
      page
        .getByText("il ne donne pas accès à un catalogue de films commerciaux", { exact: false })
        .first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Devenir membre fondateur" }).first(),
    ).toBeVisible();
  });

  test("la page des offres affiche les trois formules en euros", async ({ page }) => {
    await page.goto("/offres");
    for (const plan of ["Fondateur", "Standard", "Premium"])
      await expect(page.getByRole("heading", { name: plan })).toBeVisible();
    await expect(page.getByText(/^2\s€$/).first()).toBeVisible();
    await expect(page.getByText(/≈ 300 DA/).first()).toBeVisible();
  });

  test("les documents juridiques sont présentés comme des brouillons", async ({ page }) => {
    await page.goto("/legal/cgu");
    await expect(
      page.getByText("Document provisoire, non validé juridiquement", { exact: false }),
    ).toBeVisible();
  });

  test("une page inconnue affiche la page d'erreur personnalisée", async ({ page }) => {
    const response = await page.goto("/cette-page-n-existe-pas");
    expect(response?.status()).toBe(404);
    await expect(page.getByText("Cette page s'est égarée")).toBeVisible();
  });

  test("la recherche propose des suggestions", async ({ page }) => {
    await page.goto("/catalogue");
    const search = page.getByRole("combobox").first();
    await search.fill("ta");
    await expect(page.getByRole("option").first()).toBeVisible();
  });

  test("l'arabe s'affiche de droite à gauche, avec l'avertissement de traduction", async ({
    page,
    baseURL,
  }) => {
    await page.context().addCookies([{ name: "NEXT_LOCALE", value: "ar", url: baseURL! }]);
    await page.goto("/offres");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.getByText("الترجمة قيد المراجعة", { exact: false })).toBeVisible();
  });
});

test.describe("consentement", () => {
  test("refuser est aussi simple qu'accepter, et le choix est mémorisé", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/");
    const banner = page.getByRole("dialog", { name: "Votre vie privée" });
    await expect(banner).toBeVisible();
    await banner.getByRole("button", { name: "Tout refuser" }).click();
    await expect(banner).toBeHidden();
    await page.reload();
    await expect(page.getByRole("dialog", { name: "Votre vie privée" })).toBeHidden();
  });
});
