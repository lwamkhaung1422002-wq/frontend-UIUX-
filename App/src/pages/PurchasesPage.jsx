import { useEffect, useMemo, useRef, useState } from 'react'
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, TextField, Typography } from '@mui/material'
import AddCircleRoundedIcon from '@mui/icons-material/AddCircleRounded'
import ArticleRoundedIcon from '@mui/icons-material/ArticleRounded'
import CancelRoundedIcon from '@mui/icons-material/CancelRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded'
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import DrawRoundedIcon from '@mui/icons-material/DrawRounded'
import { useAppHeaderActions } from '../contexts/AppHeaderActionsContext.jsx'

const initialPurchases = [
  { id: 1, supplier: 'Pahtama Group', phone: '09666655928', address: 'လှိုင်သာယာ', voucher: '125978', senderName: 'ကိုအောင်မင်း', senderPhone: '09770011223', receiverName: 'မောင်လင်း', receivedDate: '10/05/2026', receivedTime: '10:05 am', dueDate: '20/05/2026', amount: 374000, paid: 0, payments: [], items: [{ name: 'Jasmine အနံ့ဆီ', sku: '1001', quantity: 68, cost: 2900 }, { name: 'Nivea Roll on', sku: '1002', quantity: 29, cost: 5800 }, { name: 'ကွမ်းယာ', sku: '1004', quantity: 2, cost: 4300 }] },
  { id: 2, supplier: 'Unilever', phone: '09977051730', address: 'တာမွေ', voucher: '111548', senderName: 'ကိုရဲထွန်း', senderPhone: '09880044556', receiverName: 'မစုဝင်း', receivedDate: '11/06/2026', receivedTime: '12:05 pm', dueDate: '', amount: 16000, paid: 16000, payments: [{ amount: 16000, method: 'mobile', mobileName: 'KPay', accountName: 'John Doe', transactionId: '12345678', time: '11/06/2026 · 12:20 pm' }], items: [{ name: 'Coca-Cola 330ml', sku: '1228', quantity: 20, cost: 800 }] },
]

const emptyPurchase = { supplier: '', phone: '', address: '', voucher: '', senderName: '', senderPhone: '', receiverName: '', receivedDate: '', dueDate: '', amount: '' }
const money = (amount) => `${Number(amount || 0).toLocaleString('en-US')} ကျပ်`
const inputDate = (date) => date.toISOString().slice(0, 10)
const currentMonthRange = () => { const today = new Date(); return { from: inputDate(new Date(today.getFullYear(), today.getMonth(), 1)), to: inputDate(new Date(today.getFullYear(), today.getMonth() + 1, 0)) } }
const dateISO = (value) => value ? value.split('/').reverse().join('-') : ''
const dueOf = (purchase) => Math.max(0, purchase.amount - purchase.paid)
const paymentDraftFor = (purchase) => ({ purchase, amount: dueOf(purchase), method: 'cash', recipientName: '', recipientPhone: '', signature: '', mobileName: 'KPay', accountName: '', transactionId: '' })

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState(initialPurchases)
  const [status, setStatus] = useState('အားလုံး')
  const [fromDate, setFromDate] = useState(() => currentMonthRange().from)
  const [toDate, setToDate] = useState(() => currentMonthRange().to)
  const [dateFilterActive, setDateFilterActive] = useState(false)
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState(null)
  const [payment, setPayment] = useState(null)
  const [details, setDetails] = useState(null)
  const [records, setRecords] = useState(null)
  const [cancelDraft, setCancelDraft] = useState(null)
  const [signatureOpen, setSignatureOpen] = useState(false)
  const setAppHeaderActions = useAppHeaderActions()

  const filtered = useMemo(() => purchases.filter((purchase) => {
    const keyword = query.trim().toLowerCase()
    const date = dateISO(purchase.receivedDate)
    const matchesStatus = status === 'အားလုံး' || (status === 'ကုန်ကြွေး' ? !purchase.cancelled && dueOf(purchase) > 0 : status === 'ရှင်းပြီး' ? !purchase.cancelled && dueOf(purchase) === 0 : Boolean(purchase.cancelled))
    const matchesDate = !dateFilterActive || ((!fromDate || date >= fromDate) && (!toDate || date <= toDate))
    return matchesStatus && matchesDate && (!keyword || `${purchase.supplier} ${purchase.phone} ${purchase.voucher}`.toLowerCase().includes(keyword))
  }), [purchases, status, fromDate, toDate, dateFilterActive, query])
  const activePurchases = purchases.filter((purchase) => !purchase.cancelled)
  const total = activePurchases.reduce((sum, purchase) => sum + purchase.amount, 0)
  const payable = activePurchases.reduce((sum, purchase) => sum + dueOf(purchase), 0)
  const supplierCount = new Set(activePurchases.map((purchase) => purchase.supplier)).size

  useEffect(() => {
    setAppHeaderActions(<Button className="app-product-add-action" variant="contained" startIcon={<AddCircleRoundedIcon />} onClick={() => setDraft({ ...emptyPurchase, receivedDate: inputDate(new Date()), receivedTime: '00:00' })}>အဝယ်စာရင်းထည့်သွင်းပါ</Button>)
    return () => setAppHeaderActions(null)
  }, [setAppHeaderActions])

  const savePurchase = () => {
    if (!draft?.supplier.trim() || !draft.phone.trim() || !draft.address.trim() || !draft.voucher.trim() || !draft.senderName.trim() || !draft.senderPhone.trim() || !draft.receiverName.trim() || !draft.receivedDate || Number(draft.amount) <= 0) return
    setPurchases((current) => [...current, { ...draft, id: Date.now(), amount: Number(draft.amount), paid: 0, payments: [], items: [] }])
    setDraft(null)
  }
  const savePayment = () => {
    const remaining = dueOf(payment.purchase)
    const validCash = payment.method !== 'cash' || (payment.recipientName.trim() && payment.recipientPhone.trim() && payment.signature)
    const validMobile = payment.method !== 'mobile' || (payment.mobileName.trim() && payment.accountName.trim() && /^\d{8}$/.test(payment.transactionId))
    if (!payment || Number(payment.amount) <= 0 || Number(payment.amount) > remaining || !validCash || !validMobile) return
    const entry = { amount: Number(payment.amount), method: payment.method, recipientName: payment.recipientName, recipientPhone: payment.recipientPhone, signature: payment.signature, mobileName: payment.mobileName, accountName: payment.accountName, transactionId: payment.transactionId, time: new Intl.DateTimeFormat('en-GB', { dateStyle: 'short', timeStyle: 'short', hour12: true }).format(new Date()) }
    setPurchases((current) => current.map((purchase) => purchase.id === payment.purchase.id ? { ...purchase, paid: purchase.paid + entry.amount, payments: [...purchase.payments, entry], dueDate: purchase.paid + entry.amount >= purchase.amount ? '' : purchase.dueDate } : purchase))
    setPayment(null)
  }
  const saveCancel = () => {
    if (!cancelDraft?.reason.trim() || !cancelDraft?.approver.trim()) return
    setPurchases((current) => current.map((purchase) => purchase.id === cancelDraft.purchase.id ? { ...purchase, cancelled: { reason: cancelDraft.reason, approver: cancelDraft.approver, time: new Intl.DateTimeFormat('en-GB', { dateStyle: 'short', timeStyle: 'short', hour12: true }).format(new Date()) } } : purchase))
    setCancelDraft(null)
    setDetails(null)
  }

  return <Box className="page-stack purchases-page">
    <Box className="purchase-summary-filter">
      <Box className="purchase-summary-values"><Typography>အဝယ်စုစုပေါင်း <b>{money(total)}</b></Typography><Typography>ကုန်သည်ပေါင်း <b>{supplierCount}</b></Typography><Typography>ကြွေးလက်ကျန်စုစုပေါင်း <b>{money(payable)}</b></Typography></Box>
      <Box className="purchase-filter-controls"><TextField select size="small" label="အခြေအနေ" value={status} onChange={(event) => setStatus(event.target.value)}><MenuItem value="အားလုံး">အားလုံး</MenuItem><MenuItem value="ကုန်ကြွေး">ကုန်ကြွေး</MenuItem><MenuItem value="ရှင်းပြီး">ရှင်းပြီး</MenuItem><MenuItem value="ပယ်ဖျက်">ပယ်ဖျက်</MenuItem></TextField><Box className="purchase-date-row"><TextField size="small" type="date" label="မှ" value={fromDate} onChange={(event) => { setFromDate(event.target.value); setDateFilterActive(true) }} InputLabelProps={{ shrink: true }} /><TextField size="small" type="date" label="အထိ" value={toDate} onChange={(event) => { setToDate(event.target.value); setDateFilterActive(true) }} InputLabelProps={{ shrink: true }} /></Box><TextField className="purchase-search" size="small" label="ကုန်သည်၊ ဖုန်းနံပါတ် သို့မဟုတ် ဘောက်ချာရှာရန်" value={query} onChange={(event) => setQuery(event.target.value)} slotProps={{ input: { startAdornment: <SearchRoundedIcon fontSize="small" /> } }} /></Box>
    </Box>
    <Box className="purchases-desktop-table"><Box className="purchases-table-head"><span>ကုန်သည် / ကုမ္ပဏီ</span><span>ဘောက်ချာနံပါတ်</span><span>ပစ္စည်းလက်ခံချိန်</span><span>ငွေသွင်းရန်ရက်ချိန်း</span><span>ငွေပမာဏ</span><span>လုပ်ဆောင်ချက်များ</span></Box>{filtered.map((purchase) => <PurchaseRow key={purchase.id} purchase={purchase} onPay={(item) => setPayment(paymentDraftFor(item))} onDetails={setDetails} onRecords={setRecords} />)}</Box>
    <Box className="purchases-mobile-list">{filtered.map((purchase) => <PurchaseCard key={purchase.id} purchase={purchase} onPay={(item) => setPayment(paymentDraftFor(item))} onDetails={setDetails} onRecords={setRecords} />)}</Box>

    <Dialog open={Boolean(draft)} onClose={() => setDraft(null)} fullWidth maxWidth="sm"><DialogTitle>အဝယ်စာရင်းထည့်သွင်းပါ</DialogTitle><DialogContent className="supplier-form"><TextField autoFocus required label="ကုန်သည် / ကုမ္ပဏီအမည်" value={draft?.supplier || ''} onChange={(event) => setDraft((item) => ({ ...item, supplier: event.target.value }))} /><TextField required label="ဖုန်းနံပါတ်" value={draft?.phone || ''} onChange={(event) => setDraft((item) => ({ ...item, phone: event.target.value }))} /><TextField required label="လိပ်စာ" value={draft?.address || ''} onChange={(event) => setDraft((item) => ({ ...item, address: event.target.value }))} /><TextField required label="ဘောက်ချာနံပါတ်" value={draft?.voucher || ''} onChange={(event) => setDraft((item) => ({ ...item, voucher: event.target.value }))} /><TextField required label="ပစ္စည်း ပို့သူ အမည်" value={draft?.senderName || ''} onChange={(event) => setDraft((item) => ({ ...item, senderName: event.target.value }))} /><TextField required label="ပစ္စည်း ပို့သူ ဖုန်းနံပါတ်" value={draft?.senderPhone || ''} onChange={(event) => setDraft((item) => ({ ...item, senderPhone: event.target.value }))} /><TextField required label="ပစ္စည်း လက်ခံသူအမည်" value={draft?.receiverName || ''} onChange={(event) => setDraft((item) => ({ ...item, receiverName: event.target.value }))} /><TextField required type="date" label="ပစ္စည်းလက်ခံရက်" value={draft?.receivedDate || ''} onChange={(event) => setDraft((item) => ({ ...item, receivedDate: event.target.value }))} InputLabelProps={{ shrink: true }} /><TextField required type="time" label="ပစ္စည်းလက်ခံချိန်" value={draft?.receivedTime || ''} onChange={(event) => setDraft((item) => ({ ...item, receivedTime: event.target.value }))} InputLabelProps={{ shrink: true }} /><TextField required type="number" label="အဝယ်စုစုပေါင်းငွေပမာဏ" value={draft?.amount || ''} onChange={(event) => setDraft((item) => ({ ...item, amount: event.target.value }))} /><TextField type="date" label="ငွေသွင်းရန်ရက်ချိန်း" value={draft?.dueDate || ''} onChange={(event) => setDraft((item) => ({ ...item, dueDate: event.target.value }))} InputLabelProps={{ shrink: true }} /></DialogContent><DialogActions><Button onClick={() => setDraft(null)}>မလုပ်တော့ပါ</Button><Button variant="contained" disabled={!draft?.supplier.trim() || !draft?.phone.trim() || !draft?.address.trim() || !draft?.voucher.trim() || !draft?.senderName.trim() || !draft?.senderPhone.trim() || !draft?.receiverName.trim() || !draft?.receivedDate || !draft?.receivedTime || Number(draft?.amount) <= 0} onClick={savePurchase}>သိမ်းမည်</Button></DialogActions></Dialog>

    <Dialog open={Boolean(payment)} onClose={() => setPayment(null)} fullWidth maxWidth="xs"><DialogTitle>ကုန်ကြွေး ပေးချေမည်</DialogTitle><DialogContent className="payment-form"><Typography fontWeight={800}>ကြွေးကျန်ငွေ — {money(payment ? dueOf(payment.purchase) : 0)}</Typography><TextField select label="ပေးချေမှုနည်းလမ်း" value={payment?.method || 'cash'} onChange={(event) => setPayment((current) => ({ ...current, method: event.target.value }))}><MenuItem value="cash">ငွေသား</MenuItem><MenuItem value="mobile">Mobile Payment</MenuItem></TextField><TextField required type="number" label="သွင်းငွေ" value={payment?.amount ?? ''} onChange={(event) => setPayment((current) => ({ ...current, amount: event.target.value }))} helperText={`ကျန်ငွေ — ${money(Math.max(0, dueOf(payment?.purchase || { amount: 0, paid: 0 }) - Number(payment?.amount || 0)))}`} />{payment?.method === 'cash' ? <><TextField required label="လက်ခံသူအမည်" value={payment?.recipientName || ''} onChange={(event) => setPayment((current) => ({ ...current, recipientName: event.target.value }))} /><TextField required label="ဖုန်းနံပါတ်" value={payment?.recipientPhone || ''} onChange={(event) => setPayment((current) => ({ ...current, recipientPhone: event.target.value }))} /><Button className="signature-button" variant={payment?.signature ? 'contained' : 'outlined'} startIcon={<DrawRoundedIcon />} onClick={() => setSignatureOpen(true)}>{payment?.signature ? 'လက်မှတ်ထိုးပြီး' : 'လက်မှတ်ထိုးမည်'}</Button></> : <><TextField required label="Mobile Payment အမည်" value={payment?.mobileName || ''} onChange={(event) => setPayment((current) => ({ ...current, mobileName: event.target.value }))} /><TextField required label="Account name" value={payment?.accountName || ''} onChange={(event) => setPayment((current) => ({ ...current, accountName: event.target.value }))} /><TextField required label="Transaction ID (နောက်ဆုံး 8 လုံး)" value={payment?.transactionId || ''} onChange={(event) => setPayment((current) => ({ ...current, transactionId: event.target.value.replace(/\D/g, '').slice(-8) }))} inputProps={{ inputMode: 'numeric', maxLength: 8 }} /></>}<Typography variant="body2" color="text.secondary">အချိန် — သိမ်းချိန်တွင် မှတ်တမ်းတင်မည်</Typography></DialogContent><DialogActions><Button onClick={() => setPayment(null)}>မလုပ်တော့ပါ</Button><Button variant="contained" onClick={savePayment}>ပေးချေမည်</Button></DialogActions></Dialog>
    <Dialog open={signatureOpen} onClose={() => setSignatureOpen(false)} fullWidth maxWidth="sm"><DialogTitle>လက်မှတ်ထိုးပါ</DialogTitle><DialogContent><SignaturePad onSave={(signature) => { setPayment((current) => ({ ...current, signature })); setSignatureOpen(false) }} /></DialogContent><DialogActions><Button onClick={() => setSignatureOpen(false)}>မလုပ်တော့ပါ</Button></DialogActions></Dialog>

    <Dialog open={Boolean(details)} onClose={() => setDetails(null)} fullWidth maxWidth="xs"><DialogTitle>အဝယ်စာရင်း အသေးစိတ်</DialogTitle><DialogContent className="product-detail"><Detail label="ကုန်သည် / ကုမ္ပဏီအမည်" value={details?.supplier} /><Detail label="ဖုန်းနံပါတ်" value={details?.phone} /><Detail label="လိပ်စာ" value={details?.address} /><Detail label="ဘောက်ချာနံပါတ်" value={details?.voucher} /><Detail label="ပစ္စည်း ပို့သူ အမည်" value={details?.senderName} /><Detail label="ပစ္စည်း ပို့သူ ဖုန်းနံပါတ်" value={details?.senderPhone} /><Detail label="ပစ္စည်း လက်ခံသူအမည်" value={details?.receiverName} /><Detail label="ပစ္စည်းလက်ခံရက်" value={details?.receivedDate} /><Detail label="အဝယ်စုစုပေါင်းငွေပမာဏ" value={money(details?.amount)} /><Detail label="ကြွေးကျန်ငွေ" value={details?.cancelled ? 'ပယ်ဖျက်ထားသည်' : money(dueOf(details || { amount: 0, paid: 0 }))} />{details?.cancelled ? <Box className="cancel-note"><Typography fontWeight={800}>ပယ်ဖျက်မှတ်တမ်း</Typography><Typography>အကြောင်းပြချက် — {details.cancelled.reason}</Typography><Typography>အတည်ပြုသူ — {details.cancelled.approver}</Typography></Box> : null}</DialogContent><DialogActions>{details && !details.cancelled && details.paid === 0 ? <Button color="error" startIcon={<CancelRoundedIcon />} onClick={() => setCancelDraft({ purchase: details, reason: '', approver: '' })}>ပယ်ဖျက်မည်</Button> : null}<Box sx={{ flex: 1 }} /><Button onClick={() => setDetails(null)}>ပိတ်မည်</Button></DialogActions></Dialog>
    <Dialog open={Boolean(cancelDraft)} onClose={() => setCancelDraft(null)} fullWidth maxWidth="xs"><DialogTitle>အဝယ်စာရင်း ပယ်ဖျက်မည်</DialogTitle><DialogContent className="payment-form"><Typography color="error">ငွေမရှင်းရသေးသော စာရင်းကိုသာ ပယ်ဖျက်နိုင်သည်။</Typography><TextField autoFocus required multiline minRows={2} label="ပယ်ဖျက်ရသည့်အကြောင်းပြချက်" value={cancelDraft?.reason || ''} onChange={(event) => setCancelDraft((current) => ({ ...current, reason: event.target.value }))} /><TextField required label="ပယ်ဖျက်ရန် အတည်ပြုသူအမည်" value={cancelDraft?.approver || ''} onChange={(event) => setCancelDraft((current) => ({ ...current, approver: event.target.value }))} /></DialogContent><DialogActions><Button onClick={() => setCancelDraft(null)}>မလုပ်တော့ပါ</Button><Button color="error" variant="contained" disabled={!cancelDraft?.reason.trim() || !cancelDraft?.approver.trim()} onClick={saveCancel}>ပယ်ဖျက်မည်</Button></DialogActions></Dialog>
    <Dialog open={Boolean(records)} onClose={() => setRecords(null)} fullWidth maxWidth="xs"><DialogTitle>အဝယ်စာရင်း မှတ်တမ်း</DialogTitle><DialogContent className="product-record-list"><Box className="product-record-card"><Typography fontWeight={800}>ပစ္စည်းလက်ခံခြင်း</Typography><Typography>{records?.supplier} · {records?.voucher}</Typography><Typography>ငွေပမာဏ — {money(records?.amount)}</Typography><Typography>ပေးချေပြီး — {records?.paid ? money(records.paid) : 'ကုန်ကြွေး'}</Typography><Typography>ပစ္စည်းလက်ခံရက် — {records?.receivedDate}</Typography>{records?.payments?.map((entry, index) => <Typography key={index} variant="body2">ပေးချေမှု — {money(entry.amount)} · {entry.method === 'cash' ? 'ငွေသား' : entry.mobileName} · {entry.time}</Typography>)}{records?.cancelled ? <Typography color="error">ပယ်ဖျက်ထားသည် — {records.cancelled.approver} · {records.cancelled.time}</Typography> : null}</Box></DialogContent><DialogActions><Button onClick={() => setRecords(null)}>ပိတ်မည်</Button></DialogActions></Dialog>
  </Box>
}

function Detail({ label, value }) { return <Typography><b>{label}</b> — {value || 'မသတ်မှတ်ရသေးပါ'}</Typography> }
function SignaturePad({ onSave }) {
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const [hasSignature, setHasSignature] = useState(false)
  const point = (event) => { const canvas = canvasRef.current; const rect = canvas.getBoundingClientRect(); return { x: (event.clientX - rect.left) * (canvas.width / rect.width), y: (event.clientY - rect.top) * (canvas.height / rect.height) } }
  const start = (event) => { drawing.current = true; setHasSignature(true); const context = canvasRef.current.getContext('2d'); const value = point(event); context.beginPath(); context.moveTo(value.x, value.y); event.currentTarget.setPointerCapture(event.pointerId) }
  const draw = (event) => { if (!drawing.current) return; const context = canvasRef.current.getContext('2d'); const value = point(event); context.lineTo(value.x, value.y); context.stroke() }
  const clear = () => { const canvas = canvasRef.current; canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height); setHasSignature(false) }
  return <Box className="signature-pad"><Typography variant="body2" color="text.secondary">အောက်ပါနေရာတွင် လက်မှတ်ရေးထိုးပါ</Typography><canvas ref={canvasRef} width="900" height="300" onPointerDown={start} onPointerMove={draw} onPointerUp={() => { drawing.current = false }} onPointerCancel={() => { drawing.current = false }} /><Box><Button onClick={clear}>ပြန်ဖျက်မည်</Button><Button variant="contained" disabled={!hasSignature} onClick={() => onSave(canvasRef.current.toDataURL('image/png'))}>လက်မှတ်သိမ်းမည်</Button></Box></Box>
}
function PurchaseAction({ purchase, onPay }) { const due = dueOf(purchase); if (purchase.cancelled) return <IconButton color="error" aria-label="ပယ်ဖျက်ထားသည်"><CancelRoundedIcon /></IconButton>; if (!due) return <IconButton color="success" aria-label="ငွေရှင်းပြီး"><CheckCircleRoundedIcon /></IconButton>; return <Button size="small" startIcon={<PaymentsRoundedIcon />} onClick={() => onPay(purchase)}>{purchase.paid ? `ကျန်ငွေ ${money(due)}` : 'ပေးချေ'}</Button> }
function PurchaseRow({ purchase, onPay, onDetails, onRecords }) { const due = dueOf(purchase); return <Box className="purchases-table-row"><span><b>{purchase.supplier}</b><small>{purchase.phone}</small><small>{purchase.address}</small></span><span>{purchase.voucher}</span><span>{purchase.receivedDate}</span><span>{purchase.cancelled ? 'ပယ်ဖျက်ထားသည်' : due ? purchase.dueDate : 'ငွေရှင်းပြီး'}</span><span className={due && !purchase.cancelled ? 'supplier-payable' : ''}>{money(purchase.amount)}</span><span><PurchaseAction purchase={purchase} onPay={onPay} /><Button size="small" startIcon={<ArticleRoundedIcon />} onClick={() => onDetails(purchase)}>အသေးစိတ်</Button><IconButton aria-label="မှတ်တမ်း" onClick={() => onRecords(purchase)}><HistoryRoundedIcon /></IconButton></span></Box> }
function PurchaseCard({ purchase, onPay, onDetails, onRecords }) { const due = dueOf(purchase); const state = purchase.cancelled ? 'ပယ်ဖျက်ထားသည်' : due ? 'ကုန်ကြွေး' : 'ငွေရှင်းပြီး'; return <Box className="purchase-mobile-card"><Box><Typography fontWeight={850}>{purchase.supplier}</Typography><Typography variant="body2" color="text.secondary">ဘောက်ချာနံပါတ် {purchase.voucher}</Typography><Typography variant="body2" sx={{ mt: 1 }}>ပစ္စည်းလက်ခံရက်</Typography><Typography variant="body2">{purchase.receivedDate}</Typography></Box><Box className="purchase-mobile-side"><Typography variant="body2" color="text.secondary">{state}</Typography><Typography variant="h6" color={purchase.cancelled ? 'error.main' : due ? 'warning.dark' : 'success.dark'}>{money(due || purchase.amount)}</Typography>{due && !purchase.cancelled ? <Typography variant="body2">ရက်ချိန်း {purchase.dueDate}</Typography> : null}<Box><PurchaseAction purchase={purchase} onPay={onPay} /><IconButton aria-label="အသေးစိတ်" onClick={() => onDetails(purchase)}><ArticleRoundedIcon /></IconButton><IconButton aria-label="မှတ်တမ်း" onClick={() => onRecords(purchase)}><HistoryRoundedIcon /></IconButton></Box></Box></Box> }
