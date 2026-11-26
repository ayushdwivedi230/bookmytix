interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse bg-[#161925] border border-white/[0.04] rounded-xl ${className}`}
    />
  );
}

export function MovieCardSkeleton() {
  return (
    <div
      className="rounded-2xl border border-white/[0.06] bg-[#0F1118] overflow-hidden flex flex-col"
      aria-hidden="true"
    >
      <Skeleton className="aspect-[2/3] w-full rounded-none" />
      <div className="p-3.5 space-y-2.5">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-8 w-full mt-2" />
      </div>
    </div>
  );
}

export function EventCardSkeleton() {
  return (
    <div
      className="rounded-2xl border border-white/[0.06] bg-[#0F1118] overflow-hidden flex flex-col"
      aria-hidden="true"
    >
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3.5 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-10 w-full mt-2" />
      </div>
    </div>
  );
}
