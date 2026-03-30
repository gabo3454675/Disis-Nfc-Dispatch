import { Card } from '@/components/ui/card'
import { BarChart3, TrendingUp, Clock } from 'lucide-react'

interface RecentDispatch {
  id: string
  customer: string
  items: number
  timestamp: string
}

interface AdminPanelProps {
  stock: {
    total: number
    today: number
    critical: number
  }
  recentDispatches: RecentDispatch[]
}

export default function AdminPanel({ stock, recentDispatches }: AdminPanelProps) {
  return (
    <div className="space-y-4 w-full max-w-sm">
      {/* Stock Summary */}
      <Card className="bg-card border border-border p-4">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-bold text-foreground">Stock Local</h3>
          <BarChart3 className="w-5 h-5 text-accent" />
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase">Total</p>
            <p className="text-3xl font-bold text-foreground">{stock.total}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase">Hoy</p>
              <p className="text-xl font-bold text-accent">{stock.today}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Crítico</p>
              <p className="text-xl font-bold text-destructive">{stock.critical}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Recent Dispatches */}
      <Card className="bg-card border border-border p-4">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-bold text-foreground">Últimos Despachos</h3>
          <TrendingUp className="w-5 h-5 text-accent" />
        </div>
        <div className="space-y-3 max-h-48 overflow-auto">
          {recentDispatches.length > 0 ? (
            recentDispatches.map((dispatch) => (
              <div
                key={dispatch.id}
                className="border-b border-border pb-3 last:border-0"
              >
                <p className="text-sm font-medium text-foreground">
                  {dispatch.customer}
                </p>
                <p className="text-xs text-muted-foreground">
                  {dispatch.items} item(s)
                </p>
                <p className="text-xs text-accent flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3" />
                  {dispatch.timestamp}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Sin despachos aún
            </p>
          )}
        </div>
      </Card>
    </div>
  )
}
