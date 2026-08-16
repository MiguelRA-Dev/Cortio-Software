import { ArrowUp, ArrowDown } from 'lucide-react'
import Card from './Card'

// `deltaDirection` controls the arrow (did the raw number go up or down), `deltaTone`
// controls the color (is that a good or bad thing) — kept separate because for metrics
// like Gastos, a number going up is bad, but the arrow should still point up to match
// what actually happened. `deltaTone` is optional and defaults to matching direction,
// so callers that only care about "higher is better" metrics can ignore it entirely.
function StatTile({ label, value, delta, deltaDirection = 'up', deltaTone, icon: Icon }) {
  const isUp = deltaDirection === 'up'
  const isGood = deltaTone ? deltaTone === 'good' : isUp

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <span className="text-sm text-muted">{label}</span>
        {Icon && <Icon size={18} className="text-muted" strokeWidth={2} />}
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-ink">{value}</div>
      {delta && (
        <div
          className={`mt-2 inline-flex items-center gap-1 text-xs font-medium ${
            isGood ? 'text-success' : 'text-danger'
          }`}
        >
          {isUp ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
          {delta}
        </div>
      )}
    </Card>
  )
}

export default StatTile
