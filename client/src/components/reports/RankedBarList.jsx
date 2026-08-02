function RankedBarList({ items, valueFormatter = (v) => v, emptyLabel = 'Sin datos para este período.' }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted">{emptyLabel}</p>
  }

  const max = Math.max(...items.map((i) => i.value), 1)

  return (
    <div className="flex flex-col gap-3.5">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="truncate font-medium text-ink">{item.label}</span>
            <span className="shrink-0 tabular-nums text-muted">{valueFormatter(item.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-ink transition-all"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export default RankedBarList
