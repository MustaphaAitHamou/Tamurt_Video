import { TitleCard } from "@/components/catalog/title-card";
import type { TitleCardData } from "@/server/catalog/types";

export function TitleGrid({ items }: { items: TitleCardData[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {items.map((item, index) => (
        <li key={item.id}>
          <TitleCard title={item} variant="poster" priority={index < 6} />
        </li>
      ))}
    </ul>
  );
}
