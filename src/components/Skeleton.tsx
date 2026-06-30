export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-lg ${className}`} />
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <Skeleton className="w-10 h-10 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-2.5 w-20" />
      </div>
      <Skeleton className="h-3.5 w-12" />
    </div>
  )
}
