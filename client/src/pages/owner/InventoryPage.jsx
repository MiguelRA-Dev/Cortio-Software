import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, ArrowUpDown, Package, AlertTriangle } from 'lucide-react'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Switch from '../../components/ui/Switch'
import { formatCOP } from '../../lib/format'
import { listProducts, createProduct, updateProduct, createMovement } from '../../api/products'

const EMPTY_PRODUCT_FORM = { name: '', sku: '', unitCost: '', salePrice: '', lowStockThreshold: '', stockQuantity: '' }
const EMPTY_MOVEMENT_FORM = { type: 'in', quantity: '', reason: '' }

function InventoryPage() {
  const queryClient = useQueryClient()
  const { data: products = [], isLoading, isError } = useQuery({ queryKey: ['products'], queryFn: listProducts })

  const [productModalOpen, setProductModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT_FORM)
  const [productError, setProductError] = useState('')

  const [movementModalOpen, setMovementModalOpen] = useState(false)
  const [movementTarget, setMovementTarget] = useState(null)
  const [movementForm, setMovementForm] = useState(EMPTY_MOVEMENT_FORM)
  const [movementError, setMovementError] = useState('')

  const lowStockCount = useMemo(
    () => products.filter((p) => p.active && p.stockQuantity <= p.lowStockThreshold).length,
    [products]
  )

  const createProductMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setProductModalOpen(false)
    },
    onError: (err) => setProductError(err.response?.data?.error || 'No pudimos crear el producto.'),
  })

  const updateProductMutation = useMutation({
    mutationFn: ({ id, payload }) => updateProduct(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setProductModalOpen(false)
    },
    onError: (err) => setProductError(err.response?.data?.error || 'No pudimos guardar los cambios.'),
  })

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }) => updateProduct(id, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  })

  const movementMutation = useMutation({
    mutationFn: ({ id, payload }) => createMovement(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setMovementModalOpen(false)
    },
    onError: (err) => setMovementError(err.response?.data?.error || 'No pudimos registrar el movimiento.'),
  })

  function openCreate() {
    setEditingId(null)
    setProductForm(EMPTY_PRODUCT_FORM)
    setProductError('')
    setProductModalOpen(true)
  }

  function openEdit(product) {
    setEditingId(product._id)
    setProductForm({
      name: product.name,
      sku: product.sku || '',
      unitCost: product.unitCost,
      salePrice: product.salePrice,
      lowStockThreshold: product.lowStockThreshold,
      stockQuantity: product.stockQuantity,
    })
    setProductError('')
    setProductModalOpen(true)
  }

  function toggleActive(id, active) {
    toggleActiveMutation.mutate({ id, active })
  }

  function handleProductChange(e) {
    setProductForm({ ...productForm, [e.target.name]: e.target.value })
  }

  function handleProductSubmit(e) {
    e.preventDefault()
    setProductError('')
    const payload = {
      name: productForm.name,
      sku: productForm.sku,
      unitCost: Number(productForm.unitCost) || 0,
      salePrice: Number(productForm.salePrice) || 0,
      lowStockThreshold: Number(productForm.lowStockThreshold) || 0,
    }

    if (editingId) {
      updateProductMutation.mutate({ id: editingId, payload })
    } else {
      createProductMutation.mutate({ ...payload, stockQuantity: Number(productForm.stockQuantity) || 0 })
    }
  }

  function openMovement(product) {
    setMovementTarget(product)
    setMovementForm(EMPTY_MOVEMENT_FORM)
    setMovementError('')
    setMovementModalOpen(true)
  }

  function handleMovementChange(e) {
    setMovementForm({ ...movementForm, [e.target.name]: e.target.value })
  }

  function handleMovementSubmit(e) {
    e.preventDefault()
    setMovementError('')
    const quantity = Number(movementForm.quantity)
    if (!quantity || quantity < 1) {
      setMovementError('La cantidad debe ser mayor a 0')
      return
    }
    movementMutation.mutate({
      id: movementTarget._id,
      payload: { type: movementForm.type, quantity, reason: movementForm.reason },
    })
  }

  const savingProduct = createProductMutation.isPending || updateProductMutation.isPending

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Inventario</h1>
          <p className="mt-1 text-sm text-muted">{products.length} productos registrados</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} />
          Nuevo producto
        </Button>
      </div>

      {lowStockCount > 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          <AlertTriangle size={16} />
          {lowStockCount} {lowStockCount === 1 ? 'producto está' : 'productos están'} por debajo del stock mínimo.
        </div>
      )}

      <Card className="mt-6">
        {isLoading ? (
          <p className="py-4 text-sm text-muted">Cargando inventario…</p>
        ) : isError ? (
          <p className="py-4 text-sm text-danger">No pudimos cargar el inventario. Intenta recargar.</p>
        ) : products.length === 0 ? (
          <p className="py-4 text-sm text-muted">Aún no tienes productos registrados.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {products.map((p) => {
              const isLow = p.stockQuantity <= p.lowStockThreshold
              return (
                <div key={p._id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted">
                    <Package size={16} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{p.name}</p>
                    <p className="truncate text-xs text-muted">{p.sku}</p>
                  </div>

                  <div className="hidden text-right sm:block">
                    <p className={`text-sm font-medium tabular-nums ${isLow ? 'text-danger' : 'text-ink'}`}>
                      {p.stockQuantity} en stock
                    </p>
                    <p className="text-xs text-muted">{formatCOP(p.salePrice)}</p>
                  </div>

                  <Switch checked={p.active} onChange={(v) => toggleActive(p._id, v)} />

                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => openMovement(p)}
                      aria-label="Registrar movimiento"
                      className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-ink"
                    >
                      <ArrowUpDown size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(p)}
                      aria-label="Editar producto"
                      className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-ink"
                    >
                      <Pencil size={15} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Modal
        open={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        title={editingId ? 'Editar producto' : 'Nuevo producto'}
      >
        <form onSubmit={handleProductSubmit} className="flex flex-col gap-4">
          <Input id="name" name="name" label="Nombre" placeholder="Cera para cabello" value={productForm.name} onChange={handleProductChange} required />
          <Input id="sku" name="sku" label="SKU" placeholder="CERA-01" value={productForm.sku} onChange={handleProductChange} />
          <div className="grid grid-cols-2 gap-3">
            <Input id="unitCost" name="unitCost" type="number" min="0" label="Costo unitario" placeholder="8000" value={productForm.unitCost} onChange={handleProductChange} />
            <Input id="salePrice" name="salePrice" type="number" min="0" label="Precio de venta" placeholder="15000" value={productForm.salePrice} onChange={handleProductChange} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input id="lowStockThreshold" name="lowStockThreshold" type="number" min="0" label="Stock mínimo" placeholder="5" value={productForm.lowStockThreshold} onChange={handleProductChange} />
            {!editingId && (
              <Input id="stockQuantity" name="stockQuantity" type="number" min="0" label="Stock inicial" placeholder="0" value={productForm.stockQuantity} onChange={handleProductChange} />
            )}
          </div>
          {editingId && (
            <p className="text-xs text-muted">
              El stock se ajusta con movimientos de entrada/salida, no editando el producto directamente.
            </p>
          )}
          {productError && (
            <p className="rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">{productError}</p>
          )}
          <Button type="submit" disabled={savingProduct} className="mt-2 w-full">
            {savingProduct ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear producto'}
          </Button>
        </form>
      </Modal>

      <Modal
        open={movementModalOpen}
        onClose={() => setMovementModalOpen(false)}
        title={movementTarget ? `Movimiento — ${movementTarget.name}` : 'Movimiento'}
      >
        {movementTarget && (
          <form onSubmit={handleMovementSubmit} className="flex flex-col gap-4">
            <p className="text-sm text-muted">
              Stock actual: <span className="font-medium text-ink">{movementTarget.stockQuantity}</span>
            </p>
            <Select id="movementType" name="type" label="Tipo" value={movementForm.type} onChange={handleMovementChange}>
              <option value="in">Entrada</option>
              <option value="out">Salida</option>
            </Select>
            <Input id="quantity" name="quantity" type="number" min="1" label="Cantidad" placeholder="1" value={movementForm.quantity} onChange={handleMovementChange} required />
            <Input id="reason" name="reason" label="Motivo" placeholder="Compra a proveedor, ajuste, etc." value={movementForm.reason} onChange={handleMovementChange} />
            {movementError && (
              <p className="rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
                {movementError}
              </p>
            )}
            <Button type="submit" disabled={movementMutation.isPending} className="mt-2 w-full">
              {movementMutation.isPending ? 'Guardando...' : 'Registrar movimiento'}
            </Button>
          </form>
        )}
      </Modal>
    </div>
  )
}

export default InventoryPage
