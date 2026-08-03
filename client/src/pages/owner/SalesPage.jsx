import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Minus, Trash2, ShoppingCart, Check } from 'lucide-react'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Select from '../../components/ui/Select'
import Badge from '../../components/ui/Badge'
import { formatCOP } from '../../lib/format'
import { listServices } from '../../api/services'
import { listProducts } from '../../api/products'
import { listTeam } from '../../api/barbers'
import { listSales, createSale } from '../../api/sales'
import { listMyAppointments } from '../../api/appointments'
import { useAuth } from '../../context/AuthContext'

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Efectivo' },
  { id: 'card', label: 'Tarjeta' },
  { id: 'transfer', label: 'Transferencia' },
  { id: 'other', label: 'Otro' },
]

function todayRange() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  return { from: start.toISOString(), to: end.toISOString() }
}

function CatalogGrid({ items, onAdd, priceKey = 'price' }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {items.map((item) => (
        <button
          key={item._id}
          type="button"
          onClick={() => onAdd(item)}
          className="flex flex-col items-start gap-1 rounded-lg border border-border bg-surface-2 p-3 text-left transition-colors hover:border-ink"
        >
          <span className="text-sm font-medium text-ink">{item.name}</span>
          <span className="text-xs text-muted">{formatCOP(item[priceKey])}</span>
        </button>
      ))}
    </div>
  )
}

function SalesPage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const isBarber = user?.role === 'barber'
  const [catalogTab, setCatalogTab] = useState('services')
  const [cart, setCart] = useState([])
  const [barberId, setBarberId] = useState(() => (isBarber ? user._id : ''))
  const [appointmentId, setAppointmentId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const { data: services = [] } = useQuery({ queryKey: ['services'], queryFn: listServices })
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: listProducts })
  const { data: barbers = [] } = useQuery({ queryKey: ['team'], queryFn: listTeam })
  const { data: sales = [] } = useQuery({ queryKey: ['sales', 'today'], queryFn: () => listSales(todayRange()) })
  const { data: appointments = [] } = useQuery({ queryKey: ['appointments'], queryFn: () => listMyAppointments() })

  const activeServices = services.filter((s) => s.active)
  const activeProducts = products.filter((p) => p.active)

  const soldAppointmentIds = useMemo(
    () => new Set(sales.filter((s) => s.appointment).map((s) => s.appointment._id || s.appointment)),
    [sales]
  )

  const linkableAppointments = useMemo(() => {
    const todayKey = new Date().toDateString()
    return appointments
      .filter(
        (a) =>
          new Date(a.startTime).toDateString() === todayKey &&
          ['confirmed', 'completed'].includes(a.status) &&
          !soldAppointmentIds.has(a._id)
      )
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
  }, [appointments, soldAppointmentIds])

  const total = useMemo(() => cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0), [cart])
  const salesTotal = useMemo(() => sales.reduce((sum, s) => sum + s.total, 0), [sales])

  const checkoutMutation = useMutation({
    mutationFn: createSale,
    onSuccess: (sale) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setCart([])
      setBarberId(isBarber ? user._id : '')
      setAppointmentId('')
      setError('')
      setSuccessMessage(`Venta registrada por ${formatCOP(sale.total)}`)
      setTimeout(() => setSuccessMessage(''), 3000)
    },
    onError: (err) => setError(err.response?.data?.error || 'No pudimos registrar la venta.'),
  })

  function addToCart(item, itemType) {
    const unitPrice = itemType === 'Service' ? item.price : item.salePrice
    setCart((prev) => {
      const existing = prev.find((i) => i.itemId === item._id && i.itemType === itemType)
      if (existing) {
        return prev.map((i) => (i === existing ? { ...i, quantity: i.quantity + 1 } : i))
      }
      return [...prev, { itemId: item._id, itemType, name: item.name, unitPrice, quantity: 1 }]
    })
  }

  function changeQuantity(itemId, itemType, delta) {
    setCart((prev) =>
      prev
        .map((i) => (i.itemId === itemId && i.itemType === itemType ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    )
  }

  function removeItem(itemId, itemType) {
    setCart((prev) => prev.filter((i) => !(i.itemId === itemId && i.itemType === itemType)))
  }

  function handleAppointmentChange(e) {
    const id = e.target.value
    setAppointmentId(id)
    const appt = linkableAppointments.find((a) => a._id === id)
    if (appt?.barber?._id) {
      setBarberId(appt.barber._id)
    }
  }

  function handleCheckout() {
    if (cart.length === 0) return
    setError('')
    checkoutMutation.mutate({
      barberId: barberId || undefined,
      appointmentId: appointmentId || undefined,
      paymentMethod,
      items: cart.map((i) => ({ itemType: i.itemType, itemId: i.itemId, quantity: i.quantity })),
    })
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Ventas (POS)</h1>
      <p className="mt-1 text-sm text-muted">Registra ventas de servicios y productos</p>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <div className="flex gap-1 rounded-lg border border-border bg-surface-2 p-1">
              <button
                type="button"
                onClick={() => setCatalogTab('services')}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  catalogTab === 'services' ? 'bg-accent text-accent-ink' : 'text-muted hover:text-ink'
                }`}
              >
                Servicios
              </button>
              <button
                type="button"
                onClick={() => setCatalogTab('products')}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  catalogTab === 'products' ? 'bg-accent text-accent-ink' : 'text-muted hover:text-ink'
                }`}
              >
                Productos
              </button>
            </div>

            <div className="mt-4">
              {catalogTab === 'services' ? (
                <CatalogGrid items={activeServices} onAdd={(item) => addToCart(item, 'Service')} priceKey="price" />
              ) : (
                <CatalogGrid items={activeProducts} onAdd={(item) => addToCart(item, 'Product')} priceKey="salePrice" />
              )}
            </div>
          </Card>

          <Card className="mt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted">Ventas de hoy</h3>
              <span className="text-sm font-semibold tabular-nums text-ink">{formatCOP(salesTotal)}</span>
            </div>
            {sales.length === 0 ? (
              <p className="mt-3 text-sm text-muted">Aún no hay ventas registradas hoy.</p>
            ) : (
              <div className="mt-3 flex flex-col divide-y divide-border">
                {sales.map((s) => (
                  <div key={s._id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-3 first:pt-0 last:pb-0">
                    <span className="shrink-0 text-sm font-medium tabular-nums text-ink sm:w-12">
                      {new Date(s.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-muted">
                      {s.items.map((i) => i.name).join(', ')}
                    </span>
                    <span className="shrink-0 text-sm font-medium tabular-nums text-ink">{formatCOP(s.total)}</span>

                    <div className="basis-full sm:hidden" />

                    <span className="min-w-0 max-w-[45%] shrink-0 truncate text-sm text-muted sm:w-24 sm:max-w-none">
                      {s.barber?.name || 'Sin asignar'}
                    </span>
                    {s.source === 'appointment' && s.appointment ? (
                      <Badge variant="neutral" className="min-w-0 flex-1 justify-start sm:w-48 sm:flex-none">
                        <span
                          className="block w-full truncate text-left"
                          title={`${s.appointment.customer?.name || 'Cliente'} · ${new Date(
                            s.appointment.startTime
                          ).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })}`}
                        >
                          {s.appointment.customer?.name || 'Cliente'} ·{' '}
                          {new Date(s.appointment.startTime).toLocaleTimeString('es-CO', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                          })}
                        </span>
                      </Badge>
                    ) : (
                      <Badge variant="muted">Walk-in</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div>
          <Card className="sticky top-20">
            <div className="flex items-center gap-2">
              <ShoppingCart size={16} className="text-muted" />
              <h3 className="text-sm font-medium text-muted">Ticket actual</h3>
            </div>

            {cart.length === 0 ? (
              <p className="mt-4 text-sm text-muted">Agrega servicios o productos desde el catálogo.</p>
            ) : (
              <div className="mt-4 flex flex-col divide-y divide-border">
                {cart.map((item) => (
                  <div key={`${item.itemType}-${item.itemId}`} className="flex items-center gap-2 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{item.name}</p>
                      <p className="text-xs text-muted">{formatCOP(item.unitPrice)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => changeQuantity(item.itemId, item.itemType, -1)}
                        className="rounded-md p-1 text-muted hover:bg-surface-2 hover:text-ink"
                        aria-label="Restar"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="w-5 text-center text-sm tabular-nums text-ink">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => changeQuantity(item.itemId, item.itemType, 1)}
                        className="rounded-md p-1 text-muted hover:bg-surface-2 hover:text-ink"
                        aria-label="Sumar"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.itemId, item.itemType)}
                      className="rounded-md p-1 text-muted hover:bg-surface-2 hover:text-danger"
                      aria-label="Quitar"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
              <Select id="appointment" label="Vincular a una cita (opcional)" value={appointmentId} onChange={handleAppointmentChange}>
                <option value="">Walk-in (sin cita)</option>
                {linkableAppointments.map((a) => (
                  <option key={a._id} value={a._id}>
                    {new Date(a.startTime).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })} ·{' '}
                    {a.customer?.name} · {a.service?.name}
                  </option>
                ))}
              </Select>

              <Select
                id="barber"
                label="Atendido por"
                value={barberId}
                onChange={(e) => setBarberId(e.target.value)}
                disabled={isBarber}
              >
                {isBarber ? (
                  <option value={user._id}>{user.name}</option>
                ) : (
                  <>
                    <option value="">Sin asignar</option>
                    {barbers.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name}
                      </option>
                    ))}
                  </>
                )}
              </Select>

              <Select id="paymentMethod" label="Método de pago" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </Select>

              <div className="flex items-center justify-between border-t border-border pt-3">
                <span className="text-sm font-medium text-muted">Total</span>
                <span className="text-xl font-semibold tabular-nums text-ink">{formatCOP(total)}</span>
              </div>

              {error && (
                <p className="rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">{error}</p>
              )}

              <Button onClick={handleCheckout} disabled={cart.length === 0 || checkoutMutation.isPending} className="w-full">
                {checkoutMutation.isPending ? 'Procesando...' : 'Cobrar'}
              </Button>

              {successMessage && (
                <p className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3.5 py-2.5 text-sm text-success">
                  <Check size={15} />
                  {successMessage}
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default SalesPage
