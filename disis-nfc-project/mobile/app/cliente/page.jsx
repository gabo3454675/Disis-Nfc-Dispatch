'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function ClientePage() {
  const router = useRouter()
  const [isAllowed, setIsAllowed] = useState(false)
  const [nfcUid, setNfcUid] = useState('BRAZALETE_TEST_01')
  const [wallet, setWallet] = useState(null)
  const [error, setError] = useState('')
  const apiBaseUrl = process.env.NEXT_PUBLIC_DISPATCH_API_URL || 'http://localhost:3001'

  useEffect(() => {
    const role = localStorage.getItem('dispatch_role')
    if (role !== 'client') {
      router.replace('/acceso?next=/cliente')
      return
    }
    setIsAllowed(true)
  }, [router])

  const handleSearch = async () => {
    setError('')
    const response = await fetch(`${apiBaseUrl}/api/v1/internal/wallet/${encodeURIComponent(nfcUid)}`)
    const data = await response.json()
    if (!response.ok) {
      setWallet(null)
      setError(data?.error || 'No se pudo consultar la billetera')
      return
    }
    setWallet(data.wallet)
  }

  const handleLogout = () => {
    localStorage.removeItem('dispatch_role')
    router.push('/acceso')
  }

  if (!isAllowed) {
    return <div className="min-h-screen bg-background" />
  }

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Portal de Cliente</h1>
          <div className="flex items-center gap-4">
            <Link href="/acceso?switch=1" className="underline text-accent">Cambiar perfil</Link>
            <Button variant="outline" onClick={handleLogout}>Salir</Button>
          </div>
        </div>

        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Consulta de prepagado y consumo por NFC UID</p>
          <div className="flex gap-3 mt-4">
            <Input value={nfcUid} onChange={(e) => setNfcUid(e.target.value)} />
            <Button onClick={handleSearch}>Consultar</Button>
          </div>
          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        </Card>

        {wallet && (
          <>
            <Card className="p-6">
              <p className="text-xl font-semibold">{wallet.customerName}</p>
              <p className="text-sm text-muted-foreground">{wallet.nfcUid}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div>
                  <p className="text-xs text-muted-foreground">Prepagado</p>
                  <p className="text-2xl font-bold">${Number(wallet.totals.prepaidAmount).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Consumido</p>
                  <p className="text-2xl font-bold">${Number(wallet.totals.consumedAmount).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Saldo restante</p>
                  <p className="text-2xl font-bold text-accent">${Number(wallet.totals.remainingAmount).toFixed(2)}</p>
                </div>
              </div>
            </Card>

            <div className="grid gap-3">
              {wallet.items.map((item) => (
                <Card key={item.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">{item.sku}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p>Prepagado: {item.totalQuantity}</p>
                    <p>Consumido: {item.servedQuantity}</p>
                    <p>Restante: {item.remainingQuantity}</p>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
