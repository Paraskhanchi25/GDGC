export function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading overview">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface)]" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="h-72 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface)] lg:col-span-7" />
        <div className="h-72 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface)] lg:col-span-5" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-52 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface)]" />
        ))}
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading records">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface)]" />
      ))}
    </div>
  );
}
