import { parse, TYPE, type MessageFormatElement } from "@formatjs/icu-messageformat-parser";

/**
 * Contrôle de cohérence des traductions par rapport au français (référence) :
 * clés manquantes ou inconnues, syntaxe ICU, variables et balises conservées.
 * Utilisé par les tests unitaires et par `pnpm i18n:check`.
 */
export type Messages = { [key: string]: string | Messages };

export function flatten(messages: Messages, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(messages)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") result[path] = value;
    else Object.assign(result, flatten(value, path));
  }
  return result;
}

function collectArguments(elements: MessageFormatElement[], names = new Set<string>()) {
  for (const element of elements) {
    if (element.type === TYPE.argument || element.type === TYPE.number || element.type === TYPE.date || element.type === TYPE.time) {
      names.add(`{${element.value}}`);
    } else if (element.type === TYPE.plural || element.type === TYPE.select) {
      names.add(`{${element.value}}`);
      for (const option of Object.values(element.options)) collectArguments(option.value, names);
    } else if (element.type === TYPE.tag) {
      names.add(`<${element.value}>`);
      collectArguments(element.children, names);
    }
  }
  return names;
}

export function placeholders(message: string) {
  return [...collectArguments(parse(message))].sort();
}

export type LocaleReport = { missing: string[]; unknown: string[]; invalid: string[]; placeholderMismatch: string[] };

export function compareLocale(reference: Messages, candidate: Messages, { partial = false } = {}): LocaleReport {
  const ref = flatten(reference);
  const target = flatten(candidate);
  const report: LocaleReport = { missing: [], unknown: [], invalid: [], placeholderMismatch: [] };
  for (const key of Object.keys(ref)) if (!(key in target) && !partial) report.missing.push(key);
  for (const [key, value] of Object.entries(target)) {
    if (!(key in ref)) {
      report.unknown.push(key);
      continue;
    }
    try {
      const expected = placeholders(ref[key]!).join(",");
      if (placeholders(value).join(",") !== expected) report.placeholderMismatch.push(key);
    } catch {
      report.invalid.push(key);
    }
  }
  return report;
}
