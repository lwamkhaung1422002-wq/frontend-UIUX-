import { calculateFinancialSummary } from './finance.js'
import { isRevenueRecognized } from './orders.js'

const dateOnly = (value) => String(value || '').slice(0, 10)
const inRange = (value, from, to) => (!from || value >= from) && (!to || value <= to)

export function buildReportAnalysis(data = {}, from = '', to = '') {
  const orders = (data.orders || []).filter((order) => order.fulfillmentStatus !== 'cancelled')
  const purchases = (data.purchases || []).filter((purchase) => purchase.status !== 'cancelled')
  const periodOrders = orders.filter((order) => inRange(dateOnly(order.completedAt || order.createdAt || order.date), from, to))
  const periodPurchases = purchases.filter((purchase) => inRange(dateOnly(purchase.orderedAt || purchase.createdAt), from, to))
  const expenses = (data.expenses || []).filter((item) => inRange(dateOnly(item.spentAt || item.date || item.createdAt), from, to))
  const products = new Map()
  const addProduct = (key, name) => {
    if (!products.has(key)) products.set(key, { key, name, boughtQty: 0, boughtValue: 0, soldQty: 0, revenue: 0, cost: 0, stockQty: 0, stockValue: 0 })
    return products.get(key)
  }
  periodPurchases.forEach((purchase) => (purchase.items || []).forEach((item) => {
    const row = addProduct(String(item.productId || item.productName || item.id), item.productName || item.name || '-')
    row.boughtQty += Number(item.receivedQuantity || item.quantity || 0); row.boughtValue += Number(item.lineTotal || Number(item.quantity || 0) * Number(item.unitCost || 0))
  }))
  periodOrders.filter(isRevenueRecognized).forEach((order) => (order.items || []).forEach((item) => {
    const row = addProduct(String(item.productId || item.type || item.id), item.type || item.productName || '-')
    row.soldQty += Number(item.quantity || 0); row.revenue += Number(item.lineTotal || Number(item.quantity || 0) * Number(item.unitPrice || 0)); row.cost += Number(item.unitCost || 0) * Number(item.quantity || 0)
  }))
  ;(data.stocks || []).forEach((stock) => {
    const row = addProduct(String(stock.productId || stock.productName || stock.id), stock.productName || stock.name || stock.type || '-')
    const qty = Math.max(0, Number(stock.quantity || 0) - Number(stock.reservedQuantity || 0)); row.stockQty += qty; row.stockValue += qty * Number(stock.unitCost || stock.cost || 0)
  })
  const suppliers = new Map()
  periodPurchases.forEach((purchase) => {
    const key = String(purchase.supplierId || purchase.supplier?.id || 'unknown'); const row = suppliers.get(key) || { key, name: purchase.supplier?.name || 'Supplier', purchases: [], itemTypes: new Set(), quantity: 0, value: 0, paid: 0, payable: 0 }
    row.purchases.push(purchase); (purchase.items || []).forEach((item) => { row.itemTypes.add(item.productId || item.productName); row.quantity += Number(item.receivedQuantity || item.quantity || 0) }); row.value += Number(purchase.total || 0); row.paid += Number(purchase.paidAmount || 0); row.payable += Math.max(0, Number(purchase.total || 0) - Number(purchase.paidAmount || 0)); suppliers.set(key, row)
  })
  const financial = calculateFinancialSummary(periodOrders, expenses)
  const receivable = orders.reduce((sum, order) => sum + Math.max(0, Number(order.balanceDue || 0)), 0)
  const payable = purchases.reduce((sum, purchase) => sum + Math.max(0, Number(purchase.total || 0) - Number(purchase.paidAmount || 0)), 0)
  const stockValue = [...products.values()].reduce((sum, row) => sum + row.stockValue, 0)
  return { financial, products: [...products.values()].map((row) => ({ ...row, profit: row.revenue - row.cost })), suppliers: [...suppliers.values()].map((row) => ({ ...row, itemTypes: row.itemTypes.size })), receivable, payable, stockValue }
}
