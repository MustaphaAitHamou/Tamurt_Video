import { test as base, expect } from "@playwright/test";

export const DEMO_PASSWORD = "Tamurt-Demo-2026";
export const USERS = {
  admin: "admin@tamurt.test",
  editor: "editeur@tamurt.test",
  rights: "droits@tamurt.test",
  founder: "fondateur@tamurt.test",
  standard: "standard@tamurt.test",
  premium: "premium@tamurt.test",
  member: "membre@tamurt.test",
} as const;
export type DemoUser = keyof typeof USERS;

export const storageStatePath = (user: DemoUser) => `e2e/.auth/${user}.json`;

export const test = base.extend<{ consented: void }>({
  consented: [
    async ({ page, baseURL }, use) => {
      await page.context().addCookies([
        {
          name: "tv_consent",
          value: encodeURIComponent(
            JSON.stringify({ analytics: false, ads: false, version: "2026-10" }),
          ),
          url: baseURL ?? "http://localhost:3000",
        },
      ]);
      await use();
    },
    { auto: true },
  ],
});

export { expect };
