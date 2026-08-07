/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { emptyData, previewDemoData, refreshUserData } from '../services/shopApiService.js'
import { useAuth } from './AuthContext.jsx'
import { setStoreFormatPreferences } from '../utils/storage.js'

const DataContext = createContext(null)
const previewData = previewDemoData

export function DataProvider({ children }) {
  const { user } = useAuth()
  const [data, setData] = useState(() => (user?.preview ? previewData : emptyData))
  const [loading, setLoading] = useState(() => Boolean(user && !user.preview))
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    if (!user) return
    if (user.preview) {
      setData(previewData)
      setError('')
      return previewData
    }

    setError('')
    const nextData = await refreshUserData(user.uid)
    setData(nextData)
    return nextData
  }, [user])

  const savePreviewSale = useCallback((sale) => {
    if (!user?.preview) return
    setData((current) => ({
      ...current,
      stocks: current.stocks.map((stock) => {
        const line = sale.items.find((item) => item.productId === stock.productId)
        return line ? { ...stock, quantity: Math.max(0, Number(stock.quantity || 0) - line.quantity) } : stock
      }),
      products: current.products.map((product) => {
        const line = sale.items.find((item) => item.productId === product.id)
        return line ? { ...product, quantity: Math.max(0, Number(product.quantity || 0) - line.quantity) } : product
      }),
      orders: [sale, ...current.orders],
    }))
  }, [user?.preview])

  useEffect(() => {
    setStoreFormatPreferences(data.catalogSettings)
  }, [data.catalogSettings])

  useEffect(() => {
    let active = true

    if (!user) return undefined

    if (user.preview) {
      return undefined
    }

    refreshUserData(user.uid)
      .then((nextData) => {
        if (!active) return
        setData(nextData)
        setError('')
      })
      .catch((nextError) => {
        if (!active) return
        setError(nextError.message || 'Failed to load shop data.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [user])

  const value = useMemo(
    () => ({
      data,
      loading,
      error,
      refresh,
      savePreviewSale,
    }),
    [data, loading, error, refresh, savePreviewSale],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useData must be used within DataProvider')
  }

  return context
}
