import { Star, UserRound } from 'lucide-react'
import { resolveAssetUrl } from '../../lib/assets'

function initials(name) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

function BarberCard({ barber, selected, onSelect, onViewProfile }) {
  return (
    <div
      className={`flex flex-col items-start gap-3 rounded-xl border p-4 transition-colors ${
        selected ? 'border-ink bg-surface-2' : 'border-border bg-surface hover:border-ink/50'
      }`}
    >
      <button type="button" onClick={onSelect} className="flex w-full flex-col items-start gap-3 text-left">
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
        </div>
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onViewProfile?.()
        }}
        className="flex items-center gap-1.5 text-xs font-medium text-muted underline hover:text-ink"
      >
        <UserRound size={12} />
        Ver perfil
      </button>
    </div>
  )
}

export default BarberCard
