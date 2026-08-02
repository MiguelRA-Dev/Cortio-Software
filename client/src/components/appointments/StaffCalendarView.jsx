import { Calendar } from 'react-big-calendar'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import '../../styles/calendar-overrides.css'
import { localizer } from '../../lib/calendarLocalizer'

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
}

function EventContent({ event }) {
  return (
    <div className="overflow-hidden text-xs leading-tight">
      <p className="truncate font-medium">{event.customer}</p>
      <p className="truncate text-[11px] opacity-75">{event.service}</p>
    </div>
  )
}

function StaffCalendarView({ date, onNavigate, resources, events, onSelectEvent }) {
  return (
    <div style={{ height: 640 }}>
      <Calendar
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
      />
    </div>
  )
}

export default StaffCalendarView
