import { HeroSkeleton, RowSkeleton } from "@/components/catalog/skeletons";

export default function Loading() {
  return (
    <div className="pb-10" aria-busy="true">
      <HeroSkeleton />
      <div className="relative z-10 -mt-20 space-y-10">
        <RowSkeleton />
        <RowSkeleton landscape />
        <RowSkeleton />
      </div>
    </div>
  );
}
