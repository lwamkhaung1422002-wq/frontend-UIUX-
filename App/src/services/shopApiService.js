import { api, getStoredShopId } from './api.js'
import { getToday, groupOrdersByMonth } from '../utils/storage.js'
import { normalizeOrders } from '../domain/orders.js'
import {
  normalizeCatalogSettings,
  normalizeOptionPath,
  normalizeOptionTree,
  isCodPaymentMethod,
  uniqueCatalogValues,
  variantDisplayName,
  variantOptionValue,
} from '../utils/catalog.js'

export const emptyData = {
  records: {},
  orders: [],
  stocks: [],
  payments: [],
  expenses: [],
  adjustments: [],
  productTypes: [],
  productColors: [],
  option1Values: [],
  option2Values: [],
  catalogSettings: normalizeCatalogSettings(),
  products: [],
  categories: [],
  customers: [],
  suppliers: [],
  productSuppliers: [],
  purchases: [],
  dashboard: null,
  storeConfiguration: null,
  units: [],
    inventoryBalances: [],
    inventoryMovements: [],
    inventoryLocations: [],
    inventoryLots: [],
    inventorySerials: [],
    warranties: [],
    recipes: [],
    priceGroups: [],
}

const previewToday = getToday()

const previewDashboardSales = [
  { number: '9854', time: '19:45:00', total: 15500, quantity: 3, method: 'ငွေသား' },
  { number: '9853', time: '18:20:00', total: 32500, quantity: 5, method: 'KPay' },
  { number: '9852', time: '17:05:00', total: 8000, quantity: 2, method: 'Wave Pay' },
  { number: '9851', time: '16:40:00', total: 12000, quantity: 4, method: 'ငွေသား' },
  { number: '9850', time: '14:25:00', total: 28000, quantity: 6, method: 'KPay' },
  { number: '9849', time: '13:10:00', total: 9500, quantity: 2, method: 'ငွေသား' },
  { number: '9848', time: '11:55:00', total: 21500, quantity: 4, method: 'Wave Pay' },
  { number: '9847', time: '10:15:00', total: 17500, quantity: 3, method: 'KPay' },
].map((sale) => ({
  id: `demo-sale-${sale.number}`, orderNumber: sale.number, date: previewToday, createdAt: `${previewToday}T${sale.time}+06:30`, completedAt: `${previewToday}T${sale.time}+06:30`,
  customer: { name: 'လမ်းလျှောက်ဝယ်သူ' }, fulfillmentStatus: 'completed', paymentStatus: 'paid', paymentMethod: sale.method, paidAmount: sale.total, balanceDue: 0,
  subtotal: sale.total, discount: 0, deliveryFee: 0, total: sale.total, source: 'Preview POS',
  items: [{ id: `demo-sale-${sale.number}-item`, productId: 'demo-coke', type: 'Coca-Cola 330ml', quantity: sale.quantity, unitPrice: Math.round(sale.total / sale.quantity), unitCost: 800, lineTotal: sale.total }],
}))

// Temporary no-login test store. It deliberately mirrors the same product/barcode/stock data
// used by the inventory examples; authenticated shops always load from PostgreSQL instead.
export const previewDemoData = {
  ...emptyData,
  categories: [
    { id: 'demo-cat-beauty', name: 'အလှကုန်' },
    { id: 'demo-cat-drink', name: 'အအေး' },
    { id: 'demo-cat-general', name: 'အထွေထွေ' },
  ],
  products: [
    // The no-login POS uses the exact same four product demos displayed on the
    // product page. The four-digit product code is also the scan value.
    { id: 'demo-jasmine', sku: '1001', name: 'Jasmine အနံ့ဆီ', categoryId: 'demo-cat-beauty', price: 3500, cost: 2900, isActive: true, quantity: 68, barcodes: [{ value: '1001' }] },
    { id: 'demo-nivea', sku: '1002', name: 'Nivea Roll on', categoryId: 'demo-cat-beauty', price: 6500, cost: 5800, isActive: true, quantity: 29, previewPromotion: { name: 'အလှကုန် အထူးလျှော့စျေး', type: 'PERCENTAGE', value: 10, minQuantity: 1, startsAt: '2026-01-01', endsAt: '2026-12-31', conditionLabel: 'Nivea Roll on အတွက် သတ်မှတ်ထားသော ပရိုမိုးရှင်းနှင့် ကိုက်ညီသည်' }, barcodes: [{ value: '1002' }] },
    { id: 'demo-coke', sku: '1228', name: 'Coca-Cola 330ml', categoryId: 'demo-cat-drink', price: 1000, cost: 800, isActive: true, quantity: 20, barcodes: [{ value: '1228' }] },
    { id: 'demo-betel', sku: '1004', name: 'ကွမ်းယာ', categoryId: 'demo-cat-general', price: 5000, cost: 4300, isActive: true, quantity: 9, barcodes: [{ value: '1004' }] },
    { id: 'demo-coffee', sku: '1029', name: 'Premium Coffee Beans', categoryId: 'demo-cat-general', price: 13000, cost: 9800, isActive: true, quantity: 2, barcodes: [{ value: '1029' }] },
    { id: 'demo-green-tea', sku: '1033', name: 'Organic Green Tea', categoryId: 'demo-cat-general', price: 4500, cost: 3200, isActive: true, quantity: 5, barcodes: [{ value: '1033' }] },
    { id: 'demo-almond-milk', sku: '1045', name: 'Almond Milk 1L', categoryId: 'demo-cat-general', price: 9600, cost: 7800, isActive: true, quantity: 0, barcodes: [{ value: '1045' }] },
    { id: 'demo-sugar', sku: '1056', name: 'သကြားဖြူ ၁ ကီလို', categoryId: 'demo-cat-general', price: 4200, cost: 3600, isActive: true, quantity: 3, barcodes: [{ value: '1056' }] },
    { id: 'demo-cooking-oil', sku: '1064', name: 'ဟင်းသီးဟင်းရွက်ဆီ ၁ လီတာ', categoryId: 'demo-cat-general', price: 8500, cost: 7100, isActive: true, quantity: 0, barcodes: [{ value: '1064' }] },
  ],
  stocks: [
    { id: 'demo-stock-jasmine', productId: 'demo-jasmine', quantity: 68, unitCost: 2900, price: 3500 },
    { id: 'demo-stock-nivea', productId: 'demo-nivea', quantity: 29, unitCost: 5800, price: 6500 },
    { id: 'demo-stock-coke', productId: 'demo-coke', quantity: 20, unitCost: 800, price: 1000 },
    { id: 'demo-stock-betel', productId: 'demo-betel', quantity: 9, unitCost: 4300, price: 5000 },
    { id: 'demo-stock-coffee', productId: 'demo-coffee', quantity: 2, unitCost: 9800, price: 13000 },
    { id: 'demo-stock-green-tea', productId: 'demo-green-tea', quantity: 5, unitCost: 3200, price: 4500 },
    { id: 'demo-stock-almond-milk', productId: 'demo-almond-milk', quantity: 0, unitCost: 7800, price: 9600 },
    { id: 'demo-stock-sugar', productId: 'demo-sugar', quantity: 3, unitCost: 3600, price: 4200 },
    { id: 'demo-stock-cooking-oil', productId: 'demo-cooking-oil', quantity: 0, unitCost: 7100, price: 8500 },
  ],
  suppliers: [{ id: 'demo-supplier-pahtama', name: 'Pahtama Group', phone: '09666655928' }],
  expenses: [{ id: 'demo-expense-today', title: 'ဆိုင်အသုံးစရိတ်', amount: 15000, method: 'ငွေသား', spentAt: `${previewToday}T09:00:00+06:30`, note: 'နေ့စဉ် ဆိုင်သုံးကုန်ကျစရိတ်' }],
  purchases: [{
    id: 'demo-purchase-paid', purchaseNumber: 'PO-00001', status: 'received', total: 50000, paidAmount: 50000,
    supplier: { id: 'demo-supplier-pahtama', name: 'Pahtama Group' }, receivedAt: `${previewToday}T10:30:00+06:30`,
    items: [{ id: 'demo-purchase-paid-item', productName: 'Jasmine အနံ့ဆီ', quantity: 10, unitCost: 5000, lineTotal: 50000 }],
    payments: [{ id: 'demo-supplier-payment-today', amount: 50000, method: 'KPay', reference: 'KPay-20260809-001', mobileAccountName: 'Pahtama Group KPay', notes: 'KPay ဖြင့် ကုန်ပစ္စည်းဖိုးရှင်းပြီး', paidAt: `${previewToday}T10:35:00+06:30` }],
  }, {
    id: 'demo-purchase-cash-paid', purchaseNumber: 'PO-00003', status: 'received', total: 26000, paidAmount: 26000,
    supplier: { id: 'demo-supplier-pahtama', name: 'Pahtama Group' }, receivedAt: `${previewToday}T12:10:00+06:30`,
    items: [{ id: 'demo-purchase-cash-item', productName: 'Coca-Cola 330ml', quantity: 26, unitCost: 1000, lineTotal: 26000 }],
    payments: [{ id: 'demo-supplier-payment-cash', amount: 26000, method: 'ငွေသား', payerName: 'ကိုအောင်လင်း', payerPhone: '09976543210', notes: 'ကုန်ပစ္စည်းဖိုး ငွေသားလက်မှတ်ဖြင့် ရှင်းပြီး', signatureDataUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 180"%3E%3Crect width="600" height="180" fill="white"/%3E%3Cpath d="M55 118 C90 30 115 145 150 72 S220 150 255 80 S320 140 350 65 S410 125 455 72 S510 135 550 58" fill="none" stroke="%2300785b" stroke-width="7" stroke-linecap="round"/%3E%3Ctext x="55" y="157" font-family="sans-serif" font-size="22" fill="%23607569"%3Eကိုအောင်လင်း%3C/text%3E%3C/svg%3E', paidAt: `${previewToday}T12:15:00+06:30` }],
  }, {
    id: 'demo-purchase-payable', purchaseNumber: 'PO-00002', status: 'received', total: 28000, paidAmount: 0,
    supplier: { id: 'demo-supplier-pahtama', name: 'Pahtama Group' }, receivedAt: `${previewToday}T11:15:00+06:30`, payments: [],
  }],
  orders: [
    {
      id: 'demo-sale-9855', orderNumber: '9855', date: previewToday, createdAt: `${previewToday}T20:30:00+06:30`, completedAt: `${previewToday}T20:30:00+06:30`,
      customer: { name: 'လမ်းလျှောက်ဝယ်သူ' }, fulfillmentStatus: 'completed', paymentStatus: 'paid', paidAmount: 180000, balanceDue: 0,
      subtotal: 180000, discount: 0, deliveryFee: 0, total: 180000, source: 'Preview POS',
      items: [
        { id: 'demo-sale-9855-jasmine', productId: 'demo-jasmine', type: 'Jasmine အနံ့ဆီ', quantity: 36, unitPrice: 3500, lineTotal: 126000 },
        { id: 'demo-sale-9855-nivea', productId: 'demo-nivea', type: 'Nivea Roll on', quantity: 8, unitPrice: 6500, lineTotal: 52000 },
        { id: 'demo-sale-9855-coke', productId: 'demo-coke', type: 'Coca-Cola 330ml', quantity: 2, unitPrice: 1000, lineTotal: 2000 },
      ],
    },
    {
      id: 'demo-sale-3695', orderNumber: '3695', date: previewToday, createdAt: `${previewToday}T15:30:00+06:30`, completedAt: `${previewToday}T15:30:00+06:30`,
      customer: { name: 'ဒေါ်မိုး' }, fulfillmentStatus: 'completed', paymentStatus: 'unpaid', paidAmount: 0, balanceDue: 10000,
      subtotal: 10000, discount: 0, deliveryFee: 0, total: 10000, source: 'Preview POS',
      items: [{ id: 'demo-sale-3695-betel', productId: 'demo-betel', type: 'ကွမ်းယာ', quantity: 2, unitPrice: 5000, lineTotal: 10000 }],
    },
    ...previewDashboardSales,
  ],
  dashboard: { summary: { revenue: 190000, profit: 62450, cashBalance: 32450, categoriesCount: 3, stockUnits: 119, lowStockCount: 1, expenses: 15000 }, lowStock: [], upcomingPayables: [], recentSales: [] },
}

function shopIdFrom(uid) {
  return getStoredShopId() || uid
}

function dateOnly(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
}

function uniqueItems(items) {
  return [...new Set(items.filter(Boolean).map((item) => String(item).trim()).filter(Boolean))]
}

function variantSize(variant) {
  return variantOptionValue(variant, 0, variant?.option1 || variant?.name || 'Default')
}

function variantColor(variant) {
  return variantOptionValue(variant, 1, variant?.option2 || variant?.option3 || '-')
}

function mapProduct(product) {
  return {
    ...product,
    optionTree: normalizeOptionTree(product.optionTree),
    variants: (product.variants || []).filter((variant) => !variant.isDefault).map((variant) => ({
      ...variant,
      optionPath: normalizeOptionPath(variant.optionPath),
      displayName: variantDisplayName(variant),
    })),
  }
}

function mapStock(batch) {
  const variant = batch.variant || null
  const product = batch.product || {}
  return {
    id: String(batch.id),
    productId: batch.productId,
    variantId: batch.variantId,
    variantName: variantDisplayName(variant),
    optionPath: normalizeOptionPath(variant?.optionPath),
    date: dateOnly(batch.receivedAt || batch.createdAt),
    deli: 0,
    size: variantSize(variant),
    color: variantColor(variant),
    type: product.name || '-',
    unitCost: Number(batch.unitCost || 0),
    salePrice: Number(variant?.price ?? product.price ?? 0),
    price: Number(variant?.price ?? product.price ?? 0),
    quantity: Number(batch.quantity || 0),
    reservedQuantity: Number(batch.reservedQuantity || 0),
    note: batch.note || '',
  }
}

function mapLedgerStock(balance, legacyBatches = []) {
  const matchingBatch = legacyBatches.find(
    (batch) => String(batch.productId) === String(balance.productId)
      && String(batch.variantId || '') === String(balance.variantId || ''),
  )
  const variant = balance.variant || matchingBatch?.variant || null
  const product = balance.product || matchingBatch?.product || {}
  return {
    id: String(matchingBatch?.id || balance.id),
    ledgerBalanceId: String(balance.id),
    ledgerVersion: Number(balance.version || 0),
    locationId: balance.locationId,
    locationName: balance.location?.name || '',
    ledgerMode: true,
    productId: balance.productId,
    variantId: balance.variantId,
    variantName: variantDisplayName(variant),
    optionPath: normalizeOptionPath(variant?.optionPath),
    date: dateOnly(balance.updatedAt || balance.createdAt),
    deli: 0,
    size: variantSize(variant),
    color: variantColor(variant),
    type: product.name || '-',
    unitCost: Number(matchingBatch?.unitCost ?? product.cost ?? 0),
    salePrice: Number(variant?.price ?? product.price ?? 0),
    price: Number(variant?.price ?? product.price ?? 0),
    quantity: Number(balance.onHand || 0),
    reservedQuantity: Number(balance.reserved || 0),
    note: balance.location?.name ? `Location: ${balance.location.name}` : '',
  }
}

function mapPayment(payment) {
  return {
    ...payment,
    id: String(payment.id),
    orderId: payment.orderId ? String(payment.orderId) : null,
    orderIds: Array.isArray(payment.orderIds) ? payment.orderIds.map(String) : [],
    allocations: Array.isArray(payment.allocations) ? payment.allocations : [],
    amount: Number(payment.amount || 0),
    date: dateOnly(payment.paidAt || payment.createdAt),
    paidAt: payment.paidAt,
    refunded: payment.type === 'refund',
  }
}

function mapOrder(order, payments = []) {
  const directPayments = payments.filter(
    (payment) => payment.orderId === order.id && payment.type === 'payment',
  )
  const directPayment = directPayments.find((payment) => Number(payment.amount || 0) > 0)
  const settlement = payments.find(
    (payment) => payment.scope === 'cod-settlement' && payment.orderIds?.map(String).includes(String(order.id)),
  )
  const refund = payments.find(
    (payment) => payment.orderId === order.id && payment.type === 'refund',
  )
  const payment = directPayment || settlement || null
  const directPaidAmount = directPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  const settlementPaidAmount = settlement?.allocations?.find((allocation) => String(allocation.orderId) === String(order.id))?.amount || 0
  const paidAmount = Math.max(0, directPaidAmount + Number(settlementPaidAmount || 0))
  const advancedPaymentAmount = directPayments
    .filter((payment) => payment.scope === 'advanced-payment' || /advanced payment/i.test(String(payment.note || '')))
    .reduce((sum, payment) => sum + Math.max(0, Number(payment.amount || 0)), 0)

  return {
    id: String(order.id),
    orderNumber: order.orderNumber || '',
    customer: {
      name: order.customer?.name || '',
      phone: order.customer?.phone || '',
      city: order.customer?.city || '',
      address: order.customer?.address || '',
    },
    items: (order.items || []).map((item) => ({
      id: String(item.id),
      productId: item.productId,
      variantId: item.variantId,
      trackingMode: item.product?.trackingMode || 'NONE',
      type: item.productName || item.product?.name || '-',
      size: variantSize(item.variant),
      color: variantColor(item.variant),
      variantName: variantDisplayName(item.variant),
      optionPath: normalizeOptionPath(item.variant?.optionPath),
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.baseUnitPrice ?? item.unitPrice ?? 0),
      unitCost: Number(item.unitCost || 0),
      discount: Number(item.discount || 0),
      promotionId: item.promotionId || '',
      promotionName: item.pricingSnapshot?.promotionName || '',
      promotionDiscount: Number(item.promotionDiscount || 0),
      regularUnitPrice: Number(item.regularUnitPrice ?? item.unitPrice ?? 0),
      deductionType: item.deductionType === 'advance-payment' ? 'advance-payment' : 'discount',
      lineTotal: Number(item.lineTotal || 0),
      allocations: (item.allocations || []).map((allocation) => ({
        stockBatchId: String(allocation.inventoryBatchId || allocation.stockBatchId),
        quantity: Number(allocation.quantity || 0),
        unitCost: Number(allocation.unitCost || 0),
      })),
      serials: (item.serialAllocations || []).map((allocation) => ({
        id: allocation.serialId || allocation.serial?.id,
        serial: allocation.serial?.serial || allocation.serialId,
        imei: allocation.serial?.imei || '',
        status: allocation.serial?.status || '',
      })),
      modifiers: (item.modifierSelections || []).map((selection) => ({
        id: selection.modifierOptionId || selection.id,
        name: selection.optionName,
        groupName: selection.groupName,
        priceDelta: Number(selection.priceDelta || 0),
      })),
    })),
    date: dateOnly(order.completedAt || order.items?.find((item) => item.recognizedAt)?.recognizedAt || order.createdAt),
    subtotal: Number(order.subtotal || 0),
    discount: Number(order.discount || 0),
    deliveryFee: Number(order.deliveryFee || 0),
    total: Number(order.total || 0),
    paidAmount,
    balanceDue: Math.max(0, Number(order.total || 0) - paidAmount),
    advancedPaymentAmount,
    fulfillmentStatus: order.fulfillmentStatus || 'reserved',
    paymentStatus: order.paymentStatus || 'unpaid',
    paymentMethod: payment?.method || '',
    source: order.source || '',
    remark: order.note || '',
    paymentId: payment?.id || null,
    refundId: order.refundId || refund?.id || null,
    createdAt: order.createdAt,
    completedAt: order.completedAt,
    updatedAt: order.updatedAt,
    received: order.paymentStatus === 'paid',
    paid: order.paymentStatus !== 'unpaid',
  }
}

function mapExpense(expense) {
  return {
    ...expense,
    id: String(expense.id),
    title: expense.title,
    amount: Number(expense.amount || 0),
    type: expense.category || 'General',
    category: expense.category || 'General',
    method: expense.method || 'Other',
    transactionId: expense.transactionId || '',
    date: dateOnly(expense.spentAt || expense.createdAt),
    spentAt: expense.spentAt,
    note: expense.note || '',
  }
}

function mapAdjustment(adjustment) {
  const stock = mapStock(adjustment.inventoryBatch || {})
  return {
    id: String(adjustment.id),
    stockBatchId: String(adjustment.inventoryBatchId),
    action: adjustment.action === 'REMOVE' ? 'SUB' : adjustment.action,
    qty: Number(adjustment.quantity || 0),
    quantity: Number(adjustment.quantity || 0),
    beforeQuantity: Number(adjustment.beforeQuantity || 0),
    afterQuantity: Number(adjustment.afterQuantity || 0),
    reason: adjustment.reason || '',
    date: dateOnly(adjustment.createdAt),
    size: stock.size,
    color: stock.color,
    type: stock.type,
  }
}

async function loadUserData(uid) {
  const shopId = shopIdFrom(uid)
  if (!shopId) return emptyData

  const [
    categoriesResult,
    productsResult,
    inventoryResult,
    ordersResult,
    paymentsResult,
    expensesResult,
    adjustmentsResult,
    dashboardResult,
    customersResult,
    settingsResult,
    suppliersResult,
    productSuppliersResult,
    purchasesResult,
    configurationResult,
    unitsResult,
    balancesResult,
    movementsResult,
    locationsResult,
    lotsResult,
    serialsResult,
    warrantiesResult,
    recipesResult,
    priceGroupsResult,
  ] = await Promise.all([
    api.categories(shopId),
    api.products(shopId),
    api.inventory(shopId),
    api.orders(shopId),
    api.payments(shopId),
    api.expenses(shopId),
    api.adjustments(shopId),
    api.dashboard(shopId).catch(() => ({ summary: null })),
    api.customers(shopId).catch(() => ({ customers: [] })),
    api.shopSettings(shopId).catch(() => ({ settings: normalizeCatalogSettings() })),
    api.suppliers(shopId).catch(() => ({ suppliers: [] })),
    api.productSuppliers(shopId).catch(() => ({ productSuppliers: [] })),
    api.purchases(shopId).catch(() => ({ purchases: [] })),
    api.storeConfiguration(shopId).catch(() => ({ configuration: null })),
    api.units(shopId).catch(() => ({ units: [] })),
    api.inventoryBalances(shopId).catch(() => ({ balances: [] })),
    api.inventoryMovements(shopId).catch(() => ({ movements: [] })),
    api.inventoryLocations(shopId).catch(() => ({ locations: [] })),
    api.inventoryLots(shopId).catch(() => ({ lots: [] })),
    api.inventorySerials(shopId).catch(() => ({ serials: [] })),
    api.warranties(shopId).catch(() => ({ warranties: [] })),
    api.recipes(shopId).catch(() => ({ recipes: [] })),
    api.priceGroups(shopId).catch(() => ({ priceGroups: [] })),
  ])

  const payments = (paymentsResult.payments || []).map(mapPayment)
  const orders = normalizeOrders((ordersResult.orders || []).map((order) => mapOrder(order, payments)))
  const legacyInventory = inventoryResult.inventory || []
  const ledgerReadEnabled = configurationResult.configuration?.inventoryReadMode === 'LEDGER'
  const stocks = ledgerReadEnabled
    ? (balancesResult.balances || []).map((balance) => mapLedgerStock(balance, legacyInventory))
    : legacyInventory.map(mapStock)
  const expenses = (expensesResult.expenses || []).map(mapExpense)
  const adjustments = (adjustmentsResult.adjustments || []).map(mapAdjustment)
  const products = (productsResult.products || []).map(mapProduct)
  const catalogSettings = normalizeCatalogSettings(settingsResult.settings)
  const productTypes = uniqueItems([
    ...products.map((product) => product.name),
    ...stocks.map((stock) => stock.type),
  ])
  const option1Values = uniqueCatalogValues([
    ...catalogSettings.option1Values,
    ...products.flatMap((product) => (product.variants || []).map(variantSize)),
    ...stocks.map((stock) => stock.size),
  ]).filter((item) => item !== '-')
  const option2Values = uniqueCatalogValues([
    ...catalogSettings.option2Values,
    ...products.flatMap((product) => (product.variants || []).map(variantColor)),
    ...stocks.map((stock) => stock.color),
  ]).filter((item) => item !== '-')

  return {
    records: groupOrdersByMonth(orders),
    orders,
    stocks,
    payments,
    expenses,
    adjustments,
    productTypes,
    productColors: option2Values,
    option1Values,
    option2Values,
    catalogSettings: {
      ...catalogSettings,
      option1Values,
      option2Values,
    },
    products,
    categories: categoriesResult.categories || [],
    customers: customersResult.customers || [],
    dashboard: dashboardResult.summary || dashboardResult,
    suppliers: suppliersResult.suppliers || [],
    productSuppliers: productSuppliersResult.productSuppliers || [],
    purchases: purchasesResult.purchases || [],
    storeConfiguration: configurationResult.configuration || null,
    units: unitsResult.units || [],
    inventoryBalances: balancesResult.balances || [],
    inventoryMovements: movementsResult.movements || [],
    inventoryLocations: locationsResult.locations || [],
    inventoryLots: lotsResult.lots || [],
    inventorySerials: serialsResult.serials || [],
    warranties: warrantiesResult.warranties || [],
    recipes: recipesResult.recipes || [],
    priceGroups: priceGroupsResult.priceGroups || [],
  }
}

export function subscribeUserData(uid, onData, onError) {
  let active = true

  loadUserData(uid)
    .then((nextData) => {
      if (active) onData(nextData)
    })
    .catch((error) => {
      if (active) onError(error)
    })

  return () => {
    active = false
  }
}

async function ensureProduct(shopId, stock) {
  const products = (await api.products(shopId)).products || []
  const existing = products.find((product) => product.name === stock.type)
  if (existing) return existing

  const result = await api.createProduct(shopId, {
    name: stock.type || 'General Product',
    price: Number(stock.salePrice || stock.price || 0),
    cost: Number(stock.unitCost || 0),
  })
  return result.product
}

async function ensureVariant(shopId, product, stock) {
  if (stock.variantId) {
    const existingById = (product.variants || []).find((variant) => String(variant.id) === String(stock.variantId))
    if (existingById) return existingById
  }

  const size = stock.size || 'Other'
  const color = stock.color || '-'
  const variants = product.variants || []
  const existing = variants.find(
    (variant) => variantSize(variant) === size && variantColor(variant) === color,
  )
  if (existing) return existing

  const result = await api.createVariant(shopId, product.id, {
    name: color && color !== '-' ? `${size} / ${color}` : size,
    price: Number(stock.salePrice || stock.price || product.price || 0),
    cost: Number(stock.unitCost || product.cost || 0),
    option1: size,
    option2: color,
  })
  return result.variant
}

async function productVariantForLine(shopId, line, stocks = []) {
  const allocatedStock = line.allocations?.[0]?.stockBatchId
    ? stocks.find((stock) => String(stock.id) === String(line.allocations[0].stockBatchId))
    : null
  const source = allocatedStock || line
  const product = await ensureProduct(shopId, {
    type: source.type,
    salePrice: source.unitPrice,
    price: source.unitPrice,
    unitCost: source.unitCost,
  })
  const variant = await ensureVariant(shopId, product, {
    size: source.size,
    color: source.color,
    salePrice: source.unitPrice,
    price: source.unitPrice,
    unitCost: source.unitCost,
  })
  return { product, variant }
}

function paymentPayload(details, amount) {
  const isCod = details.isCod ?? isCodPaymentMethod(details.method, details.settings || {})
  const isCash = String(details.method || '').trim().toLowerCase() === 'cash'
  return {
    method: details.method,
    scope: details.scope,
    amount: Number(details.amount || amount || 0),
    billNumber: isCod ? details.billNumber : undefined,
    transactionId: isCash ? undefined : details.transactionId,
    note: details.note,
    paidAt: details.date ? new Date(details.date).toISOString() : undefined,
  }
}

export async function saveCatalogItems(uid, key, items) {
  const shopId = shopIdFrom(uid)
  if (key === 'productTypes') {
    const products = (await api.products(shopId)).products || []
    for (const item of items) {
      if (!products.some((product) => product.name === item)) {
        await api.createProduct(shopId, { name: item, price: 0, cost: 0 })
      }
    }
  }

  if (key === 'option1Values') {
    await api.updateShopSettings(shopId, { option1Values: uniqueItems(items) })
  }
  if (key === 'productColors' || key === 'option2Values') {
    await api.updateShopSettings(shopId, { option2Values: uniqueItems(items) })
  }
}

export async function saveCatalogSettings(uid, settings) {
  return api.updateShopSettings(shopIdFrom(uid), settings)
}

export async function savePaymentMethods(uid, paymentMethods) {
  return api.updateShopSettings(shopIdFrom(uid), { paymentMethods })
}

export async function createProductDocument(uid, product) {
  const requestedTrackingMode = product.trackingMode || 'NONE'
  const capabilities = Array.isArray(product.capabilities)
    ? Object.fromEntries(product.capabilities.map((capability) => [capability, true]))
    : product.capabilities
  return api.createProduct(shopIdFrom(uid), {
    name: product.name,
    sku: product.sku,
    description: product.description,
    price: Number(product.price || 0),
    cost: Number(product.cost || 0),
    optionTree: normalizeOptionTree(product.optionTree),
    categoryId: product.categoryId || undefined,
    trackingMode: requestedTrackingMode === 'EXPIRY' ? 'LOT' : requestedTrackingMode,
    quantityPrecision: requestedTrackingMode === 'SERIAL' ? 0 : Number(product.quantityPrecision || 0),
    capabilities: {
      ...(capabilities || {}),
      ...(requestedTrackingMode === 'EXPIRY' ? { 'inventory.lots': true, 'inventory.expiry': true } : {}),
    },
    units: product.units,
  })
}

export async function createCustomerDocument(uid, customer) {
  return api.createCustomer(shopIdFrom(uid), customer)
}

export const createSupplierDocument = (uid, supplier) =>
  api.createSupplier(shopIdFrom(uid), supplier)
export const saveProductSupplierDocument = (uid, productSupplier) =>
  api.saveProductSupplier(shopIdFrom(uid), productSupplier)
export const createPurchaseDocument = (uid, purchase) =>
  api.createPurchase(shopIdFrom(uid), purchase)
export const sendPurchaseDocument = (uid, purchaseId) =>
  api.sendPurchase(shopIdFrom(uid), purchaseId)
export const receivePurchaseDocument = (uid, purchaseId, receipt, idempotencyKey) =>
  api.receivePurchase(shopIdFrom(uid), purchaseId, receipt, idempotencyKey)
export const payPurchaseDocument = (uid, purchaseId, payment) =>
  api.payPurchase(shopIdFrom(uid), purchaseId, payment)
export const reversePurchasePaymentDocument = (uid, purchaseId, paymentId, payload) =>
  api.reversePurchasePayment(shopIdFrom(uid), purchaseId, paymentId, payload)
export const returnPurchaseDocument = (uid, purchaseId, payload) =>
  api.returnPurchase(shopIdFrom(uid), purchaseId, payload)

export async function updateProductDocument(uid, productId, product) {
  const requestedTrackingMode = product.trackingMode
  const capabilities = Array.isArray(product.capabilities)
    ? Object.fromEntries(product.capabilities.map((capability) => [capability, true]))
    : product.capabilities
  return api.updateProduct(shopIdFrom(uid), productId, {
    name: product.name,
    sku: product.sku,
    description: product.description,
    price: Number(product.price || 0),
    cost: Number(product.cost || 0),
    categoryId: product.categoryId || undefined,
    isActive: product.isActive,
    optionTree: normalizeOptionTree(product.optionTree),
    ...(requestedTrackingMode ? {
      trackingMode: requestedTrackingMode === 'EXPIRY' ? 'LOT' : requestedTrackingMode,
      quantityPrecision: requestedTrackingMode === 'SERIAL' ? 0 : Number(product.quantityPrecision || 0),
      capabilities: {
        ...(capabilities || {}),
        ...(requestedTrackingMode === 'EXPIRY' ? { 'inventory.lots': true, 'inventory.expiry': true } : {}),
      },
    } : {}),
  })
}

export async function deleteProductDocument(uid, productId) {
  return api.deleteProduct(shopIdFrom(uid), productId)
}

export async function createVariantDocument(uid, productId, variant) {
  return api.createVariant(shopIdFrom(uid), productId, {
    name: variant.name,
    price: Number(variant.price || 0),
    cost: Number(variant.cost || 0),
    optionPath: normalizeOptionPath(variant.optionPath),
    isActive: variant.isActive ?? true,
  })
}

export async function updateVariantDocument(uid, productId, variantId, variant) {
  return api.updateVariant(shopIdFrom(uid), productId, variantId, {
    name: variant.name,
    price: Number(variant.price || 0),
    cost: Number(variant.cost || 0),
    optionPath: normalizeOptionPath(variant.optionPath),
    isActive: variant.isActive,
  })
}

export async function deleteVariantDocument(uid, productId, variantId) {
  return api.deleteVariant(shopIdFrom(uid), productId, variantId)
}

export async function createOrderAtomic(uid, order, stocks, _existingOrders, paymentDetails = null) {
  const shopId = shopIdFrom(uid)
  const items = []

  for (const item of order.items) {
    const resolved = item.productId
      ? { product: { id: item.productId }, variant: item.variantId ? { id: item.variantId } : null }
      : await productVariantForLine(shopId, item, stocks)
    items.push({
      productId: resolved.product.id,
      variantId: resolved.variant?.id || undefined,
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unitPrice || 0),
      discount: Number(item.discount || 0),
      deductionType: item.deductionType || 'discount',
      ...(item.unitId ? { unitId: item.unitId } : {}),
      ...(item.serialIds?.length ? { serialIds: item.serialIds } : {}),
      ...(item.lotId ? { lotId: item.lotId, lotOverrideReason: item.lotOverrideReason } : {}),
      ...(item.modifierOptionIds?.length ? { modifierOptionIds: item.modifierOptionIds } : {}),
    })
  }

  const result = await api.createOrder(shopId, {
    customer: order.orderType === 'in-store' ? undefined : order.customer,
    fulfillmentStatus: ['new', 'confirmed', 'preparing', 'ready', 'preorder'].includes(order.fulfillmentStatus)
      ? order.fulfillmentStatus
      : 'reserved',
    discount: Number(order.discount || 0),
    deliveryFee: Number(order.deliveryFee || 0),
    source: order.source,
    note: order.remark,
    items,
  })

  if (paymentDetails) {
    await api.receivePayment(shopId, result.order.id, paymentPayload(paymentDetails, Number(result.order.total || 0)))
  }

  if (order.orderType === 'in-store') {
    await api.completeOrder(shopId, result.order.id, 'completed')
  }

  return result.order
}

export async function updateOrderDocument() {
  throw new Error('Order editing is not supported by the API yet.')
}

export async function deleteOrderDocument(uid, order) {
  return api.deleteOrder(shopIdFrom(uid), order.id)
}

export async function cancelOrderAtomic(uid, orderId, reason = 'Order cancelled') {
  return api.cancelOrder(shopIdFrom(uid), orderId, reason)
}

export async function fulfillPreorderAtomic(uid, order) {
  return api.fulfillPreorder(shopIdFrom(uid), order.id)
}

export async function setOrderFulfillmentStatus(uid, orderId, nextStatus) {
  return api.completeOrder(shopIdFrom(uid), orderId, nextStatus)
}

export async function receivePaymentAtomic(uid, orderId, details) {
  return api.receivePayment(shopIdFrom(uid), orderId, paymentPayload(details, Number(details.amount || 0) || undefined))
}

export async function receiveCodSettlementAtomic(uid, allocations, details) {
  return api.receiveCodSettlement(shopIdFrom(uid), {
    amount: Number(details.amount || 0),
    billNumber: details.billNumber,
    transactionId: details.transactionId,
    note: details.note,
    paidAt: details.date ? new Date(details.date).toISOString() : undefined,
    allocations: allocations.map((allocation) => ({
      orderId: allocation.orderId,
      amount: Number(allocation.amount || 0),
      phone: allocation.phone,
      customerName: allocation.customerName,
    })),
  })
}

export async function voidCodSettlementAtomic(uid, payment, reason) {
  return api.voidCodSettlement(shopIdFrom(uid), payment.id, { reason })
}

export async function refundPaymentAtomic(uid, orderId, details) {
  return api.refundPayment(shopIdFrom(uid), orderId, {
    method: details.method,
    transactionId: details.transactionId,
    originalPaymentId: details.originalPaymentId,
    note: details.reason,
    paidAt: details.date ? new Date(details.date).toISOString() : undefined,
  })
}

export async function returnOrderProducts(uid, orderId, payload, idempotencyKey) {
  return api.returnOrderProducts(shopIdFrom(uid), orderId, payload, idempotencyKey)
}

export async function createStockBatch(uid, stock) {
  const shopId = shopIdFrom(uid)
  const product = stock.productId ? { id: stock.productId } : await ensureProduct(shopId, stock)
  const variant = stock.variantId
    ? { id: stock.variantId }
    : stock.productId
      ? null
      : await ensureVariant(shopId, product, stock)

  const inventory = await api.createInventory(shopId, {
    productId: product.id,
    variantId: variant?.id,
    quantity: Number(stock.quantity || 0),
    unitCost: Number(stock.unitCost || 0),
    deliveryCost: Number(stock.deli || 0) || undefined,
    deliveryMethod: stock.deliveryMethod || stock.method || undefined,
    receivedAt: stock.date ? new Date(stock.date).toISOString() : undefined,
    note: stock.deli ? `Delivery cost: ${stock.deli}` : undefined,
  })

  return inventory
}

export async function deleteStockBatch(uid, stock) {
  return api.deleteInventory(shopIdFrom(uid), stock.id)
}

export async function adjustStockBatch(uid, stock, adjustment) {
  if (stock.ledgerMode && stock.ledgerBalanceIds?.[0]) {
    return api.adjustInventoryOperation(shopIdFrom(uid), {
      balanceId: stock.ledgerBalanceIds[0],
      expectedVersion: Number(stock.ledgerVersions?.[0] || 0),
      action: adjustment.action === 'SUB' ? 'REMOVE' : adjustment.action,
      quantity: String(adjustment.quantity || adjustment.qty || 0),
      reason: adjustment.reason,
      unitCost: Number(stock.unitCost || 0),
    }, crypto.randomUUID())
  }
  return api.adjustInventory(shopIdFrom(uid), stock.ids?.[0] || stock.id, {
    action: adjustment.action,
    quantity: Number(adjustment.quantity || adjustment.qty || 0),
    reason: adjustment.reason,
  })
}

export async function transferStockBalance(uid, stock, transfer) {
  return api.transferInventoryOperation(shopIdFrom(uid), {
    sourceBalanceId: stock.ledgerBalanceIds[0],
    expectedVersion: Number(stock.ledgerVersions?.[0] || 0),
    targetLocationId: transfer.targetLocationId,
    quantity: String(transfer.quantity || 0),
    reason: transfer.reason,
  }, transfer.idempotencyKey || crypto.randomUUID())
}

export async function createExpenseDocument(uid, expense) {
  return api.createExpense(shopIdFrom(uid), {
    title: expense.title,
    category: expense.type,
    method: expense.method,
    amount: Number(expense.amount || 0),
    spentAt: expense.date ? new Date(expense.date).toISOString() : undefined,
    transactionId: expense.transactionId || undefined,
    note: expense.note,
  })
}

export function updateExpenseDocument(uid, expense) {
  return api.updateExpense(shopIdFrom(uid), expense.id, {
    title: expense.title,
    category: expense.type,
    method: expense.method,
    amount: Number(expense.amount || 0),
    spentAt: expense.date ? new Date(expense.date).toISOString() : undefined,
    transactionId: expense.transactionId || undefined,
    note: expense.note,
  })
}

export function deleteExpenseDocument(uid, expenseId) {
  return api.deleteExpense(shopIdFrom(uid), expenseId)
}

export async function deleteUserCollectionDoc() {
  throw new Error('Direct collection deletes are disabled after API migration.')
}

export async function migrateUserDataToV2() {
  return { migratedOrders: 0, skippedOrders: 0 }
}

export async function refreshUserData(uid) {
  return loadUserData(uid)
}
