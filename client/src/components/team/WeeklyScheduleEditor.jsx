import { useMemo } from 'react'
import Switch from '../ui/Switch'

const DAYS = [
  { id: 1, label: 'Lun' },
  { id: 2, label: 'Mar' },
  { id: 3, label: 'Mié' },
  { id: 4, label: 'Jue' },
  { id: 5, label: 'Vie' },
  { id: 6, label: 'Sáb' },
  { id: 0, label: 'Dom' },
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
    <div className="flex flex-col gap-1.5">
      {DAYS.map((day) => {
        const entry = byDay[day.id]
        const enabled = Boolean(entry)
        return (
          <div key={day.id} className="flex items-center gap-2">
            <Switch checked={enabled} onChange={(v) => toggleDay(day.id, v)} />
            <span className="w-7 shrink-0 text-xs font-medium text-ink">{day.label}</span>
            {enabled ? (
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <input
                  type="time"
                  value={entry.startTime}
                  onChange={(e) => updateTime(day.id, 'startTime', e.target.value)}
                  className="max-w-34 flex-1 min-w-0 rounded-lg border border-border bg-surface-2 px-2 py-1 text-xs text-ink outline-none focus:border-accent"
                />
                <span className="shrink-0 text-xs text-muted">–</span>
                <input
                  type="time"
                  value={entry.endTime}
                  onChange={(e) => updateTime(day.id, 'endTime', e.target.value)}
                  className="max-w-34 flex-1 min-w-0 rounded-lg border border-border bg-surface-2 px-2 py-1 text-xs text-ink outline-none focus:border-accent"
                />
              </div>
            ) : (
              <span className="flex-1 text-xs text-muted">No trabaja</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default WeeklyScheduleEditor
