import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Wallet, CheckCircle2 } from 'lucide-react'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Badge from '../../components/ui/Badge'
import { formatCOP } from '../../lib/format'
import { listTeam } from '../../api/barbers'
import { listPayroll, previewPayroll, createPayroll, markPayrollPaid } from '../../api/payroll'

const PAYMENT_SCHEME_LABEL = {
  commission: 'Comisión',
  fixed: 'Fijo',
  mixed: 'Mixto',
}

function firstDayOfMonth() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

function lastDayOfMonth() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10)
}

const EMPTY_FORM = { barberId: '', periodStart: firstDayOfMonth(), periodEnd: lastDayOfMonth(), netAmount: '' }

function PayrollPage() {
  const queryClient = useQueryClient()
  const { data: barbers = [] } = useQuery({ queryKey: ['team'], queryFn: listTeam })
  const { data: entries = [], isLoading, isError } = useQuery({ queryKey: ['payroll'], queryFn: () => listPayroll() })

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')

  const canPreview = Boolean(form.barberId && form.periodStart && form.periodEnd)
  const { data: preview } = useQuery({
    queryKey: ['payroll-preview', form.barberId, form.periodStart, form.periodEnd],
    queryFn: () => previewPayroll({ barberId: form.barberId, periodStart: form.periodStart, periodEnd: form.periodEnd }),
    enabled: canPreview,
  })

  const selectedBarber = barbers.find((b) => b._id === form.barberId)

  const createMutation = useMutation({
    mutationFn: createPayroll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll'] })
      setModalOpen(false)
    },
    onError: (err) => setFormError(err.response?.data?.error || 'No pudimos generar la liquidación.'),
  })

  const markPaidMutation = useMutation({
    mutationFn: markPayrollPaid,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payroll'] }),
  })

  function openCreate() {
    setForm({ ...EMPTY_FORM, barberId: barbers[0]?._id || '' })
    setFormError('')
    setModalOpen(true)
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    createMutation.mutate({
      barberId: form.barberId,
      periodStart: form.periodStart,
      periodEnd: form.periodEnd,
      netAmount: form.netAmount ? Number(form.netAmount) : undefined,
    })
  }

  function markPaid(id) {
    markPaidMutation.mutate(id)
  }

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
                  </p>
                </div>

                <span className="hidden text-sm text-muted sm:block">Bruto: {formatCOP(e.grossAmount)}</span>
                <span className="shrink-0 text-sm font-medium tabular-nums text-ink">{formatCOP(e.netAmount)}</span>

                <Badge variant={e.status === 'paid' ? 'success' : 'muted'}>
                  {e.status === 'paid' ? 'Pagada' : 'Pendiente'}
                </Badge>

                {e.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => markPaid(e._id)}
                    aria-label="Marcar como pagada"
                    className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-success"
                  >
                    <CheckCircle2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Generar nómina">
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
                <span className="text-muted">Servicios completados</span>
                <span className="font-medium tabular-nums text-ink">{preview.servicesCount}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between border-t border-border pt-1.5">
                <span className="text-muted">Monto bruto calculado</span>
                <span className="font-semibold tabular-nums text-ink">{formatCOP(preview.grossAmount)}</span>
              </div>
            </div>
          )}

          <Input
            id="netAmount"
            name="netAmount"
            type="number"
            min="0"
            label="Monto neto a pagar (COP)"
            placeholder={preview ? String(preview.grossAmount) : ''}
            value={form.netAmount}
            onChange={handleChange}
          />
          <p className="-mt-2 text-xs text-muted">Déjalo vacío para usar el monto bruto calculado.</p>

          {formError && (
            <p className="rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">{formError}</p>
          )}

          <Button type="submit" disabled={createMutation.isPending} className="mt-2 w-full">
            {createMutation.isPending ? 'Generando...' : 'Generar liquidación'}
          </Button>
        </form>
      </Modal>
    </div>
  )
}

export default PayrollPage
