import { GridSkeleton } from "@/components/catalog/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-8 px-4 pt-28 sm:px-6 lg:px-10" aria-busy="true">
      <Skeleton className="h-10 w-56" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <GridSkeleton />
    </div>
  );
}
