import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Camera, Trash2, Image as ImageIcon, UserRound } from 'lucide-react'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Switch from '../../components/ui/Switch'
import { resolveAssetUrl } from '../../lib/assets'
import { useAuth } from '../../context/AuthContext'
import { uploadBarberAvatar } from '../../api/barbers'
import { listServices } from '../../api/services'
import { listMyPortfolio, createPortfolioPhoto, deletePortfolioPhoto } from '../../api/portfolio'
import { updateMe } from '../../api/auth'

const EMPTY_UPLOAD_FORM = { serviceId: '', description: '' }

function BarberProfilePage() {
  const { user, updateUser } = useAuth()
  const queryClient = useQueryClient()
  const fileInputRef = useRef(null)
  const avatarInputRef = useRef(null)
  const [avatarError, setAvatarError] = useState('')

  const [pendingFile, setPendingFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [uploadForm, setUploadForm] = useState(EMPTY_UPLOAD_FORM)
  const [uploadError, setUploadError] = useState('')

  const { data: photos = [], isLoading } = useQuery({ queryKey: ['portfolio', 'mine'], queryFn: listMyPortfolio })
  const { data: services = [] } = useQuery({ queryKey: ['services'], queryFn: listServices })

  const avatarMutation = useMutation({
    mutationFn: (file) => uploadBarberAvatar(user._id, file),
    onSuccess: (updatedBarber) => {
      setAvatarError('')
      updateUser({ ...user, avatarUrl: updatedBarber.avatarUrl })
    },
    onError: (err) => setAvatarError(err.response?.data?.error || 'No pudimos subir la foto.'),
  })

  const notificationsMutation = useMutation({
    mutationFn: (whatsappNotificationsEnabled) => updateMe({ whatsappNotificationsEnabled }),
    onSuccess: (updatedUser) => updateUser(updatedUser),
  })

  function handleAvatarPick(e) {
    const file = e.target.files?.[0]
    if (file) avatarMutation.mutate(file)
    e.target.value = ''
  }

  const uploadMutation = useMutation({
    mutationFn: createPortfolioPhoto,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio', 'mine'] })
      closeUploadModal()
    },
    onError: (err) => setUploadError(err.response?.data?.error || 'No pudimos subir la foto.'),
  })

  const deleteMutation = useMutation({
    mutationFn: deletePortfolioPhoto,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['portfolio', 'mine'] }),
  })

  function handlePick(e) {
    const file = e.target.files?.[0]
    if (file) {
      setPendingFile(file)
      setPreviewUrl(URL.createObjectURL(file))
      setUploadForm(EMPTY_UPLOAD_FORM)
      setUploadError('')
    }
    e.target.value = ''
  }

  function closeUploadModal() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPendingFile(null)
    setPreviewUrl('')
    setUploadForm(EMPTY_UPLOAD_FORM)
    setUploadError('')
  }

  function handleUploadSubmit(e) {
    e.preventDefault()
    setUploadError('')
    uploadMutation.mutate({
      file: pendingFile,
      serviceId: uploadForm.serviceId || undefined,
      description: uploadForm.description,
    })
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Mi perfil</h1>
          <p className="mt-1 text-sm text-muted">Tu foto y tus mejores trabajos, visibles para los clientes que agendan contigo</p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handlePick}
        />
        <Button onClick={() => fileInputRef.current?.click()}>
          <Camera size={16} />
          Agregar foto de trabajo
        </Button>
      </div>

      <Card className="mt-6">
        <h3 className="text-sm font-medium text-muted">Foto de perfil</h3>
        <div className="mt-4 flex items-center gap-4">
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
      </Card>

      <Card className="mt-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-medium text-ink">Notificaciones de WhatsApp</h3>
            <p className="mt-1 text-xs text-muted">
              Recibe un mensaje cuando te agendan, cancelan o reprograman una cita, y un recordatorio antes de la hora.
            </p>
          </div>
          <Switch
            checked={user.whatsappNotificationsEnabled !== false}
            onChange={(v) => notificationsMutation.mutate(v)}
          />
        </div>
      </Card>

      <Card className="mt-6">
        <h3 className="text-sm font-medium text-muted">Portafolio de trabajos</h3>
        <div className="mt-4">
          {isLoading ? (
            <p className="py-4 text-sm text-muted">Cargando portafolio…</p>
          ) : photos.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <ImageIcon size={24} className="text-muted" />
              <p className="text-sm text-muted">Aún no has subido fotos de tus trabajos.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {photos.map((p) => (
                <div key={p._id} className="group relative aspect-square overflow-hidden rounded-lg bg-surface-2">
                  <img src={resolveAssetUrl(p.imageUrl)} alt={p.description || ''} className="h-full w-full object-cover" />
                  {(p.service?.name || p.description) && (
                    <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent p-2 pt-6">
                      {p.service?.name && <p className="truncate text-xs font-medium text-white">{p.service.name}</p>}
                      {p.description && <p className="truncate text-[11px] text-white/80">{p.description}</p>}
                    </div>
                  )}
                  {/* Always visible on touch devices (no hover state) — only fades in on hover once there's room to spare on desktop. */}
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(p._id)}
                    aria-label="Eliminar foto"
                    className="absolute right-2 top-2 rounded-md bg-bg/80 p-1.5 text-muted backdrop-blur transition-opacity hover:text-danger sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Modal open={Boolean(pendingFile)} onClose={closeUploadModal} title="Nueva foto de trabajo">
        <form onSubmit={handleUploadSubmit} className="flex flex-col gap-4">
          {previewUrl && (
            <img src={previewUrl} alt="" className="aspect-square w-full rounded-lg object-cover" />
          )}

          <Select
            id="serviceId"
            label="Corte / servicio (opcional)"
            value={uploadForm.serviceId}
            onChange={(e) => setUploadForm({ ...uploadForm, serviceId: e.target.value })}
          >
            <option value="">Sin especificar</option>
            {services.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </Select>

          <Input
            id="photoDescription"
            label="Descripción (opcional)"
            placeholder="Ej. Degradado bajo con diseño"
            value={uploadForm.description}
            onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
          />

          {uploadError && (
            <p className="rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">{uploadError}</p>
          )}

          <Button type="submit" disabled={uploadMutation.isPending} className="w-full">
            {uploadMutation.isPending ? 'Subiendo...' : 'Publicar foto'}
          </Button>
        </form>
      </Modal>
    </div>
  )
}

export default BarberProfilePage
