export const routeLoaders = {
  home: () => import('../features/dashboard/DashboardPage.jsx'),
  sales: () => import('../features/sales/SalesPage.jsx'),
  stock: () => import('../features/inventory/StockPage.jsx'),
  finance: () => import('../features/finance/FinancePage.jsx'),
  balance: () => import('../features/reports/BalancePage.jsx'),
  order: () => import('../features/pos/OrderPage.jsx'),
  settings: () => import('../features/settings/AppSettingsPage.jsx'),
  products: () => import('../features/inventory/ProductsPage.jsx'),
  customers: () => import('../features/customers/CustomersPage.jsx'),
  suppliers: () => import('../features/suppliers/SuppliersPage.jsx'),
  purchases: () => import('../features/purchases/PurchasesPage.jsx'),
  pricing: () => import('../features/pricing/PricingPage.jsx'),
}

const preloadCache = new Map()

export function preloadRoute(route) {
  if (!routeLoaders[route]) return Promise.resolve()
  if (!preloadCache.has(route)) preloadCache.set(route, routeLoaders[route]())
  return preloadCache.get(route)
}

export function preloadAllRoutes() {
  return Promise.allSettled(Object.keys(routeLoaders).map(preloadRoute))
}
