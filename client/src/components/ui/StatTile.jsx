import { ArrowUp, ArrowDown } from 'lucide-react'
import Card from './Card'

function StatTile({ label, value, delta, deltaDirection = 'up', icon: Icon }) {
  const isPositive = deltaDirection === 'up'

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
            isPositive ? 'text-success' : 'text-danger'
          }`}
        >
          {isPositive ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
          {delta}
        </div>
      )}
    </Card>
  )
}

export default StatTile
