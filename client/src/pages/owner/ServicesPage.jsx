import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Scissors } from 'lucide-react'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import Textarea from '../../components/ui/Textarea'
import Switch from '../../components/ui/Switch'
import { formatCOP } from '../../lib/format'
import { listServices, createService, updateService } from '../../api/services'

const EMPTY_FORM = { name: '', category: '', description: '', durationMinutes: '', price: '' }

function ServicesPage() {
  const queryClient = useQueryClient()
  const { data: services = [], isLoading, isError } = useQuery({ queryKey: ['services'], queryFn: listServices })

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')

  const createMutation = useMutation({
    mutationFn: createService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
      setModalOpen(false)
    },
    onError: (err) => setFormError(err.response?.data?.error || 'No pudimos crear el servicio.'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateService(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
      setModalOpen(false)
    },
    onError: (err) => setFormError(err.response?.data?.error || 'No pudimos guardar los cambios.'),
  })

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }) => updateService(id, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services'] }),
  })

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setModalOpen(true)
  }

  function openEdit(service) {
    setEditingId(service._id)
    setForm({
      name: service.name,
      category: service.category || '',
      description: service.description || '',
      durationMinutes: service.durationMinutes,
      price: service.price,
    })
    setFormError('')
    setModalOpen(true)
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
    const payload = {
      name: form.name,
      category: form.category,
      description: form.description,
      durationMinutes: Number(form.durationMinutes),
      price: Number(form.price),
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Servicios</h1>
          <p className="mt-1 text-sm text-muted">{services.length} servicios registrados</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} />
          Nuevo servicio
        </Button>
      </div>

      <Card className="mt-6">
        {isLoading ? (
          <p className="py-4 text-sm text-muted">Cargando servicios…</p>
        ) : isError ? (
          <p className="py-4 text-sm text-danger">No pudimos cargar los servicios. Intenta recargar.</p>
        ) : services.length === 0 ? (
          <p className="py-4 text-sm text-muted">Aún no tienes servicios registrados.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {services.map((s) => (
              <div key={s._id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted">
                  <Scissors size={16} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{s.name}</p>
                  <p className="truncate text-xs text-muted">
                    {s.category} · {s.durationMinutes} min
                  </p>
                </div>

                <span className="hidden text-sm font-medium tabular-nums text-ink sm:block">
                  {formatCOP(s.price)}
                </span>

                <Switch checked={s.active} onChange={(v) => toggleActive(s._id, v)} />

                <button
                  type="button"
                  onClick={() => openEdit(s)}
                  aria-label="Editar servicio"
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
        title={editingId ? 'Editar servicio' : 'Nuevo servicio'}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            id="name"
            name="name"
            label="Nombre"
            placeholder="Corte clásico"
            value={form.name}
            onChange={handleChange}
            required
          />
          <Input
            id="category"
            name="category"
            label="Categoría"
            placeholder="Corte, Barba, Combo..."
            value={form.category}
            onChange={handleChange}
          />
          <Textarea
            id="description"
            name="description"
            label="Descripción"
            placeholder="Breve descripción del servicio"
            value={form.description}
            onChange={handleChange}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="durationMinutes"
              name="durationMinutes"
              type="number"
              min="5"
              step="5"
              label="Duración (min)"
              placeholder="30"
              value={form.durationMinutes}
              onChange={handleChange}
              required
            />
            <Input
              id="price"
              name="price"
              type="number"
              min="0"
              label="Precio (COP)"
              placeholder="25000"
              value={form.price}
              onChange={handleChange}
              required
            />
          </div>

          {formError && (
            <p className="rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">{formError}</p>
          )}

          <Button type="submit" disabled={saving} className="mt-2 w-full">
            {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear servicio'}
          </Button>
        </form>
      </Modal>
    </div>
  )
}

export default ServicesPage
