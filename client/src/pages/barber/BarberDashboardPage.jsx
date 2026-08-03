import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar, DollarSign, Scissors, X as XIcon } from 'lucide-react'
import Card from '../../components/ui/Card'
import StatTile from '../../components/ui/StatTile'
import Badge from '../../components/ui/Badge'
import { formatCOP } from '../../lib/format'
import { listMyAppointments, updateAppointmentStatus } from '../../api/appointments'

const STATUS_LABEL = {
  completed: 'Completada',
  confirmed: 'Confirmada',
  pending: 'Pendiente',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
}
const STATUS_VARIANT = { completed: 'success', confirmed: 'neutral', pending: 'muted', cancelled: 'danger', no_show: 'danger' }

const today = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })

function formatTime(date) {
  return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function BarberDashboardPage() {
  const queryClient = useQueryClient()
  const { data: appointments = [] } = useQuery({ queryKey: ['appointments'], queryFn: () => listMyAppointments() })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => updateAppointmentStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] }),
  })

  const now = new Date()

  const todayAppointments = useMemo(
    () =>
      appointments
        .filter((a) => new Date(a.startTime).toDateString() === now.toDateString())
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [appointments]
  )

  const incomeToday = todayAppointments
    .filter((a) => a.status === 'completed')
    .reduce((sum, a) => sum + a.priceAtBooking, 0)

  const servicesThisMonth = useMemo(
    () =>
      appointments.filter(
        (a) =>
          a.status === 'completed' &&
          new Date(a.startTime).getFullYear() === now.getFullYear() &&
          new Date(a.startTime).getMonth() === now.getMonth()
      ).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [appointments]
  )

  function updateStatus(id, status) {
    statusMutation.mutate({ id, status })
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Mi día</h1>
      <p className="mt-1 text-sm text-muted capitalize">{today}</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Mis citas de hoy" value={String(todayAppointments.length)} icon={Calendar} />
        <StatTile label="Mis ingresos de hoy" value={formatCOP(incomeToday)} icon={DollarSign} />
        <StatTile label="Servicios este mes" value={String(servicesThisMonth)} icon={Scissors} />
      </div>

      <Card className="mt-6">
        <h3 className="text-sm font-medium text-muted">Mis citas de hoy</h3>
        {todayAppointments.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No tienes citas hoy.</p>
        ) : (
          <div className="mt-4 flex flex-col divide-y divide-border">
            {todayAppointments.map((a) => (
              <div key={a._id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                <span className="w-12 shrink-0 text-sm font-medium tabular-nums text-ink">
                  {formatTime(new Date(a.startTime))}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{a.customer?.name}</p>
                  <p className="truncate text-xs text-muted">{a.service?.name}</p>
                </div>
                <Badge variant={STATUS_VARIANT[a.status]}>{STATUS_LABEL[a.status]}</Badge>
                {(a.status === 'pending' || a.status === 'confirmed') && (
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => updateStatus(a._id, 'no_show')}
                      aria-label="El cliente no se presentó"
                      className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-danger"
                    >
                      <XIcon size={15} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

export default BarberDashboardPage
