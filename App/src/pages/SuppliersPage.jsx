import { useMemo, useState } from 'react'
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControl, InputLabel, MenuItem, Paper, Select, Stack, Tab, Tabs, TextField, Typography, useMediaQuery } from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import InventoryRoundedIcon from '@mui/icons-material/InventoryRounded'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useData } from '../contexts/DataContext.jsx'
import { useFeedback } from '../contexts/FeedbackContext.jsx'
import { createPurchaseDocument, receivePurchaseDocument, saveProductSupplierDocument, sendPurchaseDocument } from '../services/shopApiService.js'

const money = (value) => `${Number(value || 0).toLocaleString('en-US')} ကျပ်`
const today = () => new Date().toISOString().slice(0, 10)
const dateBefore = (days) => new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)
const quantity = (value) => Number(value || 0)

function stockFor(product, stocks) {
  return stocks.filter((stock) => stock.productId === product.id).reduce((total, stock) => total + quantity(stock.quantity ?? stock.available), 0)
}

function orderDate(order) { return String(order.completedAt || order.createdAt || order.date || '').slice(0, 10) }

function analysisRows(data) {
  const from = dateBefore(90)
  const sales = (data.orders || []).filter((order) => order.fulfillmentStatus !== 'cancelled' && order.status !== 'cancelled' && orderDate(order) >= from)
  return (data.products || []).filter((product) => product.isActive !== false).map((product) => {
    const sold = sales.reduce((sum, order) => sum + (order.items || []).filter((item) => item.productId === product.id).reduce((line, item) => line + quantity(item.quantity), 0), 0)
    const available = stockFor(product, data.stocks || [])
    const daily = sold / 90
    const coverage = daily ? available / daily : Infinity
    const threshold = Number(data.catalogSettings?.lowStockDefault ?? 5)
    const suggested = daily ? Math.max(1, Math.ceil(daily * 14 - available)) : 0
    const status = daily === 0 || (available <= threshold && coverage > 28) ? 'slow' : coverage <= 7 ? 'urgent' : available <= threshold || coverage <= 14 ? 'watch' : 'healthy'
    return { product, available, sold, daily, coverage, suggested, status }
  }).sort((a, b) => {
    const rank = { urgent: 0, watch: 1, slow: 2, healthy: 3 }
    return rank[a.status] - rank[b.status] || a.coverage - b.coverage
  })
}

const statusMeta = {
  urgent: { label: 'အရေးပေါ်မှာရန်', color: 'error' },
  watch: { label: 'စောင့်ကြည့်ရန်', color: 'warning' },
  slow: { label: 'အရောင်းနှေး', color: 'default' },
  healthy: { label: 'လက်ကျန်ကောင်း', color: 'success' },
}

export default function SuppliersPage({ refresh }) {
  const { data } = useData(); const { user } = useAuth(); const { notify } = useFeedback(); const mobile = useMediaQuery('(max-width:899px)')
  const [tab, setTab] = useState('suggestions'); const [search, setSearch] = useState(''); const [draftOpen, setDraftOpen] = useState(false); const [selected, setSelected] = useState([]); const [supplierId, setSupplierId] = useState(''); const [expectedAt, setExpectedAt] = useState(''); const [note, setNote] = useState(''); const [receiving, setReceiving] = useState(null); const [busy, setBusy] = useState(false)
  const rows = useMemo(() => analysisRows(data), [data]); const suppliers = (data.suppliers || []).filter((supplier) => supplier.isActive !== false)
  const purchases = (data.purchases || []).filter((purchase) => purchase.status !== 'cancelled').sort((a, b) => String(b.orderedAt || b.createdAt).localeCompare(String(a.orderedAt || a.createdAt)))
  const draftPurchases = purchases.filter((purchase) => purchase.status === 'draft'); const orderedPurchases = purchases.filter((purchase) => ['ordered', 'partially_received'].includes(purchase.status))
  const visibleRows = rows.filter((row) => !search.trim() || `${row.product.name} ${row.product.sku || ''}`.toLowerCase().includes(search.trim().toLowerCase()))
  const linkedSuppliers = (productId) => (data.productSuppliers || []).filter((link) => link.productId === productId)
  const counts = ['urgent', 'watch', 'slow'].reduce((all, key) => ({ ...all, [key]: rows.filter((row) => row.status === key).length }), {})

  const openDraft = (row) => { setSelected(row ? [{ row, quantity: row.suggested || 1, unitCost: linkedSuppliers(row.product.id)[0]?.lastUnitCost || row.product.cost || 0, promotionLabel: '' }] : []); setSupplierId(''); setExpectedAt(''); setNote(''); setDraftOpen(true) }
  const createDraft = async () => {
    if (!supplierId || !selected.length || selected.some((line) => quantity(line.quantity) <= 0 || quantity(line.unitCost) < 0)) return notify('Supplier နှင့် ပစ္စည်း/စျေးနှုန်းကို ဖြည့်ပါ', 'warning')
    setBusy(true)
    try {
      const result = await createPurchaseDocument(user.uid, { supplierId, orderedAt: new Date(today()).toISOString(), expectedAt: expectedAt ? new Date(expectedAt).toISOString() : undefined, notes: note || undefined, items: selected.map((line) => ({ productId: line.row.product.id, quantity: quantity(line.quantity), unitCost: quantity(line.unitCost), promotionLabel: line.promotionLabel || undefined })) })
      await Promise.all(selected.map((line) => saveProductSupplierDocument(user.uid, { productId: line.row.product.id, supplierId, lastUnitCost: quantity(line.unitCost) })))
      setDraftOpen(false); await refresh?.(); notify(`အဝယ်စာရင်း ${result.purchase?.purchaseNumber || ''} ကို မှတ်ထားပြီးပါပြီ`)
    } catch (error) { notify(error.message || 'အဝယ်စာရင်း မသိမ်းနိုင်ပါ', 'error') } finally { setBusy(false) }
  }
  const send = async (purchase) => { try { setBusy(true); await sendPurchaseDocument(user.uid, purchase.id); await refresh?.(); notify('Supplier ထံမှာပြီးအဖြစ် ပြောင်းပြီးပါပြီ') } catch (error) { notify(error.message || 'မှာယူမှု မပြောင်းနိုင်ပါ', 'error') } finally { setBusy(false) } }
  const receive = async () => {
    const changed = receiving.items.some((item) => quantity(item.actualUnitCost) !== quantity(item.unitCost))
    if (changed && !receiving.confirmed) { setReceiving({ ...receiving, needsConfirmation: true }); return }
    try { setBusy(true); await receivePurchaseDocument(user.uid, receiving.id, { receivedAt: new Date(today()).toISOString(), confirmPriceChanges: Boolean(receiving.confirmed), items: receiving.items.map((item) => ({ purchaseItemId: item.id, quantity: quantity(item.quantity - item.receivedQuantity) || 1, actualUnitCost: quantity(item.actualUnitCost) })) }, crypto.randomUUID()); setReceiving(null); await refresh?.(); notify('လက်ခံပြီး stock ထဲသို့ထည့်ပြီးပါပြီ') } catch (error) { notify(error.message || 'ပစ္စည်းလက်ခံ၍မရပါ', 'error') } finally { setBusy(false) }
  }
  const addLine = (row) => setSelected((current) => current.some((line) => line.row.product.id === row.product.id) ? current : [...current, { row, quantity: row.suggested || 1, unitCost: linkedSuppliers(row.product.id)[0]?.lastUnitCost || row.product.cost || 0, promotionLabel: '' }])
  const purchaseCard = (purchase, ordered) => <Paper key={purchase.id} variant="outlined" className="purchase-plan-card"><Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}><Box><Typography fontWeight={900}>{purchase.purchaseNumber}</Typography><Typography variant="body2" color="text.secondary">{purchase.supplier?.name || 'ကုန်သည်'} · {String(purchase.orderedAt || '').slice(0, 10)}</Typography>{purchase.expectedAt ? <Typography variant="body2" color="text.secondary">ပို့မည့်ရက် — {String(purchase.expectedAt).slice(0, 10)}</Typography> : null}</Box><Chip size="small" label={ordered ? 'ပို့လာရန်' : 'မှတ်ထားသည်'} color={ordered ? 'warning' : 'default'} /></Stack><Divider sx={{ my: 1 }} />{(purchase.items || []).map((item) => <Typography key={item.id} variant="body2">{item.productName} · {item.quantity} ခု · မှာစျေး {money(item.plannedUnitCost ?? item.unitCost)}{item.plannedPromotionLabel ? ` · ${item.plannedPromotionLabel}` : ''}</Typography>)}<Stack direction="row" justifyContent="flex-end" sx={{ mt: 1 }}>{ordered ? <Button size="small" variant="contained" onClick={() => setReceiving({ ...purchase, items: purchase.items.map((item) => ({ ...item, actualUnitCost: item.unitCost })), confirmed: false, needsConfirmation: false })}>လက်ခံမည်</Button> : <Button size="small" variant="contained" onClick={() => send(purchase)} disabled={busy}>မှာပြီး</Button>}</Stack></Paper>

  return <Box className="purchase-planning-page"><Box className="purchase-planning-header"><Box><Typography variant="h5" fontWeight={900}>အဝယ်စာရင်းနှင့် မှတ်စု</Typography><Typography color="text.secondary">ရောင်းနှုန်းနှင့် လက်ကျန်ကိုကြည့်၍ ဝယ်ယူမှုကို ကြိုတင်ပြင်ဆင်ပါ</Typography></Box><Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => openDraft()}>ဝယ်ဖို့မှတ်မည်</Button></Box>
    <Box className="purchase-metric-grid"><Metric label="အရေးပေါ်မှာရန်" value={`${counts.urgent} မျိုး`} tone="error" /><Metric label="စောင့်ကြည့်ရန်" value={`${counts.watch} မျိုး`} tone="warning" /><Metric label="အရောင်းနှေး" value={`${counts.slow} မျိုး`} tone="default" /><Metric label="မှာပြီးမရောက်သေး" value={`${orderedPurchases.length} စာရင်း`} tone="info" /></Box>
    <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" scrollButtons="auto"><Tab value="suggestions" label="မှာရန်အကြံပြုချက်" /><Tab value="drafts" label="မှတ်ထားသောအဝယ်စာရင်း" /><Tab value="ordered" label="မှာပြီး / ပို့လာရန်" /></Tabs>
    {tab === 'suggestions' ? <Box className="purchase-workspace"><Paper variant="outlined" className="purchase-analysis"><Stack direction={mobile ? 'column' : 'row'} justifyContent="space-between" gap={1} sx={{ mb: 1.5 }}><Box><Typography fontWeight={900}>၉၀ ရက် အရောင်းနှုန်း ခွဲခြမ်းစိတ်ဖြာမှု</Typography><Typography variant="body2" color="text.secondary">နောက် ၁၄ ရက်စာအတွက် မှာယူပမာဏကို အကြံပြုထားသည်</Typography></Box><TextField size="small" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ပစ္စည်းရှာရန်" /></Stack>{visibleRows.map((row) => <Box key={row.product.id} className="purchase-suggestion-row"><Box><Typography fontWeight={850}>{row.product.name}</Typography><Typography variant="body2" color="text.secondary">လက်ကျန် {row.available} ခု · ၉၀ ရက်ရောင်းပြီး {row.sold} ခု · တစ်နေ့ {row.daily.toFixed(2)} ခု</Typography><Typography variant="caption" color="text.secondary">{Number.isFinite(row.coverage) ? `လက်ကျန်အသုံးခံ ${Math.floor(row.coverage)} ရက်` : 'အရောင်းမရှိသေးပါ'}{row.status !== 'healthy' ? ` · ${row.status === 'slow' ? 'အရောင်းနည်းသောကြောင့် ချက်ချင်းမှာရန်မလိုပါ' : `အကြံပြု ${row.suggested} ခု`}` : ''}</Typography></Box><Stack direction="row" alignItems="center" gap={1}><Chip size="small" label={statusMeta[row.status].label} color={statusMeta[row.status].color} /><Button size="small" onClick={() => openDraft(row)}>မှတ်မည်</Button></Stack></Box>)}{!visibleRows.length ? <Typography color="text.secondary" sx={{ p: 2 }}>ပစ္စည်းမတွေ့ပါ</Typography> : null}</Paper><Paper variant="outlined" className="purchase-draft-side"><Typography fontWeight={900}>မှတ်ထားသောစာရင်း</Typography><Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Supplier လာသောအခါ မှာပြီးအဖြစ်ပြောင်းနိုင်သည်</Typography>{draftPurchases.slice(0, 4).map((purchase) => purchaseCard(purchase, false))}{!draftPurchases.length ? <Typography color="text.secondary">မှတ်ထားသောအဝယ်စာရင်းမရှိသေးပါ</Typography> : null}</Paper></Box> : null}
    {tab === 'drafts' ? <Stack spacing={1}>{draftPurchases.map((purchase) => purchaseCard(purchase, false))}{!draftPurchases.length ? <Empty text="မှတ်ထားသောအဝယ်စာရင်းမရှိသေးပါ" /> : null}</Stack> : null}
    {tab === 'ordered' ? <Stack spacing={1}>{orderedPurchases.map((purchase) => purchaseCard(purchase, true))}{!orderedPurchases.length ? <Empty text="မှာပြီး/ပို့လာရန်စာရင်းမရှိသေးပါ" /> : null}</Stack> : null}
    <Dialog open={draftOpen} onClose={() => setDraftOpen(false)} fullWidth maxWidth="md"><DialogTitle>ဝယ်ဖို့မှတ်မည်</DialogTitle><DialogContent><Stack spacing={1.5} sx={{ pt: 1 }}><FormControl fullWidth><InputLabel>ဝယ်မည့်ကုန်သည်</InputLabel><Select label="ဝယ်မည့်ကုန်သည်" value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>{suppliers.map((supplier) => <MenuItem value={supplier.id} key={supplier.id}>{supplier.name}</MenuItem>)}</Select></FormControl>{!suppliers.length ? <Alert severity="warning">ကုန်သည်မရှိသေးပါ။ ကုန်သည်စာရင်းတွင် အရင်ထည့်ပါ။</Alert> : null}<TextField type="date" label="ပို့မည့်ရက်" value={expectedAt} onChange={(event) => setExpectedAt(event.target.value)} InputLabelProps={{ shrink: true }} /><TextField label="မှတ်ချက်" value={note} onChange={(event) => setNote(event.target.value)} multiline minRows={2} />{selected.map((line, index) => <Paper key={line.row.product.id} variant="outlined" sx={{ p: 1.25 }}><Stack direction={mobile ? 'column' : 'row'} gap={1} alignItems={mobile ? 'stretch' : 'center'}><Box sx={{ flex: 1 }}><Typography fontWeight={800}>{line.row.product.name}</Typography><Typography variant="caption">အကြံပြု {line.row.suggested || 1} ခု</Typography></Box><TextField size="small" type="number" label="အရေအတွက်" value={line.quantity} onChange={(e) => setSelected((all) => all.map((item, i) => i === index ? { ...item, quantity: e.target.value } : item))} /><TextField size="small" type="number" label="မှာစျေး" value={line.unitCost} onChange={(e) => setSelected((all) => all.map((item, i) => i === index ? { ...item, unitCost: e.target.value } : item))} /><TextField size="small" label="လျှော့စျေး / မှတ်ချက်" value={line.promotionLabel} onChange={(e) => setSelected((all) => all.map((item, i) => i === index ? { ...item, promotionLabel: e.target.value } : item))} /><Button color="error" size="small" onClick={() => setSelected((all) => all.filter((_, i) => i !== index))}>ဖယ်မည်</Button></Stack></Paper>)}<TextField select size="small" label="ပစ္စည်းထပ်ထည့်ရန်" value="" onChange={(e) => { const row = rows.find((item) => item.product.id === e.target.value); if (row) addLine(row) }}>{rows.filter((row) => !selected.some((line) => line.row.product.id === row.product.id)).map((row) => <MenuItem key={row.product.id} value={row.product.id}>{row.product.name}</MenuItem>)}</TextField></Stack></DialogContent><DialogActions><Button onClick={() => setDraftOpen(false)}>ပိတ်မည်</Button><Button variant="contained" onClick={createDraft} disabled={busy}>မှတ်မည်</Button></DialogActions></Dialog>
    <Dialog open={Boolean(receiving)} onClose={() => setReceiving(null)} fullWidth maxWidth="sm"><DialogTitle>ပစ္စည်းလက်ခံမည်</DialogTitle><DialogContent><Stack spacing={1.25} sx={{ pt: 1 }}><Typography color="text.secondary">မှာစျေးနှင့် ပို့စျေးမတူလျှင် အတည်ပြုပြီးမှသာ stock ထဲသို့ထည့်မည်။</Typography>{receiving?.items.map((item, index) => <Paper key={item.id} variant="outlined" sx={{ p: 1.25 }}><Typography fontWeight={800}>{item.productName}</Typography><Typography variant="body2">မှာစျေး — {money(item.plannedUnitCost ?? item.unitCost)}</Typography><TextField fullWidth size="small" type="number" label="ပို့လာသောတစ်ခုစျေး" value={item.actualUnitCost} onChange={(e) => setReceiving((current) => ({ ...current, items: current.items.map((line, i) => i === index ? { ...line, actualUnitCost: e.target.value } : line), needsConfirmation: false, confirmed: false }))} sx={{ mt: 1 }} /></Paper>)}{receiving?.needsConfirmation ? <Alert severity="warning">မှာစျေးနှင့် ပို့စျေးကွာခြားနေပါသည်။ အောက်က အတည်ပြုခလုတ်ကိုနှိပ်ပြီးမှ လက်ခံပါ။</Alert> : null}</Stack></DialogContent><DialogActions><Button onClick={() => setReceiving(null)}>ပိတ်မည်</Button>{receiving?.needsConfirmation ? <Button variant="contained" color="warning" onClick={() => setReceiving((current) => ({ ...current, confirmed: true, needsConfirmation: false }))}>စျေးကွာခြားမှု အတည်ပြုမည်</Button> : <Button variant="contained" onClick={receive} disabled={busy}>လက်ခံမည်</Button>}</DialogActions></Dialog>
  </Box>
}

function Metric({ label, value, tone }) { return <Paper variant="outlined" className={`purchase-metric purchase-metric--${tone}`}><Typography variant="body2" color="text.secondary">{label}</Typography><Typography variant="h6" fontWeight={900}>{value}</Typography></Paper> }
function Empty({ text }) { return <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}><InventoryRoundedIcon color="disabled" /><Typography color="text.secondary">{text}</Typography></Paper> }
