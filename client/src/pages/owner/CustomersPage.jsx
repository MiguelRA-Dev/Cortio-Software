import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import { formatCOP } from '../../lib/format'
import { listCustomers } from '../../api/customers'

const SEGMENT_LABEL = { new: 'Nuevo', frequent: 'Frecuente', inactive: 'Inactivo', regular: 'Regular' }
const SEGMENT_VARIANT = { new: 'neutral', frequent: 'success', inactive: 'danger', regular: 'muted' }

const SEGMENT_FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'new', label: 'Nuevos' },
  { id: 'frequent', label: 'Frecuentes' },
  { id: 'inactive', label: 'Inactivos' },
]

const PAGE_SIZE = 20

function daysSince(dateStr) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

function getSegment(customer) {
  if (daysSince(customer.lastVisit) > 60) return 'inactive'
  if (daysSince(customer.firstVisit) < 30) return 'new'
  if (customer.totalVisits >= 5) return 'frequent'
  return 'regular'
}

function initials(name) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

function CustomersPage() {
  const [search, setSearch] = useState('')
  const [segmentFilter, setSegmentFilter] = useState('all')
  const [page, setPage] = useState(1)

  const { data: customers = [], isLoading, isError } = useQuery({ queryKey: ['customers'], queryFn: listCustomers })

  const enriched = useMemo(
    () => customers.map((c) => ({ ...c, segment: getSegment(c) })).sort((a, b) => b.totalSpent - a.totalSpent),
    [customers]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return enriched.filter((c) => {
      const matchesSegment = segmentFilter === 'all' || c.segment === segmentFilter
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.phone || '').includes(q) ||
        (c.email || '').toLowerCase().includes(q)
      return matchesSegment && matchesSearch
    })
  }, [enriched, search, segmentFilter])

  // Search/segment changes reshuffle the result set, so land back on page 1 instead
  // of stranding the user on a now out-of-range page.
  useEffect(() => {
    setPage(1)
  }, [search, segmentFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Clientes</h1>
        <p className="mt-1 text-sm text-muted">{customers.length} clientes registrados</p>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-surface-2 p-1">
          {SEGMENT_FILTERS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSegmentFilter(s.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                segmentFilter === s.id ? 'bg-accent text-accent-ink' : 'text-muted hover:text-ink'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono o correo"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface-2 py-2 pl-9 pr-3 text-sm text-ink outline-none placeholder:text-muted/60 focus:border-accent"
          />
        </div>
      </div>

      <Card className="mt-6">
        {isLoading ? (
          <p className="py-4 text-sm text-muted">Cargando clientes…</p>
        ) : isError ? (
          <p className="py-4 text-sm text-danger">No pudimos cargar los clientes. Intenta recargar.</p>
        ) : filtered.length === 0 ? (
          <p className="py-4 text-sm text-muted">No hay clientes que coincidan con este filtro.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {paginated.map((c) => (
              <div key={c.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-medium text-ink">
                    {initials(c.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{c.name}</p>
                    <p className="truncate text-xs text-muted">{c.phone} · {c.email}</p>
                  </div>
                </div>

                <div className="flex flex-1 flex-wrap items-center gap-x-6 gap-y-1 text-xs text-muted sm:justify-end">
                  <span>
                    <span className="font-medium text-ink">{c.totalVisits}</span> visitas · última hace{' '}
                    <span className="font-medium text-ink">{daysSince(c.lastVisit)}d</span>
                  </span>
                  <span>
                    <span className="font-medium text-ink">{formatCOP(c.totalSpent)}</span> gastado
                  </span>
                  <span className="hidden md:inline">
                    Prefiere <span className="font-medium text-ink">{c.favoriteBarber || '—'}</span> · {c.favoriteService || '—'}
                  </span>
                  <Badge variant={SEGMENT_VARIANT[c.segment]}>{SEGMENT_LABEL[c.segment]}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {!isLoading && !isError && filtered.length > 0 && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between gap-4">
          <p className="text-xs text-muted">
            Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} de{' '}
            {filtered.length} clientes
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-border p-2 text-muted hover:bg-surface-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
              aria-label="Página anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-medium text-ink">
              Página {currentPage} de {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-border p-2 text-muted hover:bg-surface-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
              aria-label="Página siguiente"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default CustomersPage
