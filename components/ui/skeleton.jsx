import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-esqueleto", className)}
      {...props} />
  );
}

export { Skeleton }
