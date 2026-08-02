import { Star, Camera } from 'lucide-react'
import { resolveAssetUrl } from '../../lib/assets'

function initials(name) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

function BarberCard({ barber, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
        selected ? 'border-ink bg-surface-2' : 'border-border bg-surface hover:border-ink/50'
      }`}
    >
      {barber.avatarUrl ? (
        <img src={resolveAssetUrl(barber.avatarUrl)} alt="" className="h-16 w-16 rounded-full object-cover" />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-2 text-lg font-medium text-ink">
          {initials(barber.name)}
        </div>
      )}
      <div>
        <p className="text-sm font-medium text-ink">{barber.name}</p>
        {barber.rating != null && (
          <div className="mt-0.5 flex items-center gap-1 text-xs text-muted">
            <Star size={12} className="fill-ink text-ink" />
            {barber.rating} · {barber.reviewsCount} reseñas
          </div>
        )}
        {barber.portfolioCount != null && (
          <div className="mt-1 flex items-center gap-1 text-xs text-muted">
            <Camera size={12} />
            {barber.portfolioCount} trabajos en portafolio
          </div>
        )}
      </div>
    </button>
  )
}

export default BarberCard
