import { useMemo, useState } from 'react'
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  FormControl, InputLabel, MenuItem, Paper, Select, Stack, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TextField, ToggleButton,
  ToggleButtonGroup, Typography, useMediaQuery,
} from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import PaidRoundedIcon from '@mui/icons-material/PaidRounded'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useData } from '../contexts/DataContext.jsx'
import { useFeedback } from '../contexts/FeedbackContext.jsx'
import { activePaymentMethods } from '../utils/catalog.js'
import { formatKs, getToday } from '../utils/storage.js'
import { calculateFinancialSummary } from '../domain/finance.js'
import { createExpenseDocument, payPurchaseDocument, receivePaymentAtomic } from '../services/shopApiService.js'

const money = (value) => formatKs(Number(value || 0))
const day = (value) => String(value || '').slice(0, 10)
const orderDate = (order) => day(order.completedAt || order.createdAt || order.date)
const inRange = (value, from, to) => (!from || value >= from) && (!to || value <= to)
const paymentDate = (payment) => day(payment.paidAt || payment.date || payment.createdAt)
const isCredit = (order) => order.paymentStatus === 'unpaid' || Number(order.balanceDue || 0) > 0

function Metric({ label, value, tone = '' }) {
  return <Box className={`finance-summary-metric ${tone}`}><Typography>{label}</Typography><strong>{value}</strong></Box>
}

function typeLabel(type) {
  return ({ sale: 'အရောင်းဝင်ငွေ', credit: 'အကြွေးလက်ခံငွေ', supplier: 'supplier ပေးချေမှု', expense: 'ကုန်ကျစရိတ်', refund: 'ပြန်အမ်းငွေ' })[type] || type
}

export default function FinancePage({ refresh, requireAuth }) {
  const mobile = useMediaQuery('(max-width:899px)')
  const { user } = useAuth()
  const { data } = useData()
  const { notify } = useFeedback()
  const [from, setFrom] = useState(getToday)
  const [to, setTo] = useState(getToday)
  const [type, setType] = useState('all')
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [supplierPurchase, setSupplierPurchase] = useState(null)
  const [creditOrder, setCreditOrder] = useState(null)
  const [saving, setSaving] = useState(false)
  const methods = useMemo(() => activePaymentMethods(data.catalogSettings), [data.catalogSettings])
  const defaultMethod = methods[0]?.name || 'ငွေသား'
  const [expense, setExpense] = useState({ title: '', category: 'အခြားကုန်ကျစရိတ်', amount: '', method: defaultMethod, date: getToday(), note: '' })
  const [supplierPayment, setSupplierPayment] = useState({ amount: '', method: defaultMethod, reference: '', paidAt: getToday(), notes: '' })
  const [creditPayment, setCreditPayment] = useState({ amount: '', method: defaultMethod, transactionId: '', date: getToday(), note: '' })

  const orders = useMemo(() => (data.orders || []).filter((order) => order.fulfillmentStatus !== 'cancelled'), [data.orders])
  const periodOrders = useMemo(() => orders.filter((order) => inRange(orderDate(order), from, to)), [orders, from, to])
  const periodExpenses = useMemo(() => (data.expenses || []).filter((item) => inRange(day(item.spentAt || item.date || item.createdAt), from, to)), [data.expenses, from, to])
  const receivables = useMemo(() => orders.filter(isCredit), [orders])
  const purchases = useMemo(() => (data.purchases || []).filter((purchase) => purchase.status !== 'cancelled'), [data.purchases])
  const payables = useMemo(() => (data.purchases || []).filter((purchase) => purchase.status !== 'cancelled' && Number(purchase.total || 0) > Number(purchase.paidAmount || 0)), [data.purchases])

  const summary = useMemo(() => {
    const financial = calculateFinancialSummary(periodOrders, periodExpenses)
    const orderById = new Map(orders.map((order) => [String(order.id), order]))
    let received = 0; let refunds = 0
    ;(data.payments || []).forEach((payment) => {
      if (!inRange(paymentDate(payment), from, to)) return
      if (payment.type === 'refund') { refunds += Number(payment.amount || 0); return }
      if (payment.type === 'payment' && orderById.has(String(payment.orderId))) received += Number(payment.amount || 0)
    })
    const supplierPaid = purchases.flatMap((purchase) => purchase.payments || []).filter((payment) => !payment.reversedAt && inRange(paymentDate(payment), from, to)).reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
    const expenses = periodExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    return { ...financial, received, refunds, supplierPaid, expenses, cashOut: supplierPaid + expenses + refunds, cashMovement: received - supplierPaid - expenses - refunds,
      receivable: receivables.reduce((sum, order) => sum + Number(order.balanceDue || order.total || 0), 0),
      payable: payables.reduce((sum, purchase) => sum + Math.max(0, Number(purchase.total || 0) - Number(purchase.paidAmount || 0)), 0) }
  }, [periodOrders, periodExpenses, data.payments, orders, purchases, payables, receivables, from, to])

  const ledger = useMemo(() => {
    const entries = []
    periodOrders.forEach((order) => entries.push({ id: `sale-${order.id}`, type: isCredit(order) ? 'credit' : 'sale', date: orderDate(order), at: order.completedAt || order.createdAt, reference: `ဘောက်ချာ ${order.orderNumber || String(order.id).slice(-5)}`, method: order.paymentMethod || '-', income: isCredit(order) ? 0 : Number(order.total || 0), expense: 0, order }))
    ;(data.payments || []).filter((payment) => inRange(paymentDate(payment), from, to)).forEach((payment) => {
      const order = orders.find((item) => String(item.id) === String(payment.orderId))
      if (!order) return
      if (payment.type === 'refund') entries.push({ id: `refund-${payment.id}`, type: 'refund', date: paymentDate(payment), at: payment.paidAt || payment.createdAt, reference: `ဘောက်ချာ ${order.orderNumber || String(order.id).slice(-5)}`, method: payment.method || '-', income: 0, expense: Number(payment.amount || 0) })
      else if (payment.type === 'payment' && isCredit(order)) entries.push({ id: `credit-${payment.id}`, type: 'credit', date: paymentDate(payment), at: payment.paidAt || payment.createdAt, reference: `ဘောက်ချာ ${order.orderNumber || String(order.id).slice(-5)}`, method: payment.method || '-', income: Number(payment.amount || 0), expense: 0 })
    })
    purchases.forEach((purchase) => (purchase.payments || []).filter((payment) => !payment.reversedAt && inRange(paymentDate(payment), from, to)).forEach((payment) => entries.push({ id: `supplier-${payment.id}`, type: 'supplier', date: paymentDate(payment), at: payment.paidAt || payment.createdAt, reference: `${purchase.supplier?.name || 'Supplier'} · ${purchase.purchaseNumber || String(purchase.id).slice(-5)}`, method: payment.method || '-', income: 0, expense: Number(payment.amount || 0) })))
    periodExpenses.forEach((item) => entries.push({ id: `expense-${item.id}`, type: 'expense', date: day(item.spentAt || item.date || item.createdAt), at: item.spentAt || item.createdAt, reference: item.title, method: item.method || '-', income: 0, expense: Number(item.amount || 0) }))
    return entries.filter((entry) => type === 'all' || entry.type === type).sort((a, b) => new Date(b.at || b.date).getTime() - new Date(a.at || a.date).getTime())
  }, [periodOrders, periodExpenses, data.payments, orders, purchases, from, to, type])

  const saveExpense = async () => {
    if (!expense.title.trim() || Number(expense.amount) <= 0) return notify('ကုန်ကျစရိတ်အမည်နှင့် ပမာဏမှန်ကန်စွာထည့်ပါ', 'warning')
    if (requireAuth?.('create expense')) return
    setSaving(true)
    try { await createExpenseDocument(user.uid, expense); setExpenseOpen(false); setExpense({ title: '', category: 'အခြားကုန်ကျစရိတ်', amount: '', method: defaultMethod, date: getToday(), note: '' }); await refresh?.(); notify('ကုန်ကျစရိတ်ကို သိမ်းပြီးပါပြီ') } catch (error) { notify(error.message || 'ကုန်ကျစရိတ်မသိမ်းနိုင်ပါ', 'error') } finally { setSaving(false) }
  }
  const saveSupplierPayment = async () => {
    const outstanding = Math.max(0, Number(supplierPurchase?.total || 0) - Number(supplierPurchase?.paidAmount || 0))
    if (Number(supplierPayment.amount) <= 0 || Number(supplierPayment.amount) > outstanding) return notify('ပေးရန်ကျန်ငွေထက် ပို၍မပေးနိုင်ပါ', 'warning')
    setSaving(true)
    try { await payPurchaseDocument(user.uid, supplierPurchase.id, supplierPayment); setSupplierPurchase(null); await refresh?.(); notify('Supplier ပေးချေမှုကို သိမ်းပြီးပါပြီ') } catch (error) { notify(error.message || 'Supplier ပေးချေမှု မသိမ်းနိုင်ပါ', 'error') } finally { setSaving(false) }
  }
  const saveCreditPayment = async () => {
    const outstanding = Number(creditOrder?.balanceDue || creditOrder?.total || 0)
    if (Number(creditPayment.amount) <= 0 || Number(creditPayment.amount) > outstanding) return notify('ရရန်အကြွေးပမာဏကို စစ်ဆေးပါ', 'warning')
    setSaving(true)
    try { await receivePaymentAtomic(user.uid, creditOrder.id, creditPayment); setCreditOrder(null); await refresh?.(); notify('အကြွေးလက်ခံငွေကို သိမ်းပြီးပါပြီ') } catch (error) { notify(error.message || 'အကြွေးလက်ခံငွေ မသိမ်းနိုင်ပါ', 'error') } finally { setSaving(false) }
  }
  const openSupplier = (purchase) => { setSupplierPurchase(purchase); setSupplierPayment({ amount: Math.max(0, Number(purchase.total || 0) - Number(purchase.paidAmount || 0)), method: defaultMethod, reference: '', paidAt: getToday(), notes: '' }) }
  const openCredit = (order) => { setCreditOrder(order); setCreditPayment({ amount: Number(order.balanceDue || order.total || 0), method: defaultMethod, transactionId: '', date: getToday(), note: '' }) }

  return <Box className="page-stack finance-dashboard-page">
    <Box className="finance-topbar"><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} className="finance-date-range"><TextField type="date" size="small" label="မှ" value={from} onChange={(e) => setFrom(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} /><TextField type="date" size="small" label="ထိ" value={to} onChange={(e) => setTo(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} /></Stack><Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setExpenseOpen(true)}>ကုန်ကျစရိတ်ထည့်မည်</Button></Box>
    <Box className="finance-summary-grid"><Metric label="လက်ခံရရှိငွေ" value={money(summary.received)} tone="income" /><Metric label="ထွက်ငွေ" value={money(summary.cashOut)} tone="expense" /><Metric label="ငွေလက်ကျန်ပြောင်းလဲမှု" value={money(summary.cashMovement)} tone={summary.cashMovement >= 0 ? 'income' : 'expense'} /><Metric label="အသားတင်အမြတ်" value={money(summary.netProfit)} tone={summary.netProfit >= 0 ? 'income' : 'expense'} /><Metric label="ရရန်အကြွေး" value={money(summary.receivable)} tone="warning" /><Metric label="ပေးရန်ကုန်ကြွေး" value={money(summary.payable)} tone="warning" /></Box>
    <Box className="finance-dues-grid"><Paper variant="outlined" className="finance-due-card"><Stack direction="row" justifyContent="space-between" alignItems="center"><Box><Typography fontWeight={900}>ရရန်အကြွေး</Typography><Typography color="text.secondary" variant="body2">{receivables.length} ဘောက်ချာ</Typography></Box><Typography fontWeight={900}>{money(summary.receivable)}</Typography></Stack><Divider sx={{ my: 1.25 }} />{receivables.slice(0, 4).map((order) => <Stack key={order.id} direction="row" justifyContent="space-between" alignItems="center" sx={{ py: .5 }}><Typography>ဘောက်ချာ {order.orderNumber || String(order.id).slice(-5)}</Typography><Button size="small" onClick={() => openCredit(order)}>လက်ခံမည်</Button></Stack>)}{!receivables.length ? <Typography color="text.secondary">ရရန်အကြွေးမရှိပါ</Typography> : null}</Paper><Paper variant="outlined" className="finance-due-card"><Stack direction="row" justifyContent="space-between" alignItems="center"><Box><Typography fontWeight={900}>ပေးရန်ကုန်ကြွေး</Typography><Typography color="text.secondary" variant="body2">{payables.length} စာရင်း</Typography></Box><Typography fontWeight={900}>{money(summary.payable)}</Typography></Stack><Divider sx={{ my: 1.25 }} />{payables.slice(0, 4).map((purchase) => <Stack key={purchase.id} direction="row" justifyContent="space-between" alignItems="center" sx={{ py: .5 }}><Typography>{purchase.supplier?.name || 'Supplier'} · {purchase.purchaseNumber}</Typography><Button size="small" onClick={() => openSupplier(purchase)}>ပေးချေမည်</Button></Stack>)}{!payables.length ? <Typography color="text.secondary">ပေးရန်ကုန်ကြွေးမရှိပါ</Typography> : null}</Paper></Box>
    <Paper variant="outlined" className="finance-ledger"><ToggleButtonGroup exclusive value={type} onChange={(_, next) => next && setType(next)} className="finance-ledger-filters" size="small"><ToggleButton value="all">အားလုံး</ToggleButton><ToggleButton value="sale">အရောင်း</ToggleButton><ToggleButton value="credit">အကြွေး</ToggleButton><ToggleButton value="supplier">Supplier</ToggleButton><ToggleButton value="expense">ကုန်ကျစရိတ်</ToggleButton><ToggleButton value="refund">ပြန်အမ်း</ToggleButton></ToggleButtonGroup>{mobile ? <Box className="finance-ledger-mobile">{ledger.map((entry) => <Box key={entry.id} className="finance-ledger-row"><Box><Typography fontWeight={800}>{typeLabel(entry.type)}</Typography><Typography variant="body2" color="text.secondary">{entry.date} · {entry.reference}</Typography><Typography variant="caption" color="text.secondary">{entry.method}</Typography></Box><Box textAlign="right">{entry.income ? <Typography className="finance-income">+ {money(entry.income)}</Typography> : null}{entry.expense ? <Typography className="finance-expense">− {money(entry.expense)}</Typography> : null}</Box></Box>)}{!ledger.length ? <Typography className="finance-empty">ရွေးထားသောနေ့အတွက် record မရှိသေးပါ</Typography> : null}</Box> : <TableContainer><Table size="small"><TableHead><TableRow><TableCell>ရက်စွဲ/အချိန်</TableCell><TableCell>အမျိုးအစား</TableCell><TableCell>Reference</TableCell><TableCell>နည်းလမ်း</TableCell><TableCell align="right">ဝင်ငွေ</TableCell><TableCell align="right">ထွက်ငွေ</TableCell></TableRow></TableHead><TableBody>{ledger.map((entry) => <TableRow key={entry.id}><TableCell>{entry.date}</TableCell><TableCell><Chip size="small" label={typeLabel(entry.type)} /></TableCell><TableCell>{entry.reference}</TableCell><TableCell>{entry.method}</TableCell><TableCell align="right" className="finance-income">{entry.income ? money(entry.income) : '-'}</TableCell><TableCell align="right" className="finance-expense">{entry.expense ? money(entry.expense) : '-'}</TableCell></TableRow>)}</TableBody></Table></TableContainer>}</Paper>
    <Dialog open={expenseOpen} onClose={() => setExpenseOpen(false)} fullWidth maxWidth="sm"><DialogTitle>ကုန်ကျစရိတ်ထည့်ရန်</DialogTitle><DialogContent><Stack spacing={1.5} sx={{ pt: 1 }}><TextField label="ကုန်ကျစရိတ်အမည်" value={expense.title} onChange={(e) => setExpense({ ...expense, title: e.target.value })} /><TextField label="အမျိုးအစား" value={expense.category} onChange={(e) => setExpense({ ...expense, category: e.target.value })} /><TextField type="number" label="ပမာဏ" value={expense.amount} onChange={(e) => setExpense({ ...expense, amount: e.target.value })} /><FormControl><InputLabel>ငွေပေးချေမှုနည်းလမ်း</InputLabel><Select label="ငွေပေးချေမှုနည်းလမ်း" value={expense.method} onChange={(e) => setExpense({ ...expense, method: e.target.value })}>{methods.map((m) => <MenuItem key={m.id} value={m.name}>{m.name}</MenuItem>)}</Select></FormControl><TextField type="date" label="ရက်စွဲ" value={expense.date} onChange={(e) => setExpense({ ...expense, date: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} /><TextField label="မှတ်ချက်" value={expense.note} onChange={(e) => setExpense({ ...expense, note: e.target.value })} multiline minRows={2} /></Stack></DialogContent><DialogActions><Button onClick={() => setExpenseOpen(false)}>ပိတ်မည်</Button><Button variant="contained" onClick={saveExpense} disabled={saving}>သိမ်းမည်</Button></DialogActions></Dialog>
    <Dialog open={Boolean(supplierPurchase)} onClose={() => setSupplierPurchase(null)} fullWidth maxWidth="sm"><DialogTitle>Supplier ပေးချေမှု</DialogTitle><DialogContent><Stack spacing={1.5} sx={{ pt: 1 }}><Paper variant="outlined" sx={{ p: 1.5 }}><Typography fontWeight={800}>{supplierPurchase?.supplier?.name || 'Supplier'} · {supplierPurchase?.purchaseNumber}</Typography><Typography>ပေးရန်ကျန်ငွေ — {money(Math.max(0, Number(supplierPurchase?.total || 0) - Number(supplierPurchase?.paidAmount || 0)))}</Typography></Paper><TextField type="number" label="ပေးချေမည့်ပမာဏ" value={supplierPayment.amount} onChange={(e) => setSupplierPayment({ ...supplierPayment, amount: e.target.value })} /><FormControl><InputLabel>ငွေပေးချေမှုနည်းလမ်း</InputLabel><Select label="ငွေပေးချေမှုနည်းလမ်း" value={supplierPayment.method} onChange={(e) => setSupplierPayment({ ...supplierPayment, method: e.target.value })}>{methods.map((m) => <MenuItem key={m.id} value={m.name}>{m.name}</MenuItem>)}</Select></FormControl><TextField label="Reference" value={supplierPayment.reference} onChange={(e) => setSupplierPayment({ ...supplierPayment, reference: e.target.value })} /><TextField type="date" label="ရက်စွဲ" value={supplierPayment.paidAt} onChange={(e) => setSupplierPayment({ ...supplierPayment, paidAt: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} /><TextField label="မှတ်ချက်" value={supplierPayment.notes} onChange={(e) => setSupplierPayment({ ...supplierPayment, notes: e.target.value })} /></Stack></DialogContent><DialogActions><Button onClick={() => setSupplierPurchase(null)}>ပိတ်မည်</Button><Button variant="contained" onClick={saveSupplierPayment} disabled={saving}>ပေးချေမည်</Button></DialogActions></Dialog>
    <Dialog open={Boolean(creditOrder)} onClose={() => setCreditOrder(null)} fullWidth maxWidth="sm"><DialogTitle>အကြွေးလက်ခံရန်</DialogTitle><DialogContent><Stack spacing={1.5} sx={{ pt: 1 }}><Typography>ဘောက်ချာ {creditOrder?.orderNumber || String(creditOrder?.id || '').slice(-5)} · ကျန်ငွေ {money(creditOrder?.balanceDue || creditOrder?.total)}</Typography><TextField type="number" label="လက်ခံရရှိငွေ" value={creditPayment.amount} onChange={(e) => setCreditPayment({ ...creditPayment, amount: e.target.value })} /><FormControl><InputLabel>ငွေပေးချေမှုနည်းလမ်း</InputLabel><Select label="ငွေပေးချေမှုနည်းလမ်း" value={creditPayment.method} onChange={(e) => setCreditPayment({ ...creditPayment, method: e.target.value })}>{methods.map((m) => <MenuItem key={m.id} value={m.name}>{m.name}</MenuItem>)}</Select></FormControl><TextField label="Transaction ID" value={creditPayment.transactionId} onChange={(e) => setCreditPayment({ ...creditPayment, transactionId: e.target.value })} /><TextField type="date" label="ရက်စွဲ" value={creditPayment.date} onChange={(e) => setCreditPayment({ ...creditPayment, date: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} /><TextField label="မှတ်ချက်" value={creditPayment.note} onChange={(e) => setCreditPayment({ ...creditPayment, note: e.target.value })} /></Stack></DialogContent><DialogActions><Button onClick={() => setCreditOrder(null)}>ပိတ်မည်</Button><Button variant="contained" startIcon={<PaidRoundedIcon />} onClick={saveCreditPayment} disabled={saving}>လက်ခံမည်</Button></DialogActions></Dialog>
  </Box>
}
