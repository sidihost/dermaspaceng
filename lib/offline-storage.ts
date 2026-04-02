// IndexedDB wrapper for offline data storage
const DB_NAME = 'dermaspace-offline'
const DB_VERSION = 1

interface DBSchema {
  bookings: {
    key: string
    value: {
      id: string
      data: any
      timestamp: number
      synced: boolean
    }
  }
  cache: {
    key: string
    value: {
      url: string
      data: any
      timestamp: number
      ttl: number
    }
  }
}

class OfflineStorage {
  private db: IDBDatabase | null = null
  private dbReady: Promise<IDBDatabase> | null = null

  private async openDB(): Promise<IDBDatabase> {
    if (this.db) return this.db

    if (this.dbReady) return this.dbReady

    this.dbReady = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB not available'))
        return
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Bookings store for offline booking submissions
        if (!db.objectStoreNames.contains('bookings')) {
          db.createObjectStore('bookings', { keyPath: 'id' })
        }

        // Cache store for API responses
        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { keyPath: 'url' })
          cacheStore.createIndex('timestamp', 'timestamp')
        }
      }
    })

    return this.dbReady
  }

  // Cache API response
  async cacheResponse(url: string, data: any, ttl: number = 5 * 60 * 1000): Promise<void> {
    try {
      const db = await this.openDB()
      const tx = db.transaction('cache', 'readwrite')
      const store = tx.objectStore('cache')

      await new Promise<void>((resolve, reject) => {
        const request = store.put({
          url,
          data,
          timestamp: Date.now(),
          ttl,
        })
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Failed to cache response:', error)
    }
  }

  // Get cached response
  async getCachedResponse<T>(url: string): Promise<T | null> {
    try {
      const db = await this.openDB()
      const tx = db.transaction('cache', 'readonly')
      const store = tx.objectStore('cache')

      return new Promise((resolve, reject) => {
        const request = store.get(url)
        request.onsuccess = () => {
          const result = request.result
          if (!result) {
            resolve(null)
            return
          }

          // Check if cache is still valid
          if (Date.now() - result.timestamp > result.ttl) {
            // Cache expired, delete it
            this.deleteCachedResponse(url)
            resolve(null)
            return
          }

          resolve(result.data as T)
        }
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Failed to get cached response:', error)
      return null
    }
  }

  // Delete cached response
  async deleteCachedResponse(url: string): Promise<void> {
    try {
      const db = await this.openDB()
      const tx = db.transaction('cache', 'readwrite')
      const store = tx.objectStore('cache')

      await new Promise<void>((resolve, reject) => {
        const request = store.delete(url)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Failed to delete cached response:', error)
    }
  }

  // Save booking for offline sync
  async saveOfflineBooking(booking: any): Promise<string> {
    const id = `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    try {
      const db = await this.openDB()
      const tx = db.transaction('bookings', 'readwrite')
      const store = tx.objectStore('bookings')

      await new Promise<void>((resolve, reject) => {
        const request = store.put({
          id,
          data: booking,
          timestamp: Date.now(),
          synced: false,
        })
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })

      return id
    } catch (error) {
      console.error('Failed to save offline booking:', error)
      throw error
    }
  }

  // Get all pending offline bookings
  async getPendingBookings(): Promise<any[]> {
    try {
      const db = await this.openDB()
      const tx = db.transaction('bookings', 'readonly')
      const store = tx.objectStore('bookings')

      return new Promise((resolve, reject) => {
        const request = store.getAll()
        request.onsuccess = () => {
          const results = request.result.filter((b: any) => !b.synced)
          resolve(results)
        }
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Failed to get pending bookings:', error)
      return []
    }
  }

  // Mark booking as synced
  async markBookingSynced(id: string): Promise<void> {
    try {
      const db = await this.openDB()
      const tx = db.transaction('bookings', 'readwrite')
      const store = tx.objectStore('bookings')

      const booking = await new Promise<any>((resolve, reject) => {
        const request = store.get(id)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })

      if (booking) {
        booking.synced = true
        await new Promise<void>((resolve, reject) => {
          const request = store.put(booking)
          request.onsuccess = () => resolve()
          request.onerror = () => reject(request.error)
        })
      }
    } catch (error) {
      console.error('Failed to mark booking synced:', error)
    }
  }

  // Clear old cached data
  async clearOldCache(maxAge: number = 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const db = await this.openDB()
      const tx = db.transaction('cache', 'readwrite')
      const store = tx.objectStore('cache')
      const index = store.index('timestamp')
      const cutoff = Date.now() - maxAge

      const request = index.openCursor(IDBKeyRange.upperBound(cutoff))
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        }
      }
    } catch (error) {
      console.error('Failed to clear old cache:', error)
    }
  }
}

export const offlineStorage = new OfflineStorage()

// Helper function for fetch with offline caching
export async function fetchWithCache<T>(
  url: string,
  options?: RequestInit,
  ttl: number = 5 * 60 * 1000
): Promise<T> {
  // Check if offline
  if (!navigator.onLine) {
    const cached = await offlineStorage.getCachedResponse<T>(url)
    if (cached) {
      return cached
    }
    throw new Error('Offline and no cached data available')
  }

  try {
    const response = await fetch(url, options)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    
    // Cache the response
    await offlineStorage.cacheResponse(url, data, ttl)
    
    return data as T
  } catch (error) {
    // Try to return cached data on network error
    const cached = await offlineStorage.getCachedResponse<T>(url)
    if (cached) {
      return cached
    }
    throw error
  }
}
