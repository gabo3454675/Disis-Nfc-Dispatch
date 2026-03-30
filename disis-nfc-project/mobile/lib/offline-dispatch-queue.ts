type DispatchQueueItem = {
  id: string
  nfcUid: string
  sku: string
  pointId: string
  quantity: number
  createdAt: number
}

const STORAGE_KEY = 'dispatch_offline_queue_v1'

function isBrowser() {
  return typeof window !== 'undefined'
}

function readQueue(): DispatchQueueItem[] {
  if (!isBrowser()) return []
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeQueue(queue: DispatchQueueItem[]) {
  if (!isBrowser()) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
}

export function enqueueDispatch(item: Omit<DispatchQueueItem, 'id' | 'createdAt'>) {
  const queue = readQueue()
  queue.push({
    ...item,
    id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
    createdAt: Date.now(),
  })
  writeQueue(queue)
}

export function getPendingDispatchCount() {
  return readQueue().length
}

export async function flushDispatchQueue(apiBaseUrl: string, internalApiKey?: string) {
  const queue = readQueue()
  if (queue.length === 0) return { sent: 0, failed: 0 }

  const remaining: DispatchQueueItem[] = []
  let sent = 0
  let failed = 0

  for (const item of queue) {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (internalApiKey) headers['x-internal-api-key'] = internalApiKey

      const response = await fetch(`${apiBaseUrl}/api/v1/dispatch`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          nfcUid: item.nfcUid,
          sku: item.sku,
          pointId: item.pointId,
          quantity: item.quantity,
        }),
      })

      if (!response.ok) {
        // Solo reencolar si es falla de infraestructura/transitoria.
        if (response.status >= 500 || response.status === 429) {
          remaining.push(item)
          failed += 1
        } else {
          failed += 1
        }
      } else {
        sent += 1
      }
    } catch {
      remaining.push(item)
      failed += 1
    }
  }

  writeQueue(remaining)
  return { sent, failed }
}
