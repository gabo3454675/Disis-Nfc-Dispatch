'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { io } from 'socket.io-client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getPendingDispatchCount } from '@/lib/offline-dispatch-queue'
import { Input } from '@/components/ui/input'

export default function AdminPage() {
  const router = useRouter()
  const [inventory, setInventory] = useState([])
  const [wallets, setWallets] = useState([])
  const [points, setPoints] = useState([])
  const [pendingQueue, setPendingQueue] = useState(0)
  const [search, setSearch] = useState('')
  const [newPointId, setNewPointId] = useState('')
  const [newPointName, setNewPointName] = useState('')
  const [totals, setTotals] = useState({ prepaidAmount: 0, consumedAmount: 0, remainingAmount: 0 })
  const apiBaseUrl = process.env.NEXT_PUBLIC_DISPATCH_API_URL || 'http://localhost:3001'
  const internalApiKey = process.env.NEXT_PUBLIC_INTERNAL_API_KEY || ''

  const loadInventory = async () => {
    const response = await fetch(`${apiBaseUrl}/api/v1/internal/admin/summary`)
    const data = await response.json()
    setInventory(Array.isArray(data?.inventory) ? data.inventory : [])
    setWallets(Array.isArray(data?.wallets) ? data.wallets : [])
    setPoints(Array.isArray(data?.points) ? data.points : [])
    setTotals(data?.totals || { prepaidAmount: 0, consumedAmount: 0, remainingAmount: 0 })
  }

  useEffect(() => {
    const role = localStorage.getItem('dispatch_role')
    if (role !== 'admin') {
      router.replace('/acceso?next=/admin')
      return
    }
    loadInventory()
  }, [apiBaseUrl, router])

  useEffect(() => {
    const refreshQueue = () => {
      setPendingQueue(getPendingDispatchCount())
    }

    refreshQueue()
    const timer = setInterval(refreshQueue, 2000)
    window.addEventListener('storage', refreshQueue)

    return () => {
      clearInterval(timer)
      window.removeEventListener('storage', refreshQueue)
    }
  }, [])

  useEffect(() => {
    const socket = io(apiBaseUrl, {
      transports: ['websocket'],
    })

    socket.on('update-inventory', (payload) => {
      if (payload?.sku === 'ALL') {
        setInventory([])
        return
      }
      setInventory((prev) => {
        const exists = prev.some((item) => item.sku === payload.sku)
        if (!exists) {
          return [...prev, payload]
        }
        return prev.map((item) =>
          item.sku === payload.sku ? { ...item, globalStock: payload.globalStock } : item,
        )
      })
    })

    return () => {
      socket.disconnect()
    }
  }, [apiBaseUrl])

  const totalStock = useMemo(
    () => inventory.reduce((acc, item) => acc + item.globalStock, 0),
    [inventory],
  )
  const filteredWallets = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return wallets
    return wallets.filter((wallet) =>
      String(wallet.customerName || '').toLowerCase().includes(term) ||
      String(wallet.nfcUid || '').toLowerCase().includes(term),
    )
  }, [search, wallets])

  const handleResetDemo = async () => {
    await fetch(`${apiBaseUrl}/api/v1/internal/reset-demo`, {
      method: 'POST',
      headers: {
        ...(internalApiKey ? { 'x-internal-api-key': internalApiKey } : {}),
      },
    })
    await loadInventory()
  }

  const handleTogglePoint = async (pointId, isActive) => {
    await fetch(`${apiBaseUrl}/api/v1/internal/admin/points/${encodeURIComponent(pointId)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(internalApiKey ? { 'x-internal-api-key': internalApiKey } : {}),
      },
      body: JSON.stringify({ isActive: !isActive }),
    })
    await loadInventory()
  }

  const handleCreatePoint = async () => {
    if (!newPointId.trim()) return
    await fetch(`${apiBaseUrl}/api/v1/internal/admin/points`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(internalApiKey ? { 'x-internal-api-key': internalApiKey } : {}),
      },
      body: JSON.stringify({
        pointId: newPointId.trim(),
        name: newPointName.trim() || newPointId.trim(),
      }),
    })
    setNewPointId('')
    setNewPointName('')
    await loadInventory()
  }

  const handleLogout = () => {
    localStorage.removeItem('dispatch_role')
    router.push('/acceso')
  }

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Admin de Pruebas</h1>
          <div className="flex items-center gap-4">
            <Link href="/" className="underline text-accent">
              Ir a despacho
            </Link>
            <Button variant="outline" onClick={handleLogout}>
              Salir
            </Button>
          </div>
        </div>

        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Inventario global en tiempo real</p>
          <p className="text-4xl font-bold mt-2">{totalStock}</p>
          <Button onClick={handleResetDemo} className="mt-4">
            Reset Demo
          </Button>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Prepagado total</p>
            <p className="text-2xl font-bold mt-2">${Number(totals.prepaidAmount || 0).toFixed(2)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Consumido total</p>
            <p className="text-2xl font-bold mt-2">${Number(totals.consumedAmount || 0).toFixed(2)}</p>
          </Card>
          <Card className="p-4 border-accent/40">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Saldo pendiente total</p>
            <p className="text-2xl font-bold mt-2 text-accent">${Number(totals.remainingAmount || 0).toFixed(2)}</p>
          </Card>
        </div>

        <Card className="p-6 border-amber-400/40">
          <p className="text-sm text-muted-foreground">Cola offline pendiente (local)</p>
          <p className="text-4xl font-bold mt-2 text-amber-400">{pendingQueue}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Si hay fallas de red, estos despachos se reintentan automaticamente cada 10s.
          </p>
        </Card>

        <Card className="p-6">
          <p className="text-lg font-semibold mb-4">Gestion de puntos de despacho</p>
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <Input
              placeholder="POINT_01"
              value={newPointId}
              onChange={(e) => setNewPointId(e.target.value)}
            />
            <Input
              placeholder="Nombre del punto"
              value={newPointName}
              onChange={(e) => setNewPointName(e.target.value)}
            />
            <Button onClick={handleCreatePoint}>Agregar Punto</Button>
          </div>
          <div className="grid gap-3">
            {points.map((point) => (
              <Card key={point.pointId} className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <p className="font-semibold">{point.name}</p>
                  <p className="text-xs text-muted-foreground">{point.pointId}</p>
                </div>
                <div className="text-sm md:text-right">
                  <p>Despachos: {Number(point.dispatchCount || 0)}</p>
                  <p>Unidades: {Number(point.consumedUnits || 0)}</p>
                </div>
                <Button onClick={() => handleTogglePoint(point.pointId, point.isActive)} variant="outline">
                  {point.isActive ? 'Desactivar' : 'Activar'}
                </Button>
              </Card>
            ))}
          </div>
        </Card>

        <div className="grid gap-4">
          {inventory.map((item) => (
            <Card key={item.sku} className="p-4 flex items-center justify-between">
              <p className="font-semibold">{item.sku}</p>
              <p className="text-2xl font-bold">{item.globalStock}</p>
            </Card>
          ))}
        </div>

        <Card className="p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <p className="text-lg font-semibold">Control de clientes</p>
            <Input
              placeholder="Buscar por nombre o NFC UID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <div className="grid gap-3">
            {filteredWallets.map((wallet) => (
              <Card key={wallet.id} className="p-4 border border-border/40">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{wallet.customerName}</p>
                    <p className="text-xs text-muted-foreground">{wallet.nfcUid}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Saldo restante</p>
                    <p className="font-bold text-accent">
                      ${Number(wallet?.totals?.remainingAmount || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Prepagado</p>
                    <p>${Number(wallet?.totals?.prepaidAmount || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Consumido</p>
                    <p>${Number(wallet?.totals?.consumedAmount || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Unidades restantes</p>
                    <p>{Number(wallet?.totals?.remainingUnits || 0)}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Card>
      </div>
    </main>
  )
}
