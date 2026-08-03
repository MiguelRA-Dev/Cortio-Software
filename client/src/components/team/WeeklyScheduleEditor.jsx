import { useMemo } from 'react'
import Switch from '../ui/Switch'

const DAYS = [
  { id: 1, label: 'Lunes' },
  { id: 2, label: 'Martes' },
  { id: 3, label: 'Miércoles' },
  { id: 4, label: 'Jueves' },
  { id: 5, label: 'Viernes' },
  { id: 6, label: 'Sábado' },
  { id: 0, label: 'Domingo' },
]

const DEFAULT_START = '09:00'
const DEFAULT_END = '18:00'

function WeeklyScheduleEditor({ value, onChange }) {
  const byDay = useMemo(() => {
    const map = {}
    for (const entry of value) map[entry.dayOfWeek] = entry
    return map
  }, [value])

  function toggleDay(dayId, enabled) {
    if (enabled) {
      onChange([...value, { dayOfWeek: dayId, startTime: DEFAULT_START, endTime: DEFAULT_END }])
    } else {
      onChange(value.filter((e) => e.dayOfWeek !== dayId))
    }
  }

  function updateTime(dayId, field, time) {
    onChange(value.map((e) => (e.dayOfWeek === dayId ? { ...e, [field]: time } : e)))
  }

  return (
    <div className="flex flex-col gap-2.5">
      {DAYS.map((day) => {
        const entry = byDay[day.id]
        const enabled = Boolean(entry)
        return (
          <div key={day.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:flex-nowrap">
            <Switch checked={enabled} onChange={(v) => toggleDay(day.id, v)} />
            <span className="w-20 shrink-0 text-sm text-ink">{day.label}</span>
            {enabled ? (
              <div className="flex min-w-0 basis-full flex-wrap items-center gap-2 sm:basis-auto sm:flex-1">
                <input
                  type="time"
                  value={entry.startTime}
                  onChange={(e) => updateTime(day.id, 'startTime', e.target.value)}
                  className="min-w-0 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-accent"
                />
                <span className="text-sm text-muted">a</span>
                <input
                  type="time"
                  value={entry.endTime}
                  onChange={(e) => updateTime(day.id, 'endTime', e.target.value)}
                  className="min-w-0 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-accent"
                />
              </div>
            ) : (
              <span className="text-xs text-muted">No trabaja</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default WeeklyScheduleEditor
