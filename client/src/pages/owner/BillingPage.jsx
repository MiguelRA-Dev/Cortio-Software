import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CreditCard, ShieldCheck } from 'lucide-react'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import { formatCOP } from '../../lib/format'
import { getBillingStatus, attachPaymentMethod } from '../../api/billing'

const WOMPI_BASE_URL = import.meta.env.VITE_WOMPI_ENV === 'production' ? 'https://production.wompi.co/v1' : 'https://sandbox.wompi.co/v1'

const STATUS_LABEL = { trialing: 'En prueba', active: 'Activa', past_due: 'Pago pendiente', canceled: 'Cancelada' }
const STATUS_VARIANT = { trialing: 'neutral', active: 'success', past_due: 'danger', canceled: 'danger' }

const EMPTY_CARD_FORM = { number: '', cardHolder: '', expMonth: '', expYear: '', cvc: '' }

async function tokenizeCard(form) {
  const res = await fetch(`${WOMPI_BASE_URL}/tokens/cards`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_WOMPI_PUBLIC_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      number: form.number.replace(/\s+/g, ''),
      cvc: form.cvc,
      exp_month: form.expMonth,
      exp_year: form.expYear,
      card_holder: form.cardHolder,
    }),
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(json?.error?.reason || 'No pudimos procesar la tarjeta. Verifica los datos.')
  }
  return json.data.id
}

function BillingPage() {
  const queryClient = useQueryClient()
  const { data: status, isLoading } = useQuery({ queryKey: ['billing-status'], queryFn: getBillingStatus })

  const [form, setForm] = useState(EMPTY_CARD_FORM)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const attachMutation = useMutation({
    mutationFn: attachPaymentMethod,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-status'] })
      setForm(EMPTY_CARD_FORM)
    },
    onError: (err) => setError(err.response?.data?.error || 'No pudimos activar la suscripción.'),
  })

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const cardToken = await tokenizeCard(form)
      attachMutation.mutate(cardToken)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (isLoading) {
    return <p className="text-sm text-muted">Cargando facturación…</p>
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Facturación</h1>
      <p className="mt-1 text-sm text-muted">Tu plan mensual de Cortio</p>

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
              Tu acceso al panel está bloqueado. Agrega o actualiza tu método de pago para reactivarlo.
            </p>
          )}
          {status.priceCOP > 0 && <p className="text-muted">Precio mensual: {formatCOP(status.priceCOP)}</p>}
          {status.card && (
            <p className="flex items-center gap-2 text-muted">
              <CreditCard size={15} />
              Tarjeta terminada en {status.card.lastFour}
            </p>
          )}
        </div>
      </Card>

      <Card className="mt-6">
        <h3 className="text-sm font-medium text-muted">{status.card ? 'Cambiar tarjeta' : 'Agregar método de pago'}</h3>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <Input id="cardHolder" name="cardHolder" label="Nombre en la tarjeta" value={form.cardHolder} onChange={handleChange} required />
          <Input id="number" name="number" label="Número de tarjeta" placeholder="4242 4242 4242 4242" value={form.number} onChange={handleChange} required />
          <div className="grid grid-cols-3 gap-3">
            <Input id="expMonth" name="expMonth" label="Mes (MM)" placeholder="08" value={form.expMonth} onChange={handleChange} required />
            <Input id="expYear" name="expYear" label="Año (YY)" placeholder="30" value={form.expYear} onChange={handleChange} required />
            <Input id="cvc" name="cvc" label="CVC" placeholder="123" value={form.cvc} onChange={handleChange} required />
          </div>

          <p className="flex items-center gap-2 text-xs text-muted">
            <ShieldCheck size={14} />
            Tu tarjeta se envía directo a Wompi — nunca pasa por nuestros servidores.
          </p>

          {error && <p className="rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">{error}</p>}

          <Button type="submit" disabled={submitting || attachMutation.isPending} className="w-full">
            {submitting || attachMutation.isPending ? 'Procesando...' : 'Guardar y cobrar'}
          </Button>
        </form>
      </Card>
    </div>
  )
}

export default BillingPage
