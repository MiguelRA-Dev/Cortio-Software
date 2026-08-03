import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import { listMyAppointments } from '../../api/appointments'

const STATUS_LABEL = {
  completed: 'Completada',
  confirmed: 'Confirmada',
  pending: 'Pendiente',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
}

const STATUS_VARIANT = {
  completed: 'success',
  confirmed: 'neutral',
  pending: 'muted',
  cancelled: 'danger',
  no_show: 'danger',
}

function formatTime(date) {
  return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function TodayAppointments() {
  const { data: appointments = [] } = useQuery({ queryKey: ['appointments'], queryFn: () => listMyAppointments() })

  const today = useMemo(() => {
    const todayKey = new Date().toDateString()
    return appointments
      .filter((a) => new Date(a.startTime).toDateString() === todayKey)
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
  }, [appointments])

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted">Citas de hoy</h3>
        <span className="text-xs text-muted">{today.length} citas</span>
      </div>

      {today.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No hay citas programadas para hoy.</p>
      ) : (
        <div className="mt-4 flex flex-col divide-y divide-border">
          {today.map((a) => (
            <div key={a._id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
              <span className="w-12 shrink-0 text-sm font-medium tabular-nums text-ink">
                {formatTime(new Date(a.startTime))}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{a.customer?.name}</p>
                <p className="truncate text-xs text-muted">
                  {a.service?.name} · {a.barber?.name}
                </p>
              </div>
              <Badge variant={STATUS_VARIANT[a.status]}>{STATUS_LABEL[a.status]}</Badge>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

export default TodayAppointments
