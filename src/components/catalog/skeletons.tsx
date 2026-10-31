import { Skeleton } from "@/components/ui/skeleton";

export function RowSkeleton({ count = 7, landscape = false }: { count?: number; landscape?: boolean }) {
  return (
    <div className="space-y-3 px-4 sm:px-6 lg:px-10">
      <Skeleton className="h-6 w-48" />
      <div className="flex gap-3 overflow-hidden sm:gap-4">
        {Array.from({ length: count }).map((_, index) => (
          <Skeleton
            key={index}
            className={landscape ? "aspect-video w-[72vw] shrink-0 sm:w-[32vw] lg:w-[22vw]" : "aspect-[2/3] w-[38vw] shrink-0 sm:w-[20vw] lg:w-[13vw]"}
          />
        ))}
      </div>
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="relative h-[70svh] min-h-[480px] w-full">
      <Skeleton className="absolute inset-0 rounded-none" />
      <div className="absolute bottom-[18%] start-4 space-y-4 sm:start-6 lg:start-10">
        <Skeleton className="h-12 w-[60vw] max-w-xl" />
        <Skeleton className="h-4 w-[70vw] max-w-lg" />
        <Skeleton className="h-4 w-[50vw] max-w-md" />
        <div className="flex gap-3 pt-2">
          <Skeleton className="h-12 w-36 rounded-full" />
          <Skeleton className="h-12 w-36 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className="aspect-[2/3] w-full" />
      ))}
    </div>
  );
}
