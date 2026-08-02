import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import QRCode from 'qrcode'
import { Copy, Check } from 'lucide-react'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import WeeklyScheduleEditor from '../../components/team/WeeklyScheduleEditor'
import { useAuth } from '../../context/AuthContext'
import { getMyBarbershop, updateMyBarbershop } from '../../api/barbershops'

const BOOKING_BASE_URL = window.location.origin + '/b'

function SettingsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data: barbershop, isLoading } = useQuery({ queryKey: ['barbershop'], queryFn: getMyBarbershop })

  const [form, setForm] = useState({ name: '', address: '', phone: '' })
  const [businessHours, setBusinessHours] = useState([])
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (barbershop) {
      setForm({ name: barbershop.name, address: barbershop.address || '', phone: barbershop.phone || '' })
      setBusinessHours(barbershop.businessHours || [])
    }
  }, [barbershop])

  const bookingUrl = barbershop ? `${BOOKING_BASE_URL}/${barbershop.slug}` : ''

  useEffect(() => {
    if (!bookingUrl) return
    QRCode.toDataURL(bookingUrl, { margin: 1, width: 160 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''))
  }, [bookingUrl])

  const updateMutation = useMutation({
    mutationFn: updateMyBarbershop,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barbershop'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    },
  })

  function handleCopy() {
    navigator.clipboard.writeText(bookingUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  function handleSave(e) {
    e.preventDefault()
    updateMutation.mutate({ ...form, businessHours })
  }

  if (isLoading) {
    return <p className="text-sm text-muted">Cargando configuración…</p>
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Configuración</h1>
      <p className="mt-1 text-sm text-muted">Datos del negocio, horario y cuenta</p>

      <form onSubmit={handleSave} className="mt-6 flex flex-col gap-4">
        <Card>
          <h3 className="text-sm font-medium text-muted">Perfil del negocio</h3>
          <div className="mt-4 flex flex-col gap-4">
            <Input id="name" name="name" label="Nombre de la barbería" value={form.name} onChange={handleChange} required />
            <Input id="address" name="address" label="Dirección" value={form.address} onChange={handleChange} />
            <Input id="phone" name="phone" label="Teléfono" value={form.phone} onChange={handleChange} />
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-medium text-muted">Link de agendamiento</h3>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1">
              <Input id="slug" label="Slug" value={barbershop?.slug || ''} readOnly />
              <p className="mt-1 text-xs text-muted">El link no se puede cambiar por ahora.</p>
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3.5 py-2.5">
                <span className="min-w-0 flex-1 truncate text-sm text-muted">{bookingUrl}</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  aria-label="Copiar link"
                  className="shrink-0 text-muted hover:text-ink"
                >
                  {copied ? <Check size={15} className="text-success" /> : <Copy size={15} />}
                </button>
              </div>
              <p className="mt-2 text-xs text-muted">
                Comparte este link o el código QR con tus clientes para que agenden directamente.
              </p>
            </div>

            {qrDataUrl && (
              <div className="flex shrink-0 flex-col items-center gap-2 self-center rounded-lg border border-border bg-bg p-3">
                <img src={qrDataUrl} alt="Código QR del link de agendamiento" width={120} height={120} />
              </div>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-medium text-muted">Horario de atención</h3>
          <div className="mt-4">
            <WeeklyScheduleEditor value={businessHours} onChange={setBusinessHours} />
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-medium text-muted">Cuenta</h3>
          <div className="mt-4 flex flex-col gap-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted">Nombre</span>
              <span className="text-ink">{user.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Correo</span>
              <span className="text-ink">{user.email}</span>
            </div>
          </div>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
          </Button>
          {saved && <span className="text-sm text-success">Cambios guardados</span>}
        </div>
      </form>
    </div>
  )
}

export default SettingsPage
