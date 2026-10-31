import { existsSync } from "node:fs";

import { expect, storageStatePath, test } from "./fixtures";

test.describe("lecteur vidéo", () => {
  test.use({ storageState: storageStatePath("standard") });
  test.skip(
    !existsSync("dev-media/demo-episode/master.m3u8"),
    "Médias de test absents : lancer pnpm media:dev",
  );

  test("lit un épisode autorisé en HLS avec sous-titres", async ({ page }) => {
    await page.goto("/regarder/cuisine-de-nos-meres");
    const video = page.locator("video");
    await expect(video).toBeVisible();
    await expect
      .poll(async () => video.evaluate((v: HTMLVideoElement) => v.currentTime), { timeout: 30_000 })
      .toBeGreaterThan(1);
    expect(await video.evaluate((v: HTMLVideoElement) => v.textTracks.length)).toBeGreaterThan(0);
  });
});
