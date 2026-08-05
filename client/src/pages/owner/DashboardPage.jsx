import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Calendar, DollarSign, TrendingDown, TrendingUp, Scissors, Receipt, Wallet } from 'lucide-react'
import StatTile from '../../components/ui/StatTile'
import Input from '../../components/ui/Input'
import RevenueChart from '../../components/dashboard/RevenueChart'
import TodayAppointments from '../../components/dashboard/TodayAppointments'
import LowStockAlert from '../../components/dashboard/LowStockAlert'
import { useAuth } from '../../context/AuthContext'
import BarberDashboardPage from '../barber/BarberDashboardPage'
import { listMyAppointments } from '../../api/appointments'
import { getSummary, getByBarber } from '../../api/reports'
import { formatCOP } from '../../lib/format'
import { toDateKey } from '../../lib/dates'
import { RANGE_PRESETS, defaultCustomFrom, getRangeDates } from '../../lib/reportRange'

const today = new Date().toLocaleDateString('es-CO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

function OwnerDashboard() {
  const now = new Date()

  const [range, setRange] = useState('month')
  const [customFrom, setCustomFrom] = useState(defaultCustomFrom())
  const [customTo, setCustomTo] = useState(toDateKey(new Date()))

  const { from, to } = useMemo(() => getRangeDates(range, customFrom, customTo), [range, customFrom, customTo])

  const { data: appointments = [] } = useQuery({ queryKey: ['appointments'], queryFn: () => listMyAppointments() })
  const { data: periodSummary } = useQuery({
    queryKey: ['reports', 'summary', from, to],
    queryFn: () => getSummary({ from, to }),
  })
  const { data: periodByBarber = [] } = useQuery({
    queryKey: ['reports', 'by-barber', from, to],
    queryFn: () => getByBarber({ from, to }),
  })

  const todayCount = useMemo(() => {
    const todayKey = now.toDateString()
    return appointments.filter((a) => new Date(a.startTime).toDateString() === todayKey).length
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointments])

  const servicesInPeriod = periodByBarber.reduce((sum, b) => sum + b.servicesCount, 0)

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Dashboard</h1>
      <p className="mt-1 text-sm text-muted capitalize">{today}</p>

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
              id="dashboardCustomFrom"
              type="date"
              value={customFrom}
              max={customTo}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="py-1.5"
            />
            <span className="text-sm text-muted">a</span>
            <Input
              id="dashboardCustomTo"
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

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Citas de hoy" value={String(todayCount)} icon={Calendar} />
        <StatTile label="Ingresos" value={formatCOP(periodSummary?.totalIncome || 0)} icon={DollarSign} />
        <StatTile label="Gastos" value={formatCOP(periodSummary?.totalExpenses || 0)} icon={TrendingDown} />
        <StatTile label="Nómina pagada" value={formatCOP(periodSummary?.totalPayroll || 0)} icon={Wallet} />
        <StatTile label="Utilidad neta" value={formatCOP(periodSummary?.netProfit || 0)} icon={TrendingUp} />
        <StatTile label="Servicios" value={String(servicesInPeriod)} icon={Scissors} />
        <StatTile label="Ticket promedio" value={formatCOP(periodSummary?.averageTicket || 0)} icon={Receipt} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <RevenueChart />
          <TodayAppointments />
        </div>
        <div className="flex flex-col gap-4">
          <LowStockAlert />
        </div>
      </div>
    </div>
  )
}

function DashboardPage() {
  const { user } = useAuth()
  if (user.role === 'barber') return <BarberDashboardPage />
  return <OwnerDashboard />
}

export default DashboardPage
