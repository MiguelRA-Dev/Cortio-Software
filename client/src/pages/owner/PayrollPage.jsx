import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Wallet, CheckCircle2, Pencil, Trash2, Receipt, X as XIcon } from 'lucide-react'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Badge from '../../components/ui/Badge'
import { formatCOP } from '../../lib/format'
import { listTeam } from '../../api/barbers'
import { useAuth } from '../../context/AuthContext'
import BarberPayrollPage from '../barber/BarberPayrollPage'
import {
  listPayroll,
  getPayrollEntry,
  previewPayroll,
  createPayroll,
  updatePayroll,
  deletePayroll,
  markPayrollPaid,
} from '../../api/payroll'
import { toDateKey, toUtcDateInput } from '../../lib/dates'

const PAYMENT_SCHEME_LABEL = {
  commission: 'Comisión',
  fixed: 'Fijo',
  mixed: 'Mixto',
}

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Efectivo' },
  { id: 'card', label: 'Tarjeta' },
  { id: 'transfer', label: 'Transferencia' },
  { id: 'other', label: 'Otro' },
]
const PAYMENT_METHOD_LABEL = Object.fromEntries(PAYMENT_METHODS.map((m) => [m.id, m.label]))

const LINE_TYPE_LABEL = { bonus: 'Bono', deduction: 'Descuento' }

function firstDayOfMonth() {
  const d = new Date()
  return toDateKey(new Date(d.getFullYear(), d.getMonth(), 1))
}

function lastDayOfMonth() {
  const d = new Date()
  return toDateKey(new Date(d.getFullYear(), d.getMonth() + 1, 0))
}

const EMPTY_FORM = { barberId: '', periodStart: firstDayOfMonth(), periodEnd: lastDayOfMonth(), lines: [] }

function LineEditor({ lines, onAdd, onChange, onRemove }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted">Bonos y descuentos</span>
        <div className="flex gap-2">
          <button type="button" onClick={() => onAdd('bonus')} className="text-xs font-medium text-success hover:underline">
            + Bono
          </button>
          <button type="button" onClick={() => onAdd('deduction')} className="text-xs font-medium text-danger hover:underline">
            + Descuento
          </button>
        </div>
      </div>

      {lines.length > 0 && (
        <div className="flex flex-col gap-2">
          {lines.map((line, i) => (
            <div key={i} className="flex items-center gap-2">
              <Badge variant={line.type === 'bonus' ? 'success' : 'danger'} className="w-24 shrink-0 justify-center">
                {LINE_TYPE_LABEL[line.type]}
              </Badge>
              <input
                type="text"
                placeholder="Concepto"
                value={line.label}
                onChange={(e) => onChange(i, 'label', e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-ink outline-none focus:border-accent"
              />
              <input
                type="number"
                min="0"
                placeholder="0"
                value={line.amount}
                onChange={(e) => onChange(i, 'amount', e.target.value)}
                className="w-28 shrink-0 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-ink outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={() => onRemove(i)}
                aria-label="Quitar línea"
                className="shrink-0 rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-danger"
              >
                <XIcon size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PayrollPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data: barbers = [] } = useQuery({ queryKey: ['team'], queryFn: listTeam, enabled: user.role === 'owner' })

  if (user.role === 'barber') return <BarberPayrollPage />


  const [filterBarberId, setFilterBarberId] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const listParams = useMemo(() => {
    const params = {}
    if (filterBarberId) params.barberId = filterBarberId
    if (filterStatus) params.status = filterStatus
    return params
  }, [filterBarberId, filterStatus])

  const { data: entries = [], isLoading, isError } = useQuery({
    queryKey: ['payroll', listParams],
    queryFn: () => listPayroll(listParams),
  })

  // Unfiltered dataset so the summary totals don't shift as the list filters change.
  const { data: allEntries = [] } = useQuery({ queryKey: ['payroll', 'all'], queryFn: () => listPayroll() })

  const totals = useMemo(() => {
    const now = new Date()
    const pendingTotal = allEntries.filter((e) => e.status === 'pending').reduce((sum, e) => sum + e.netAmount, 0)
    const paidThisMonth = allEntries
      .filter((e) => {
        if (e.status !== 'paid' || !e.paidAt) return false
        const paidAt = new Date(e.paidAt)
        return paidAt.getMonth() === now.getMonth() && paidAt.getFullYear() === now.getFullYear()
      })
      .reduce((sum, e) => sum + e.netAmount, 0)
    return { pendingTotal, paidThisMonth }
  }, [allEntries])

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')

  const [payingId, setPayingId] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('cash')

  const [tracingId, setTracingId] = useState(null)

  const canPreview = Boolean(form.barberId && form.periodStart && form.periodEnd)
  const { data: preview } = useQuery({
    queryKey: ['payroll-preview', form.barberId, form.periodStart, form.periodEnd],
    queryFn: () => previewPayroll({ barberId: form.barberId, periodStart: form.periodStart, periodEnd: form.periodEnd }),
    enabled: canPreview,
  })

  const { data: tracingEntry, isLoading: tracingLoading } = useQuery({
    queryKey: ['payroll-entry', tracingId],
    queryFn: () => getPayrollEntry(tracingId),
    enabled: Boolean(tracingId),
  })

  const selectedBarber = barbers.find((b) => b._id === form.barberId)

  const netAmount = useMemo(() => {
    if (!preview) return null
    const bonuses = form.lines.filter((l) => l.type === 'bonus').reduce((sum, l) => sum + (Number(l.amount) || 0), 0)
    const deductions = form.lines.filter((l) => l.type === 'deduction').reduce((sum, l) => sum + (Number(l.amount) || 0), 0)
    return preview.grossAmount + bonuses - deductions
  }, [preview, form.lines])

  const createMutation = useMutation({
    mutationFn: createPayroll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll'] })
      setModalOpen(false)
    },
    onError: (err) => setFormError(err.response?.data?.error || 'No pudimos generar la liquidación.'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updatePayroll(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll'] })
      setModalOpen(false)
    },
    onError: (err) => setFormError(err.response?.data?.error || 'No pudimos guardar los cambios.'),
  })

  const deleteMutation = useMutation({
    mutationFn: deletePayroll,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payroll'] }),
  })

  const markPaidMutation = useMutation({
    mutationFn: ({ id, method }) => markPayrollPaid(id, method),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll'] })
      setPayingId(null)
    },
  })

  function openCreate() {
    setEditingId(null)
    setForm({ ...EMPTY_FORM, barberId: barbers[0]?._id || '' })
    setFormError('')
    setModalOpen(true)
  }

  function openEdit(entry) {
    setEditingId(entry._id)
    setForm({
      barberId: entry.barber._id,
      periodStart: toUtcDateInput(new Date(entry.periodStart)),
      periodEnd: toUtcDateInput(new Date(entry.periodEnd)),
      lines: entry.lines.map((l) => ({ type: l.type, label: l.label, amount: String(l.amount) })),
    })
    setFormError('')
    setModalOpen(true)
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  function addLine(type) {
    setForm((f) => ({ ...f, lines: [...f.lines, { type, label: '', amount: '' }] }))
  }

  function updateLine(index, field, value) {
    setForm((f) => ({ ...f, lines: f.lines.map((l, i) => (i === index ? { ...l, [field]: value } : l)) }))
  }

  function removeLine(index) {
    setForm((f) => ({ ...f, lines: f.lines.filter((_, i) => i !== index) }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    const payload = {
      barberId: form.barberId,
      periodStart: form.periodStart,
      periodEnd: form.periodEnd,
      lines: form.lines
        .filter((l) => l.label.trim())
        .map((l) => ({ type: l.type, label: l.label.trim(), amount: Number(l.amount) || 0 })),
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  function handleDelete(id) {
    deleteMutation.mutate(id)
  }

  const saving = createMutation.isPending || updateMutation.isPending

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Nómina</h1>
          <p className="mt-1 text-sm text-muted">{entries.length} liquidaciones registradas</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} />
          Generar nómina
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="px-4 py-3">
          <span className="text-xs text-muted">Total pendiente por pagar</span>
          <p className="mt-1 text-lg font-semibold tabular-nums text-ink">{formatCOP(totals.pendingTotal)}</p>
        </Card>
        <Card className="px-4 py-3">
          <span className="text-xs text-muted">Total pagado este mes</span>
          <p className="mt-1 text-lg font-semibold tabular-nums text-ink">{formatCOP(totals.paidThisMonth)}</p>
        </Card>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Select id="filterBarberId" value={filterBarberId} onChange={(e) => setFilterBarberId(e.target.value)} className="py-2">
          <option value="">Todos los barberos</option>
          {barbers.map((b) => (
            <option key={b._id} value={b._id}>
              {b.name}
            </option>
          ))}
        </Select>
        <Select id="filterStatus" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="py-2">
          <option value="">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="paid">Pagada</option>
        </Select>
      </div>

      <Card className="mt-6">
        {isLoading ? (
          <p className="py-4 text-sm text-muted">Cargando nómina…</p>
        ) : isError ? (
          <p className="py-4 text-sm text-danger">No pudimos cargar la nómina. Intenta recargar.</p>
        ) : entries.length === 0 ? (
          <p className="py-4 text-sm text-muted">Aún no hay liquidaciones registradas.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {entries.map((e) => (
              <div key={e._id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted">
                  <Wallet size={16} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{e.barber?.name}</p>
                  <p className="truncate text-xs text-muted">
                    {new Date(e.periodStart).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })} —{' '}
                    {new Date(e.periodEnd).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                    {e.status === 'paid' && e.paymentMethod && ` · ${PAYMENT_METHOD_LABEL[e.paymentMethod]}`}
                  </p>
                  {e.lines?.length > 0 && (
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {e.lines
                        .map((l) => `${l.type === 'bonus' ? '+' : '-'}${formatCOP(l.amount)} ${l.label}`)
                        .join(' · ')}
                    </p>
                  )}
                </div>

                {e.sales?.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setTracingId(e._id)}
                    aria-label="Ver ventas incluidas"
                    className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-ink"
                  >
                    <Receipt size={15} />
                  </button>
                )}

                <span className="hidden text-sm text-muted sm:block">Bruto: {formatCOP(e.grossAmount)}</span>
                <span className="shrink-0 text-sm font-medium tabular-nums text-ink">{formatCOP(e.netAmount)}</span>

                <Badge variant={e.status === 'paid' ? 'success' : 'muted'}>
                  {e.status === 'paid' ? 'Pagada' : 'Pendiente'}
                </Badge>

                {e.status === 'pending' && (
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(e)}
                      aria-label="Editar liquidación"
                      className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-ink"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(e._id)}
                      aria-label="Eliminar liquidación"
                      className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-danger"
                    >
                      <Trash2 size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPayingId(e._id)
                        setPaymentMethod('cash')
                      }}
                      aria-label="Marcar como pagada"
                      className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-success"
                    >
                      <CheckCircle2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar liquidación' : 'Generar nómina'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Select id="barberId" name="barberId" label="Barbero" value={form.barberId} onChange={handleChange} required>
            <option value="" disabled>
              Selecciona un barbero
            </option>
            {barbers.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name}
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <Input id="periodStart" name="periodStart" type="date" label="Desde" value={form.periodStart} onChange={handleChange} required />
            <Input id="periodEnd" name="periodEnd" type="date" label="Hasta" value={form.periodEnd} onChange={handleChange} required />
          </div>

          {preview && selectedBarber && (
            <div className="rounded-lg border border-border bg-surface-2 p-3.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted">Esquema</span>
                <span className="font-medium text-ink">{PAYMENT_SCHEME_LABEL[preview.paymentScheme]}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-muted">Servicios vendidos en el período</span>
                <span className="font-medium tabular-nums text-ink">{preview.servicesCount}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between border-t border-border pt-1.5">
                <span className="text-muted">Monto bruto calculado</span>
                <span className="font-semibold tabular-nums text-ink">{formatCOP(preview.grossAmount)}</span>
              </div>
            </div>
          )}

          <LineEditor lines={form.lines} onAdd={addLine} onChange={updateLine} onRemove={removeLine} />

          {netAmount !== null && (
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm font-medium text-muted">Neto a pagar</span>
              <span className="text-lg font-semibold tabular-nums text-ink">{formatCOP(netAmount)}</span>
            </div>
          )}

          {formError && (
            <p className="rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">{formError}</p>
          )}

          <Button type="submit" disabled={saving} className="mt-2 w-full">
            {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Generar liquidación'}
          </Button>
        </form>
      </Modal>

      <Modal open={Boolean(payingId)} onClose={() => setPayingId(null)} title="Marcar como pagada">
        <div className="flex flex-col gap-4">
          <Select id="paymentMethod" label="Método de pago" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </Select>
          <Button
            onClick={() => markPaidMutation.mutate({ id: payingId, method: paymentMethod })}
            disabled={markPaidMutation.isPending}
            className="w-full"
          >
            {markPaidMutation.isPending ? 'Guardando...' : 'Confirmar pago'}
          </Button>
        </div>
      </Modal>

      <Modal open={Boolean(tracingId)} onClose={() => setTracingId(null)} title="Ventas incluidas en el bruto">
        {tracingLoading ? (
          <p className="text-sm text-muted">Cargando…</p>
        ) : !tracingEntry?.sales?.length ? (
          <p className="text-sm text-muted">Esta liquidación no tiene ventas asociadas.</p>
        ) : (
          <div className="flex max-h-105 flex-col divide-y divide-border overflow-y-auto pr-1">
            {tracingEntry.sales.map((s) => (
              <div key={s._id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                <span className="w-20 shrink-0 text-xs text-muted">
                  {new Date(s.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{s.items.map((i) => i.name).join(', ')}</span>
                <span className="shrink-0 text-sm font-medium tabular-nums text-ink">{formatCOP(s.total)}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default PayrollPage
