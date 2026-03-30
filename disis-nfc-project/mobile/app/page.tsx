'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DispatchDashboard from '@/components/dispatch-dashboard'
import DispatchDetail from '@/components/dispatch-detail'
import { flushDispatchQueue } from '@/lib/offline-dispatch-queue'

type ScanStatus = 'waiting' | 'authorized' | 'denied'
type DispatchScreen = 'dashboard' | 'detail'
type WalletViewItem = {
  id: string
  sku: string
  productName: string
  unitPrice: number
  totalQuantity: number
  servedQuantity: number
  remainingQuantity: number
}

export default function Page() {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isCheckingAccess, setIsCheckingAccess] = useState(true)
  const [screen, setScreen] = useState<DispatchScreen>('dashboard')
  const [scanStatus, setScanStatus] = useState<ScanStatus>('waiting')
  const [customerData, setCustomerData] = useState<{
    nfcUid: string
    name: string
    balance: number
    consumedAmount: number
    prepaidAmount: number
    items: WalletViewItem[]
  } | null>(null)
  const apiBaseUrl = process.env.NEXT_PUBLIC_DISPATCH_API_URL || 'http://localhost:3001'
  const internalApiKey = process.env.NEXT_PUBLIC_INTERNAL_API_KEY || ''

  useEffect(() => {
    const role = localStorage.getItem('dispatch_role')
    if (role !== 'admin') {
      router.replace('/acceso?next=/')
      return
    }
    setIsAuthorized(true)
    setIsCheckingAccess(false)
  }, [router])

  useEffect(() => {
    if (!isAuthorized) return
    const timer = setInterval(() => {
      flushDispatchQueue(apiBaseUrl, internalApiKey)
    }, 10000)

    return () => clearInterval(timer)
  }, [apiBaseUrl, internalApiKey, isAuthorized])

  const handleScanSuccess = (data: {
    nfcUid: string
    name: string
    balance: number
    consumedAmount: number
    prepaidAmount: number
    items: WalletViewItem[]
  }) => {
    setCustomerData(data)
    setScanStatus('authorized')
    setScreen('detail')
  }

  const handleScanError = () => {
    setScanStatus('denied')
    setCustomerData(null)
  }

  const handleReset = () => {
    setScreen('dashboard')
    setScanStatus('waiting')
    setCustomerData(null)
  }

  if (isCheckingAccess) {
    return <div className="min-h-screen bg-background" />
  }

  return (
    <div className="min-h-screen bg-background">
      {screen === 'dashboard' ? (
        <DispatchDashboard
          scanStatus={scanStatus}
          customerData={customerData}
          onScanSuccess={handleScanSuccess}
          onScanError={handleScanError}
        />
      ) : (
        <DispatchDetail
          customerData={customerData!}
          onReset={handleReset}
        />
      )}
    </div>
  )
}
