import { expect, storageStatePath, test } from "./fixtures";

test.describe("éditeur de catalogue", () => {
  test.use({ storageState: storageStatePath("editor") });

  test("crée une œuvre, se voit refuser la publication sans licence, puis la supprime", async ({
    page,
  }) => {
    const name = `E2E œuvre ${Date.now()}`;
    await page.goto("/admin/catalogue/nouveau");
    await page.locator('input[name="title"]').fill(name);
    await page.locator('input[name="release_year"]').fill("2026");
    await page.locator('input[name="countries"]').fill("DZ");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await page.waitForURL(/\/admin\/catalogue\/[0-9a-f-]{36}$/);
    await expect(page.getByText("Aucune licence valide")).toBeVisible();

    await page.getByRole("button", { name: "Publier maintenant" }).click();
    await expect(
      page.getByText("Publication impossible : une licence signée", { exact: false }).first(),
    ).toBeVisible();

    await page.getByRole("button", { name: "Supprimer", exact: true }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Confirmer" }).click();
    await expect(page.getByText("Œuvre supprimée (archivée).").first()).toBeVisible();
  });
});

test.describe("membre Premium", () => {
  test.use({ storageState: storageStatePath("premium") });

  test("propose une œuvre, avec rappel qu'une demande n'est pas une promesse", async ({ page }) => {
    await page.goto("/demandes/nouvelle");
    await expect(
      page.getByText("ne constitue ni une promesse de disponibilité", { exact: false }).first(),
    ).toBeVisible();
    await page
      .locator('input[name="title"]')
      .fill(`Essai E2E ${Math.random().toString(36).slice(2, 10)}`);
    await page.getByRole("button", { name: "Envoyer la demande" }).click();
    // Des demandes proches peuvent être proposées : on confirme l'envoi.
    const anyway = page.getByRole("button", { name: "Envoyer quand même" });
    const created = page.getByText("Votre demande a été enregistrée.");
    await expect(anyway.or(created).first()).toBeVisible();
    if (await anyway.isVisible()) await anyway.click();
    await expect(created).toBeVisible();
    await page.getByRole("link", { name: "Suivi de la demande" }).click();
    await expect(page).toHaveURL(/\/demandes\/[0-9a-f-]{36}/);
    await expect(page.getByText("Demande reçue").first()).toBeVisible();
  });
});
