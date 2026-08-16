import { Lock } from 'lucide-react'
import { Calendar } from 'react-big-calendar'
import withDragAndDropRaw from 'react-big-calendar/lib/addons/dragAndDrop'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import '../../styles/calendar-overrides.css'
import { localizer } from '../../lib/calendarLocalizer'
import Badge from '../ui/Badge'

// The addon's CJS build sometimes reaches us double-wrapped ({ default: fn }) depending
// on the bundler's interop, instead of the bare function — unwrap defensively either way.
const withDragAndDrop = withDragAndDropRaw.default || withDragAndDropRaw
const DragAndDropCalendar = withDragAndDrop(Calendar)
const RESCHEDULABLE_STATUSES = ['pending', 'confirmed']

// One consistent color for every professional's avatar — the reference design uses a
// single accent, not a color-per-barber scheme (that would compete with the
// color-per-service coding of the events themselves).
const RESOURCE_ACCENT = '#3b82f6'

// Appointments are colored by service, not by status — lets an owner scan the day and
// see "a lot of Corte + tinte today" at a glance. Each hue is only ever used at ~18%
// strength, mixed into the theme's own --surface-2 via color-mix — so the tint is
// automatically pale in light mode and automatically muted in dark mode, the same
// technique the app already uses for --success/--danger, instead of a fixed hex fill
// that reads fine on white and garish on black.
const SERVICE_HUES = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f43f5e', // rose
  '#d97706', // amber
  '#8b5cf6', // violet
  '#0891b2', // cyan
  '#ec4899', // pink
  '#6366f1', // indigo
]

function serviceHue(str) {
  if (!str) return SERVICE_HUES[0]
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return SERVICE_HUES[Math.abs(hash) % SERVICE_HUES.length]
}

function formatEventTime(date) {
  return date.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase()
}

function eventPropGetter(event) {
  if (event.isBlock) {
    return {
      style: {
        backgroundColor: 'var(--surface-2)',
        backgroundImage:
          'repeating-linear-gradient(45deg, color-mix(in oklab, var(--muted) 16%, transparent) 0 6px, transparent 6px 12px)',
        border: '1px dashed var(--border)',
        color: 'var(--muted)',
      },
    }
  }

  if (event.status === 'cancelled' || event.status === 'no_show') {
    return {
      style: {
        backgroundColor: 'var(--surface-2)',
        color: 'var(--muted)',
        border: '1px solid var(--border)',
        textDecoration: 'line-through',
        opacity: 0.7,
      },
    }
  }

  const hue = serviceHue(event.service)
  const style = {
    backgroundColor: `color-mix(in oklab, ${hue} 18%, var(--surface-2))`,
    border: 'none',
    borderLeft: `3px solid ${hue}`,
    color: 'var(--ink)',
  }
  if (event.status === 'pending') {
    style.borderLeft = `3px dashed ${hue}`
  }
  return { style }
}

function EventContent({ event }) {
  if (event.isBlock) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1 overflow-hidden text-center">
        <Lock size={13} />
        {event.reason && <p className="truncate px-1 text-[10px] leading-tight">{event.reason}</p>}
      </div>
    )
  }

  const cancelledByCustomer = event.status === 'cancelled' && event.cancelledBy === 'customer'
  return (
    <div className="overflow-hidden text-xs leading-tight">
      <p className="truncate font-semibold">{event.customer}</p>
      <p className="truncate text-[11px] opacity-90">
        {cancelledByCustomer ? 'Cancelada por el cliente' : event.service}
      </p>
      <p className="truncate text-[10px] opacity-75">
        {formatEventTime(event.start)} – {formatEventTime(event.end)}
      </p>
    </div>
  )
}

// First name only below the `sm` breakpoint — with 2+ resource columns on a phone-width
// screen, the full name ("Miguel Angel Riaño Alvarez") has no room and overflows/clips
// mid-word. `min-w-0` is required for `truncate` to actually take effect inside a flex
// column (flex items default to a min-width based on their content otherwise).
function ResourceHeader({ resource }) {
  const firstName = resource.name?.split(' ')[0] || resource.name
  return (
    <div className="flex w-full min-w-0 flex-col items-center gap-1 px-1 py-2 sm:gap-1.5">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white sm:h-9 sm:w-9 sm:text-sm"
        style={{ backgroundColor: RESOURCE_ACCENT }}
      >
        {resource.name?.[0]?.toUpperCase()}
      </div>
      <p className="w-full truncate text-center text-xs font-medium text-ink sm:text-sm" title={resource.name}>
        <span className="sm:hidden">{firstName}</span>
        <span className="hidden sm:inline">{resource.name}</span>
      </p>
      <Badge variant="muted" className="hidden sm:inline-flex">
        Profesional
      </Badge>
    </div>
  )
}

function StaffCalendarView({
  date,
  onNavigate,
  resources,
  events,
  onSelectEvent,
  onEventDrop,
  onSelectSlot,
  height = 760,
  scrollToTime,
  // Full 24h by default (real Agenda page) — the landing preview narrows this to
  // business hours so there's nothing to scroll past.
  minTime = new Date(1970, 0, 1, 0, 0),
  maxTime = new Date(1970, 0, 1, 23, 59),
}) {
  const CalendarComponent = onEventDrop ? DragAndDropCalendar : Calendar

  return (
    <div style={{ height }}>
      <CalendarComponent
        localizer={localizer}
        culture="es"
        date={date}
        onNavigate={onNavigate}
        view="day"
        views={['day']}
        toolbar={false}
        events={events}
        resources={resources}
        resourceIdAccessor="id"
        resourceTitleAccessor="name"
        startAccessor="start"
        endAccessor="end"
        min={minTime}
        max={maxTime}
        scrollToTime={scrollToTime}
        step={30}
        timeslots={2}
        eventPropGetter={eventPropGetter}
        components={{ event: EventContent, resourceHeader: ResourceHeader }}
        onSelectEvent={onSelectEvent}
        onEventDrop={onEventDrop}
        draggableAccessor={(event) => RESCHEDULABLE_STATUSES.includes(event.status)}
        resizable={false}
        // Lets an owner/barber press-and-drag over empty time to block it, instead of only
        // through the "Bloquear horario" button — "ignoreEvents" so dragging over an
        // existing appointment/block doesn't also start a new selection.
        selectable={onSelectSlot ? 'ignoreEvents' : false}
        onSelectSlot={onSelectSlot}
      />
    </div>
  )
}

export default StaffCalendarView
