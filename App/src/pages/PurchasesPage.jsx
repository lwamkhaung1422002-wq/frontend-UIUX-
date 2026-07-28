import { useMemo, useState } from 'react'
import {
  Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, InputAdornment, MenuItem, TextField, Typography, useMediaQuery,
} from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import { useData } from '../contexts/DataContext.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useFeedback } from '../contexts/FeedbackContext.jsx'
import PageHeader from '../components/PageHeader.jsx'
import SectionCard from '../components/SectionCard.jsx'
import StatusChip from '../components/StatusChip.jsx'
import EmptyState from '../components/EmptyState.jsx'
import {
  createPurchaseDocument, payPurchaseDocument, receivePurchaseDocument,
  returnPurchaseDocument, reversePurchasePaymentDocument, sendPurchaseDocument,
} from '../services/shopApiService.js'
import { formatDate, formatKs, getToday } from '../utils/storage.js'
import useSessionState from '../hooks/useSessionState.js'

const initialPurchase = { supplierId: '', productId: '', variantId: '', unitId: '', quantity: 1, unitCost: 0, deliveryCost: 0, notes: '' }

export default function PurchasesPage({ refresh, requireAuth, navigate }) {
  const { data } = useData()
  const { user } = useAuth()
  const { notify } = useFeedback()
  const fullScreen = useMediaQuery('(max-width:600px)')
  const [createOpen, setCreateOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState(initialPurchase)
  const [workflow, setWorkflow] = useState(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useSessionState('purchases:query', '')
  const [status, setStatus] = useSessionState('purchases:status', 'all')
  const purchases = useMemo(() => (data.purchases || []).filter((purchase) => {
    const term = query.trim().toLowerCase()
    return (status === 'all' || purchase.status === status) &&
      (!term || [purchase.purchaseNumber, purchase.supplier?.name].some((value) => String(value || '').toLowerCase().includes(term)))
  }), [data.purchases, query, status])
  const totals = useMemo(() => ({
    ordered: purchases.reduce((sum, item) => sum + Number(item.total || 0), 0),
    payable: purchases.reduce((sum, item) => sum + Math.max(0, Number(item.total || 0) - Number(item.paidAmount || 0)), 0),
  }), [purchases])
  const methods = (data.catalogSettings?.paymentMethods || []).filter((method) => method.active && method.type !== 'cod')
  const selectedProduct = (data.products || []).find((product) => product.id === form.productId)
  const purchaseUnits = (selectedProduct?.units || []).filter((entry) => entry.canPurchase !== false)
  const selectedPurchaseUnit = purchaseUnits.find((entry) => entry.unitId === form.unitId) ||
    purchaseUnits.find((entry) => entry.isBase) || purchaseUnits[0]
  const quantityStep = selectedPurchaseUnit?.unit?.precision > 0
    ? 10 ** -selectedPurchaseUnit.unit.precision
    : 1

  const run = async (operation, successMessage, close = true) => {
    if (requireAuth?.()) return
    setBusy(true)
    setError('')
    try {
      await operation()
      await refresh()
      notify(successMessage)
      if (close) setWorkflow(null)
    } catch (nextError) {
      setError(nextError.message || 'The transaction could not be completed.')
    } finally {
      setBusy(false)
    }
  }
  const create = () => run(async () => {
    await createPurchaseDocument(user.uid, {
      supplierId: form.supplierId, deliveryCost: Number(form.deliveryCost), notes: form.notes,
      items: [{
        productId: form.productId,
        ...(form.variantId ? { variantId: form.variantId } : {}),
        ...(selectedPurchaseUnit?.unitId ? { unitId: selectedPurchaseUnit.unitId } : {}),
        quantity: Number(form.quantity),
        unitCost: Number(form.unitCost),
      }],
    })
    setCreateOpen(false)
    setForm(initialPurchase)
  }, 'Purchase draft created.', false)

  const openReceive = (purchase) => setWorkflow({
    type: 'receive', purchase, review: false, receivedAt: getToday(), note: '', idempotencyKey: crypto.randomUUID(),
    items: purchase.items.filter((item) =>
      Number(item.receivedBaseQuantity ?? item.receivedQuantity) < Number(item.baseQuantity ?? item.quantity)
    ).map((item) => {
      const factor = Number(item.conversionFactor || 1)
      const remainingBase = Number(item.baseQuantity ?? item.quantity) - Number(item.receivedBaseQuantity ?? item.receivedQuantity)
      const remaining = remainingBase / factor
      const precision = item.product?.units?.find((entry) => entry.unitId === item.unitId)?.unit?.precision ?? 3
      return {
      id: item.id, name: item.productName, selected: true, remaining,
      quantity: remaining,
      precision,
      trackingMode: item.product?.trackingMode || 'NONE',
      requiresExpiry: item.product?.capabilities?.['inventory.expiry'] === true,
      locationId: data.inventoryLocations?.find((location) => location.type === 'SELLABLE' && location.isActive !== false)?.id || data.inventoryLocations?.[0]?.id || '',
      lotNumber: '', expiresAt: '', serials: '',
    }}),
  })
  const openPayment = (purchase) => setWorkflow({
    type: 'payment', purchase, review: false, amount: purchase.total - purchase.paidAmount,
    method: methods[0]?.name || 'Cash', paidAt: getToday(), reference: '', notes: '',
  })
  const openReturn = (purchase) => {
    const receipts = (purchase.receipts || []).map((receipt) => {
      const item = purchase.items.find((line) => line.id === receipt.purchaseItemId)
      const returned = (purchase.returns || []).filter((entry) => entry.inventoryBatchId === receipt.inventoryBatchId).reduce((sum, entry) => sum + Number(entry.baseQuantity ?? entry.quantity), 0)
      const available = Number(receipt.baseQuantity ?? receipt.quantity) - returned
      return { ...receipt, label: `${item?.productName || 'Product'} · ${available} base units available`, available, unitCost: receipt.inventoryBatch?.unitCost ?? item?.unitCost ?? 0 }
    }).filter((receipt) => receipt.available > 0)
    setWorkflow({ type: 'return', purchase, review: false, receipts, receiptId: receipts[0]?.id || '', quantity: 1, reason: '', returnedAt: getToday() })
  }
  const openReversal = (purchase, payment) => setWorkflow({ type: 'reversal', purchase, payment, review: false, reason: '' })
  const selectedReceipt = workflow?.type === 'return' ? workflow.receipts.find((receipt) => receipt.id === workflow.receiptId) : null
  const validWorkflow = workflow?.type === 'receive'
    ? workflow.items.some((item) => item.selected) && workflow.items.filter((item) => item.selected).every((item) => {
      const serials = String(item.serials || '').split(/\r?\n|,/).map((value) => value.trim()).filter(Boolean)
      return Number(item.quantity) > 0 && Number(item.quantity) <= item.remaining && item.locationId &&
        (item.trackingMode !== 'LOT' || (item.lotNumber.trim() && (!item.requiresExpiry || item.expiresAt))) &&
        (item.trackingMode !== 'SERIAL' || serials.length === Number(item.quantity))
    })
    : workflow?.type === 'payment'
      ? Number(workflow.amount) > 0 && Number(workflow.amount) <= workflow.purchase.total - workflow.purchase.paidAmount && workflow.method
      : workflow?.type === 'return'
        ? selectedReceipt && Number(workflow.quantity) > 0 && Number(workflow.quantity) <= selectedReceipt.available && workflow.reason.trim()
        : workflow?.type === 'reversal' ? workflow.reason.trim() : false

  const confirmWorkflow = () => {
    if (!workflow || !validWorkflow) return
    if (!workflow.review) {
      setWorkflow((current) => ({ ...current, review: true }))
      return
    }
    const { purchase } = workflow
    if (workflow.type === 'receive') {
      return run(() => receivePurchaseDocument(user.uid, purchase.id, {
        receivedAt: workflow.receivedAt, note: workflow.note,
        items: workflow.items.filter((item) => item.selected).map((item) => ({
          purchaseItemId: item.id,
          quantity: Number(item.quantity),
          locationId: item.locationId,
          ...(item.trackingMode === 'LOT' ? {
            lot: { lotNumber: item.lotNumber, ...(item.expiresAt ? { expiresAt: item.expiresAt } : {}) },
          } : {}),
          ...(item.trackingMode === 'SERIAL' ? {
            serials: String(item.serials || '').split(/\r?\n|,/).map((value) => value.trim()).filter(Boolean).map((serial) => ({ serial })),
          } : {}),
        })),
      }, workflow.idempotencyKey), 'Stock receipt recorded.')
    }
    if (workflow.type === 'payment') {
      return run(() => payPurchaseDocument(user.uid, purchase.id, {
        amount: Number(workflow.amount), method: workflow.method, paidAt: workflow.paidAt,
        reference: workflow.reference, notes: workflow.notes,
      }), 'Supplier payment recorded.')
    }
    if (workflow.type === 'return') {
      return run(() => returnPurchaseDocument(user.uid, purchase.id, {
        purchaseReceiptId: workflow.receiptId, quantity: Number(workflow.quantity),
        reason: workflow.reason, returnedAt: workflow.returnedAt,
      }), 'Supplier return recorded.')
    }
    return run(() => reversePurchasePaymentDocument(user.uid, purchase.id, workflow.payment.id, { reason: workflow.reason }), 'Supplier payment reversed.')
  }

  return <Box className="page-stack">
    <PageHeader title="Purchases" subtitle="Create purchase orders, receive stock and track supplier payables." actions={<>
      <Button onClick={() => navigate('suppliers')}>Suppliers</Button>
      <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setCreateOpen(true)}>New purchase</Button>
    </>} />
    <Box className="home-primary-metrics">
      <SectionCard title="Purchase orders"><Typography variant="h5">{purchases.length}</Typography></SectionCard>
      <SectionCard title="Ordered value"><Typography variant="h5">{formatKs(totals.ordered)}</Typography></SectionCard>
      <SectionCard title="Supplier payable"><Typography variant="h5" color="warning.main">{formatKs(totals.payable)}</Typography></SectionCard>
    </Box>
    <Box className="data-toolbar">
      <TextField size="small" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search purchase or supplier" slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon /></InputAdornment> } }} />
      <TextField select size="small" label="Status" value={status} onChange={(event) => setStatus(event.target.value)} sx={{ minWidth: 180 }}>
        <MenuItem value="all">All statuses</MenuItem><MenuItem value="draft">Draft</MenuItem><MenuItem value="ordered">Ordered</MenuItem><MenuItem value="partially_received">Partially received</MenuItem><MenuItem value="received">Received</MenuItem><MenuItem value="partially_returned">Partially returned</MenuItem>
      </TextField>
    </Box>
    {purchases.map((purchase) => <SectionCard key={purchase.id} title={`${purchase.purchaseNumber} · ${purchase.supplier?.name}`} subtitle={`${formatDate(purchase.orderedAt)} · ${purchase.items.length} item(s)`} actions={<StatusChip status={purchase.status} />}>
      {purchase.items.map((item) => <Box key={item.id} className="purchase-line"><span><b>{item.productName}</b><small>{item.receivedQuantity}/{item.quantity} received</small></span><b>{formatKs(item.lineTotal)}</b></Box>)}
      <Box className="purchase-summary"><span>Total <b>{formatKs(purchase.total)}</b></span><span>Paid <b>{formatKs(purchase.paidAmount)}</b></span><span>Due <b>{formatKs(Math.max(0, purchase.total - purchase.paidAmount))}</b></span></Box>
      <Box className="table-actions" sx={{ mt: 2 }}>
        {purchase.status === 'draft' ? <Button disabled={busy} onClick={() => run(() => sendPurchaseDocument(user.uid, purchase.id), 'Purchase order sent.')}>Send order</Button> : null}
        {['ordered', 'partially_received'].includes(purchase.status) ? <Button variant="outlined" disabled={busy} onClick={() => openReceive(purchase)}>Receive stock</Button> : null}
        {purchase.paidAmount < purchase.total ? <Button variant="outlined" disabled={busy} onClick={() => openPayment(purchase)}>Record payment</Button> : null}
        {purchase.receipts?.length ? <Button color="warning" variant="outlined" disabled={busy} onClick={() => openReturn(purchase)}>Return stock</Button> : null}
      </Box>
      {(purchase.payments || []).filter((payment) => !payment.reversedAt).map((payment) => <Box key={payment.id} className="purchase-line">
        <span><b>{payment.method} · {formatKs(payment.amount)}</b><small>{formatDate(payment.paidAt)}{payment.reference ? ` · ${payment.reference}` : ''}</small></span>
        <Button size="small" color="error" onClick={() => openReversal(purchase, payment)}>Reverse</Button>
      </Box>)}
    </SectionCard>)}
    {!purchases.length ? <EmptyState title="No purchases yet" message="Create a purchase order to start replenishing inventory." /> : null}

    <Dialog open={createOpen} onClose={() => !busy && setCreateOpen(false)} maxWidth="sm" fullWidth fullScreen={fullScreen}>
      <DialogTitle>New purchase order</DialogTitle>
      <DialogContent className="dialog-form">
        <TextField select label="Supplier" value={form.supplierId} onChange={(event) => setForm((current) => ({ ...current, supplierId: event.target.value }))}>{(data.suppliers || []).filter((item) => item.isActive).map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}</TextField>
        <TextField select label="Product" value={form.productId} onChange={(event) => {
          const product = (data.products || []).find((item) => item.id === event.target.value)
          const unit = (product?.units || []).find((entry) => entry.isBase && entry.canPurchase !== false) ||
            (product?.units || []).find((entry) => entry.canPurchase !== false)
          setForm((current) => ({ ...current, productId: event.target.value, variantId: '', unitId: unit?.unitId || '' }))
        }}>{(data.products || []).filter((item) => item.isActive !== false).map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}</TextField>
        {purchaseUnits.length ? <TextField select label="Purchase unit" value={selectedPurchaseUnit?.unitId || ''} onChange={(event) => setForm((current) => ({ ...current, unitId: event.target.value }))}>
          {purchaseUnits.map((entry) => <MenuItem key={entry.unitId} value={entry.unitId}>{entry.unit?.name || entry.unit?.symbol || 'Unit'} × {Number(entry.conversionFactor || 1)} base</MenuItem>)}
        </TextField> : null}
        <TextField type="number" label="Quantity" value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))} slotProps={{ htmlInput: { min: quantityStep, step: quantityStep } }} />
        <TextField type="number" label="Unit cost" value={form.unitCost} onChange={(event) => setForm((current) => ({ ...current, unitCost: event.target.value }))} />
        <TextField type="number" label="Delivery cost" value={form.deliveryCost} onChange={(event) => setForm((current) => ({ ...current, deliveryCost: event.target.value }))} />
        <TextField label="Notes" value={form.notes} multiline onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
      </DialogContent>
      <DialogActions><Button onClick={() => setCreateOpen(false)}>Cancel</Button><Button variant="contained" disabled={busy || !form.supplierId || !form.productId || Number(form.quantity) <= 0} onClick={create}>Create draft</Button></DialogActions>
    </Dialog>

    <Dialog open={Boolean(workflow)} onClose={() => !busy && setWorkflow(null)} maxWidth="sm" fullWidth fullScreen={fullScreen}>
      <DialogTitle>{workflow?.review ? 'Review transaction' : workflow?.type === 'receive' ? 'Receive stock' : workflow?.type === 'payment' ? 'Record supplier payment' : workflow?.type === 'return' ? 'Return stock to supplier' : 'Reverse supplier payment'}</DialogTitle>
      <DialogContent className="dialog-form">
        {error ? <Alert severity="error">{error}</Alert> : null}
        {workflow?.review ? <Review workflow={workflow} selectedReceipt={selectedReceipt} /> : null}
        {!workflow?.review && workflow?.type === 'receive' ? <>
          {workflow.items.map((item, index) => <Box key={item.id} className="purchase-line">
            <FormControlLabel control={<Checkbox checked={item.selected} onChange={(event) => setWorkflow((current) => ({ ...current, items: current.items.map((line, lineIndex) => lineIndex === index ? { ...line, selected: event.target.checked } : line) }))} />} label={`${item.name} (${item.remaining} remaining)`} />
            <TextField size="small" type="number" label="Quantity" value={item.quantity} disabled={!item.selected} slotProps={{ htmlInput: { min: 10 ** -item.precision, step: 10 ** -item.precision, max: item.remaining } }} onChange={(event) => setWorkflow((current) => ({ ...current, items: current.items.map((line, lineIndex) => lineIndex === index ? { ...line, quantity: event.target.value } : line) }))} />
            {item.selected ? <Box sx={{ display: 'grid', gap: 1, width: '100%' }}>
              <TextField select size="small" label="Receiving location" value={item.locationId} onChange={(event) => setWorkflow((current) => ({ ...current, items: current.items.map((line, lineIndex) => lineIndex === index ? { ...line, locationId: event.target.value } : line) }))}>
                {(data.inventoryLocations || []).filter((location) => location.isActive !== false).map((location) => <MenuItem key={location.id} value={location.id}>{location.name} · {location.type}</MenuItem>)}
              </TextField>
              {item.trackingMode === 'LOT' ? <>
                <TextField required size="small" label="Lot number" value={item.lotNumber} onChange={(event) => setWorkflow((current) => ({ ...current, items: current.items.map((line, lineIndex) => lineIndex === index ? { ...line, lotNumber: event.target.value } : line) }))} />
                <TextField required={item.requiresExpiry} size="small" type="date" label="Expiry date" value={item.expiresAt} slotProps={{ inputLabel: { shrink: true } }} onChange={(event) => setWorkflow((current) => ({ ...current, items: current.items.map((line, lineIndex) => lineIndex === index ? { ...line, expiresAt: event.target.value } : line) }))} />
              </> : null}
              {item.trackingMode === 'SERIAL' ? <TextField required size="small" multiline minRows={3} label="Serial / IMEI values" helperText={`Enter exactly ${item.quantity} unique values, one per line.`} value={item.serials} onChange={(event) => setWorkflow((current) => ({ ...current, items: current.items.map((line, lineIndex) => lineIndex === index ? { ...line, serials: event.target.value } : line) }))} /> : null}
            </Box> : null}
          </Box>)}
          <TextField type="date" label="Receipt date" value={workflow.receivedAt} slotProps={{ inputLabel: { shrink: true } }} onChange={(event) => setWorkflow((current) => ({ ...current, receivedAt: event.target.value }))} />
          <TextField label="Receipt note" value={workflow.note} multiline onChange={(event) => setWorkflow((current) => ({ ...current, note: event.target.value }))} />
        </> : null}
        {!workflow?.review && workflow?.type === 'payment' ? <>
          <TextField type="number" label="Amount" value={workflow.amount} helperText={`Balance due: ${formatKs(workflow.purchase.total - workflow.purchase.paidAmount)}`} onChange={(event) => setWorkflow((current) => ({ ...current, amount: event.target.value }))} />
          <TextField select label="Payment method" value={workflow.method} onChange={(event) => setWorkflow((current) => ({ ...current, method: event.target.value }))}>{(methods.length ? methods : [{ name: 'Cash' }]).map((method) => <MenuItem key={method.name} value={method.name}>{method.name}</MenuItem>)}</TextField>
          <TextField type="date" label="Payment date" value={workflow.paidAt} slotProps={{ inputLabel: { shrink: true } }} onChange={(event) => setWorkflow((current) => ({ ...current, paidAt: event.target.value }))} />
          <TextField label="Reference" value={workflow.reference} onChange={(event) => setWorkflow((current) => ({ ...current, reference: event.target.value }))} />
          <TextField label="Note" value={workflow.notes} multiline onChange={(event) => setWorkflow((current) => ({ ...current, notes: event.target.value }))} />
        </> : null}
        {!workflow?.review && workflow?.type === 'return' ? <>
          <TextField select label="Receipt and product" value={workflow.receiptId} onChange={(event) => setWorkflow((current) => ({ ...current, receiptId: event.target.value, quantity: 1 }))}>{workflow.receipts.map((receipt) => <MenuItem key={receipt.id} value={receipt.id}>{receipt.label}</MenuItem>)}</TextField>
          <TextField type="number" label="Return quantity (base unit)" value={workflow.quantity} helperText={selectedReceipt ? `Maximum ${selectedReceipt.available}` : ''} slotProps={{ htmlInput: { min: 0.001, step: 0.001, max: selectedReceipt?.available } }} onChange={(event) => setWorkflow((current) => ({ ...current, quantity: event.target.value }))} />
          <TextField type="date" label="Return date" value={workflow.returnedAt} slotProps={{ inputLabel: { shrink: true } }} onChange={(event) => setWorkflow((current) => ({ ...current, returnedAt: event.target.value }))} />
          <TextField required label="Reason" value={workflow.reason} multiline onChange={(event) => setWorkflow((current) => ({ ...current, reason: event.target.value }))} />
        </> : null}
        {!workflow?.review && workflow?.type === 'reversal' ? <TextField required label="Reversal reason" value={workflow.reason} multiline onChange={(event) => setWorkflow((current) => ({ ...current, reason: event.target.value }))} /> : null}
      </DialogContent>
      <DialogActions>
        <Button disabled={busy} onClick={() => workflow?.review ? setWorkflow((current) => ({ ...current, review: false })) : setWorkflow(null)}>{workflow?.review ? 'Back' : 'Cancel'}</Button>
        <Button variant="contained" color={workflow?.type === 'return' || workflow?.type === 'reversal' ? 'error' : 'primary'} disabled={busy || !validWorkflow} onClick={confirmWorkflow}>{busy ? 'Saving…' : workflow?.review ? 'Confirm transaction' : 'Review'}</Button>
      </DialogActions>
    </Dialog>
  </Box>
}

function Review({ workflow, selectedReceipt }) {
  return <Box className="review-summary">
    <Alert severity={workflow.type === 'return' || workflow.type === 'reversal' ? 'warning' : 'info'}>Check these details carefully. This action will update financial or inventory records and be written to the audit log.</Alert>
    <Typography><b>Purchase:</b> {workflow.purchase.purchaseNumber}</Typography>
    {workflow.type === 'receive' ? workflow.items.filter((item) => item.selected).map((item) => <Typography key={item.id}>{item.name}: <b>{item.quantity}</b></Typography>) : null}
    {workflow.type === 'payment' ? <><Typography><b>Amount:</b> {formatKs(workflow.amount)}</Typography><Typography><b>Method:</b> {workflow.method}</Typography></> : null}
    {workflow.type === 'return' ? <><Typography><b>Receipt:</b> {selectedReceipt?.label}</Typography><Typography><b>Quantity:</b> {workflow.quantity}</Typography><Typography><b>Value:</b> {formatKs(Number(workflow.quantity) * Number(selectedReceipt?.unitCost || 0))}</Typography><Typography><b>Reason:</b> {workflow.reason}</Typography></> : null}
    {workflow.type === 'reversal' ? <><Typography><b>Payment:</b> {formatKs(workflow.payment.amount)} via {workflow.payment.method}</Typography><Typography><b>Reason:</b> {workflow.reason}</Typography></> : null}
  </Box>
}
