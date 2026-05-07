export function ResultsSkeleton() {
  return (
    <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 card-glass p-6 space-y-6 animate-pulse">
      <div className="space-y-2 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="h-5 w-2/3 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-3 w-1/2 rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-5 w-20 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-800" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 space-y-2"
          >
            <div className="h-3 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-7 w-20 rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div className="h-3 w-20 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-3 w-full rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-3 w-11/12 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-3 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
    </section>
  );
}
