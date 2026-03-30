'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function AccesoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const next = searchParams.get('next') || '/admin'
  const isSwitchProfile = searchParams.get('switch') === '1'
  const expectedPin = process.env.NEXT_PUBLIC_ADMIN_PIN || '1234'

  useEffect(() => {
    if (isSwitchProfile) {
      localStorage.removeItem('dispatch_role')
      return
    }

    const role = localStorage.getItem('dispatch_role')
    if (role === 'admin') {
      router.replace(next)
      return
    }
    if (role === 'client') {
      router.replace('/cliente')
    }
  }, [isSwitchProfile, next, router])

  const enterAdmin = () => {
    if (pin !== expectedPin) {
      setError('PIN invalido')
      return
    }
    localStorage.setItem('dispatch_role', 'admin')
    router.push(next)
  }

  const enterClient = () => {
    localStorage.setItem('dispatch_role', 'client')
    router.push('/cliente')
  }

  return (
    <main className="min-h-screen bg-background p-6 flex items-center justify-center">
      <div className="w-full max-w-4xl space-y-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold">DISIS Dispatch - Portal de Acceso</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Selecciona tu perfil para mostrar solo las vistas permitidas segun tu rol.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <p className="text-xl font-bold">Acceso Admin</p>
          <p className="text-sm text-muted-foreground mt-1">Gestion de puntos e inventario</p>
          <Input
            className="mt-4"
            placeholder="PIN admin"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
          />
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          <Button className="mt-4 w-full" onClick={enterAdmin}>
            Entrar como Admin
          </Button>
        </Card>

        <Card className="p-6">
          <p className="text-xl font-bold">Acceso Cliente</p>
          <p className="text-sm text-muted-foreground mt-1">Consulta de prepagado, consumido y saldo restante</p>
          <Button className="mt-8 w-full" variant="outline" onClick={enterClient}>
            Entrar como Cliente
          </Button>
        </Card>
      </div>
      </div>
    </main>
  )
}
