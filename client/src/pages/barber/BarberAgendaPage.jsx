import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, X as XIcon, List, CalendarDays } from 'lucide-react'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import StaffCalendarView from '../../components/appointments/StaffCalendarView'
import { useAuth } from '../../context/AuthContext'
import { listMyAppointments, updateAppointmentStatus, rescheduleAppointment } from '../../api/appointments'
import { toDateKey } from '../../lib/dates'
import { STATUS_VARIANT, getStaffStatusLabel } from '../../lib/appointmentStatus'

const STATUS_FILTERS = [
  { id: 'all', label: 'Todas' },
  { id: 'pending', label: 'Pendiente' },
  { id: 'confirmed', label: 'Confirmada' },
  { id: 'completed', label: 'Completada' },
  { id: 'cancelled', label: 'Cancelada' },
  { id: 'no_show', label: 'No asistió' },
]

function formatTime(date) {
  return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function BarberAgendaPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [statusFilter, setStatusFilter] = useState('all')
  const [viewMode, setViewMode] = useState('calendar')
  const [rescheduleError, setRescheduleError] = useState('')

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => listMyAppointments(),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => updateAppointmentStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] }),
  })

  const rescheduleMutation = useMutation({
    mutationFn: ({ id, startTime }) => rescheduleAppointment(id, startTime),
    onSuccess: () => {
      setRescheduleError('')
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
    },
    onError: (err) => {
      setRescheduleError(err.response?.data?.error || 'No pudimos mover la cita a ese horario.')
      setTimeout(() => setRescheduleError(''), 4000)
    },
  })

  const selectedKey = toDateKey(selectedDate)
  const dayLabel = selectedDate.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })

  const filtered = useMemo(
    () =>
      appointments
        .filter(
          (a) => toDateKey(new Date(a.startTime)) === selectedKey && (statusFilter === 'all' || a.status === statusFilter)
        )
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime)),
    [appointments, selectedKey, statusFilter]
  )

  const calendarEvents = useMemo(
    () =>
      filtered.map((a) => ({
        id: a._id,
        resourceId: user._id,
        customer: a.customer?.name,
        service: a.service?.name,
        status: a.status,
        cancelledBy: a.cancelledBy,
        start: new Date(a.startTime),
        end: new Date(a.endTime),
      })),
    [filtered, user._id]
  )

  function changeDay(offset) {
    setSelectedDate((d) => {
      const next = new Date(d)
      next.setDate(next.getDate() + offset)
      return next
    })
  }

  function updateStatus(id, status) {
    statusMutation.mutate({ id, status })
  }

  function handleEventDrop({ event, start }) {
    rescheduleMutation.mutate({ id: event.id, startTime: start.toISOString() })
  }

  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Mi agenda</h1>
        <p className="mt-1 text-sm text-muted capitalize">{dayLabel}</p>
        {rescheduleError && (
          <p className="mt-3 rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
            {rescheduleError}
          </p>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => changeDay(-1)} className="rounded-lg border border-border p-2 text-muted hover:bg-surface-2 hover:text-ink" aria-label="Día anterior">
            <ChevronLeft size={16} />
          </button>
          <button type="button" onClick={() => setSelectedDate(new Date())} className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-ink hover:bg-surface-2">
            Hoy
          </button>
          <button type="button" onClick={() => changeDay(1)} className="rounded-lg border border-border p-2 text-muted hover:bg-surface-2 hover:text-ink" aria-label="Día siguiente">
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-surface-2 p-1">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStatusFilter(s.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  statusFilter === s.id ? 'bg-accent text-accent-ink' : 'text-muted hover:text-ink'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="flex gap-1 rounded-lg border border-border bg-surface-2 p-1">
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              aria-label="Vista calendario"
              className={`rounded-md p-1.5 transition-colors ${viewMode === 'calendar' ? 'bg-accent text-accent-ink' : 'text-muted hover:text-ink'}`}
            >
              <CalendarDays size={15} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              aria-label="Vista lista"
              className={`rounded-md p-1.5 transition-colors ${viewMode === 'list' ? 'bg-accent text-accent-ink' : 'text-muted hover:text-ink'}`}
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <p className="mt-6 text-sm text-muted">Cargando agenda…</p>
      ) : viewMode === 'calendar' ? (
        <Card className="mt-6 p-4">
          <StaffCalendarView
            date={selectedDate}
            onNavigate={setSelectedDate}
            resources={[{ id: user._id, name: user.name }]}
            events={calendarEvents}
            onEventDrop={handleEventDrop}
          />
        </Card>
      ) : (
        <Card className="mt-6">
          {filtered.length === 0 ? (
            <p className="py-4 text-sm text-muted">Sin citas para este día.</p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {filtered.map((a) => (
                <div key={a._id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                  <span className="w-12 shrink-0 text-sm font-medium tabular-nums text-ink">
                    {formatTime(new Date(a.startTime))}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{a.customer?.name}</p>
                    <p className="truncate text-xs text-muted">{a.service?.name}</p>
                  </div>
                  <Badge variant={STATUS_VARIANT[a.status]}>{getStaffStatusLabel(a)}</Badge>
                  {(a.status === 'pending' || a.status === 'confirmed') && (
                    <div className="flex shrink-0 gap-1">
                      <button type="button" onClick={() => updateStatus(a._id, 'no_show')} aria-label="El cliente no se presentó" className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-danger">
                        <XIcon size={15} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

export default BarberAgendaPage
