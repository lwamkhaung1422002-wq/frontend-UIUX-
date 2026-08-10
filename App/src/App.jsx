import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Box, CircularProgress, CssBaseline, ThemeProvider } from '@mui/material'
import AppLayout from './components/AppLayout.jsx'
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx'
import { DataProvider, useData } from './contexts/DataContext.jsx'
import { FeedbackProvider } from './contexts/FeedbackContext.jsx'
import AppErrorBoundary from './components/AppErrorBoundary.jsx'
import PageSkeleton from './components/PageSkeleton.jsx'
import { createAppTheme } from './app/theme.js'
import { preloadAllRoutes, preloadRoute, routeLoaders } from './app/routes.js'
import './App.css'

const HomePage = lazy(routeLoaders.home)
const SalesPage = lazy(routeLoaders.sales)
const StockPage = lazy(routeLoaders.stock)
const FinancePage = lazy(routeLoaders.finance)
const BalancePage = lazy(routeLoaders.balance)
const OrderPage = lazy(routeLoaders.order)
const AppSettingsPage = lazy(routeLoaders.settings)
const ProductsPage = lazy(routeLoaders.products)
const CustomersPage = lazy(routeLoaders.customers)
const SuppliersPage = lazy(routeLoaders.suppliers)
const PurchasesPage = lazy(routeLoaders.purchases)
const PricingPage = lazy(routeLoaders.pricing)
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'))

const pages = {
  home: HomePage,
  sales: SalesPage,
  stock: StockPage,
  finance: FinancePage,
  balance: BalancePage,
  order: OrderPage,
  settings: AppSettingsPage,
  products: ProductsPage,
  customers: CustomersPage,
  suppliers: SuppliersPage,
  purchases: PurchasesPage,
  pricing: PricingPage,
}

function LoadingScreen() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <CircularProgress />
    </Box>
  )
}

function AppGate({ colorMode, onToggleColorMode }) {
  const { user, loading } = useAuth()
  const [showAuth, setShowAuth] = useState(false)
  const route = useHashRoute()
  const shouldShowAuth = (!user && route.replace(/^\/+/, '')) || (showAuth && (!user || user.preview))

  if (loading) return <LoadingScreen />
  if (!user || shouldShowAuth) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <LoginPage />
      </Suspense>
    )
  }

  return (
    <DataProvider key={user.shop?.id || user.uid}>
      <ProtectedApp onGetStarted={() => setShowAuth(true)} colorMode={colorMode} onToggleColorMode={onToggleColorMode} />
    </DataProvider>
  )
}

function ProtectedApp({ onGetStarted, colorMode, onToggleColorMode }) {
  const { user, shop, logout, selectShop } = useAuth()
  const { data, loading: dataLoading, error: dataError, refresh } = useData()
  const route = useHashRoute()
  const candidatePage = route.replace(/^\/+/, '') || 'home'
  const page = pages[candidatePage] ? candidatePage : 'home'

  const navigate = useCallback(
    (nextPage) => {
      if (!pages[nextPage]) return
      window.location.hash = `/${nextPage}`
    },
    [],
  )
  const requireAuth = useCallback(() => {
    // Preview mode is intentionally writable while the owner tests the POS.
    // Authentication is re-enabled by replacing this temporary preview mode.
    return false
  }, [])

  useEffect(() => {
    // Sales is the most frequently visited workspace. Start loading it immediately, then warm every remaining route.
    void preloadRoute('sales')
    void preloadAllRoutes()
  }, [])

  useEffect(() => {
    const openAuth = () => {
      if (user.preview) onGetStarted()
    }
    window.addEventListener('auth-required', openAuth)
    return () => window.removeEventListener('auth-required', openAuth)
  }, [onGetStarted, user.preview])

  useEffect(() => {
    document.title = shop?.name || 'Shop Owner'
  }, [shop?.name])

  useEffect(() => {
    const savedPosition = Number(sessionStorage.getItem(`scroll:${page}`) || 0)
    const frame = window.requestAnimationFrame(() => window.scrollTo({ top: savedPosition }))
    return () => {
      window.cancelAnimationFrame(frame)
      sessionStorage.setItem(`scroll:${page}`, String(window.scrollY))
    }
  }, [page])

  const PageComponent = useMemo(() => pages[page] || HomePage, [page])
  if (dataLoading) return <LoadingScreen />

  return (
    <AppLayout
      page={page}
      onNavigate={navigate}
      onLogout={logout}
      onGetStarted={onGetStarted}
      preview={Boolean(user.preview)}
      userEmail={user.email}
      shopName={shop?.name || 'Shop Owner'}
      shops={user.shops || []}
      shopId={shop?.id}
      onShopChange={selectShop}
      data={data}
      colorMode={colorMode}
      onToggleColorMode={onToggleColorMode}
    >
      {dataError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {dataError}
        </Alert>
      ) : null}
      <Box className="page-transition">
        <Suspense fallback={<PageSkeleton />}>
          <PageComponent
            navigate={navigate}
            refresh={refresh}
            preview={Boolean(user.preview)}
            requireAuth={requireAuth}
          />
        </Suspense>
      </Box>
    </AppLayout>
  )
}

export default function App() {
  const [colorMode, setColorMode] = useState(() => {
    try {
      return localStorage.getItem('pos:color-mode') === 'dark' ? 'dark' : 'light'
    } catch {
      return 'light'
    }
  })
  const theme = useMemo(() => createAppTheme(colorMode), [colorMode])
  const toggleColorMode = useCallback(() => {
    setColorMode((current) => (current === 'dark' ? 'light' : 'dark'))
  }, [])

  useEffect(() => {
    document.documentElement.dataset.colorMode = colorMode
    try { localStorage.setItem('pos:color-mode', colorMode) } catch { /* storage is optional */ }
  }, [colorMode])

  return (
    <AppErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <FeedbackProvider>
          <AuthProvider>
            <AppGate colorMode={colorMode} onToggleColorMode={toggleColorMode} />
          </AuthProvider>
        </FeedbackProvider>
      </ThemeProvider>
    </AppErrorBoundary>
  )
}

function useHashRoute() {
  const readRoute = () => window.location.hash.replace(/^#/, '') || '/'
  const [route, setRoute] = useState(readRoute)
  useEffect(() => {
    const update = () => setRoute(readRoute())
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])
  return route
}
