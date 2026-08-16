import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Star } from 'lucide-react'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import RankedBarList from '../../components/reports/RankedBarList'
import BarberStatCard from '../../components/reports/BarberStatCard'
import { getByBarber, getCancellations, getRatings, getRecentReviews } from '../../api/reports'
import { listTeam } from '../../api/barbers'
import { toDateKey } from '../../lib/dates'
import { RANGE_PRESETS, defaultCustomFrom, getRangeDates } from '../../lib/reportRange'

const STAR_VALUES = [5, 4, 3, 2, 1]
const REVIEWS_PAGE_SIZE = 10

const REPORT_TABS = [
  { id: 'profesionales', label: 'Profesionales' },
  { id: 'resenas', label: 'Reseñas' },
]

// Same show/hide-without-unmounting pattern as TeamPage.jsx's barber-edit modal — kept
// mounted so scroll position / query state under each tab doesn't reset on switch.
function TabPanel({ active, children }) {
  return <div className={active ? '' : 'hidden'}>{children}</div>
}

const EMPTY_CANCELLATIONS = {
  overall: {
    resolvedCount: 0,
    completedCount: 0,
    cancelledCount: 0,
    noShowCount: 0,
    cancellationRate: null,
    noShowRate: null,
    cancelledByBreakdown: { owner: 0, barber: 0, customer: 0 }
  },
  byBarber: []
}

const EMPTY_RATINGS = {
  overall: { count: 0, average: null, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
  byBarber: []
}

function ReportsPage() {
  const [range, setRange] = useState('month')
  const [customFrom, setCustomFrom] = useState(defaultCustomFrom())
  const [customTo, setCustomTo] = useState(toDateKey(new Date()))
  const [activeTab, setActiveTab] = useState('profesionales')
  const [reviewsPage, setReviewsPage] = useState(1)

  const { from, to } = useMemo(() => getRangeDates(range, customFrom, customTo), [range, customFrom, customTo])

  // A new date range can leave reviewsPage pointing past the end of the new result set.
  useEffect(() => setReviewsPage(1), [from, to])

  const { data: byBarber = [] } = useQuery({
    queryKey: ['reports', 'by-barber', from, to],
    queryFn: () => getByBarber({ from, to }),
  })
  const { data: cancellations = EMPTY_CANCELLATIONS } = useQuery({
    queryKey: ['reports', 'cancellations', from, to],
    queryFn: () => getCancellations({ from, to }),
  })
  const { data: ratings = EMPTY_RATINGS } = useQuery({
    queryKey: ['reports', 'ratings', from, to],
    queryFn: () => getRatings({ from, to }),
  })
  const { data: recentReviews = { items: [], total: 0, page: 1, pageSize: REVIEWS_PAGE_SIZE } } = useQuery({
    queryKey: ['reports', 'recent-reviews', from, to, reviewsPage],
    queryFn: () => getRecentReviews({ from, to, page: reviewsPage, pageSize: REVIEWS_PAGE_SIZE }),
  })
  const { data: team = [] } = useQuery({ queryKey: ['team'], queryFn: listTeam })

  const ratingDistributionItems = STAR_VALUES.map((n) => ({ label: `${n} ★`, value: ratings.overall.distribution[n] }))

  const barberProfiles = useMemo(() => {
    const teamById = new Map(team.map((t) => [t._id, t]))
    const cancelById = new Map(cancellations.byBarber.map((b) => [b.barberId, b]))
    const ratingById = new Map(ratings.byBarber.map((b) => [b.barberId, b]))

    return byBarber.map((b) => {
      const cancel = cancelById.get(b.barberId)
      const rating = ratingById.get(b.barberId)
      return {
        barberId: b.barberId,
        name: b.name,
        avatarUrl: teamById.get(b.barberId)?.avatarUrl || null,
        revenue: b.revenue,
        servicesCount: b.servicesCount,
        occupancyRate: b.occupancyRate,
        appointmentSales: b.appointmentSales,
        walkInSales: b.walkInSales,
        cancellationRate: cancel?.cancellationRate ?? null,
        noShowRate: cancel?.noShowRate ?? null,
        ratingAverage: rating?.average ?? null,
        ratingCount: rating?.count ?? 0,
      }
    })
  }, [byBarber, cancellations, ratings, team])

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Reportes</h1>
      <p className="mt-1 text-sm text-muted">Rentabilidad y desempeño del negocio</p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-surface-2 p-1">
          {RANGE_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setRange(p.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                range === p.id ? 'bg-accent text-accent-ink' : 'text-muted hover:text-ink'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {range === 'custom' && (
          <div className="flex items-center gap-2">
            <Input
              id="customFrom"
              type="date"
              value={customFrom}
              max={customTo}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="py-1.5"
            />
            <span className="text-sm text-muted">a</span>
            <Input
              id="customTo"
              type="date"
              value={customTo}
              min={customFrom}
              max={toDateKey(new Date())}
              onChange={(e) => setCustomTo(e.target.value)}
              className="py-1.5"
            />
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-1 rounded-lg border border-border bg-surface-2 p-1">
        {REPORT_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.id ? 'bg-accent text-accent-ink' : 'text-muted hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <TabPanel active={activeTab === 'profesionales'}>
        {barberProfiles.length === 0 ? (
          <p className="mt-6 text-sm text-muted">Aún no tienes profesionales registrados.</p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {barberProfiles.map((b) => (
              <BarberStatCard key={b.barberId} barber={b} />
            ))}
          </div>
        )}
      </TabPanel>

      <TabPanel active={activeTab === 'resenas'}>
        <Card className="mt-6">
          <h3 className="text-sm font-medium text-muted">Calificaciones</h3>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-ink">{ratings.overall.average ?? '—'}</span>
            <span className="text-xs text-muted">
              {ratings.overall.count} {ratings.overall.count === 1 ? 'reseña' : 'reseñas'}
            </span>
          </div>
          <div className="mt-4">
            <RankedBarList items={ratingDistributionItems} emptyLabel="Sin calificaciones en este período." />
          </div>
          {ratings.byBarber.length > 0 && (
            <div className="mt-4 flex flex-col divide-y divide-border border-t border-border">
              {ratings.byBarber.map((b) => (
                <div key={b.barberId} className="flex items-center justify-between py-3 text-sm first:pt-3 last:pb-0">
                  <span className="font-medium text-ink">{b.name}</span>
                  <span className="tabular-nums text-muted">{b.average === null ? 'Sin reseñas' : `${b.average} ★ (${b.count})`}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="mt-4">
          <h3 className="text-sm font-medium text-muted">Comentarios</h3>
          {recentReviews.items.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Sin reseñas en este período.</p>
          ) : (
            <div className="mt-3 flex flex-col divide-y divide-border">
              {recentReviews.items.map((r) => (
                <div key={r.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star key={n} size={12} className={n <= r.rating ? 'fill-ink text-ink' : 'text-border'} />
                        ))}
                      </div>
                      <span className="text-sm font-medium text-ink">{r.barberName}</span>
                    </div>
                    <span className="shrink-0 text-xs text-muted">{r.customerName}</span>
                  </div>
                  {r.comment && <p className="mt-1.5 text-sm text-muted">"{r.comment}"</p>}
                </div>
              ))}
            </div>
          )}

          {recentReviews.total > REVIEWS_PAGE_SIZE && (
            <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
              <button
                type="button"
                onClick={() => setReviewsPage((p) => Math.max(1, p - 1))}
                disabled={reviewsPage === 1}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted hover:text-ink disabled:opacity-40 disabled:hover:text-muted"
              >
                <ChevronLeft size={16} />
                Anterior
              </button>
              <span className="text-xs text-muted">
                Página {reviewsPage} de {Math.ceil(recentReviews.total / REVIEWS_PAGE_SIZE)}
              </span>
              <button
                type="button"
                onClick={() => setReviewsPage((p) => Math.min(Math.ceil(recentReviews.total / REVIEWS_PAGE_SIZE), p + 1))}
                disabled={reviewsPage >= Math.ceil(recentReviews.total / REVIEWS_PAGE_SIZE)}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted hover:text-ink disabled:opacity-40 disabled:hover:text-muted"
              >
                Siguiente
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </Card>
      </TabPanel>
    </div>
  )
}

export default ReportsPage
