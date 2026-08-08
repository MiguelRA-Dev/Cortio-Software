import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck, ExternalLink } from 'lucide-react'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import { formatCOP } from '../../lib/format'
import { getBillingStatus, startCheckout, cancelSubscription, resumeSubscription } from '../../api/billing'

const STATUS_LABEL = { trialing: 'En prueba', active: 'Activa', past_due: 'Pago pendiente', canceled: 'Cancelada' }
const STATUS_VARIANT = { trialing: 'neutral', active: 'success', past_due: 'danger', canceled: 'danger' }

function BillingPage() {
  const queryClient = useQueryClient()
  const { data: status, isLoading } = useQuery({ queryKey: ['billing-status'], queryFn: getBillingStatus })
  const [error, setError] = useState('')
  const [cancelModalOpen, setCancelModalOpen] = useState(false)

  const checkoutMutation = useMutation({
    mutationFn: startCheckout,
    onSuccess: (data) => {
      window.location.href = data.checkoutUrl
    },
    onError: (err) => setError(err.response?.data?.error || 'No pudimos iniciar el pago. Intenta de nuevo.'),
  })

  const cancelMutation = useMutation({
    mutationFn: cancelSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-status'] })
      setCancelModalOpen(false)
    },
  })

  const resumeMutation = useMutation({
    mutationFn: resumeSubscription,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['billing-status'] }),
  })

  if (isLoading) {
    return <p className="text-sm text-muted">Cargando facturación…</p>
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Facturación</h1>
      <p className="mt-1 text-sm text-muted">Tu plan mensual de Cortio Software</p>

      <Card className="mt-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted">Estado de tu suscripción</h3>
          <Badge variant={STATUS_VARIANT[status.subscriptionStatus]}>{STATUS_LABEL[status.subscriptionStatus]}</Badge>
        </div>

        <div className="mt-4 flex flex-col gap-2 text-sm">
          {status.subscriptionStatus === 'trialing' && (
            <p className="text-ink">
              Te quedan <span className="font-semibold">{status.trialDaysLeft}</span> día(s) de prueba gratis.
            </p>
          )}
          {status.subscriptionStatus === 'active' && status.currentPeriodEnd && !status.cancelAtPeriodEnd && (
            <p className="text-ink">
              Tu próximo cobro es el{' '}
              <span className="font-semibold">
                {new Date(status.currentPeriodEnd).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              .
            </p>
          )}
          {status.subscriptionStatus === 'active' && status.cancelAtPeriodEnd && status.currentPeriodEnd && (
            <p className="rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-ink">
              Cancelaste tu suscripción. Sigues teniendo acceso hasta el{' '}
              <span className="font-semibold">
                {new Date(status.currentPeriodEnd).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>{' '}
              — después de esa fecha no se te vuelve a cobrar.
            </p>
          )}
          {status.blocked && (
            <p className="rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-danger">
              Tu acceso al panel está bloqueado. Activa tu suscripción para reactivarlo.
            </p>
          )}
          {status.priceCOP > 0 && <p className="text-muted">Precio mensual: {formatCOP(status.priceCOP)}</p>}
          {status.cardBrand && <p className="text-muted">Método de pago: {status.cardBrand}</p>}
        </div>

        {status.subscriptionStatus === 'active' && !status.blocked && (
          <div className="mt-4 border-t border-border pt-4">
            {status.cancelAtPeriodEnd ? (
              <button
                type="button"
                onClick={() => resumeMutation.mutate()}
                disabled={resumeMutation.isPending}
                className="text-sm font-medium text-ink underline disabled:opacity-50"
              >
                {resumeMutation.isPending ? 'Deshaciendo...' : 'Deshacer cancelación'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCancelModalOpen(true)}
                className="text-sm font-medium text-danger underline"
              >
                Cancelar suscripción
              </button>
            )}
          </div>
        )}
      </Card>

      {(status.subscriptionStatus !== 'active' || status.blocked) && (
        <Card className="mt-6">
          <h3 className="text-sm font-medium text-muted">Activar suscripción</h3>
          <p className="mt-2 text-sm text-muted">
            El pago se hace directo en la página de MercadoPago — tu tarjeta nunca pasa por nuestros servidores.
          </p>

          <p className="mt-3 flex items-center gap-2 text-xs text-muted">
            <ShieldCheck size={14} />
            Pago seguro procesado por MercadoPago
          </p>

          {error && (
            <p className="mt-3 rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">{error}</p>
          )}

          <Button
            type="button"
            onClick={() => {
              setError('')
              checkoutMutation.mutate()
            }}
            disabled={checkoutMutation.isPending}
            className="mt-4 flex w-full items-center justify-center gap-2"
          >
            {checkoutMutation.isPending ? 'Redirigiendo...' : 'Suscribirme con MercadoPago'}
            <ExternalLink size={15} />
          </Button>
        </Card>
      )}

      <Modal open={cancelModalOpen} onClose={() => setCancelModalOpen(false)} title="Cancelar suscripción">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            Sigues teniendo acceso al panel hasta el{' '}
            <span className="font-medium text-ink">
              {status.currentPeriodEnd &&
                new Date(status.currentPeriodEnd).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            . Después de esa fecha no se te vuelve a cobrar y el panel se bloquea. Puedes deshacer esto en cualquier
            momento antes de que llegue esa fecha.
          </p>
          {cancelMutation.isError && (
            <p className="rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
              {cancelMutation.error.response?.data?.error || 'No pudimos procesar la cancelación.'}
            </p>
          )}
          <button
            type="button"
            disabled={cancelMutation.isPending}
            onClick={() => cancelMutation.mutate()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-4 py-2.5 text-sm font-medium text-danger transition-colors hover:bg-danger/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {cancelMutation.isPending ? 'Cancelando...' : 'Sí, cancelar suscripción'}
          </button>
        </div>
      </Modal>
    </div>
  )
}

export default BillingPage
