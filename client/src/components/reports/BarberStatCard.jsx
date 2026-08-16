import { Star } from 'lucide-react'
import Card from '../ui/Card'
import { resolveAssetUrl } from '../../lib/assets'
import { formatCOP } from '../../lib/format'

function initials(name) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

// Thresholds are a judgment call, not a business rule from the owner — a simple default
// so the card flags something worth a look instead of just another number to eyeball.
function cancellationStatus(rate) {
  if (rate === null) return { label: 'Sin datos', tone: 'neutral' }
  if (rate < 10) return { label: 'Baja', tone: 'good' }
  if (rate < 25) return { label: 'Media', tone: 'warning' }
  return { label: 'Alta', tone: 'danger' }
}

const STATUS_CLASSES = {
  good: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
  neutral: 'bg-surface-2 text-muted',
}

function BarberStatCard({ barber }) {
  const status = cancellationStatus(barber.cancellationRate)
  const filledStars = barber.ratingAverage === null ? 0 : Math.round(barber.ratingAverage)

  return (
    <Card>
      <div className="flex items-center gap-3">
        {barber.avatarUrl ? (
          <img src={resolveAssetUrl(barber.avatarUrl)} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-medium text-ink">
            {initials(barber.name)}
          </div>
        )}
        <p className="truncate text-sm font-medium text-ink">{barber.name}</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3.5">
        <div>
          <p className="text-xs text-muted">Ingresos</p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums text-ink">{formatCOP(barber.revenue)}</p>
        </div>

        <div>
          <p className="text-xs text-muted">Ocupación</p>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-ink transition-all"
                style={{ width: `${Math.round((barber.occupancyRate || 0) * 100)}%` }}
              />
            </div>
            <span className="shrink-0 text-xs tabular-nums text-muted">
              {barber.occupancyRate === null ? '—' : `${Math.round(barber.occupancyRate * 100)}%`}
            </span>
          </div>
        </div>

        <div>
          <p className="text-xs text-muted">Cancelación</p>
          <div className="mt-1 flex items-center gap-1.5">
            <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-medium ${STATUS_CLASSES[status.tone]}`}>
              {status.label}
            </span>
            {barber.cancellationRate !== null && (
              <span className="text-xs tabular-nums text-muted">
                {barber.cancellationRate}% · {barber.noShowRate}% no-show
              </span>
            )}
          </div>
        </div>

        <div>
          <p className="text-xs text-muted">Calificación</p>
          {barber.ratingAverage === null ? (
            <p className="mt-1.5 text-xs text-muted">Sin reseñas</p>
          ) : (
            <div className="mt-1.5 flex items-center gap-1">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} size={12} className={n <= filledStars ? 'fill-ink text-ink' : 'text-border'} />
                ))}
              </div>
              <span className="text-xs tabular-nums text-muted">
                {barber.ratingAverage} ({barber.ratingCount})
              </span>
            </div>
          )}
        </div>
      </div>

      <p className="mt-3.5 border-t border-border pt-3 text-xs text-muted">
        {barber.servicesCount} servicios · {barber.appointmentSales} de citas · {barber.walkInSales} walk-in
      </p>
    </Card>
  )
}

export default BarberStatCard
