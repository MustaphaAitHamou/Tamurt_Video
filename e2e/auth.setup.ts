import { mkdirSync } from "node:fs";

import { expect, test as setup } from "@playwright/test";

import { DEMO_PASSWORD, storageStatePath, USERS, type DemoUser } from "./fixtures";

// Une connexion par profil, réutilisée par les tests (évite la limitation des tentatives).
for (const user of [
  "admin",
  "editor",
  "rights",
  "standard",
  "premium",
  "member",
  "founder",
] as DemoUser[]) {
  setup(`connexion ${user}`, async ({ page }) => {
    mkdirSync("e2e/.auth", { recursive: true });
    await page.goto("/connexion");
    await page.locator('input[name="email"]').fill(USERS[user]);
    await page.locator('input[name="password"]').fill(DEMO_PASSWORD);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/connexion"));
    await expect(page.getByRole("button", { name: "Mon compte" })).toBeVisible();
    await page.context().storageState({ path: storageStatePath(user) });
  });
}
