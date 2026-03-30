import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Radio } from 'lucide-react'

interface DispatchDashboardProps {
  scanStatus: 'waiting' | 'authorized' | 'denied'
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
  } | null
  onScanSuccess: (data: {
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
  }) => void
  onScanError: () => void
}

type AdminSummaryResponse = {
  inventory?: Array<{ sku: string; globalStock: number }>
  points?: Array<{ pointId: string; dispatchCount: number; lastDispatchAt?: string | null }>
}

export default function DispatchDashboard({
  scanStatus,
  customerData,
  onScanSuccess,
  onScanError,
}: DispatchDashboardProps) {
  const router = useRouter()
  const [manualInput, setManualInput] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [footerStats, setFooterStats] = useState({
    stockLocal: 0,
    dispatchesToday: 0,
    lastDispatchAt: '',
    syncOnline: true,
  })
  const mockNfcUid = 'BRAZALETE_TEST_01'
  const apiBaseUrl = process.env.NEXT_PUBLIC_DISPATCH_API_URL || 'http://localhost:3001'
  const internalApiKey = process.env.NEXT_PUBLIC_INTERNAL_API_KEY || ''
  const pointId = 'POINT_04'
  const handleLogout = () => {
    localStorage.removeItem('dispatch_role')
    router.push('/acceso')
  }

  const refreshFooterStats = async () => {
    try {
      const [summaryResponse, healthResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/api/v1/internal/admin/summary`),
        fetch(`${apiBaseUrl}/health`),
      ])
      const summary: AdminSummaryResponse = await summaryResponse.json()
      const totalStock = (summary?.inventory || []).reduce((acc, item) => acc + Number(item.globalStock || 0), 0)
      const points = Array.isArray(summary?.points) ? summary.points : []
      const currentPoint = points.find((p) => p.pointId === pointId)
      const dispatchesToday = Number(currentPoint?.dispatchCount || 0)
      const lastDispatchAt = currentPoint?.lastDispatchAt
        ? new Date(currentPoint.lastDispatchAt).toLocaleTimeString()
        : 'Sin despachos'

      setFooterStats({
        stockLocal: totalStock,
        dispatchesToday,
        lastDispatchAt,
        syncOnline: healthResponse.ok,
      })
    } catch {
      setFooterStats((prev) => ({ ...prev, syncOnline: false }))
    }
  }

  useEffect(() => {
    refreshFooterStats()
    const timer = setInterval(refreshFooterStats, 10000)
    return () => clearInterval(timer)
  }, [])

  const handleNFCScan = () => {
    setIsScanning(true)

    // Simulamos el escaneo NFC
    setTimeout(() => {
      const random = Math.random()
      if (random > 0.3) {
        // 70% de éxito
        onScanSuccess({
          nfcUid: 'NFC_SIMULADO_OK',
          name: 'Juan García',
          balance: 250.5,
          consumedAmount: 0,
          prepaidAmount: 250.5,
          items: [],
        })
      } else {
        onScanError()
        setTimeout(() => {
          setIsScanning(false)
        }, 2000)
      }
    }, 1500)
  }

  const handleManualInput = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualInput.trim()) {
      // Simulamos validación manual
      const random = Math.random()
      if (random > 0.2) {
        onScanSuccess({
          nfcUid: manualInput,
          name: manualInput,
          balance: 180.75,
          consumedAmount: 0,
          prepaidAmount: 180.75,
          items: [],
        })
      } else {
        onScanError()
        setTimeout(() => {
          setManualInput('')
        }, 2000)
      }
    }
  }

  const handleMockScan = async () => {
    try {
      setIsScanning(true)

      const response = await fetch(`${apiBaseUrl}/api/v1/internal/mock-sale`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(internalApiKey ? { 'x-internal-api-key': internalApiKey } : {}),
        },
        body: JSON.stringify({
          nfcUid: mockNfcUid,
          pointId: 'POINT_04',
        }),
      })

      if (!response.ok) {
        throw new Error('No se pudo simular el escaneo')
      }

      const data = await response.json()
      const wallet = data?.wallet

      onScanSuccess({
        nfcUid: mockNfcUid,
        name: wallet?.customerName || 'Cliente de Prueba',
        balance: Number(wallet?.totals?.remainingAmount || 0),
        consumedAmount: Number(wallet?.totals?.consumedAmount || 0),
        prepaidAmount: Number(wallet?.totals?.prepaidAmount || 0),
        items: Array.isArray(wallet?.items) ? wallet.items : [],
      })
    } catch (_error) {
      onScanError()
    } finally {
      setIsScanning(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header - Glass Effect */}
      <header className="glass-effect border-b border-border px-4 sm:px-6 py-4 sm:py-5 shadow-2xl relative">
        <div className="absolute inset-0 bg-gradient-to-r from-accent/5 to-transparent opacity-50 pointer-events-none" />
        <div className="relative flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Estación Cerveza 04</h1>
            <p className="text-sm text-muted-foreground mt-2">Punto de Despacho • Disis Dispatch</p>
          </div>
          <div className="flex items-center gap-3 bg-black/20 rounded-xl px-3 py-2 backdrop-blur-sm border border-accent/20">
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Estado</p>
              <p className="text-lg font-bold text-accent">Online</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-accent animate-pulse" />
            <Button variant="outline" className="ml-2" onClick={handleLogout}>
              Salir
            </Button>
          </div>
        </div>
      </header>

      <section className="flex-1 min-h-0">
        <div className="h-full w-full max-w-[1360px] mx-auto px-4 sm:px-6 py-4 sm:py-5 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px] gap-4 sm:gap-5">
          {/* Main Content */}
          <main className="min-h-0 overflow-auto relative rounded-2xl border border-border/30 p-4 sm:p-6 lg:p-7 bg-background/40">
            {/* Background Grid Effect */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
              <div className="absolute inset-0" style={{
                backgroundImage: 'linear-gradient(rgba(0, 255, 136, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 136, 0.1) 1px, transparent 1px)',
                backgroundSize: '50px 50px'
              }} />
            </div>

            {/* Scanning Button Section */}
            <div className="flex flex-col items-center gap-6 sm:gap-7 w-full max-w-2xl mx-auto relative z-10 animate-slide-up">
              <div className="text-center mb-2 sm:mb-3">
                <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-2 sm:mb-3 tracking-tight">
                  Escanear Brazalete
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Acerca el brazalete NFC al lector
                </p>
                <div className="mt-2 flex items-center justify-center gap-4">
                  <Link href="/admin" className="text-accent text-sm underline inline-block">
                    Volver a Admin
                  </Link>
                  <Link href="/acceso?switch=1" className="text-accent text-sm underline inline-block">
                    Cambiar perfil
                  </Link>
                </div>
              </div>

              <button
                onClick={handleNFCScan}
                disabled={isScanning || scanStatus === 'authorized'}
                className={`
              w-52 h-52 rounded-full flex items-center justify-center
              font-bold text-xl text-accent-foreground transition-all duration-300
              disabled:opacity-60 disabled:cursor-not-allowed
              relative group shadow-2xl
              ${
                scanStatus === 'authorized'
                  ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-green-500/50'
                  : isScanning
                    ? 'bg-gradient-to-br from-cyan-600 to-blue-700 animate-pulse-nfc shadow-cyan-600/50'
                    : 'bg-gradient-to-br from-accent to-emerald-500 hover:shadow-lg hover:shadow-accent/50 active:scale-95'
              }
            `}
              >
                <div className="flex flex-col items-center gap-4 relative">
                  <div className={`relative ${isScanning || scanStatus === 'authorized' ? 'animate-glow-rotate' : ''}`}>
                    <Radio className="w-[72px] h-[72px] animate-pulse-fast" />
                  </div>
                  <span className="font-black uppercase tracking-wider text-sm">
                    {isScanning ? 'Escaneando...' : scanStatus === 'authorized' ? '¡Listo!' : 'Escanear'}
                  </span>
                </div>
              </button>

              <Button
                type="button"
                onClick={handleMockScan}
                disabled={isScanning || scanStatus === 'authorized'}
                className="px-8 py-5 rounded-xl font-bold"
              >
                Simular Escaneo
              </Button>

              {/* Status Indicator */}
              <Card className={`
            w-full p-6 sm:p-7 text-center transition-all duration-500 border-2 rounded-2xl
            ${
              scanStatus === 'waiting'
                ? 'glass-effect border-muted/30'
                : scanStatus === 'authorized'
                  ? 'bg-gradient-to-br from-green-500/15 to-emerald-600/10 border-green-500/60 shadow-lg shadow-green-500/20'
                  : 'bg-gradient-to-br from-red-500/15 to-rose-600/10 border-red-500/60 shadow-lg shadow-red-500/20'
            }
          `}>
                <div className={`text-3xl font-bold mb-2 ${
              scanStatus === 'authorized'
                ? 'text-green-400 animate-slide-up'
                : scanStatus === 'denied'
                  ? 'text-red-400'
                  : 'text-muted-foreground'
            }`}>
                  {scanStatus === 'waiting' && 'Esperando tarjeta...'}
                  {scanStatus === 'authorized' && '✓ Autorizado'}
                  {scanStatus === 'denied' && 'Acceso Denegado'}
                </div>
                {customerData && (
                  <div className="mt-5 text-foreground space-y-3 animate-slide-up">
                    <p className="text-2xl font-bold tracking-tight">{customerData.name}</p>
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <span className="text-muted-foreground">Saldo disponible:</span>
                      <p className="text-2xl font-bold text-accent">
                        ${customerData.balance.toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}
              </Card>

              {/* Manual Input */}
              <form onSubmit={handleManualInput} className="w-full relative z-10">
                <div className="glass-effect border border-border/50 rounded-2xl p-5 sm:p-6 hover:border-accent/30 transition-all duration-300">
                  <label className="block text-xs font-bold text-muted-foreground mb-3 uppercase tracking-widest">
                    Plan B - Ingreso Manual
                  </label>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Input
                      type="text"
                      placeholder="Ingresa ID del cliente..."
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      className="text-base py-4 rounded-xl bg-black/30 border-accent/30 hover:border-accent/60 focus:border-accent focus:bg-black/50 transition-all"
                    />
                    <Button
                      type="submit"
                      className="button-gradient text-black font-bold px-8 rounded-xl hover:shadow-lg hover:shadow-accent/40 transition-all active:scale-95"
                    >
                      Validar
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </main>

          {/* Desktop Side Panel */}
          <aside className="hidden lg:flex flex-col gap-3">
            <Card className="text-center p-4 rounded-xl bg-gradient-to-br from-accent/5 to-transparent border border-accent/10">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-2">Stock Local</p>
              <p className="text-3xl font-bold text-foreground">{footerStats.stockLocal}</p>
            </Card>
            <Card className="text-center p-4 rounded-xl bg-gradient-to-br from-accent/5 to-transparent border border-accent/10">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-2">Despachos Hoy</p>
              <p className="text-3xl font-bold text-accent">{footerStats.dispatchesToday}</p>
            </Card>
            <Card className="text-center p-4 rounded-xl bg-gradient-to-br from-accent/5 to-transparent border border-accent/10">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-2">Última Entrega</p>
              <p className="text-lg text-foreground font-semibold">{footerStats.lastDispatchAt}</p>
            </Card>
            <Card className="text-center p-4 rounded-xl bg-gradient-to-br from-green-500/5 to-transparent border border-green-500/20">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-2">Sincronización</p>
              <p className="text-lg text-green-400 font-bold flex items-center justify-center gap-2">
                <span className={`w-2 h-2 rounded-full ${footerStats.syncOnline ? 'bg-green-400' : 'bg-red-400'}`} />
                {footerStats.syncOnline ? 'Online' : 'Offline'}
              </p>
            </Card>
          </aside>
        </div>
      </section>

      {/* Mobile Bottom Panel */}
      <footer className="lg:hidden glass-effect border-t border-border/50 px-3 py-2 backdrop-blur-md">
        <div className="grid grid-cols-2 gap-2">
          <div className="text-center p-2 rounded-lg bg-gradient-to-br from-accent/5 to-transparent border border-accent/10">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Stock</p>
            <p className="text-lg font-bold text-foreground">{footerStats.stockLocal}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-gradient-to-br from-accent/5 to-transparent border border-accent/10">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Despachos</p>
            <p className="text-lg font-bold text-accent">{footerStats.dispatchesToday}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-gradient-to-br from-accent/5 to-transparent border border-accent/10">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Ultima</p>
            <p className="text-xs text-foreground font-semibold truncate">{footerStats.lastDispatchAt}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-gradient-to-br from-green-500/5 to-transparent border border-green-500/20">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Sync</p>
            <p className="text-xs text-green-400 font-bold flex items-center justify-center gap-1">
              <span className={`w-2 h-2 rounded-full ${footerStats.syncOnline ? 'bg-green-400' : 'bg-red-400'}`} />
              {footerStats.syncOnline ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
