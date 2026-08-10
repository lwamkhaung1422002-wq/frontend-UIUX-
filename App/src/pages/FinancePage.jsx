import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, IconButton, InputLabel, MenuItem, Paper, Select,
  Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, ToggleButton, ToggleButtonGroup, Typography, useMediaQuery,
} from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import DrawRoundedIcon from '@mui/icons-material/DrawRounded'
import FilterListRoundedIcon from '@mui/icons-material/FilterListRounded'
import PaidRoundedIcon from '@mui/icons-material/PaidRounded'
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useData } from '../contexts/DataContext.jsx'
import { useFeedback } from '../contexts/FeedbackContext.jsx'
import { activePaymentMethods } from '../utils/catalog.js'
import { formatKs, getToday } from '../utils/storage.js'
import { calculateFinancialSummary } from '../domain/finance.js'
import { createExpenseDocument, payPurchaseDocument, previewDemoData, receivePaymentAtomic } from '../services/shopApiService.js'
import { useAppHeaderActions } from '../contexts/AppHeaderActionsContext.jsx'

const money = (value) => formatKs(Number(value || 0))
const day = (value) => String(value || '').slice(0, 10)
const orderDate = (order) => day(order.completedAt || order.createdAt || order.date)
const paymentDate = (payment) => day(payment.paidAt || payment.date || payment.createdAt)
const inRange = (value, from, to) => (!from || value >= from) && (!to || value <= to)
const isCredit = (order) => order.paymentStatus === 'unpaid' || Number(order.balanceDue || 0) > 0
const isCash = (method) => ['cash', 'ငွေသား'].includes(String(method || '').trim().toLowerCase())
const typeLabel = (type) => ({ purchase: 'ကုန်ဝယ်', credit: 'ရရန်အကြွေး', supplier: 'ကုန်ကြွေး', expense: 'ကုန်ကျစရိတ်' })[type] || type
const settlementStatus = () => 'ငွေရှင်းပြီး'
const searchable = (entry, query) => !query || [entry.reference, entry.method, entry.status, typeLabel(entry.type)].join(' ').toLowerCase().includes(query.toLowerCase())
const dateTime = (value) => {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return day(value)
  return `${day(value)} · ${parsed.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
}

function Metric({ label, value, tone = '' }) {
  return <Box className={`finance-summary-metric ${tone}`}><Typography>{label}</Typography><strong>{value}</strong></Box>
}

function LedgerAction({ entry, onReceive, onPay, onDetails }) {
  if (entry.action === 'receive') return <Button size="small" onClick={() => onReceive(entry.order)}>လက်ခံမည်</Button>
  if (entry.action === 'pay') return <Button size="small" onClick={() => onPay(entry.purchase)}>ပေးမည်</Button>
  return <Box className="finance-completed-action"><IconButton size="small" color="primary" aria-label="အသေးစိတ်ကြည့်မည်" onClick={() => onDetails(entry)}><VisibilityRoundedIcon fontSize="small" /></IconButton></Box>
}

function methodField(methods, value, onChange, includeAll = false) {
  return <FormControl fullWidth><InputLabel>ငွေပေးချေမှုနည်းလမ်း</InputLabel><Select label="ငွေပေးချေမှုနည်းလမ်း" value={value} onChange={onChange}>{includeAll ? <MenuItem value="all">နည်းလမ်းအားလုံး</MenuItem> : null}{methods.map((method) => <MenuItem key={method.id} value={method.name}>{method.name}</MenuItem>)}</Select></FormControl>
}

export default function FinancePage({ refresh, requireAuth }) {
  const mobile = useMediaQuery('(max-width:899px)')
  const { user } = useAuth()
  const { data: liveData } = useData()
  const { notify } = useFeedback()
  const setAppHeaderActions = useAppHeaderActions()
  const data = user?.preview || user?.email === 'greenmart.demo@local.test' ? previewDemoData : liveData
  const methods = useMemo(() => activePaymentMethods(data.catalogSettings), [data.catalogSettings])
  const defaultMethod = methods[0]?.name || 'ငွေသား'
  const [from, setFrom] = useState(getToday)
  const [to, setTo] = useState(getToday)
  const [filterOpen, setFilterOpen] = useState(false)
  const [type, setType] = useState('all')
  const [methodFilter, setMethodFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [supplierPurchase, setSupplierPurchase] = useState(null)
  const [creditOrder, setCreditOrder] = useState(null)
  const [saving, setSaving] = useState(false)
  const blankExpense = () => ({ title: '', amount: '', method: defaultMethod, transactionId: '', date: getToday(), note: '' })
  const [expense, setExpense] = useState(blankExpense)
  const [supplierPayment, setSupplierPayment] = useState({ amount: '', paymentType: 'cash', mobileName: '', reference: '', paidAt: getToday(), notes: '', payerName: '', payerPhone: '', signatureDataUrl: '', mobileAccountName: '' })
  const [creditPayment, setCreditPayment] = useState({ amount: '', method: defaultMethod, transactionId: '', date: getToday(), note: '' })
  const [signatureOpen, setSignatureOpen] = useState(false)
  const [paymentDetails, setPaymentDetails] = useState(null)
  const [signaturePreview, setSignaturePreview] = useState('')

  const orders = useMemo(() => (data.orders || []).filter((order) => order.fulfillmentStatus !== 'cancelled'), [data.orders])
  const purchases = useMemo(() => (data.purchases || []).filter((purchase) => purchase.status !== 'cancelled'), [data.purchases])
  const receivables = useMemo(() => orders.filter(isCredit), [orders])
  const payables = useMemo(() => purchases.filter((purchase) => Number(purchase.total || 0) > Number(purchase.paidAmount || 0)), [purchases])
  const periodOrders = useMemo(() => orders.filter((order) => inRange(orderDate(order), from, to)), [orders, from, to])
  const periodExpenses = useMemo(() => (data.expenses || []).filter((item) => inRange(day(item.spentAt || item.date || item.createdAt), from, to)), [data.expenses, from, to])

  const summary = useMemo(() => {
    const financial = calculateFinancialSummary(periodOrders, periodExpenses)
    const orderById = new Map(orders.map((order) => [String(order.id), order]))
    let received = 0; let refunds = 0
    ;(data.payments || []).forEach((payment) => {
      if (!inRange(paymentDate(payment), from, to)) return
      if (payment.type === 'refund') refunds += Number(payment.amount || 0)
      else if (payment.type === 'payment' && orderById.has(String(payment.orderId))) received += Number(payment.amount || 0)
    })
    const supplierPaid = purchases.flatMap((purchase) => purchase.payments || []).filter((payment) => !payment.reversedAt && inRange(paymentDate(payment), from, to)).reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
    const expenses = periodExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    return { ...financial, received, refunds, supplierPaid, expenses, cashOut: supplierPaid + expenses + refunds, cashMovement: received - supplierPaid - expenses - refunds, receivable: receivables.reduce((sum, order) => sum + Number(order.balanceDue || order.total || 0), 0), payable: payables.reduce((sum, purchase) => sum + Math.max(0, Number(purchase.total || 0) - Number(purchase.paidAmount || 0)), 0) }
  }, [periodOrders, periodExpenses, data.payments, orders, purchases, payables, receivables, from, to])

  const allLedger = useMemo(() => {
    const entries = []
    payables.filter((purchase) => inRange(day(purchase.receivedAt || purchase.createdAt), from, to)).forEach((purchase) => entries.push({ id: `payable-${purchase.id}`, type: 'supplier', date: day(purchase.receivedAt || purchase.createdAt), at: purchase.receivedAt || purchase.createdAt, reference: `${purchase.supplier?.name || 'ပေးသွင်းသူ'} · ${purchase.purchaseNumber || String(purchase.id).slice(-5)}`, method: 'ပေးရန်ကျန်', amount: Math.max(0, Number(purchase.total || 0) - Number(purchase.paidAmount || 0)), income: 0, expense: 0, action: 'pay', purchase }))
    periodOrders.filter(isCredit).forEach((order) => entries.push({ id: `credit-order-${order.id}`, type: 'credit', date: orderDate(order), at: order.completedAt || order.createdAt, reference: `${order.customer?.name || 'မသတ်မှတ်ထားပါ'} · ဘောက်ချာ ${order.orderNumber || String(order.id).slice(-5)}`, method: 'ရရန်ကျန်', amount: Number(order.balanceDue || order.total || 0), income: 0, expense: 0, action: 'receive', order }))
    ;(data.payments || []).filter((payment) => inRange(paymentDate(payment), from, to)).forEach((payment) => {
      const order = orders.find((item) => String(item.id) === String(payment.orderId))
      if (!order) return
      if (payment.type === 'payment') entries.push({ id: `payment-${payment.id}`, type: 'credit', date: paymentDate(payment), at: payment.paidAt || payment.createdAt, reference: `${order.customer?.name || 'မသတ်မှတ်ထားပါ'} · ဘောက်ချာ ${order.orderNumber || String(order.id).slice(-5)}`, method: payment.method || '-', status: settlementStatus({ ...payment, reference: payment.transactionId }), amount: Number(payment.amount || 0), income: Number(payment.amount || 0), expense: 0, payment: { ...payment, reference: payment.transactionId }, order })
    })
    purchases.forEach((purchase) => (purchase.payments || []).filter((payment) => !payment.reversedAt && inRange(paymentDate(payment), from, to)).forEach((payment) => entries.push({ id: `supplier-${payment.id}`, type: 'purchase', date: paymentDate(payment), at: payment.paidAt || payment.createdAt, reference: `${purchase.supplier?.name || 'ပေးသွင်းသူ'} · ${purchase.purchaseNumber || String(purchase.id).slice(-5)}`, method: payment.method || '-', status: settlementStatus(payment), amount: Number(payment.amount || 0), income: 0, expense: Number(payment.amount || 0), payment, purchase })))
    periodExpenses.forEach((item) => entries.push({ id: `expense-${item.id}`, type: 'expense', date: day(item.spentAt || item.date || item.createdAt), at: item.spentAt || item.createdAt, reference: item.title, method: `${item.method || '-'}${item.transactionId ? ` · ${item.transactionId}` : ''}`, amount: Number(item.amount || 0), income: 0, expense: Number(item.amount || 0) }))
    return entries.sort((a, b) => new Date(b.at || b.date).getTime() - new Date(a.at || a.date).getTime())
  }, [periodOrders, periodExpenses, data.payments, orders, purchases, payables, from, to])
  const ledger = useMemo(() => allLedger.filter((entry) => (type === 'all' || entry.type === type) && (methodFilter === 'all' || entry.method === methodFilter) && searchable(entry, search)), [allLedger, type, methodFilter, search])

  const saveExpense = async () => {
    if (!expense.title.trim() || Number(expense.amount) <= 0) return notify('ကုန်ကျစရိတ်အမည်နှင့် ပမာဏမှန်ကန်စွာထည့်ပါ', 'warning')
    if (!isCash(expense.method) && !expense.transactionId.trim()) return notify('ငွေသားမဟုတ်သော ငွေပေးချေမှုအတွက် Transaction ID ထည့်ပါ', 'warning')
    if (requireAuth?.('create expense')) return
    setSaving(true)
    try { await createExpenseDocument(user.uid, { ...expense, category: undefined, note: [expense.note, expense.transactionId ? `Transaction ID: ${expense.transactionId}` : ''].filter(Boolean).join('\n') }); setExpenseOpen(false); setExpense(blankExpense()); await refresh?.(); notify('ကုန်ကျစရိတ်ကို သိမ်းပြီးပါပြီ') } catch (error) { notify(error.message || 'ကုန်ကျစရိတ်မသိမ်းနိုင်ပါ', 'error') } finally { setSaving(false) }
  }
  const saveSupplierPayment = async () => {
    const outstanding = Math.max(0, Number(supplierPurchase?.total || 0) - Number(supplierPurchase?.paidAmount || 0))
    const cashPayment = supplierPayment.paymentType === 'cash'
    if (Number(supplierPayment.amount) <= 0 || Number(supplierPayment.amount) > outstanding) return notify('ပေးရန်ကျန်ငွေထက် ပို၍မပေးနိုင်ပါ', 'warning')
    if (!cashPayment && (!supplierPayment.mobileName.trim() || !supplierPayment.mobileAccountName.trim() || !supplierPayment.reference.trim())) return notify('Mobile Payment အမည်၊ Account name နှင့် Transaction ID ကို ဖြည့်ပါ', 'warning')
    if (cashPayment && (!supplierPayment.payerName.trim() || !supplierPayment.payerPhone.trim() || !supplierPayment.signatureDataUrl)) return notify('လက်ခံသူအမည်၊ ဖုန်းနံပါတ်နှင့် လက်မှတ်ကို ဖြည့်ပါ', 'warning')
    setSaving(true)
    try { await payPurchaseDocument(user.uid, supplierPurchase.id, { ...supplierPayment, method: cashPayment ? 'Cash' : supplierPayment.mobileName, reference: cashPayment ? undefined : supplierPayment.reference, mobileAccountName: cashPayment ? undefined : supplierPayment.mobileAccountName }); setSupplierPurchase(null); await refresh?.(); notify('ပေးရန်ကုန်ကြွေးရှင်းငွေကို သိမ်းပြီးပါပြီ') } catch (error) { notify(error.message || 'ပေးချေမှု မသိမ်းနိုင်ပါ', 'error') } finally { setSaving(false) }
  }
  const saveCreditPayment = async () => {
    const outstanding = Number(creditOrder?.balanceDue || creditOrder?.total || 0)
    if (Number(creditPayment.amount) <= 0 || Number(creditPayment.amount) > outstanding) return notify('ရရန်အကြွေးပမာဏကို စစ်ဆေးပါ', 'warning')
    if (!isCash(creditPayment.method) && !creditPayment.transactionId.trim()) return notify('ငွေသားမဟုတ်သော ငွေပေးချေမှုအတွက် Transaction ID ထည့်ပါ', 'warning')
    setSaving(true)
    try { await receivePaymentAtomic(user.uid, creditOrder.id, creditPayment); setCreditOrder(null); await refresh?.(); notify('အကြွေးလက်ခံငွေကို သိမ်းပြီးပါပြီ') } catch (error) { notify(error.message || 'အကြွေးလက်ခံငွေ မသိမ်းနိုင်ပါ', 'error') } finally { setSaving(false) }
  }
  const openSupplier = (purchase) => { setSupplierPurchase(purchase); setSupplierPayment({ amount: Math.max(0, Number(purchase.total || 0) - Number(purchase.paidAmount || 0)), paymentType: 'cash', mobileName: '', reference: '', paidAt: getToday(), notes: '', payerName: '', payerPhone: '', signatureDataUrl: '', mobileAccountName: '' }) }
  const openCredit = (order) => { setCreditOrder(order); setCreditPayment({ amount: Number(order.balanceDue || order.total || 0), method: defaultMethod, transactionId: '', date: getToday(), note: '' }) }

  useEffect(() => {
    setAppHeaderActions(<Button className="app-finance-expense-action" variant="contained" startIcon={<AddRoundedIcon />} onClick={() => { setExpense({ title: '', amount: '', method: defaultMethod, transactionId: '', date: getToday(), note: '' }); setExpenseOpen(true) }}>ကုန်ကျစရိတ်ထည့်မည်</Button>)
    return () => setAppHeaderActions(null)
  }, [defaultMethod, setAppHeaderActions])

  return <Box className="page-stack finance-dashboard-page">
    <Box className="finance-topbar"><TextField className="finance-search" size="small" placeholder="ဘောက်ချာ၊ ပေးသွင်းသူ သို့မဟုတ် မှတ်ချက်ရှာရန်" value={search} onChange={(event) => setSearch(event.target.value)} /><Button className="finance-filter-button" variant="outlined" startIcon={<FilterListRoundedIcon />} onClick={() => setFilterOpen(true)}>စစ်ရန်</Button></Box>
    <ToggleButtonGroup exclusive value={type} onChange={(_, next) => next && setType(next)} className="finance-ledger-filters finance-type-filters" size="small"><ToggleButton value="all">အားလုံး</ToggleButton><ToggleButton value="purchase">ကုန်ဝယ်</ToggleButton><ToggleButton value="supplier">ကုန်ကြွေး</ToggleButton><ToggleButton value="expense">ကုန်ကျစရိတ်</ToggleButton><ToggleButton value="credit">ရရန်အကြွေး</ToggleButton></ToggleButtonGroup>
    <Box className="finance-summary-grid"><Metric label="လက်ခံရရှိငွေ" value={money(summary.received)} tone="income" /><Metric label="ထွက်ငွေ" value={money(summary.cashOut)} tone="expense" /><Metric label="ငွေလက်ကျန်ပြောင်းလဲမှု" value={money(summary.cashMovement)} tone={summary.cashMovement >= 0 ? 'income' : 'expense'} /><Metric label="အသားတင်အမြတ်" value={money(summary.netProfit)} tone={summary.netProfit >= 0 ? 'income' : 'expense'} /><Metric label="ရရန်အကြွေး" value={money(summary.receivable)} tone="warning" /><Metric label="ပေးရန်ကုန်ကြွေး" value={money(summary.payable)} tone="warning" /></Box>
    <Paper variant="outlined" className="finance-ledger">
      {mobile ? <Box className="finance-ledger-mobile">
        {ledger.map((entry) => <Box key={entry.id} className="finance-ledger-row finance-record-mobile">
          <Box><Stack direction="row" spacing={.75} alignItems="center"><Chip size="small" label={typeLabel(entry.type)} /><Typography variant="caption" color="text.secondary">{dateTime(entry.at || entry.date)}</Typography></Stack><Typography fontWeight={800} sx={{ mt: .5 }}>{entry.reference}</Typography><Typography variant="body2" color="text.secondary">{entry.method}</Typography></Box>
          <Box className="finance-record-mobile-right"><Typography className={entry.income ? 'finance-income' : entry.expense || entry.action ? 'finance-expense' : ''} fontWeight={900}>{money(entry.amount)}</Typography><Typography variant="caption" className="finance-payment-status">{entry.status || entry.method}</Typography><LedgerAction entry={entry} onReceive={openCredit} onPay={openSupplier} onDetails={setPaymentDetails} /></Box>
        </Box>)}
        {!ledger.length ? <Typography className="finance-empty">ရွေးထားသောအခြေအနေအတွက် record မရှိသေးပါ</Typography> : null}
      </Box> : <TableContainer><Table size="small"><TableHead><TableRow><TableCell align="center">စဉ်</TableCell><TableCell>ရက်စွဲ/အချိန်</TableCell><TableCell>အမျိုးအစား / အမည် / ဘောက်ချာ</TableCell><TableCell>အခြေအနေ</TableCell><TableCell align="right">ငွေပမာဏ</TableCell><TableCell align="right">လုပ်ဆောင်ချက်</TableCell></TableRow></TableHead><TableBody>
        {ledger.map((entry, index) => <TableRow key={entry.id}><TableCell align="center">{index + 1}</TableCell><TableCell>{dateTime(entry.at || entry.date)}</TableCell><TableCell><Chip size="small" label={typeLabel(entry.type)} sx={{ mr: 1 }} />{entry.reference}</TableCell><TableCell className="finance-payment-status">{entry.status || entry.method}</TableCell><TableCell align="right" className={entry.income ? 'finance-income' : entry.expense || entry.action ? 'finance-expense' : ''}>{money(entry.amount)}</TableCell><TableCell align="right"><LedgerAction entry={entry} onReceive={openCredit} onPay={openSupplier} onDetails={setPaymentDetails} /></TableCell></TableRow>)}
        {!ledger.length ? <TableRow><TableCell colSpan={6}><Typography className="finance-empty">ရွေးထားသောအခြေအနေအတွက် record မရှိသေးပါ</Typography></TableCell></TableRow> : null}
      </TableBody></Table></TableContainer>}
    </Paper>
    <Dialog open={Boolean(paymentDetails)} onClose={() => setPaymentDetails(null)} fullWidth maxWidth="xs" sx={{ '& .MuiDialog-paper': { m: 2, borderRadius: '18px', overflow: 'hidden' } }}>
      <DialogTitle>{paymentDetails?.purchase ? 'ပစ္စည်းလက်ခံခြင်း' : 'ငွေရှင်းမှုအသေးစိတ်'}</DialogTitle>
      <DialogContent><Stack spacing={1.15} sx={{ pt: 1 }}>
        {paymentDetails?.purchase ? <><Typography>{paymentDetails.purchase.supplier?.name || 'Supplier'} · {paymentDetails.purchase.purchaseNumber}</Typography><Typography>ငွေပမာဏ — {money(paymentDetails.purchase.total)}</Typography><Typography>ပေးချေပြီး — {money(paymentDetails.purchase.paidAmount)}</Typography><Typography>ပစ္စည်းလက်ခံရက် — {day(paymentDetails.purchase.receivedAt || paymentDetails.purchase.createdAt)}</Typography></> : <><Typography fontWeight={800}>{paymentDetails?.reference}</Typography><Typography variant="body2" color="text.secondary">{dateTime(paymentDetails?.at || paymentDetails?.date)}</Typography></>}
        {paymentDetails?.payment ? <><Typography>ပေးချေမှု — {money(paymentDetails.amount)} · {paymentDetails.payment.method} · {dateTime(paymentDetails.payment.paidAt || paymentDetails.payment.createdAt)}</Typography>{!isCash(paymentDetails.payment.method) && paymentDetails.payment.mobileAccountName ? <Typography>Account name — {paymentDetails.payment.mobileAccountName}</Typography> : null}{!isCash(paymentDetails.payment.method) && paymentDetails.payment.reference ? <Typography>Transaction ID — {paymentDetails.payment.reference}</Typography> : null}{isCash(paymentDetails.payment.method) && paymentDetails.payment.payerName ? <Typography>လက်ခံသူ — {paymentDetails.payment.payerName}</Typography> : null}{isCash(paymentDetails.payment.method) && paymentDetails.payment.payerPhone ? <Typography>ဖုန်းနံပါတ် — {paymentDetails.payment.payerPhone}</Typography> : null}{paymentDetails.payment.notes ? <Typography>မှတ်ချက် — {paymentDetails.payment.notes}</Typography> : null}{isCash(paymentDetails.payment.method) && paymentDetails.payment.signatureDataUrl ? <Button className="finance-signature-preview" variant="outlined" startIcon={<DrawRoundedIcon />} onClick={() => setSignaturePreview(paymentDetails.payment.signatureDataUrl)}>လက်မှတ်ကြည့်မည်</Button> : null}</> : null}
      </Stack></DialogContent>
      <DialogActions><Button onClick={() => setPaymentDetails(null)}>ပိတ်မည်</Button></DialogActions>
    </Dialog>
    <Dialog open={Boolean(signaturePreview)} onClose={() => setSignaturePreview('')} fullWidth maxWidth="sm" sx={{ '& .MuiDialog-paper': { m: 2, borderRadius: '18px', overflow: 'hidden' } }}><DialogTitle>လက်မှတ်</DialogTitle><DialogContent><Box component="img" src={signaturePreview} alt="လက်မှတ်" className="finance-signature-image" /></DialogContent><DialogActions><Button onClick={() => setSignaturePreview('')}>ပိတ်မည်</Button></DialogActions></Dialog>
    <Dialog open={filterOpen} onClose={() => setFilterOpen(false)} fullWidth maxWidth="xs" sx={{ '& .MuiDialog-paper': { m: 2, borderRadius: '18px', overflow: 'hidden' } }}><DialogTitle>စာရင်းစစ်ရန်</DialogTitle><DialogContent><Stack spacing={1.5} sx={{ pt: 1 }}><Stack direction="row" spacing={1}><TextField type="date" fullWidth label="မှ" value={from} onChange={(event) => setFrom(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} /><TextField type="date" fullWidth label="ထိ" value={to} onChange={(event) => setTo(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} /></Stack>{methodField(methods, methodFilter, (event) => setMethodFilter(event.target.value), true)}</Stack></DialogContent><DialogActions><Button onClick={() => { setFrom(getToday()); setTo(getToday()); setMethodFilter('all') }}>ယနေ့သို့ပြန်ထားမည်</Button><Button variant="contained" onClick={() => setFilterOpen(false)}>အတည်ပြုမည်</Button></DialogActions></Dialog>
    <Dialog open={expenseOpen} onClose={() => setExpenseOpen(false)} fullWidth maxWidth="sm" sx={{ '& .MuiDialog-paper': { m: 2, borderRadius: '18px', overflow: 'hidden' } }}><DialogTitle>ကုန်ကျစရိတ်ထည့်ရန်</DialogTitle><DialogContent><Stack spacing={1.5} sx={{ pt: 1 }}><TextField label="ကုန်ကျစရိတ်အမည်" value={expense.title} onChange={(event) => setExpense({ ...expense, title: event.target.value })} /><TextField type="number" label="ပမာဏ" value={expense.amount} onChange={(event) => setExpense({ ...expense, amount: event.target.value })} />{methodField(methods, expense.method, (event) => setExpense({ ...expense, method: event.target.value }))}{!isCash(expense.method) ? <TextField required label="Transaction ID" value={expense.transactionId} onChange={(event) => setExpense({ ...expense, transactionId: event.target.value })} /> : null}<TextField type="date" label="ရက်စွဲ" value={expense.date} onChange={(event) => setExpense({ ...expense, date: event.target.value })} slotProps={{ inputLabel: { shrink: true } }} /><TextField label="မှတ်ချက်" value={expense.note} onChange={(event) => setExpense({ ...expense, note: event.target.value })} multiline minRows={2} /></Stack></DialogContent><DialogActions><Button onClick={() => setExpenseOpen(false)}>ပိတ်မည်</Button><Button variant="contained" onClick={saveExpense} disabled={saving}>သိမ်းမည်</Button></DialogActions></Dialog>
    <Dialog open={Boolean(supplierPurchase)} onClose={() => setSupplierPurchase(null)} fullWidth maxWidth="xs" sx={{ '& .MuiDialog-paper': { m: 2, borderRadius: '18px', overflow: 'hidden' } }}><DialogTitle>ကုန်ကြွေး ပေးချေမည်</DialogTitle><DialogContent><Stack spacing={1.5} sx={{ pt: 1 }}><Typography fontWeight={800}>ကြွေးကျန်ငွေ — {money(Math.max(0, Number(supplierPurchase?.total || 0) - Number(supplierPurchase?.paidAmount || 0)))}</Typography><TextField select label="ပေးချေမှုနည်းလမ်း" value={supplierPayment.paymentType} onChange={(event) => setSupplierPayment({ ...supplierPayment, paymentType: event.target.value })}><MenuItem value="cash">ငွေသား</MenuItem><MenuItem value="mobile">Mobile Payment</MenuItem></TextField><TextField required type="number" label="သွင်းငွေ" value={supplierPayment.amount} onChange={(event) => setSupplierPayment({ ...supplierPayment, amount: event.target.value })} helperText={`ကျန်ငွေ — ${money(Math.max(0, Number(supplierPurchase?.total || 0) - Number(supplierPurchase?.paidAmount || 0) - Number(supplierPayment.amount || 0)))}`} />{supplierPayment.paymentType === 'cash' ? <><TextField required label="လက်ခံသူအမည်" value={supplierPayment.payerName} onChange={(event) => setSupplierPayment({ ...supplierPayment, payerName: event.target.value })} /><TextField required label="ဖုန်းနံပါတ်" value={supplierPayment.payerPhone} onChange={(event) => setSupplierPayment({ ...supplierPayment, payerPhone: event.target.value })} /><Button className="signature-button" variant={supplierPayment.signatureDataUrl ? 'contained' : 'outlined'} startIcon={<DrawRoundedIcon />} onClick={() => setSignatureOpen(true)}>{supplierPayment.signatureDataUrl ? 'လက်မှတ်ထိုးပြီး' : 'လက်မှတ်ထိုးမည်'}</Button></> : <><TextField required label="Mobile Payment အမည်" value={supplierPayment.mobileName} onChange={(event) => setSupplierPayment({ ...supplierPayment, mobileName: event.target.value })} /><TextField required label="Account name" value={supplierPayment.mobileAccountName} onChange={(event) => setSupplierPayment({ ...supplierPayment, mobileAccountName: event.target.value })} /><TextField required label="Transaction ID (နောက်ဆုံး 8 လုံး)" value={supplierPayment.reference} onChange={(event) => setSupplierPayment({ ...supplierPayment, reference: event.target.value.replace(/\D/g, '').slice(-8) })} inputProps={{ inputMode: 'numeric', maxLength: 8 }} /></>}<TextField type="date" label="ရက်စွဲ" value={supplierPayment.paidAt} onChange={(event) => setSupplierPayment({ ...supplierPayment, paidAt: event.target.value })} slotProps={{ inputLabel: { shrink: true } }} /><TextField label="မှတ်ချက်" value={supplierPayment.notes} onChange={(event) => setSupplierPayment({ ...supplierPayment, notes: event.target.value })} /></Stack></DialogContent><DialogActions><Button onClick={() => setSupplierPurchase(null)}>မလုပ်တော့ပါ</Button><Button variant="contained" onClick={saveSupplierPayment} disabled={saving}>ပေးချေမည်</Button></DialogActions></Dialog>
    <Dialog open={signatureOpen} onClose={() => setSignatureOpen(false)} fullWidth maxWidth="sm" sx={{ '& .MuiDialog-paper': { m: 2, borderRadius: '18px', overflow: 'hidden' } }}><DialogTitle>လက်မှတ်ထိုးပါ</DialogTitle><DialogContent><FinanceSignaturePad onSave={(signatureDataUrl) => { setSupplierPayment((current) => ({ ...current, signatureDataUrl })); setSignatureOpen(false) }} /></DialogContent><DialogActions><Button onClick={() => setSignatureOpen(false)}>မလုပ်တော့ပါ</Button></DialogActions></Dialog>
    <Dialog open={Boolean(creditOrder)} onClose={() => setCreditOrder(null)} fullWidth maxWidth="sm" sx={{ '& .MuiDialog-paper': { m: 2, borderRadius: '18px', overflow: 'hidden' } }}><DialogTitle>အကြွေးလက်ခံရန်</DialogTitle><DialogContent><Stack spacing={1.5} sx={{ pt: 1 }}><Typography>ဘောက်ချာ {creditOrder?.orderNumber || String(creditOrder?.id || '').slice(-5)} · ကျန်ငွေ {money(creditOrder?.balanceDue || creditOrder?.total)}</Typography><TextField type="number" label="လက်ခံရရှိငွေ" value={creditPayment.amount} onChange={(event) => setCreditPayment({ ...creditPayment, amount: event.target.value })} />{methodField(methods, creditPayment.method, (event) => setCreditPayment({ ...creditPayment, method: event.target.value }))}{!isCash(creditPayment.method) ? <TextField required label="Transaction ID" value={creditPayment.transactionId} onChange={(event) => setCreditPayment({ ...creditPayment, transactionId: event.target.value })} /> : null}<TextField type="date" label="ရက်စွဲ" value={creditPayment.date} onChange={(event) => setCreditPayment({ ...creditPayment, date: event.target.value })} slotProps={{ inputLabel: { shrink: true } }} /><TextField label="မှတ်ချက်" value={creditPayment.note} onChange={(event) => setCreditPayment({ ...creditPayment, note: event.target.value })} /></Stack></DialogContent><DialogActions><Button onClick={() => setCreditOrder(null)}>ပိတ်မည်</Button><Button variant="contained" startIcon={<PaidRoundedIcon />} onClick={saveCreditPayment} disabled={saving}>လက်ခံမည်</Button></DialogActions></Dialog>
  </Box>
}

function FinanceSignaturePad({ onSave }) {
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const [hasSignature, setHasSignature] = useState(false)
  const point = (event) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    return { x: (event.clientX - rect.left) * (canvas.width / rect.width), y: (event.clientY - rect.top) * (canvas.height / rect.height) }
  }
  const start = (event) => {
    const canvas = canvasRef.current
    drawing.current = true
    setHasSignature(true)
    const position = point(event)
    const context = canvas.getContext('2d')
    context.beginPath()
    context.moveTo(position.x, position.y)
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const draw = (event) => {
    if (!drawing.current) return
    const context = canvasRef.current.getContext('2d')
    const position = point(event)
    context.lineTo(position.x, position.y)
    context.stroke()
  }
  const clear = () => { const canvas = canvasRef.current; canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height); setHasSignature(false) }
  return <Box className="signature-pad"><Typography variant="body2" color="text.secondary">အောက်ပါနေရာတွင် လက်မှတ်ရေးထိုးပါ</Typography><canvas ref={canvasRef} width="900" height="300" onPointerDown={start} onPointerMove={draw} onPointerUp={() => { drawing.current = false }} onPointerCancel={() => { drawing.current = false }} /><Box><Button onClick={clear}>ပြန်ဖျက်မည်</Button><Button variant="contained" disabled={!hasSignature} onClick={() => onSave(canvasRef.current.toDataURL('image/png'))}>လက်မှတ်သိမ်းမည်</Button></Box></Box>
}
