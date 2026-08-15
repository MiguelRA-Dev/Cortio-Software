import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Camera, Trash2, Image as ImageIcon, UserRound } from 'lucide-react'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Switch from '../../components/ui/Switch'
import WeeklyScheduleEditor from '../../components/team/WeeklyScheduleEditor'
import { formatCOP } from '../../lib/format'
import { resolveAssetUrl } from '../../lib/assets'
import { listTeam, createBarber, updateBarber, uploadBarberAvatar } from '../../api/barbers'
import { listBarberPortfolio, listMyPortfolio, createPortfolioPhoto, deletePortfolioPhoto } from '../../api/portfolio'
import { updateMe } from '../../api/auth'
import { useAuth } from '../../context/AuthContext'

const PAYMENT_SCHEMES = [
  { id: 'commission', label: 'Comisión' },
  { id: 'fixed', label: 'Fijo' },
  { id: 'mixed', label: 'Mixto (base + comisión)' },
]

function paymentSummary(barber) {
  if (barber.paymentScheme === 'fixed') return `Fijo · ${formatCOP(barber.baseSalary || 0)}`
  if (barber.paymentScheme === 'commission') return `Comisión · ${barber.commissionRate}%`
  return `Mixto · ${formatCOP(barber.baseSalary || 0)} + ${barber.commissionRate}%`
}

function initials(name) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  password: '',
  paymentScheme: 'commission',
  commissionRate: '',
  baseSalary: '',
  schedule: [],
}

// Lets the owner appear as a bookable professional on their own public booking page,
// using their existing account (see User.attendsClients on the backend) — no separate
// barber login needed.
function OwnerAvailabilityCard() {
  const { user, updateUser } = useAuth()
  const queryClient = useQueryClient()
  const [schedule, setSchedule] = useState(user.schedule || [])
  const [saved, setSaved] = useState(false)
  const [avatarError, setAvatarError] = useState('')
  const [photoError, setPhotoError] = useState('')
  const avatarInputRef = useRef(null)
  const photoInputRef = useRef(null)

  const toggleMutation = useMutation({
    mutationFn: (attendsClients) => updateMe({ attendsClients }),
    onSuccess: (updatedUser) => {
      updateUser(updatedUser)
      queryClient.invalidateQueries({ queryKey: ['team'] })
    },
  })

  const scheduleMutation = useMutation({
    mutationFn: (newSchedule) => updateMe({ schedule: newSchedule }),
    onSuccess: (updatedUser) => {
      updateUser(updatedUser)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    },
  })

  const avatarMutation = useMutation({
    mutationFn: (file) => uploadBarberAvatar(user._id, file),
    onSuccess: (updated) => {
      setAvatarError('')
      updateUser({ ...user, avatarUrl: updated.avatarUrl })
    },
    onError: (err) => setAvatarError(err.response?.data?.error || 'No pudimos subir la foto.'),
  })

  const { data: photos = [] } = useQuery({
    queryKey: ['portfolio', 'mine'],
    queryFn: listMyPortfolio,
    enabled: Boolean(user.attendsClients),
  })

  const uploadPhotoMutation = useMutation({
    mutationFn: (file) => createPortfolioPhoto({ file }),
    onSuccess: () => {
      setPhotoError('')
      queryClient.invalidateQueries({ queryKey: ['portfolio', 'mine'] })
    },
    onError: (err) => setPhotoError(err.response?.data?.error || 'No pudimos subir la foto.'),
  })

  const deletePhotoMutation = useMutation({
    mutationFn: deletePortfolioPhoto,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['portfolio', 'mine'] }),
  })

  function handleAvatarPick(e) {
    const file = e.target.files?.[0]
    if (file) avatarMutation.mutate(file)
    e.target.value = ''
  }

  function handlePhotoPick(e) {
    const file = e.target.files?.[0]
    if (file) uploadPhotoMutation.mutate(file)
    e.target.value = ''
  }

  return (
    <Card className="mt-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium text-ink">Tú también atiendes clientes</h3>
          <p className="mt-1 text-xs text-muted">Apareces en la agenda pública junto a tus profesionales.</p>
        </div>
        <Switch checked={Boolean(user.attendsClients)} onChange={(v) => toggleMutation.mutate(v)} />
      </div>

      {user.attendsClients && (
        <div className="mt-4 flex flex-col gap-4 border-t border-border pt-4">
          <div>
            <p className="mb-2 text-sm font-medium text-muted">Tu horario semanal</p>
            <WeeklyScheduleEditor value={schedule} onChange={setSchedule} />
            <div className="mt-3 flex items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => scheduleMutation.mutate(schedule)}
                disabled={scheduleMutation.isPending}
              >
                {scheduleMutation.isPending ? 'Guardando...' : 'Guardar horario'}
              </Button>
              {saved && <span className="text-sm text-success">Guardado</span>}
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <p className="mb-2 text-sm font-medium text-muted">Tu foto de perfil</p>
            <div className="flex items-center gap-4">
              {user.avatarUrl ? (
                <img src={resolveAssetUrl(user.avatarUrl)} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover" />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted">
                  <UserRound size={24} />
                </div>
              )}
              <div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarPick}
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={avatarMutation.isPending}
                  onClick={() => avatarInputRef.current?.click()}
                >
                  <Camera size={14} />
                  {avatarMutation.isPending ? 'Subiendo...' : 'Cambiar foto'}
                </Button>
                {avatarError && <p className="mt-1.5 text-xs text-danger">{avatarError}</p>}
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium text-muted">Tu portafolio de trabajos</p>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePhotoPick}
              />
              <Button
                type="button"
                variant="secondary"
                disabled={uploadPhotoMutation.isPending}
                onClick={() => photoInputRef.current?.click()}
              >
                <Camera size={14} />
                {uploadPhotoMutation.isPending ? 'Subiendo...' : 'Agregar foto'}
              </Button>
            </div>
            {photoError && <p className="mt-1.5 text-xs text-danger">{photoError}</p>}
            {photos.length === 0 ? (
              <p className="mt-3 flex items-center gap-2 text-xs text-muted">
                <ImageIcon size={14} />
                Aún no has subido fotos de tus trabajos.
              </p>
            ) : (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {photos.map((p) => (
                  <div key={p._id} className="group relative aspect-square overflow-hidden rounded-lg bg-surface-2">
                    <img src={resolveAssetUrl(p.imageUrl)} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => deletePhotoMutation.mutate(p._id)}
                      aria-label="Eliminar foto"
                      className="absolute right-1 top-1 rounded-md bg-bg/80 p-1 text-muted backdrop-blur transition-opacity hover:text-danger sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}

function TeamPage() {
  const queryClient = useQueryClient()
  const { data: barbers = [], isLoading, isError } = useQuery({ queryKey: ['team'], queryFn: listTeam })

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingAvatarUrl, setEditingAvatarUrl] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [avatarError, setAvatarError] = useState('')
  const fileInputRef = useRef(null)

  const createMutation = useMutation({
    mutationFn: createBarber,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] })
      setModalOpen(false)
    },
    onError: (err) => setFormError(err.response?.data?.error || 'No pudimos crear el profesional.'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateBarber(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] })
      setModalOpen(false)
    },
    onError: (err) => setFormError(err.response?.data?.error || 'No pudimos guardar los cambios.'),
  })

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }) => updateBarber(id, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team'] }),
  })

  const avatarMutation = useMutation({
    mutationFn: ({ id, file }) => uploadBarberAvatar(id, file),
    onSuccess: (updatedBarber) => {
      setEditingAvatarUrl(updatedBarber.avatarUrl)
      setAvatarError('')
      queryClient.invalidateQueries({ queryKey: ['team'] })
    },
    onError: (err) => setAvatarError(err.response?.data?.error || 'No pudimos subir la foto.'),
  })

  const { data: portfolioPhotos = [] } = useQuery({
    queryKey: ['portfolio', 'barber', editingId],
    queryFn: () => listBarberPortfolio(editingId),
    enabled: Boolean(editingId),
  })

  const deletePhotoMutation = useMutation({
    mutationFn: deletePortfolioPhoto,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['portfolio', 'barber', editingId] }),
  })

  function openCreate() {
    setEditingId(null)
    setEditingAvatarUrl(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setAvatarError('')
    setModalOpen(true)
  }

  function openEdit(barber) {
    setEditingId(barber._id)
    setEditingAvatarUrl(barber.avatarUrl || null)
    setForm({
      name: barber.name,
      email: barber.email,
      phone: barber.phone || '',
      password: '',
      paymentScheme: barber.paymentScheme,
      commissionRate: barber.commissionRate ?? '',
      baseSalary: barber.baseSalary ?? '',
      schedule: barber.schedule || [],
    })
    setFormError('')
    setAvatarError('')
    setModalOpen(true)
  }

  function handleAvatarPick(e) {
    const file = e.target.files?.[0]
    if (file && editingId) {
      avatarMutation.mutate({ id: editingId, file })
    }
    e.target.value = ''
  }

  function toggleActive(id, active) {
    toggleActiveMutation.mutate({ id, active })
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  function handleSubmit(e) {
    e.preventDefault()
    setFormError('')

    if (editingId) {
      const payload = {
        name: form.name,
        phone: form.phone,
        paymentScheme: form.paymentScheme,
        commissionRate: form.commissionRate ? Number(form.commissionRate) : null,
        baseSalary: form.baseSalary ? Number(form.baseSalary) : null,
        schedule: form.schedule,
      }
      updateMutation.mutate({ id: editingId, payload })
    } else {
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone,
        paymentScheme: form.paymentScheme,
        commissionRate: form.commissionRate ? Number(form.commissionRate) : undefined,
        baseSalary: form.baseSalary ? Number(form.baseSalary) : undefined,
        schedule: form.schedule,
      }
      createMutation.mutate(payload)
    }
  }

  const showCommission = form.paymentScheme === 'commission' || form.paymentScheme === 'mixed'
  const showBaseSalary = form.paymentScheme === 'fixed' || form.paymentScheme === 'mixed'
  const saving = createMutation.isPending || updateMutation.isPending

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Equipo</h1>
          <p className="mt-1 text-sm text-muted">{barbers.length} profesionales registrados</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} />
          Nuevo profesional
        </Button>
      </div>

      <OwnerAvailabilityCard />

      <Card className="mt-6">
        {isLoading ? (
          <p className="py-4 text-sm text-muted">Cargando equipo…</p>
        ) : isError ? (
          <p className="py-4 text-sm text-danger">No pudimos cargar el equipo. Intenta recargar.</p>
        ) : barbers.length === 0 ? (
          <p className="py-4 text-sm text-muted">Aún no tienes profesionales registrados.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {barbers.map((b) => (
              <div key={b._id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                {b.avatarUrl ? (
                  <img
                    src={resolveAssetUrl(b.avatarUrl)}
                    alt={b.name}
                    className="h-10 w-10 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-medium text-ink">
                    {initials(b.name)}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{b.name}</p>
                  <p className="truncate text-xs text-muted">{b.email}</p>
                </div>

                <span className="hidden text-xs text-muted sm:block">{paymentSummary(b)}</span>

                <Switch checked={b.active} onChange={(v) => toggleActive(b._id, v)} />

                <button
                  type="button"
                  onClick={() => openEdit(b)}
                  aria-label="Editar profesional"
                  className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-ink"
                >
                  <Pencil size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Editar profesional' : 'Nuevo profesional'}
      >
        <form onSubmit={handleSubmit} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
          {editingId && (
            <div className="flex items-center gap-4">
              {editingAvatarUrl ? (
                <img
                  src={resolveAssetUrl(editingAvatarUrl)}
                  alt=""
                  className="h-16 w-16 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-surface-2 text-lg font-medium text-ink">
                  {initials(form.name || '?')}
                </div>
              )}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarPick}
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={avatarMutation.isPending}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera size={14} />
                  {avatarMutation.isPending ? 'Subiendo...' : 'Cambiar foto'}
                </Button>
                {avatarError && <p className="mt-1.5 text-xs text-danger">{avatarError}</p>}
              </div>
            </div>
          )}

          {editingId && (
            <div>
              <p className="mb-2 text-sm font-medium text-muted">Portafolio de trabajos</p>
              {portfolioPhotos.length === 0 ? (
                <p className="flex items-center gap-2 text-xs text-muted">
                  <ImageIcon size={14} />
                  Este profesional aún no ha subido fotos.
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {portfolioPhotos.map((p) => (
                    <div key={p._id} className="group relative aspect-square overflow-hidden rounded-lg bg-surface-2">
                      <img src={resolveAssetUrl(p.imageUrl)} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => deletePhotoMutation.mutate(p._id)}
                        aria-label="Eliminar foto"
                        className="absolute right-1 top-1 rounded-md bg-bg/80 p-1 text-muted backdrop-blur transition-opacity hover:text-danger sm:opacity-0 sm:group-hover:opacity-100"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <Input id="name" name="name" label="Nombre" placeholder="Nombre completo" value={form.name} onChange={handleChange} required />
          <Input
            id="email"
            name="email"
            type="email"
            label="Correo"
            placeholder="correo@ejemplo.com"
            value={form.email}
            onChange={handleChange}
            readOnly={Boolean(editingId)}
            required
          />
          <Input id="phone" name="phone" label="Teléfono" placeholder="300 123 4567" value={form.phone} onChange={handleChange} />
          {!editingId && (
            <Input id="password" name="password" type="password" label="Contraseña temporal" placeholder="••••••••" value={form.password} onChange={handleChange} required />
          )}

          <Select id="paymentScheme" name="paymentScheme" label="Esquema de pago" value={form.paymentScheme} onChange={handleChange}>
            {PAYMENT_SCHEMES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-3">
            {showCommission && (
              <Input id="commissionRate" name="commissionRate" type="number" min="0" max="100" label="Comisión (%)" placeholder="50" value={form.commissionRate} onChange={handleChange} required />
            )}
            {showBaseSalary && (
              <Input id="baseSalary" name="baseSalary" type="number" min="0" label="Salario base (COP)" placeholder="500000" value={form.baseSalary} onChange={handleChange} required />
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-muted">Horario semanal</p>
            <WeeklyScheduleEditor value={form.schedule} onChange={(schedule) => setForm({ ...form, schedule })} />
          </div>

          {formError && (
            <p className="rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">{formError}</p>
          )}

          <Button type="submit" disabled={saving} className="mt-2 w-full">
            {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Agregar profesional'}
          </Button>
        </form>
      </Modal>
    </div>
  )
}

export default TeamPage
