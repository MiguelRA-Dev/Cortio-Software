import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Wallet, Receipt } from 'lucide-react'
import Card from '../../components/ui/Card'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import { formatCOP } from '../../lib/format'
import { listPayroll, getPayrollEntry } from '../../api/payroll'

const PAYMENT_METHOD_LABEL = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', other: 'Otro' }

function BarberPayrollPage() {
  const { data: entries = [], isLoading, isError } = useQuery({ queryKey: ['payroll', 'me'], queryFn: () => listPayroll() })
  const [tracingId, setTracingId] = useState(null)

  const { data: tracingEntry, isLoading: tracingLoading } = useQuery({
    queryKey: ['payroll-entry', tracingId],
    queryFn: () => getPayrollEntry(tracingId),
    enabled: Boolean(tracingId),
  })

  const totals = useMemo(() => {
    const now = new Date()
    const pendingTotal = entries.filter((e) => e.status === 'pending').reduce((sum, e) => sum + e.netAmount, 0)
    const paidThisMonth = entries
      .filter((e) => {
        if (e.status !== 'paid' || !e.paidAt) return false
        const paidAt = new Date(e.paidAt)
        return paidAt.getMonth() === now.getMonth() && paidAt.getFullYear() === now.getFullYear()
      })
      .reduce((sum, e) => sum + e.netAmount, 0)
    return { pendingTotal, paidThisMonth }
  }, [entries])

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Mi nómina</h1>
      <p className="mt-1 text-sm text-muted">Historial de tus liquidaciones</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="px-4 py-3">
          <span className="text-xs text-muted">Pendiente por cobrar</span>
          <p className="mt-1 text-lg font-semibold tabular-nums text-ink">{formatCOP(totals.pendingTotal)}</p>
        </Card>
        <Card className="px-4 py-3">
          <span className="text-xs text-muted">Cobrado este mes</span>
          <p className="mt-1 text-lg font-semibold tabular-nums text-ink">{formatCOP(totals.paidThisMonth)}</p>
        </Card>
      </div>

      <Card className="mt-6">
        {isLoading ? (
          <p className="py-4 text-sm text-muted">Cargando nómina…</p>
        ) : isError ? (
          <p className="py-4 text-sm text-danger">No pudimos cargar tu nómina. Intenta recargar.</p>
        ) : entries.length === 0 ? (
          <p className="py-4 text-sm text-muted">Aún no tienes liquidaciones registradas.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {entries.map((e) => (
              <div key={e._id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted">
                  <Wallet size={16} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {new Date(e.periodStart).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })} —{' '}
                    {new Date(e.periodEnd).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                  </p>
                  <p className="truncate text-xs text-muted">
                    Bruto: {formatCOP(e.grossAmount)}
                    {e.status === 'paid' && e.paymentMethod && ` · Pagado por ${PAYMENT_METHOD_LABEL[e.paymentMethod]}`}
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

                <span className="shrink-0 text-sm font-medium tabular-nums text-ink">{formatCOP(e.netAmount)}</span>

                <Badge variant={e.status === 'paid' ? 'success' : 'muted'}>
                  {e.status === 'paid' ? 'Pagada' : 'Pendiente'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={Boolean(tracingId)} onClose={() => setTracingId(null)} title="Ventas incluidas en el bruto">
        {tracingLoading ? (
          <p className="text-sm text-muted">Cargando…</p>
        ) : !tracingEntry?.sales?.length ? (
          <p className="text-sm text-muted">Esta liquidación no tiene ventas asociadas.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
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

export default BarberPayrollPage
