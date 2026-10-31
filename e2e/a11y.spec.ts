import AxeBuilder from "@axe-core/playwright";

import { expect, test } from "./fixtures";

// Contrôle automatique WCAG 2.x A/AA : il ne remplace pas un audit manuel.
for (const path of [
  "/",
  "/offres",
  "/catalogue",
  "/connexion",
  "/inscription",
  "/aide",
  "/legal/cgu",
]) {
  test(`accessibilité de ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    const blocking = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(
      blocking.map(
        (v) =>
          `${v.id} (${v.impact}) : ${v.nodes
            .slice(0, 3)
            .map((n) => n.target.join(" "))
            .join(" | ")}`,
      ),
    ).toEqual([]);
  });
}
