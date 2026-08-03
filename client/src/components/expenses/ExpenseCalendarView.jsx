import { useMemo } from 'react'
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { formatCOP } from '../../lib/format'
import { toDateKey, toUtcDateInput } from '../../lib/dates'

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function ExpenseCalendarView({ month, expenses }) {
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { locale: es })
    const end = endOfWeek(endOfMonth(month), { locale: es })
    return eachDayOfInterval({ start, end })
  }, [month])

  const byDay = useMemo(() => {
    const map = new Map()
    for (const e of expenses) {
      const key = toUtcDateInput(new Date(e.date))
      const list = map.get(key) || []
      list.push(e)
      map.set(key, list)
    }
    return map
  }, [expenses])

  return (
    <div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-t-lg border border-b-0 border-border bg-border text-center text-xs font-medium text-muted">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="bg-surface-2 py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-b-lg border border-border bg-border">
        {days.map((day) => {
          const key = toDateKey(day)
          const dayExpenses = byDay.get(key) || []
          const total = dayExpenses.reduce((sum, e) => sum + e.amount, 0)
          const inMonth = isSameMonth(day, month)
          const isToday = isSameDay(day, new Date())

          return (
            <div key={key} className={`min-h-[6.5rem] bg-surface p-2 ${inMonth ? '' : 'opacity-40'}`}>
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium ${
                  isToday ? 'bg-accent text-accent-ink' : 'text-muted'
                }`}
              >
                {day.getDate()}
              </span>

              {dayExpenses.length > 0 && (
                <div className="mt-1.5 flex flex-col gap-1">
                  <span className="truncate text-xs font-semibold tabular-nums text-danger">{formatCOP(total)}</span>
                  {dayExpenses.slice(0, 2).map((e) => (
                    <span
                      key={e._id}
                      className="truncate text-[11px] text-muted"
                      title={`${e.description || e.category} · ${formatCOP(e.amount)}`}
                    >
                      {e.description || e.category}
                    </span>
                  ))}
                  {dayExpenses.length > 2 && <span className="text-[11px] text-muted">+{dayExpenses.length - 2} más</span>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ExpenseCalendarView
