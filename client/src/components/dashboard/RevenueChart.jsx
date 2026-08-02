import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Card from '../ui/Card'
import { formatCOP } from '../../lib/format'
import { listSales } from '../../api/sales'

function last7Days() {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    d.setHours(0, 0, 0, 0)
    days.push(d)
  }
  return days
}

function RevenueChart() {
  const [hovered, setHovered] = useState(null)
  const days = useMemo(last7Days, [])
  const from = days[0].toISOString()
  const to = useMemo(() => {
    const d = new Date()
    d.setHours(23, 59, 59, 999)
    return d.toISOString()
  }, [])

  const { data: sales = [] } = useQuery({
    queryKey: ['sales', 'last7', from, to],
    queryFn: () => listSales({ from, to }),
  })

  const data = useMemo(
    () =>
      days.map((day) => {
        const dayKey = day.toDateString()
        const value = sales
          .filter((s) => new Date(s.createdAt).toDateString() === dayKey)
          .reduce((sum, s) => sum + s.total, 0)
        return { day: day.toLocaleDateString('es-CO', { weekday: 'short' }), value }
      }),
    [days, sales]
  )

  const rawMax = Math.max(...data.map((d) => d.value), 1)
  const niceMax = Math.ceil(rawMax / 100000) * 100000 || 100000
  const ticks = [niceMax, niceMax / 2, 0]

  return (
    <Card>
      <h3 className="text-sm font-medium text-muted">Ingresos — últimos 7 días</h3>

      <div className="mt-6 flex gap-3">
        <div className="flex h-40 flex-col justify-between text-xs text-muted tabular-nums">
          {ticks.map((t) => (
            <span key={t}>{formatCOP(t)}</span>
          ))}
        </div>

        <div className="relative flex flex-1 gap-3">
          <div className="pointer-events-none absolute inset-x-0 top-0 flex h-40 flex-col justify-between">
            {ticks.map((t) => (
              <div key={t} className="border-t border-border" />
            ))}
          </div>

          {data.map((d, i) => (
            <div key={i} className="flex flex-1 flex-col items-center">
              <div
                className="relative flex h-40 w-full items-end justify-center"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(i)}
                onBlur={() => setHovered(null)}
                tabIndex={0}
              >
                {hovered === i && (
                  <div className="absolute -top-8 whitespace-nowrap rounded-md border border-border bg-surface-2 px-2 py-1 text-xs font-medium text-ink shadow-lg">
                    {formatCOP(d.value)}
                  </div>
                )}
                <div
                  className="w-full max-w-6 rounded-t-[4px] bg-ink transition-opacity hover:opacity-80"
                  style={{ height: `${(d.value / niceMax) * 100}%` }}
                />
              </div>
              <span className="mt-2 text-xs capitalize text-muted">{d.day}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

export default RevenueChart
