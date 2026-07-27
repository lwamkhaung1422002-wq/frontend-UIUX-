import { useMemo, useState } from 'react'
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, Typography } from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import { useData } from '../contexts/DataContext.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import PageHeader from '../components/PageHeader.jsx'
import SectionCard from '../components/SectionCard.jsx'
import StatusChip from '../components/StatusChip.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { createPurchaseDocument, payPurchaseDocument, receivePurchaseDocument, sendPurchaseDocument } from '../services/shopApiService.js'
import { formatKs } from '../utils/storage.js'

export default function PurchasesPage({ refresh, requireAuth, navigate }) {
  const { data } = useData()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ supplierId: '', productId: '', variantId: '', quantity: 1, unitCost: 0, deliveryCost: 0, notes: '' })
  const purchases = useMemo(() => data.purchases || [], [data.purchases])
  const totals = useMemo(() => ({
    ordered: purchases.reduce((sum, item) => sum + Number(item.total || 0), 0),
    payable: purchases.reduce((sum, item) => sum + Math.max(0, Number(item.total || 0) - Number(item.paidAmount || 0)), 0),
  }), [purchases])
  const act = async (action) => {
    if (requireAuth?.()) return
    setBusy(true)
    try { await action(); await refresh() } finally { setBusy(false) }
  }
  const create = () => act(async () => {
    await createPurchaseDocument(user.uid, {
      supplierId: form.supplierId, deliveryCost: Number(form.deliveryCost), notes: form.notes,
      items: [{ productId: form.productId, ...(form.variantId ? { variantId: form.variantId } : {}), quantity: Number(form.quantity), unitCost: Number(form.unitCost) }],
    })
    setOpen(false)
  })
  return <Box className="page-stack">
    <PageHeader title="Purchases" subtitle="Create purchase orders, receive stock and track supplier payables." actions={<>
      <Button onClick={() => navigate('suppliers')}>Suppliers</Button>
      <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setOpen(true)}>New purchase</Button>
    </>} />
    <Box className="home-primary-metrics">
      <SectionCard title="Purchase orders"><Typography variant="h5">{purchases.length}</Typography></SectionCard>
      <SectionCard title="Ordered value"><Typography variant="h5">{formatKs(totals.ordered)}</Typography></SectionCard>
      <SectionCard title="Supplier payable"><Typography variant="h5" color="warning.main">{formatKs(totals.payable)}</Typography></SectionCard>
    </Box>
    {purchases.map((purchase) => <SectionCard key={purchase.id} title={`${purchase.purchaseNumber} · ${purchase.supplier?.name}`} subtitle={`${new Date(purchase.orderedAt).toLocaleDateString()} · ${purchase.items.length} item(s)`} actions={<StatusChip status={purchase.status} />}>
      {purchase.items.map((item) => <Box key={item.id} className="purchase-line"><span><b>{item.productName}</b><small>{item.receivedQuantity}/{item.quantity} received</small></span><b>{formatKs(item.lineTotal)}</b></Box>)}
      <Box className="purchase-summary"><span>Total <b>{formatKs(purchase.total)}</b></span><span>Paid <b>{formatKs(purchase.paidAmount)}</b></span><span>Due <b>{formatKs(Math.max(0, purchase.total - purchase.paidAmount))}</b></span></Box>
      <Box className="table-actions" sx={{ mt: 2 }}>
        {purchase.status === 'draft' ? <Button disabled={busy} onClick={() => act(() => sendPurchaseDocument(user.uid, purchase.id))}>Send order</Button> : null}
        {['ordered', 'partially_received'].includes(purchase.status) ? <Button variant="outlined" disabled={busy} onClick={() => act(() => receivePurchaseDocument(user.uid, purchase.id, { items: purchase.items.filter((item) => item.receivedQuantity < item.quantity).map((item) => ({ purchaseItemId: item.id, quantity: item.quantity - item.receivedQuantity })) }))}>Receive remaining</Button> : null}
        {purchase.paidAmount < purchase.total ? <Button variant="outlined" disabled={busy} onClick={() => act(() => payPurchaseDocument(user.uid, purchase.id, { amount: purchase.total - purchase.paidAmount, method: 'Cash' }))}>Pay balance</Button> : null}
      </Box>
    </SectionCard>)}
    {!purchases.length ? <EmptyState title="No purchases yet" message="Create a purchase order to start replenishing inventory." /> : null}
    <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>New purchase order</DialogTitle>
      <DialogContent className="dialog-form">
        <TextField select label="Supplier" value={form.supplierId} onChange={(event) => setForm((current) => ({ ...current, supplierId: event.target.value }))}>{(data.suppliers || []).filter((item) => item.isActive).map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}</TextField>
        <TextField select label="Product" value={form.productId} onChange={(event) => setForm((current) => ({ ...current, productId: event.target.value, variantId: '' }))}>{(data.products || []).filter((item) => item.isActive !== false).map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}</TextField>
        <TextField type="number" label="Quantity" value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))} />
        <TextField type="number" label="Unit cost" value={form.unitCost} onChange={(event) => setForm((current) => ({ ...current, unitCost: event.target.value }))} />
        <TextField type="number" label="Delivery cost" value={form.deliveryCost} onChange={(event) => setForm((current) => ({ ...current, deliveryCost: event.target.value }))} />
        <TextField label="Notes" value={form.notes} multiline onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
      </DialogContent>
      <DialogActions><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="contained" disabled={busy || !form.supplierId || !form.productId || Number(form.quantity) < 1} onClick={create}>Create draft</Button></DialogActions>
    </Dialog>
  </Box>
}
