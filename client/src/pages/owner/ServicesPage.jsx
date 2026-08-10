import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil } from 'lucide-react'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Textarea from '../../components/ui/Textarea'
import Switch from '../../components/ui/Switch'
import { formatCOP } from '../../lib/format'
import { listServices, createService, updateService } from '../../api/services'

const NEW_CATEGORY_VALUE = '__new__'
const EMPTY_FORM = { name: '', category: '', description: '', durationMinutes: '', price: '' }

// Aim for ~2 rows instead of a fixed column count — 8 items become 4 columns, 6 become
// 3, so a grid stays roughly square instead of one long column or a lopsided last row.
// `max` caps it — categories get up to 4 (the outer grid), services inside a category
// card get up to 2 (that card is already narrower once categories share the row).
function gridColumnsFor(count, max = 4) {
  if (count <= 1) return 1
  return Math.min(max, Math.max(2, Math.ceil(count / 2)))
}

// Column caps by viewport — on a phone, 4 category columns would squeeze each card
// (and the service tiles inside it) into a sliver. Narrower screens get fewer columns
// for both the category grid and the service grid inside each category card.
const COLUMN_BREAKPOINTS = [
  { minWidth: 1024, outer: 4, inner: 2 },
  { minWidth: 768, outer: 3, inner: 2 },
  { minWidth: 480, outer: 2, inner: 2 },
  { minWidth: 0, outer: 1, inner: 2 },
]

function getColumnCaps() {
  if (typeof window === 'undefined') return { outer: 4, inner: 2 }
  const width = window.innerWidth
  return COLUMN_BREAKPOINTS.find((bp) => width >= bp.minWidth) ?? COLUMN_BREAKPOINTS.at(-1)
}

function useColumnCaps() {
  const [caps, setCaps] = useState(getColumnCaps)
  useEffect(() => {
    function handleResize() {
      setCaps(getColumnCaps())
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  return caps
}

function ServicesPage() {
  const queryClient = useQueryClient()
  const { data: services = [], isLoading, isError } = useQuery({ queryKey: ['services'], queryFn: listServices })
  const { outer: outerMax, inner: innerMax } = useColumnCaps()

  const servicesByCategory = useMemo(() => {
    const groups = new Map()
    for (const s of services) {
      const category = s.category?.trim() || 'Sin categoría'
      if (!groups.has(category)) groups.set(category, [])
      groups.get(category).push(s)
    }
    return Array.from(groups.entries())
  }, [services])

  // Existing categories to pick from, so a typo doesn't quietly create "Cortes" and
  // "cortes" as two different groups — "+ Nueva categoría" is the only way to add one.
  const existingCategories = useMemo(() => {
    const set = new Set(services.map((s) => s.category?.trim()).filter(Boolean))
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'))
  }, [services])

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [newCategoryInput, setNewCategoryInput] = useState('')
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
    setNewCategoryInput('')
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
    setNewCategoryInput('')
    setFormError('')
    setModalOpen(true)
  }

  function handleCategorySelectChange(e) {
    setForm({ ...form, category: e.target.value })
    if (e.target.value !== NEW_CATEGORY_VALUE) setNewCategoryInput('')
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
    const category = form.category === NEW_CATEGORY_VALUE ? newCategoryInput.trim() : form.category
    const payload = {
      name: form.name,
      category,
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

      {isLoading ? (
        <Card className="mt-6">
          <p className="py-4 text-sm text-muted">Cargando servicios…</p>
        </Card>
      ) : isError ? (
        <Card className="mt-6">
          <p className="py-4 text-sm text-danger">No pudimos cargar los servicios. Intenta recargar.</p>
        </Card>
      ) : services.length === 0 ? (
        <Card className="mt-6">
          <p className="py-4 text-sm text-muted">Aún no tienes servicios registrados.</p>
        </Card>
      ) : (
        <div
          className="mt-6 grid gap-4"
          style={{ gridTemplateColumns: `repeat(${gridColumnsFor(servicesByCategory.length, outerMax)}, minmax(0, 1fr))` }}
        >
          {servicesByCategory.map(([category, categoryServices]) => (
            <Card key={category}>
              <div className="flex items-baseline gap-1.5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{category}</h3>
                <span className="text-xs text-muted">· {categoryServices.length}</span>
              </div>
              <div
                className="mt-2 grid gap-1.5"
                style={{ gridTemplateColumns: `repeat(${gridColumnsFor(categoryServices.length, innerMax)}, minmax(0, 1fr))` }}
              >
                {categoryServices.map((s) => (
                  <div key={s._id} className="rounded-lg border border-border bg-surface-2 p-2.5">
                    <div className="flex items-start justify-between gap-1.5">
                      <p className="min-w-0 truncate text-xs font-medium leading-tight text-ink">{s.name}</p>
                      <button
                        type="button"
                        onClick={() => openEdit(s)}
                        aria-label="Editar servicio"
                        className="shrink-0 text-muted hover:text-ink"
                      >
                        <Pencil size={12} />
                      </button>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted">{s.durationMinutes} min</p>
                    <div className="mt-1.5 flex items-center justify-between gap-1.5">
                      <span className="truncate text-xs font-medium tabular-nums text-ink">{formatCOP(s.price)}</span>
                      <Switch checked={s.active} onChange={(v) => toggleActive(s._id, v)} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

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
          <Select id="category" name="category" label="Categoría" value={form.category} onChange={handleCategorySelectChange}>
            <option value="">Sin categoría</option>
            {existingCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            <option value={NEW_CATEGORY_VALUE}>+ Nueva categoría...</option>
          </Select>
          {form.category === NEW_CATEGORY_VALUE && (
            <Input
              id="newCategory"
              label="Nombre de la nueva categoría"
              placeholder="Cortes"
              value={newCategoryInput}
              onChange={(e) => setNewCategoryInput(e.target.value)}
              required
            />
          )}
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
