import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Box, CircularProgress, CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import { HashRouter, useLocation, useNavigate } from 'react-router-dom'
import AppLayout from './components/AppLayout.jsx'
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx'
import { DataProvider, useData } from './contexts/DataContext.jsx'
import { FeedbackProvider } from './contexts/FeedbackContext.jsx'
import AppErrorBoundary from './components/AppErrorBoundary.jsx'
import PageSkeleton from './components/PageSkeleton.jsx'
import { preloadAllRoutes, preloadRoute, routeLoaders } from './routes.js'
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
}

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#059669',
      dark: '#047857',
      light: '#d1fae5',
      contrastText: '#ffffff',
    },
    success: {
      main: '#16a34a',
    },
    warning: {
      main: '#d97706',
    },
    error: {
      main: '#dc2626',
    },
    background: {
      default: '#f8faf9',
      paper: '#ffffff',
    },
    text: {
      primary: '#17211d',
      secondary: '#66736d',
    },
    divider: '#e2e8e5',
  },
  shape: {
    borderRadius: 10,
  },
  typography: {
    fontFamily: '"Noto Sans Myanmar", Roboto, Arial, sans-serif',
    h5: {
      fontWeight: 750,
      letterSpacing: '-0.025em',
    },
    h6: {
      fontWeight: 700,
      letterSpacing: 0,
    },
    button: {
      fontWeight: 700,
      textTransform: 'none',
      letterSpacing: 0,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          minHeight: 42,
          boxShadow: 'none',
        },
        contained: {
          boxShadow: '0 4px 10px rgba(5, 150, 105, 0.16)',
          '&:hover': {
            boxShadow: '0 7px 16px rgba(5, 150, 105, 0.22)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundImage: 'none',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: '#fff',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          minWidth: 40,
          minHeight: 40,
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: '#f3f7f5',
        },
      },
    },
  },
})

function LoadingScreen() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <CircularProgress />
    </Box>
  )
}

function AppGate() {
  const { user, loading } = useAuth()
  const [showAuth, setShowAuth] = useState(false)
  const location = useLocation()
  const shouldShowAuth = (!user && location.pathname.replace(/^\/+/, '')) || (showAuth && (!user || user.preview))

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
      <ProtectedApp onGetStarted={() => setShowAuth(true)} />
    </DataProvider>
  )
}

function ProtectedApp({ onGetStarted }) {
  const { user, shop, logout } = useAuth()
  const { data, loading: dataLoading, error: dataError, refresh } = useData()
  const location = useLocation()
  const routerNavigate = useNavigate()
  const candidatePage = location.pathname.replace(/^\/+/, '') || 'home'
  const page = pages[candidatePage] ? candidatePage : 'home'

  const navigate = useCallback(
    (nextPage) => {
      if (!pages[nextPage]) return
      routerNavigate(`/${nextPage}`)
    },
    [routerNavigate],
  )
  const requireAuth = useCallback(() => {
    if (!user.preview) return false
    onGetStarted()
    return true
  }, [onGetStarted, user.preview])

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
      data={data}
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
  return (
    <AppErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <FeedbackProvider>
          <HashRouter>
            <AuthProvider>
              <AppGate />
            </AuthProvider>
          </HashRouter>
        </FeedbackProvider>
      </ThemeProvider>
    </AppErrorBoundary>
  )
}
