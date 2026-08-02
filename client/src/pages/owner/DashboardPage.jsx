import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Calendar, DollarSign, Scissors, Receipt } from 'lucide-react'
import StatTile from '../../components/ui/StatTile'
import RevenueChart from '../../components/dashboard/RevenueChart'
import TodayAppointments from '../../components/dashboard/TodayAppointments'
import LowStockAlert from '../../components/dashboard/LowStockAlert'
import { useAuth } from '../../context/AuthContext'
import BarberDashboardPage from '../barber/BarberDashboardPage'
import { listMyAppointments } from '../../api/appointments'
import { getSummary, getByBarber } from '../../api/reports'
import { formatCOP } from '../../lib/format'

const today = new Date().toLocaleDateString('es-CO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

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

function OwnerDashboard() {
  const now = new Date()
  const todayFrom = startOfDay(now).toISOString()
  const todayTo = endOfDay(now).toISOString()
  const monthFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const { data: appointments = [] } = useQuery({ queryKey: ['appointments'], queryFn: () => listMyAppointments() })
  const { data: todaySummary } = useQuery({
    queryKey: ['reports', 'summary', todayFrom, todayTo],
    queryFn: () => getSummary({ from: todayFrom, to: todayTo }),
  })
  const { data: monthSummary } = useQuery({
    queryKey: ['reports', 'summary', monthFrom, todayTo],
    queryFn: () => getSummary({ from: monthFrom, to: todayTo }),
  })
  const { data: monthByBarber = [] } = useQuery({
    queryKey: ['reports', 'by-barber', monthFrom, todayTo],
    queryFn: () => getByBarber({ from: monthFrom, to: todayTo }),
  })

  const todayCount = useMemo(() => {
    const todayKey = now.toDateString()
    return appointments.filter((a) => new Date(a.startTime).toDateString() === todayKey).length
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointments])

  const servicesThisMonth = monthByBarber.reduce((sum, b) => sum + b.servicesCount, 0)

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Dashboard</h1>
      <p className="mt-1 text-sm text-muted capitalize">{today}</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Citas de hoy" value={String(todayCount)} icon={Calendar} />
        <StatTile label="Ingresos de hoy" value={formatCOP(todaySummary?.totalIncome || 0)} icon={DollarSign} />
        <StatTile label="Servicios este mes" value={String(servicesThisMonth)} icon={Scissors} />
        <StatTile label="Ticket promedio" value={formatCOP(monthSummary?.averageTicket || 0)} icon={Receipt} />
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
