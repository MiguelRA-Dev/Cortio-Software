import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DollarSign, TrendingDown, TrendingUp, Receipt } from 'lucide-react'
import Card from '../../components/ui/Card'
import StatTile from '../../components/ui/StatTile'
import Input from '../../components/ui/Input'
import RankedBarList from '../../components/reports/RankedBarList'
import { formatCOP } from '../../lib/format'
import { getSummary, getByBarber, getByService } from '../../api/reports'

const RANGE_PRESETS = [
  { id: '7d', label: 'Últimos 7 días' },
  { id: 'month', label: 'Este mes' },
  { id: 'lastMonth', label: 'Mes pasado' },
  { id: 'custom', label: 'Personalizado' },
]

function toDateInput(date) {
  return date.toISOString().slice(0, 10)
}

function defaultCustomFrom() {
  const d = new Date()
  d.setDate(d.getDate() - 6)
  return toDateInput(d)
}

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfDay(date) {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

function getRangeDates(range, customFrom, customTo) {
  const now = new Date()
  if (range === '7d') {
    const from = startOfDay(now)
    from.setDate(from.getDate() - 6)
    return { from: from.toISOString(), to: endOfDay(now).toISOString() }
  }
  if (range === 'month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1)
    return { from: from.toISOString(), to: endOfDay(now).toISOString() }
  }
  if (range === 'lastMonth') {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
    return { from: from.toISOString(), to: to.toISOString() }
  }
  return { from: startOfDay(new Date(customFrom)).toISOString(), to: endOfDay(new Date(customTo)).toISOString() }
}

function ReportsPage() {
  const [range, setRange] = useState('month')
  const [customFrom, setCustomFrom] = useState(defaultCustomFrom())
  const [customTo, setCustomTo] = useState(toDateInput(new Date()))

  const { from, to } = useMemo(() => getRangeDates(range, customFrom, customTo), [range, customFrom, customTo])

  const { data: summary = { totalIncome: 0, totalExpenses: 0, netProfit: 0, salesCount: 0, averageTicket: 0 } } = useQuery(
    { queryKey: ['reports', 'summary', from, to], queryFn: () => getSummary({ from, to }) }
  )
  const { data: byBarber = [] } = useQuery({
    queryKey: ['reports', 'by-barber', from, to],
    queryFn: () => getByBarber({ from, to }),
  })
  const { data: byService = [] } = useQuery({
    queryKey: ['reports', 'by-service', from, to],
    queryFn: () => getByService({ from, to }),
  })

  const byServiceItems = byService.map((s) => ({ label: s.name, value: s.revenue }))

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
              max={toDateInput(new Date())}
              onChange={(e) => setCustomTo(e.target.value)}
              className="py-1.5"
            />
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Ingresos" value={formatCOP(summary.totalIncome)} icon={DollarSign} />
        <StatTile label="Gastos" value={formatCOP(summary.totalExpenses)} icon={TrendingDown} />
        <StatTile label="Utilidad neta" value={formatCOP(summary.netProfit)} icon={TrendingUp} />
        <StatTile label="Ticket promedio" value={formatCOP(summary.averageTicket)} icon={Receipt} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="text-sm font-medium text-muted">Rentabilidad por servicio</h3>
          <div className="mt-4">
            <RankedBarList items={byServiceItems} valueFormatter={formatCOP} />
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-medium text-muted">Por barbero</h3>
          <div className="mt-4 flex flex-col divide-y divide-border">
            {byBarber.map((b) => (
              <div key={b.barberId} className="py-3.5 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-ink">{b.name}</span>
                  <span className="tabular-nums text-muted">
                    {b.servicesCount} servicios · {formatCOP(b.revenue)}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-ink transition-all"
                      style={{ width: `${Math.round((b.occupancyRate || 0) * 100)}%` }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted">
                    {b.occupancyRate === null ? '—' : `${Math.round(b.occupancyRate * 100)}%`}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-muted">
                  Ventas: {b.appointmentSales + b.walkInSales} ({b.appointmentSales} de citas · {b.walkInSales} walk-in)
                </p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">Barra = % de ocupación sobre su horario disponible</p>
        </Card>
      </div>
    </div>
  )
}

export default ReportsPage
