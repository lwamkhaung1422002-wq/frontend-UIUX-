import { useEffect, useMemo, useState } from 'react'
import { Alert, Box, Button, Divider, IconButton, InputAdornment, MenuItem, Paper, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import PageHeader from '../components/PageHeader.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useData } from '../contexts/DataContext.jsx'
import { useFeedback } from '../contexts/FeedbackContext.jsx'
import { api } from '../services/api.js'
import { formatKs, getToday } from '../utils/storage.js'

const money = (value) => formatKs(Number(value || 0))

function previewPromotionFor(product) {
  try {
    const records = JSON.parse(sessionStorage.getItem('pricing:demo-promotion-records:v2') || '[]')
    const today = getToday()
    const record = records.find((entry) => entry.sku === product.sku && entry.status === 'active' && entry.startsAt <= today && entry.endsAt >= today)
    if (!record) return product.previewPromotion
    return {
      name: record.promotionName,
      type: record.type === 'percent' ? 'PERCENTAGE' : 'FIXED_PRICE',
      value: Number(record.value || 0), minQuantity: Number(record.minimumQuantity || 1),
      startsAt: record.startsAt, endsAt: record.endsAt,
      conditionLabel: 'စျေးနှုန်းနှင့် ပရိုမိုးရှင်းစာမျက်နှာတွင် သတ်မှတ်ထားသော အခြေအနေနှင့် ကိုက်ညီသည်',
    }
  } catch { return product.previewPromotion }
}

function resolvePreviewPrice(product, quantity) {
  const promotion = previewPromotionFor(product)
  const today = getToday()
  const active = promotion && quantity >= Number(promotion.minQuantity || 1)
    && (!promotion.startsAt || promotion.startsAt <= today)
    && (!promotion.endsAt || promotion.endsAt >= today)
  const regularUnitPrice = Number(product.price || 0)
  let promotionDiscount = 0
  if (active && promotion.type === 'PERCENTAGE') promotionDiscount = Math.round(regularUnitPrice * Number(promotion.value || 0) / 100)
  if (active && promotion.type === 'FIXED_DISCOUNT') promotionDiscount = Math.min(regularUnitPrice, Number(promotion.value || 0))
  if (active && promotion.type === 'FIXED_PRICE') promotionDiscount = Math.max(0, regularUnitPrice - Number(promotion.value || 0))
  return {
    regularUnitPrice,
    promotionDiscount,
    finalUnitPrice: regularUnitPrice - promotionDiscount,
    promotionName: active ? promotion.name : '',
    promotionCondition: active ? (promotion.conditionLabel || 'ပရိုမိုးရှင်းသတ်မှတ်ချက်နှင့် ကိုက်ညီသည်') : '',
  }
}

export default function OrderPage({ refresh, requireAuth }) {
  const { user } = useAuth()
  const { data, savePreviewSale } = useData()
  const { notify } = useFeedback()
  const shopId = user.shop?.id
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState([])
  const [method, setMethod] = useState('CASH')
  const [received, setReceived] = useState('')
  const [mobileName, setMobileName] = useState('KBZPay')
  const [transactionId, setTransactionId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState('')
  const [saving, setSaving] = useState(false)

  const products = useMemo(() => (data.products || []).filter((product) => product.isActive !== false), [data.products])
  const availableStockByProductId = useMemo(() => (data.stocks || []).reduce((totals, stock) => {
    const productId = String(stock.productId || '')
    if (!productId) return totals
    totals.set(productId, (totals.get(productId) || 0) + Math.max(0, Number(stock.quantity || 0) - Number(stock.reservedQuantity || 0)))
    return totals
  }, new Map()), [data.stocks])
  const previewInvoiceCount = (data.orders || []).filter((order) => String(order.id).startsWith('preview-invoice-')).length
  const invoiceNumber = user.preview
    ? String(previewInvoiceCount + 1).padStart(5, '0')
    : (nextInvoiceNumber || '...')
  const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.regularPrice, 0)
  const promotionDiscount = cart.reduce((sum, item) => sum + item.quantity * item.promotionDiscount, 0)
  const totalDiscount = promotionDiscount
  const total = Math.max(0, subtotal - totalDiscount)
  const change = Math.max(0, Number(received || 0) - total)
  const matches = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return []
    return products.filter((product) => `${product.sku || ''} ${product.name}`.toLowerCase().includes(term)).slice(0, 8)
  }, [products, search])

  useEffect(() => {
    if (user.preview || !shopId) return undefined
    let active = true
    api.nextOrderNumber(shopId)
      .then((result) => { if (active) setNextInvoiceNumber(result.orderNumber || '') })
      .catch(() => { if (active) setNextInvoiceNumber('') })
    return () => { active = false }
  }, [shopId, user.preview])

  const pricingFor = async (product, quantity) => user.preview
    ? resolvePreviewPrice(product, quantity)
    : (await api.resolvePrice(shopId, { productId: product.id, quantity, channel: 'POS' })).pricing

  const addProduct = async (product) => {
    const existing = cart.find((line) => line.productId === product.id)
    const quantity = Number(existing?.quantity || 0) + 1
    const availableQuantity = Number(availableStockByProductId.get(String(product.id)) || 0)
    if (quantity > availableQuantity) {
      notify('လက်ကျန် မလုံလောက်ပါ', 'warning')
      return
    }
    try {
      const price = await pricingFor(product, quantity)
      const nextLine = {
        productId: product.id, code: product.sku || '-', name: product.name, quantity,
        regularPrice: Number(price.regularUnitPrice ?? product.price ?? 0),
        unitPrice: Number(price.finalUnitPrice ?? product.price ?? 0),
        promotionDiscount: Number(price.promotionDiscount || 0),
        promotionName: price.promotionName || '', promotionCondition: price.promotionName ? `အနည်းဆုံး ${price.promotionMinimumQuantity || 1} မျိုး ရွေးသောအခါ ပရိုမိုးရှင်းလျှော့စျေး ရရှိသည်။` : '', availableQuantity, cost: Number(product.cost || 0),
      }
      setCart((current) => existing ? current.map((line) => line.productId === product.id ? nextLine : line) : [...current, nextLine])
      setSearch('')
    } catch (error) { notify(error.message || 'ပစ္စည်းစျေးနှုန်း မရှာနိုင်ပါ', 'error') }
  }

  const submitProduct = async (event) => {
    event?.preventDefault()
    const value = search.trim().toLowerCase()
    if (!value) return
    const product = products.find((entry) => `${entry.sku || ''} ${entry.name}`.toLowerCase().includes(value))
    if (product) return addProduct(product)
    notify('ကုန်ပစ္စည်း code သို့မဟုတ် အမည် မတွေ့ပါ', 'warning')
  }

  const updateQuantity = async (index, nextQuantity) => {
    const line = cart[index]
    if (!line) return
    const quantity = Math.max(0, Number(nextQuantity || 0))
    if (quantity <= 0) {
      setCart((current) => current.filter((_, currentIndex) => currentIndex !== index))
      return
    }
    if (quantity > Number(line.availableQuantity || 0)) {
      notify('လက်ကျန် မလုံလောက်ပါ', 'warning')
      return
    }
    const product = products.find((entry) => entry.id === line.productId)
    if (!product) return
    try {
      const price = await pricingFor(product, quantity)
      setCart((current) => current.map((item, currentIndex) => currentIndex === index ? {
        ...item, quantity, regularPrice: Number(price.regularUnitPrice ?? product.price ?? 0),
        unitPrice: Number(price.finalUnitPrice ?? product.price ?? 0), promotionDiscount: Number(price.promotionDiscount || 0),
        promotionName: price.promotionName || '', promotionCondition: price.promotionName ? `အနည်းဆုံး ${price.promotionMinimumQuantity || 1} မျိုး ရွေးသောအခါ ပရိုမိုးရှင်းလျှော့စျေး ရရှိသည်။` : '',
      } : item))
    } catch (error) { notify(error.message || 'ပရိုမိုးရှင်းစျေးနှုန်း မရှာနိုင်ပါ', 'error') }
  }

  const changeQuantity = (index, delta) => updateQuantity(index, Number(cart[index]?.quantity || 0) + delta)

  const handleQuantityKey = (event, index) => {
    if (event.key === '+' || event.key === 'ArrowUp') {
      event.preventDefault()
      changeQuantity(index, 1)
    }
    if (event.key === '-' || event.key === 'ArrowDown') {
      event.preventDefault()
      changeQuantity(index, -1)
    }
  }

  const checkout = async () => {
    if (requireAuth?.('create sale')) return
    if (!cart.length) return notify('ကုန်ပစ္စည်း အနည်းဆုံးတစ်မျိုး ထည့်ပါ', 'warning')
    if (method === 'CASH' && Number(received || 0) < total) return notify('လက်ခံရရှိငွေ မလုံလောက်ပါ', 'warning')
    if (method === 'MOBILE' && !/^\d{8}$/.test(transactionId.trim())) return notify('Transaction number နောက်ဆုံး 8 လုံး ထည့်ပါ', 'warning')
    if (method === 'CREDIT' && !customerName.trim()) return notify('အကြွေးဝယ်သူအမည် ထည့်ပါ', 'warning')
    setSaving(true)
    try {
      let savedInvoiceNumber = invoiceNumber
      if (user.preview) {
        const now = new Date().toISOString()
        savePreviewSale({
          id: `preview-invoice-${invoiceNumber}`, orderNumber: invoiceNumber, date: getToday(), createdAt: now, completedAt: now,
          customer: { name: method === 'CREDIT' ? customerName.trim() : 'လမ်းလျှောက်ဝယ်သူ' }, fulfillmentStatus: 'completed',
          paymentStatus: method === 'CREDIT' ? 'unpaid' : 'paid', paidAmount: method === 'CREDIT' ? 0 : total, balanceDue: method === 'CREDIT' ? total : 0,
          subtotal, discount: totalDiscount, deliveryFee: 0, total, paymentMethod: method === 'MOBILE' ? mobileName : method,
          transactionId: method === 'MOBILE' ? transactionId.trim() : '', source: 'Preview POS',
          items: cart.map((item) => ({ id: `${item.productId}-${invoiceNumber}`, productId: item.productId, type: item.name, quantity: item.quantity, unitPrice: item.unitPrice, regularUnitPrice: item.regularPrice, promotionName: item.promotionName, promotionDiscount: item.promotionDiscount, lineTotal: item.quantity * item.unitPrice })),
        })
      } else {
        const created = await api.createOrder(shopId, { customer: method === 'CREDIT' ? { name: customerName.trim() } : undefined, fulfillmentStatus: 'reserved', source: 'POS', items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity, discount: 0 })) })
        savedInvoiceNumber = created.order.orderNumber || invoiceNumber
        if (method !== 'CREDIT') await api.receivePayment(shopId, created.order.id, { method: method === 'MOBILE' ? mobileName : 'ငွေသား', amount: total, ...(method === 'MOBILE' ? { transactionId: transactionId.trim() } : {}) })
        await api.completeOrder(shopId, created.order.id, 'completed')
        await refresh?.()
      }
      notify(`Invoice ${savedInvoiceNumber} ကို သိမ်းပြီးပါပြီ`)
      setCart([]); setReceived(''); setTransactionId(''); setCustomerName('')
      if (!user.preview) {
        const next = await api.nextOrderNumber(shopId)
        setNextInvoiceNumber(next.orderNumber || '')
      }
    } catch (error) { notify(error.message || 'အရောင်းကို မသိမ်းနိုင်ပါ', 'error') } finally { setSaving(false) }
  }

  return <Box className="page-stack pos-page">
    <PageHeader title="အရောင်းစီမံခန့်ခွဲမှု" subtitle="ကုန်ပစ္စည်းရွေးပြီး ငွေရှင်းပါ" />
    <Box className="pos-layout"><Paper className="pos-register" elevation={0}>
      <Box component="form" onSubmit={submitProduct} className="pos-search">
        <TextField fullWidth className="pos-product-search" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); submitProduct(event) } }} placeholder="ကုန်ပစ္စည်းအမည် သို့မဟုတ် code number ဖြင့်ရှာပါ" slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon color="action" /></InputAdornment> } }} />
      </Box>
      {search ? <Paper variant="outlined" className="pos-results">{matches.map((product) => <Button key={product.id} onClick={() => addProduct(product)}><span>{product.sku} · {product.name}</span><strong>{money(product.price)}</strong></Button>)}</Paper> : null}
      <Box className="pos-workspace">
      <Box className="pos-cart-panel">
      <Box className="pos-order-meta-row">
        <Box className="pos-invoice" aria-label={`Invoice number ${invoiceNumber}`}><span>Invoice no.</span><strong>{invoiceNumber}</strong></Box>
        <Box className="pos-cart-heading"><Typography variant="subtitle1" fontWeight={800}>ရွေးထားသောပစ္စည်းများ</Typography><Typography variant="body2" color="text.secondary">{cart.length} မျိုး</Typography></Box>
      </Box>
      <Stack divider={<Divider flexItem />}>{cart.map((item, index) => <Box className="pos-line" key={item.productId}>
        <Box><Typography fontWeight={800}>{item.code} · {item.name}</Typography>{item.promotionDiscount > 0 ? <><Typography variant="caption" display="block" sx={{ textDecoration: 'line-through' }}>တစ်ခုလျှင် {money(item.regularPrice)}</Typography><Typography variant="caption" color="success.main">{item.promotionName} · လျှော့စျေး {money(item.promotionDiscount)}</Typography><Typography variant="caption" color="text.secondary" display="block">{item.promotionCondition}</Typography></> : <Typography variant="caption">တစ်ခုလျှင် {money(item.unitPrice)}</Typography>}<Typography className="pos-stock-available" variant="caption" display="block">လက်ကျန် {Number(item.availableQuantity || 0).toLocaleString('en-US')} မျိုး</Typography></Box>
        <Stack direction="row" alignItems="center" spacing={1.25} className="pos-quantity-control"><IconButton aria-label="အရေအတွက်လျှော့ရန်" onClick={() => changeQuantity(index, -1)}><RemoveRoundedIcon fontSize="large" /></IconButton><TextField className="pos-quantity-input" type="number" value={item.quantity} onChange={(event) => updateQuantity(index, event.target.value)} onKeyDown={(event) => handleQuantityKey(event, index)} slotProps={{ htmlInput: { min: 0, max: item.availableQuantity, step: 1, inputMode: 'numeric', 'aria-label': `${item.name} အရေအတွက်` } }} /><Typography component="output" className="pos-quantity-value">{item.quantity}</Typography><IconButton aria-label="အရေအတွက်တိုးရန်" onClick={() => changeQuantity(index, 1)}><AddRoundedIcon fontSize="large" /></IconButton></Stack>
        <Typography className="pos-line-total">{money(item.quantity * item.unitPrice)}</Typography>
      </Box>)}</Stack>
      {!cart.length ? <Alert severity="info" sx={{ mt: 2 }}>Code number သို့မဟုတ် ကုန်ပစ္စည်းအမည် ရိုက်ပြီး Enter နှိပ်ပါ</Alert> : null}
      </Box>
      <Box className="pos-checkout-panel">
      <Box className="pos-total"><Typography>စုစုပေါင်း</Typography><strong>{money(subtotal)}</strong>{totalDiscount > 0 ? <><Typography>လျှော့စျေး</Typography><strong>− {money(totalDiscount)}</strong></> : null}<Typography variant="h6">ကျသင့်ငွေ ပေါင်း</Typography><Typography variant="h5">{money(total)}</Typography></Box>
      <Divider sx={{ my: 2.5 }} /><Typography className="pos-payment-title">ငွေပေးချေမှု နည်းလမ်း</Typography>
      <ToggleButtonGroup exclusive value={method} onChange={(_, value) => value && setMethod(value)} fullWidth sx={{ mt: 1 }}><ToggleButton value="CASH">ငွေသား</ToggleButton><ToggleButton value="MOBILE">Mobile Payment</ToggleButton><ToggleButton value="CREDIT">အကြွေး</ToggleButton></ToggleButtonGroup>
      {method === 'CASH' ? <Box className="pos-payment-fields"><TextField type="number" label="လက်ခံရရှိငွေ" value={received} onChange={(event) => setReceived(event.target.value)} /><TextField label="ပြန်အမ်းငွေ" value={money(change)} InputProps={{ readOnly: true }} /></Box> : null}
      {method === 'MOBILE' ? <Box className="pos-payment-fields"><TextField select label="Mobile Payment name" value={mobileName} onChange={(event) => setMobileName(event.target.value)}>{['KBZPay', 'AYAPay', 'WavePay'].map((name) => <MenuItem key={name} value={name}>{name}</MenuItem>)}</TextField><TextField label="Transaction number နောက်ဆုံး 8 လုံး" value={transactionId} onChange={(event) => setTransactionId(event.target.value.replace(/\D/g, '').slice(-8))} /></Box> : null}
      {method === 'CREDIT' ? <TextField fullWidth sx={{ mt: 2 }} label="ဝယ်သူအမည်" value={customerName} onChange={(event) => setCustomerName(event.target.value)} /> : null}
      <Button sx={{ mt: 2 }} size="large" fullWidth variant="contained" disabled={saving || !cart.length} onClick={checkout}>{saving ? 'သိမ်းဆည်းနေသည်...' : 'ပြီးဆုံးပြီ'}</Button>
      </Box>
      </Box>
    </Paper></Box>
  </Box>
}
