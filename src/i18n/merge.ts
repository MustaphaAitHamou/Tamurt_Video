type Messages = { [key: string]: string | Messages };

/** Fusion profonde : les clés absentes d'une traduction retombent sur le français. */
export function mergeMessages(base: Messages, override: Messages): Messages {
  const result: Messages = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const current = result[key];
    if (value && typeof value === "object" && current && typeof current === "object") {
      result[key] = mergeMessages(current, value);
    } else if (typeof value === "string" && value.trim() !== "") {
      result[key] = value;
    }
  }
  return result;
}
