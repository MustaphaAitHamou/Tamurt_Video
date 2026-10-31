import { readFileSync } from "node:fs";
import path from "node:path";

import { localeStatus, locales } from "../src/i18n/config.ts";
import { compareLocale, flatten, type Messages } from "../src/i18n/check.ts";

const load = (locale: string) => JSON.parse(readFileSync(path.join(import.meta.dirname, "..", "messages", `${locale}.json`), "utf8")) as Messages;
const reference = load("fr");
let failed = false;
console.log(`fr (référence) : ${Object.keys(flatten(reference)).length} messages`);
for (const locale of locales.filter((l) => l !== "fr")) {
  const messages = load(locale);
  const report = compareLocale(reference, messages, { partial: localeStatus[locale] === "partial-draft" });
  const count = Object.keys(flatten(messages)).length;
  const problems = Object.entries(report).filter(([, list]) => list.length > 0);
  console.log(`${locale} (${localeStatus[locale]}) : ${count} messages${problems.length ? "" : " — OK"}`);
  for (const [kind, list] of problems) {
    failed = true;
    console.log(`  ${kind} : ${list.join(", ")}`);
  }
}
process.exit(failed ? 1 : 0);
