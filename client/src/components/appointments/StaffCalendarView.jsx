import { Calendar } from 'react-big-calendar'
import withDragAndDropRaw from 'react-big-calendar/lib/addons/dragAndDrop'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import '../../styles/calendar-overrides.css'
import { localizer } from '../../lib/calendarLocalizer'

// The addon's CJS build sometimes reaches us double-wrapped ({ default: fn }) depending
// on the bundler's interop, instead of the bare function — unwrap defensively either way.
const withDragAndDrop = withDragAndDropRaw.default || withDragAndDropRaw
const DragAndDropCalendar = withDragAndDrop(Calendar)
const RESCHEDULABLE_STATUSES = ['pending', 'confirmed']

const STATUS_STYLE = {
  completed: { borderLeft: '3px solid var(--success)', backgroundColor: 'color-mix(in oklab, var(--success) 14%, var(--surface-2))' },
  confirmed: { borderLeft: '3px solid var(--ink)', backgroundColor: 'var(--surface-2)' },
  pending: { borderLeft: '3px dashed var(--muted)', backgroundColor: 'var(--surface-2)' },
  cancelled: {
    borderLeft: '3px solid var(--danger)',
    backgroundColor: 'color-mix(in oklab, var(--danger) 10%, var(--surface-2))',
    opacity: 0.6,
    textDecoration: 'line-through',
  },
  no_show: {
    borderLeft: '3px solid var(--danger)',
    backgroundColor: 'color-mix(in oklab, var(--danger) 10%, var(--surface-2))',
    opacity: 0.6,
    textDecoration: 'line-through',
  },
}

function EventContent({ event }) {
  const cancelledByCustomer = event.status === 'cancelled' && event.cancelledBy === 'customer'
  return (
    <div className="overflow-hidden text-xs leading-tight">
      <p className="truncate font-medium">{event.customer}</p>
      <p className="truncate text-[11px] opacity-75">
        {cancelledByCustomer ? 'Cancelada por el cliente' : event.service}
      </p>
    </div>
  )
}

function StaffCalendarView({ date, onNavigate, resources, events, onSelectEvent, onEventDrop }) {
  const CalendarComponent = onEventDrop ? DragAndDropCalendar : Calendar

  return (
    <div style={{ height: 640 }}>
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
        min={new Date(1970, 0, 1, 8, 0)}
        max={new Date(1970, 0, 1, 20, 0)}
        step={30}
        timeslots={2}
        eventPropGetter={(event) => ({ style: STATUS_STYLE[event.status] || {} })}
        components={{ event: EventContent }}
        onSelectEvent={onSelectEvent}
        onEventDrop={onEventDrop}
        draggableAccessor={(event) => RESCHEDULABLE_STATUSES.includes(event.status)}
        resizable={false}
      />
    </div>
  )
}

export default StaffCalendarView
