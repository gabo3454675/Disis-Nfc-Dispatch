import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Plus, Minus, ArrowLeft, Check } from 'lucide-react'
import { enqueueDispatch, getPendingDispatchCount } from '@/lib/offline-dispatch-queue'

interface Product {
  id: string
  name: string
  sku: string
  quantity: number
  available: number
}

interface DispatchDetailProps {
  customerData: {
    nfcUid: string
    name: string
    balance: number
    consumedAmount: number
    prepaidAmount: number
    items: Array<{
      id: string
      sku: string
      productName: string
      unitPrice: number
      totalQuantity: number
      servedQuantity: number
      remainingQuantity: number
    }>
  }
  onReset: () => void
}

export default function DispatchDetail({
  customerData,
  onReset,
}: DispatchDetailProps) {
  const [products, setProducts] = useState<Product[]>(
    customerData.items.map((item) => ({
      id: item.id,
      name: item.productName,
      sku: item.sku,
      quantity: 0,
      available: item.remainingQuantity,
    })),
  )
  const [isConfirming, setIsConfirming] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const apiBaseUrl = process.env.NEXT_PUBLIC_DISPATCH_API_URL || 'http://localhost:3001'
  const internalApiKey = process.env.NEXT_PUBLIC_INTERNAL_API_KEY || ''

  const updateQuantity = (id: string, change: number) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const newQty = Math.max(0, Math.min(p.quantity + change, p.available))
          return { ...p, quantity: newQty }
        }
        return p
      })
    )
  }

  const totalItems = products.reduce((sum, p) => sum + p.quantity, 0)
  const hasItems = totalItems > 0
  const estimatedCurrentOrder = useMemo(
    () =>
      products.reduce((acc, p) => {
        const source = customerData.items.find((i) => i.id === p.id)
        return acc + p.quantity * Number(source?.unitPrice || 0)
      }, 0),
    [customerData.items, products],
  )

  const handleConfirm = async () => {
    try {
      setIsConfirming(true)
      setErrorMsg('')
      setSuccessMsg('')
      const selected = products.filter((p) => p.quantity > 0)

      for (const product of selected) {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (internalApiKey) {
          headers['x-internal-api-key'] = internalApiKey
        }

        const response = await fetch(`${apiBaseUrl}/api/v1/dispatch`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            nfcUid: customerData.nfcUid,
            sku: product.sku,
            pointId: 'POINT_04',
            quantity: product.quantity,
          }),
        })

        if (!response.ok) {
          throw new Error(`HTTP_${response.status}`)
        }
      }

      setIsCompleted(true)
      setTimeout(() => {
        onReset()
      }, 2000)
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      const isBusinessError = message.includes('HTTP_400') || message.includes('HTTP_401') || message.includes('HTTP_404') || message.includes('HTTP_409')

      if (isBusinessError) {
        setErrorMsg('Despacho rechazado. Revisa saldo o seguridad del endpoint.')
        setIsConfirming(false)
        return
      }

      // Offline-first: si falla red/infra, guardamos en cola local y seguimos el flujo.
      const selected = products.filter((p) => p.quantity > 0)
      for (const product of selected) {
        if (product.quantity > 0) {
          enqueueDispatch({
            nfcUid: customerData.nfcUid,
            sku: product.sku,
            pointId: 'POINT_04',
            quantity: product.quantity,
          })
        }
      }

      setSuccessMsg(
        `Sin conexion. Despacho guardado en cola (${getPendingDispatchCount()} pendiente/s). Se reintentara cada 10s.`,
      )
      setIsCompleted(true)
      setTimeout(() => {
        onReset()
      }, 2000)
      setIsConfirming(false)
    }
  }

  if (isCompleted) {
    return (
      <div className="flex flex-col h-screen bg-background items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-20 right-20 w-72 h-72 bg-accent rounded-full mix-blend-screen blur-3xl" />
        </div>
        <Card className="bg-gradient-to-br from-green-500/20 to-emerald-600/10 border-2 border-green-500/60 p-12 text-center max-w-md relative shadow-2xl shadow-green-500/20 rounded-3xl">
          <div className="flex justify-center mb-8 animate-slide-up">
            <div className="relative">
              <div className="absolute inset-0 bg-green-400/30 rounded-full blur-2xl" />
              <Check className="w-28 h-28 text-green-400 relative" />
            </div>
          </div>
          <h2 className="text-4xl font-bold text-green-400 mb-3 tracking-tight">
            ¡Entrega Completada!
          </h2>
          <p className="text-foreground text-lg mb-4">
            {totalItems} producto{totalItems !== 1 ? 's' : ''} entregado{totalItems !== 1 ? 's' : ''} a
            <br className="hidden sm:block" />
            <span className="text-accent font-bold">{customerData.name}</span>
          </p>
          <p className="text-muted-foreground text-sm">Redirigiendo en 2 segundos...</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {isConfirming && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center">
          <Card className="p-8 text-center">
            <p className="text-xl font-bold">Procesando despacho...</p>
            <p className="text-muted-foreground mt-2">No cierres ni toques la pantalla</p>
          </Card>
        </div>
      )}
      {/* Header */}
      <header className="glass-effect border-b border-border px-6 py-6 shadow-2xl relative">
        <div className="absolute inset-0 bg-gradient-to-r from-accent/5 to-transparent opacity-50 pointer-events-none" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              onClick={onReset}
              variant="ghost"
              className="text-accent hover:bg-accent/20 hover:text-accent rounded-xl w-12 h-12 p-0 transition-all"
              size="lg"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight">Despacho de Productos</h1>
              <p className="text-muted-foreground text-sm mt-1">Cliente: <span className="text-accent font-semibold">{customerData.name}</span></p>
            </div>
          </div>
          <div className="text-right bg-black/20 rounded-xl px-5 py-3 backdrop-blur-sm border border-accent/20">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Saldo</p>
            <p className="text-2xl font-bold text-accent mt-1">${customerData.balance.toFixed(2)}</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto px-6 py-8 relative">
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none">
          <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(rgba(0, 255, 136, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 136, 0.1) 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }} />
        </div>
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-2 tracking-tight">
              Productos Disponibles
            </h2>
            <p className="text-muted-foreground">Selecciona las cantidades a despachar</p>
          </div>

          <div className="grid gap-4">
            {products.map((product) => (
              <Card
                key={product.id}
                className="card-gradient border border-accent/20 p-6 flex items-center justify-between hover:border-accent/50 hover:shadow-lg hover:shadow-accent/10 transition-all duration-300 rounded-2xl group"
              >
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-foreground mb-2 group-hover:text-accent transition-colors">
                    {product.name}
                  </h3>
                  <div className="flex items-center gap-3">
                    <span className="inline-block w-2 h-2 rounded-full bg-accent" />
                    <p className="text-accent font-semibold">
                      {product.available} unidade{product.available !== 1 ? 's' : ''} disponible{product.available !== 1 ? 's' : ''}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      $
                      {Number(customerData.items.find((i) => i.id === product.id)?.unitPrice || 0).toFixed(2)}
                      {' '}c/u
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <Button
                    onClick={() => updateQuantity(product.id, -1)}
                    disabled={product.quantity === 0}
                    className="bg-gradient-to-br from-red-500 to-rose-600 hover:shadow-lg hover:shadow-red-500/40 text-white rounded-xl w-16 h-16 p-0 font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
                  >
                    <Minus className="w-7 h-7" />
                  </Button>

                  <div className="text-center min-w-24 bg-black/20 rounded-xl px-4 py-3 border border-accent/20">
                    <p className="text-4xl font-black text-accent">
                      {product.quantity}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2 uppercase tracking-wider">Despacho</p>
                  </div>

                  <Button
                    onClick={() => updateQuantity(product.id, 1)}
                    disabled={product.quantity >= product.available}
                    className="button-gradient text-black rounded-xl w-16 h-16 p-0 font-black hover:shadow-lg hover:shadow-accent/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
                  >
                    <Plus className="w-7 h-7" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>

      {/* Footer with Confirm Button */}
      <footer className="glass-effect border-t border-border/50 px-6 py-8 backdrop-blur-md">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 gap-4 mb-8">
            <Card className="bg-gradient-to-br from-accent/10 to-transparent border border-accent/30 p-5 rounded-2xl hover:border-accent/60 transition-all">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Total Productos</p>
              <p className="text-4xl font-black text-accent mt-2">{totalItems}</p>
            </Card>
            <Card className={`
              p-5 rounded-2xl transition-all border-2
              ${hasItems 
                ? 'bg-gradient-to-br from-green-500/10 to-transparent border-green-500/60' 
                : 'bg-gradient-to-br from-muted/10 to-transparent border-muted/30'
              }
            `}>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Estado</p>
              <p className={`text-lg font-black mt-2 ${hasItems ? 'text-green-400' : 'text-muted-foreground'}`}>
                {hasItems ? '✓ Listo para enviar' : '⊘ Selecciona productos'}
              </p>
            </Card>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="p-4 rounded-2xl border border-border/40">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Prepagado</p>
              <p className="text-2xl font-bold mt-2">${customerData.prepaidAmount.toFixed(2)}</p>
            </Card>
            <Card className="p-4 rounded-2xl border border-border/40">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Consumido</p>
              <p className="text-2xl font-bold mt-2">${customerData.consumedAmount.toFixed(2)}</p>
            </Card>
            <Card className="p-4 rounded-2xl border border-accent/30">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Orden Actual</p>
              <p className="text-2xl font-bold mt-2 text-accent">${estimatedCurrentOrder.toFixed(2)}</p>
            </Card>
          </div>

          <Button
            onClick={handleConfirm}
            disabled={!hasItems || isConfirming}
            className={`
              w-full py-8 text-2xl font-black rounded-2xl tracking-wider
              transition-all duration-300 uppercase
              disabled:opacity-50 disabled:cursor-not-allowed
              ${
                hasItems && !isConfirming
                  ? 'button-gradient text-black hover:shadow-2xl hover:shadow-accent/50 active:scale-95'
                  : 'bg-muted text-muted-foreground'
              }
            `}
          >
            {isConfirming ? (
              <div className="flex items-center justify-center gap-4">
                <div className="animate-spin">
                  <svg
                    className="w-7 h-7"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
                <span>Procesando Entrega...</span>
              </div>
            ) : (
              'Confirmar Entrega'
            )}
          </Button>

          {!hasItems && (
            <p className="text-center text-muted-foreground text-sm mt-5">
              Selecciona al menos un producto para continuar
            </p>
          )}
          {errorMsg && <p className="text-center text-red-400 text-sm mt-5">{errorMsg}</p>}
          {successMsg && <p className="text-center text-green-400 text-sm mt-5">{successMsg}</p>}
        </div>
      </footer>
    </div>
  )
}
