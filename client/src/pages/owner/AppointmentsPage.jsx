import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Check, X as XIcon, List, CalendarDays, Ban, Lock } from 'lucide-react'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import StaffCalendarView from '../../components/appointments/StaffCalendarView'
import AgendaLegend from '../../components/appointments/AgendaLegend'
import { useAuth } from '../../context/AuthContext'
import BarberAgendaPage from '../barber/BarberAgendaPage'
import { listMyAppointments, updateAppointmentStatus } from '../../api/appointments'
import { listMyTimeBlocks, createTimeBlock, deleteTimeBlock } from '../../api/timeBlocks'
import { listTeam } from '../../api/barbers'
import { toDateKey, toTimeInputValue } from '../../lib/dates'
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

const EMPTY_BLOCK_FORM = { barberId: '', startTime: '', endTime: '', reason: '' }

function AppointmentsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [selectedDate, setSelectedDate] = useState(new Date())
  const [statusFilter, setStatusFilter] = useState('all')
  const [viewMode, setViewMode] = useState('calendar')
  const [blockModalOpen, setBlockModalOpen] = useState(false)
  const [blockForm, setBlockForm] = useState(EMPTY_BLOCK_FORM)
  const [blockError, setBlockError] = useState('')

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => listMyAppointments(),
  })
  const { data: timeBlocks = [] } = useQuery({
    queryKey: ['time-blocks'],
    queryFn: listMyTimeBlocks,
  })
  const { data: teamBarbers = [] } = useQuery({ queryKey: ['team'], queryFn: listTeam })
  // listTeam only returns role: 'barber' accounts — the owner has their own bookable
  // toggle (User.attendsClients, set in Equipo) and needs a column/card here too when on.
  const barbers = useMemo(
    () => (user.attendsClients ? [{ _id: user._id, name: user.name }, ...teamBarbers] : teamBarbers),
    [teamBarbers, user]
  )

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => updateAppointmentStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] }),
  })

  const createBlockMutation = useMutation({
    mutationFn: createTimeBlock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-blocks'] })
      setBlockModalOpen(false)
      setBlockForm(EMPTY_BLOCK_FORM)
      setBlockError('')
    },
    onError: (err) => setBlockError(err.response?.data?.error || 'No pudimos crear el bloqueo.'),
  })

  const deleteBlockMutation = useMutation({
    mutationFn: deleteTimeBlock,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['time-blocks'] }),
  })

  const selectedKey = toDateKey(selectedDate)
  const dayLabel = selectedDate.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })

  const filtered = useMemo(
    () =>
      appointments.filter(
        (a) => toDateKey(new Date(a.startTime)) === selectedKey && (statusFilter === 'all' || a.status === statusFilter)
      ),
    [appointments, selectedKey, statusFilter]
  )

  const dayBlocks = useMemo(
    () => timeBlocks.filter((b) => toDateKey(new Date(b.startTime)) === selectedKey),
    [timeBlocks, selectedKey]
  )

  const calendarEvents = useMemo(
    () => [
      ...filtered.map((a) => ({
        id: a._id,
        resourceId: a.barber?._id,
        customer: a.customer?.name,
        service: a.service?.name,
        status: a.status,
        cancelledBy: a.cancelledBy,
        start: new Date(a.startTime),
        end: new Date(a.endTime),
      })),
      ...dayBlocks.map((b) => ({
        id: b._id,
        resourceId: b.barber,
        isBlock: true,
        status: 'blocked',
        reason: b.reason,
        start: new Date(b.startTime),
        end: new Date(b.endTime),
      })),
    ],
    [filtered, dayBlocks]
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

  function handleSelectEvent(event) {
    if (event.isBlock && window.confirm('¿Eliminar este bloqueo?')) {
      deleteBlockMutation.mutate(event.id)
    }
  }

  function openBlockModal() {
    setBlockForm({ ...EMPTY_BLOCK_FORM, barberId: barbers[0]?._id || '' })
    setBlockError('')
    setBlockModalOpen(true)
  }

  // Dragging over empty time in the calendar (touch-and-drag on mobile, click-and-drag on
  // desktop) opens the same modal pre-filled with the dragged range and column, instead of
  // only being reachable through the "Bloquear horario" button.
  function handleSelectSlot({ start, end, resourceId }) {
    setBlockForm({
      barberId: resourceId || barbers[0]?._id || '',
      startTime: toTimeInputValue(start),
      endTime: toTimeInputValue(end),
      reason: '',
    })
    setBlockError('')
    setBlockModalOpen(true)
  }

  function handleBlockFormChange(e) {
    setBlockForm({ ...blockForm, [e.target.name]: e.target.value })
  }

  function handleCreateBlock(e) {
    e.preventDefault()
    if (!blockForm.barberId || !blockForm.startTime || !blockForm.endTime) return

    const dateKey = toDateKey(selectedDate)
    const startTime = new Date(`${dateKey}T${blockForm.startTime}`)
    const endTime = new Date(`${dateKey}T${blockForm.endTime}`)
    if (endTime <= startTime) {
      setBlockError('La hora de fin debe ser después de la de inicio.')
      return
    }

    setBlockError('')
    createBlockMutation.mutate({
      barberId: blockForm.barberId,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      reason: blockForm.reason,
    })
  }

  if (user.role === 'barber') return <BarberAgendaPage />

  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Agenda</h1>
        <p className="mt-1 text-sm text-muted capitalize">{dayLabel}</p>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
            <button
              type="button"
              onClick={() => changeDay(-1)}
              className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-ink"
              aria-label="Día anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-2 text-sm font-semibold capitalize text-ink">
              {selectedDate.toLocaleDateString('es-CO', { weekday: 'long' })}
            </span>
            <button
              type="button"
              onClick={() => changeDay(1)}
              className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-ink"
              aria-label="Día siguiente"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setSelectedDate(new Date())}
            className="text-xs font-medium text-muted underline hover:text-ink"
          >
            Hoy
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {viewMode === 'calendar' && <AgendaLegend className="hidden lg:flex" />}

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
              className={`rounded-md p-1.5 transition-colors ${
                viewMode === 'calendar' ? 'bg-accent text-accent-ink' : 'text-muted hover:text-ink'
              }`}
            >
              <CalendarDays size={15} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              aria-label="Vista lista"
              className={`rounded-md p-1.5 transition-colors ${
                viewMode === 'list' ? 'bg-accent text-accent-ink' : 'text-muted hover:text-ink'
              }`}
            >
              <List size={15} />
            </button>
          </div>

          <Button type="button" variant="secondary" onClick={openBlockModal} disabled={barbers.length === 0}>
            <Lock size={14} />
            Bloquear horario
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="mt-6 text-sm text-muted">Cargando agenda…</p>
      ) : viewMode === 'calendar' ? (
        <Card className="mt-6 p-4">
          <StaffCalendarView
            date={selectedDate}
            onNavigate={setSelectedDate}
            resources={barbers.map((b) => ({ id: b._id, name: b.name }))}
            events={calendarEvents}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
          />
          <p className="mt-4 text-center text-xs text-muted">
            Cada quien ve la agenda de su día. Tú ves la de todos.
          </p>
        </Card>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {barbers.map((barber) => {
            const barberAppointments = filtered
              .filter((a) => a.barber?._id === barber._id)
              .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
            const barberBlocks = dayBlocks.filter((b) => b.barber === barber._id)

            return (
              <Card key={barber._id}>
                <h3 className="text-sm font-medium text-ink">{barber.name}</h3>

                {barberBlocks.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {barberBlocks.map((b) => (
                      <span
                        key={b._id}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-3 py-1 text-xs text-muted"
                      >
                        <Ban size={11} />
                        {formatTime(new Date(b.startTime))}–{formatTime(new Date(b.endTime))}
                        {b.reason ? ` · ${b.reason}` : ''}
                        <button
                          type="button"
                          onClick={() => deleteBlockMutation.mutate(b._id)}
                          aria-label="Eliminar bloqueo"
                          className="text-muted hover:text-danger"
                        >
                          <XIcon size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {barberAppointments.length === 0 ? (
                  <p className="mt-4 text-sm text-muted">Sin citas para este día.</p>
                ) : (
                  <div className="mt-4 flex flex-col divide-y divide-border">
                    {barberAppointments.map((a) => (
                      <div key={a._id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
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
                            <button
                              type="button"
                              onClick={() => updateStatus(a._id, 'completed')}
                              aria-label="Marcar como completada"
                              className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-success"
                            >
                              <Check size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => updateStatus(a._id, 'cancelled')}
                              aria-label="Cancelar cita"
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
            )
          })}
        </div>
      )}

      <Modal
        open={blockModalOpen}
        onClose={() => {
          setBlockModalOpen(false)
          setBlockForm(EMPTY_BLOCK_FORM)
          setBlockError('')
        }}
        title="Bloquear horario"
      >
        <form onSubmit={handleCreateBlock} className="flex flex-col gap-4">
          <p className="text-sm text-muted capitalize">{dayLabel}</p>
          <Select
            id="blockBarberId"
            name="barberId"
            label="Profesional"
            value={blockForm.barberId}
            onChange={handleBlockFormChange}
            required
          >
            {barbers.map((b) => (
              <option key={b._id} value={b._id}>
                {b._id === user._id ? `${b.name} (tú)` : b.name}
              </option>
            ))}
          </Select>
          <div className="flex gap-3">
            <Input
              id="blockStart"
              name="startTime"
              type="time"
              label="Desde"
              value={blockForm.startTime}
              onChange={handleBlockFormChange}
              required
            />
            <Input
              id="blockEnd"
              name="endTime"
              type="time"
              label="Hasta"
              value={blockForm.endTime}
              onChange={handleBlockFormChange}
              required
            />
          </div>
          <Input
            id="blockReason"
            name="reason"
            label="Motivo (opcional)"
            placeholder="Ej. Almuerzo, cita médica..."
            value={blockForm.reason}
            onChange={handleBlockFormChange}
          />
          {blockError && (
            <p className="rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">{blockError}</p>
          )}
          <Button type="submit" disabled={createBlockMutation.isPending}>
            {createBlockMutation.isPending ? 'Bloqueando...' : 'Bloquear'}
          </Button>
        </form>
      </Modal>
    </div>
  )
}

export default AppointmentsPage
