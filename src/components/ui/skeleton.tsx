import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("bg-skeleton animate-shimmer rounded-lg", className)}
      {...props}
    />
  );
}

export { Skeleton };
