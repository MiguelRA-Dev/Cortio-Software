import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ShieldCheck, ExternalLink } from 'lucide-react'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import { formatCOP } from '../../lib/format'
import { getBillingStatus, startCheckout } from '../../api/billing'

const STATUS_LABEL = { trialing: 'En prueba', active: 'Activa', past_due: 'Pago pendiente', canceled: 'Cancelada' }
const STATUS_VARIANT = { trialing: 'neutral', active: 'success', past_due: 'danger', canceled: 'danger' }

function BillingPage() {
  const { data: status, isLoading } = useQuery({ queryKey: ['billing-status'], queryFn: getBillingStatus })
  const [error, setError] = useState('')

  const checkoutMutation = useMutation({
    mutationFn: startCheckout,
    onSuccess: (data) => {
      window.location.href = data.checkoutUrl
    },
    onError: (err) => setError(err.response?.data?.error || 'No pudimos iniciar el pago. Intenta de nuevo.'),
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
          {status.subscriptionStatus === 'active' && status.currentPeriodEnd && (
            <p className="text-ink">
              Tu próximo cobro es el{' '}
              <span className="font-semibold">
                {new Date(status.currentPeriodEnd).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              .
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
    </div>
  )
}

export default BillingPage
