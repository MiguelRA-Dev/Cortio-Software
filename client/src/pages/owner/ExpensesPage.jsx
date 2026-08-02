import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, Receipt } from 'lucide-react'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Badge from '../../components/ui/Badge'
import { formatCOP } from '../../lib/format'
import { listExpenses, createExpense, updateExpense, deleteExpense } from '../../api/expenses'

const CATEGORIES = ['Arriendo', 'Servicios públicos', 'Insumos', 'Nómina', 'Marketing', 'Mantenimiento', 'Otro']

function toDateInput(date) {
  return date.toISOString().slice(0, 10)
}

const TODAY = new Date()

const EMPTY_FORM = { category: CATEGORIES[0], description: '', amount: '', date: toDateInput(TODAY) }

function ExpensesPage() {
  const queryClient = useQueryClient()
  const [monthCursor, setMonthCursor] = useState(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1))
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')

  const monthLabel = monthCursor.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
  const monthStart = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1)
  const monthEnd = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0, 23, 59, 59)
  const monthKey = toDateInput(monthCursor)

  const { data: expenses = [], isLoading, isError } = useQuery({
    queryKey: ['expenses', monthKey],
    queryFn: () => listExpenses({ from: monthStart.toISOString(), to: monthEnd.toISOString() }),
  })

  const sorted = useMemo(() => [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date)), [expenses])
  const total = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses])

  const createMutation = useMutation({
    mutationFn: createExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      setModalOpen(false)
    },
    onError: (err) => setFormError(err.response?.data?.error || 'No pudimos registrar el gasto.'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateExpense(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      setModalOpen(false)
    },
    onError: (err) => setFormError(err.response?.data?.error || 'No pudimos guardar los cambios.'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] }),
  })

  function changeMonth(offset) {
    setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() + offset, 1))
  }

  function openCreate() {
    setEditingId(null)
    setForm({ ...EMPTY_FORM, date: toDateInput(monthCursor) })
    setFormError('')
    setModalOpen(true)
  }

  function openEdit(expense) {
    setEditingId(expense._id)
    setForm({
      category: expense.category,
      description: expense.description || '',
      amount: expense.amount,
      date: toDateInput(new Date(expense.date)),
    })
    setFormError('')
    setModalOpen(true)
  }

  function handleDelete(id) {
    deleteMutation.mutate(id)
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    const payload = {
      category: form.category,
      description: form.description,
      amount: Number(form.amount) || 0,
      date: form.date,
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Gastos</h1>
          <p className="mt-1 text-sm text-muted capitalize">{monthLabel}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} />
          Nuevo gasto
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            className="rounded-lg border border-border p-2 text-muted hover:bg-surface-2 hover:text-ink"
            aria-label="Mes anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => setMonthCursor(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1))}
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-ink hover:bg-surface-2"
          >
            Este mes
          </button>
          <button
            type="button"
            onClick={() => changeMonth(1)}
            className="rounded-lg border border-border p-2 text-muted hover:bg-surface-2 hover:text-ink"
            aria-label="Mes siguiente"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <Card className="px-4 py-2.5">
          <span className="text-xs text-muted">Total del mes </span>
          <span className="text-sm font-semibold tabular-nums text-ink">{formatCOP(total)}</span>
        </Card>
      </div>

      <Card className="mt-6">
        {isLoading ? (
          <p className="py-4 text-sm text-muted">Cargando gastos…</p>
        ) : isError ? (
          <p className="py-4 text-sm text-danger">No pudimos cargar los gastos. Intenta recargar.</p>
        ) : sorted.length === 0 ? (
          <p className="py-4 text-sm text-muted">No hay gastos registrados este mes.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {sorted.map((e) => (
              <div key={e._id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted">
                  <Receipt size={16} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{e.description || e.category}</p>
                  <p className="truncate text-xs text-muted">
                    {new Date(e.date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                  </p>
                </div>

                <Badge variant="muted">{e.category}</Badge>

                <span className="shrink-0 text-sm font-medium tabular-nums text-ink">{formatCOP(e.amount)}</span>

                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(e)}
                    aria-label="Editar gasto"
                    className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-ink"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(e._id)}
                    aria-label="Eliminar gasto"
                    className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-danger"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Editar gasto' : 'Nuevo gasto'}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Select id="category" name="category" label="Categoría" value={form.category} onChange={handleChange}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Input id="description" name="description" label="Descripción" placeholder="Arriendo local agosto" value={form.description} onChange={handleChange} />
          <div className="grid grid-cols-2 gap-3">
            <Input id="amount" name="amount" type="number" min="0" label="Monto (COP)" placeholder="80000" value={form.amount} onChange={handleChange} required />
            <Input id="date" name="date" type="date" label="Fecha" value={form.date} onChange={handleChange} required />
          </div>
          {formError && (
            <p className="rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">{formError}</p>
          )}
          <Button type="submit" disabled={saving} className="mt-2 w-full">
            {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Registrar gasto'}
          </Button>
        </form>
      </Modal>
    </div>
  )
}

export default ExpensesPage
