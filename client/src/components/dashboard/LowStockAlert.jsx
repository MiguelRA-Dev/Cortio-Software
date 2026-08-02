import { useQuery } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import Card from '../ui/Card'
import { listLowStock } from '../../api/products'

function LowStockAlert() {
  const { data: products = [] } = useQuery({ queryKey: ['products', 'low-stock'], queryFn: listLowStock })

  return (
    <Card>
      <div className="flex items-center gap-2">
        <AlertTriangle size={16} className="text-muted" />
        <h3 className="text-sm font-medium text-muted">Inventario bajo</h3>
      </div>

      {products.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Todo el inventario está en buen nivel.</p>
      ) : (
        <div className="mt-4 flex flex-col divide-y divide-border">
          {products.map((p) => (
            <div key={p._id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <span className="text-sm text-ink">{p.name}</span>
              <span className="text-xs font-medium tabular-nums text-danger">
                {p.stockQuantity} / {p.lowStockThreshold} min.
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

export default LowStockAlert
