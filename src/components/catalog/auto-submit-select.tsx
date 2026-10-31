"use client";

import { NativeSelect } from "@/components/ui/native-select";

/** Liste de filtres qui soumet son formulaire GET dès qu'elle change (et fonctionne sans JavaScript). */
export function AutoSubmitSelect(props: React.ComponentProps<typeof NativeSelect>) {
  return <NativeSelect {...props} onChange={(event) => event.currentTarget.form?.requestSubmit()} />;
}
