import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import QRCode from 'qrcode'
import { Copy, Check, Camera, Store, ShieldCheck, ShieldAlert, TriangleAlert } from 'lucide-react'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import WeeklyScheduleEditor from '../../components/team/WeeklyScheduleEditor'
import { useAuth } from '../../context/AuthContext'
import {
  getMyBarbershop,
  updateMyBarbershop,
  uploadBarbershopLogo,
  requestBarbershopDeletion,
  cancelBarbershopDeletion,
} from '../../api/barbershops'
import { updateMe, resendVerification } from '../../api/auth'
import { resolveAssetUrl } from '../../lib/assets'

const BOOKING_BASE_URL = window.location.origin + '/b'

function SettingsPage() {
  const { user, updateUser } = useAuth()
  const queryClient = useQueryClient()
  const { data: barbershop, isLoading } = useQuery({ queryKey: ['barbershop'], queryFn: getMyBarbershop })

  const [form, setForm] = useState({ name: '', location: '', address: '', addressDetails: '', phone: '' })
  const [businessHours, setBusinessHours] = useState([])
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)

  const [accountForm, setAccountForm] = useState({ name: user.name, email: user.email })
  const [accountError, setAccountError] = useState('')
  const [accountSaved, setAccountSaved] = useState(false)

  const logoInputRef = useRef(null)
  const [logoError, setLogoError] = useState('')

  useEffect(() => {
    if (barbershop) {
      setForm({
        name: barbershop.name,
        location: barbershop.location || '',
        address: barbershop.address || '',
        addressDetails: barbershop.addressDetails || '',
        phone: barbershop.phone || '',
      })
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

  const accountMutation = useMutation({
    mutationFn: updateMe,
    onSuccess: (updatedUser) => {
      updateUser(updatedUser)
      setAccountError('')
      setAccountSaved(true)
      setTimeout(() => setAccountSaved(false), 2500)
    },
    onError: (err) => setAccountError(err.response?.data?.error || 'No pudimos guardar los cambios.'),
  })

  function handleAccountChange(e) {
    setAccountForm({ ...accountForm, [e.target.name]: e.target.value })
  }

  function handleAccountSave(e) {
    e.preventDefault()
    setAccountError('')
    accountMutation.mutate(accountForm)
  }

  const [resent, setResent] = useState(false)
  const resendMutation = useMutation({
    mutationFn: resendVerification,
    onSuccess: () => setResent(true),
  })

  const logoMutation = useMutation({
    mutationFn: uploadBarbershopLogo,
    onSuccess: () => {
      setLogoError('')
      queryClient.invalidateQueries({ queryKey: ['barbershop'] })
    },
    onError: (err) => setLogoError(err.response?.data?.error || 'No pudimos subir el logo.'),
  })

  function handleLogoPick(e) {
    const file = e.target.files?.[0]
    if (file) logoMutation.mutate(file)
    e.target.value = ''
  }

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  const requestDeletionMutation = useMutation({
    mutationFn: requestBarbershopDeletion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barbershop'] })
      queryClient.invalidateQueries({ queryKey: ['billing-status'] })
      setDeleteModalOpen(false)
      setDeleteConfirmText('')
    },
  })

  const cancelDeletionMutation = useMutation({
    mutationFn: cancelBarbershopDeletion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barbershop'] })
      queryClient.invalidateQueries({ queryKey: ['billing-status'] })
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
          <div className="mt-4 flex items-center gap-4">
            {barbershop?.logoUrl ? (
              <img src={resolveAssetUrl(barbershop.logoUrl)} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted">
                <Store size={22} />
              </div>
            )}
            <div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleLogoPick}
              />
              <Button
                type="button"
                variant="secondary"
                disabled={logoMutation.isPending}
                onClick={() => logoInputRef.current?.click()}
              >
                <Camera size={14} />
                {logoMutation.isPending ? 'Subiendo...' : 'Cambiar logo'}
              </Button>
              {logoError && <p className="mt-1.5 text-xs text-danger">{logoError}</p>}
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-4">
            <Input id="name" name="name" label="Nombre de la barbería" value={form.name} onChange={handleChange} required />
            <Input id="location" name="location" label="Ubicación (ciudad)" value={form.location} onChange={handleChange} />
            <Input id="address" name="address" label="Dirección" value={form.address} onChange={handleChange} />
            <Input
              id="addressDetails"
              name="addressDetails"
              label="Detalles adicionales de la dirección"
              value={form.addressDetails}
              onChange={handleChange}
            />
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

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
          </Button>
          {saved && <span className="text-sm text-success">Cambios guardados</span>}
        </div>
      </form>

      <form onSubmit={handleAccountSave} className="mt-4 flex flex-col gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted">Cuenta</h3>
            {user.emailVerified ? (
              <Badge variant="success">
                <ShieldCheck size={12} className="mr-1" />
                Verificado
              </Badge>
            ) : (
              <Badge variant="danger">
                <ShieldAlert size={12} className="mr-1" />
                No verificado
              </Badge>
            )}
          </div>
          <div className="mt-4 flex flex-col gap-4">
            <Input id="accountName" name="name" label="Nombre" value={accountForm.name} onChange={handleAccountChange} required />
            <Input id="accountEmail" name="email" type="email" label="Correo" value={accountForm.email} onChange={handleAccountChange} required />
          </div>
          {!user.emailVerified && (
            <div className="mt-4 flex items-center gap-3 rounded-lg border border-border bg-surface-2 px-3.5 py-2.5">
              <p className="flex-1 text-xs text-muted">
                Revisa tu correo y confirma tu cuenta para que aparezca como verificada.
              </p>
              <button
                type="button"
                onClick={() => resendMutation.mutate()}
                disabled={resendMutation.isPending || resent}
                className="shrink-0 text-xs font-medium text-ink underline disabled:opacity-50"
              >
                {resent ? 'Correo reenviado' : resendMutation.isPending ? 'Enviando...' : 'Reenviar correo'}
              </button>
            </div>
          )}
          {accountError && (
            <p className="mt-4 rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">{accountError}</p>
          )}
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={accountMutation.isPending}>
            {accountMutation.isPending ? 'Guardando...' : 'Guardar cuenta'}
          </Button>
          {accountSaved && <span className="text-sm text-success">Cambios guardados</span>}
        </div>
      </form>

      <Card className="mt-4 border-danger/30">
        <div className="flex items-center gap-2">
          <TriangleAlert size={16} className="text-danger" />
          <h3 className="text-sm font-medium text-danger">Zona de peligro</h3>
        </div>

        {barbershop?.deletionRequestedAt ? (
          <div className="mt-4">
            <p className="text-sm text-ink">
              Esta barbería se eliminará permanentemente el{' '}
              <span className="font-medium">
                {new Date(barbershop.scheduledPurgeAt).toLocaleDateString('es-CO', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
              . Se borrarán todas las citas, ventas, clientes, nómina e inventario. Cancela antes de esa fecha si
              cambiaste de opinión.
            </p>
            <button
              type="button"
              onClick={() => cancelDeletionMutation.mutate()}
              disabled={cancelDeletionMutation.isPending}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {cancelDeletionMutation.isPending ? 'Cancelando...' : 'Cancelar eliminación'}
            </button>
          </div>
        ) : (
          <div className="mt-4">
            <p className="text-sm text-muted">
              Elimina tu barbería y todos sus datos de Cortio. Tendrás 15 días para cancelar antes de que se borre
              todo de forma permanente.
            </p>
            <button
              type="button"
              onClick={() => setDeleteModalOpen(true)}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-4 py-2.5 text-sm font-medium text-danger transition-colors hover:bg-danger/20"
            >
              Eliminar mi barbería
            </button>
          </div>
        )}
      </Card>

      <Modal
        open={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false)
          setDeleteConfirmText('')
        }}
        title="Eliminar tu barbería"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            Esto desactiva <span className="font-medium text-ink">{barbershop?.name}</span> de inmediato y programa
            el borrado permanente de todos sus datos en 15 días. Tendrás ese tiempo para cancelar si cambias de
            opinión.
          </p>
          <p className="text-sm text-muted">
            Escribe <span className="font-mono font-medium text-ink">{barbershop?.slug}</span> para confirmar.
          </p>
          <Input
            id="deleteConfirm"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder={barbershop?.slug}
            autoComplete="off"
          />
          {requestDeletionMutation.isError && (
            <p className="rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
              {requestDeletionMutation.error.response?.data?.error || 'No pudimos procesar la solicitud.'}
            </p>
          )}
          <button
            type="button"
            disabled={deleteConfirmText !== barbershop?.slug || requestDeletionMutation.isPending}
            onClick={() => requestDeletionMutation.mutate()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-4 py-2.5 text-sm font-medium text-danger transition-colors hover:bg-danger/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {requestDeletionMutation.isPending ? 'Eliminando...' : 'Sí, eliminar permanentemente'}
          </button>
        </div>
      </Modal>
    </div>
  )
}

export default SettingsPage
