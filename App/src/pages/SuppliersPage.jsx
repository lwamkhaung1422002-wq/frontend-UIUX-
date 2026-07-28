import { useMemo, useState } from 'react'
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, InputAdornment, TextField, Typography } from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import { useData } from '../contexts/DataContext.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import PageHeader from '../components/PageHeader.jsx'
import SectionCard from '../components/SectionCard.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { createSupplierDocument } from '../services/shopApiService.js'
import { formatKs } from '../utils/storage.js'
import useSessionState from '../hooks/useSessionState.js'

const blank = { name: '', contactPerson: '', phone: '', email: '', address: '', notes: '' }

export default function SuppliersPage({ refresh, requireAuth, navigate }) {
  const { data } = useData()
  const { user } = useAuth()
  const [query, setQuery] = useSessionState('suppliers:query', '')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(blank)
  const [saving, setSaving] = useState(false)
  const suppliers = useMemo(() => (data.suppliers || []).filter((supplier) =>
    [supplier.name, supplier.contactPerson, supplier.phone, supplier.email].some((value) => String(value || '').toLowerCase().includes(query.toLowerCase())),
  ), [data.suppliers, query])
  const save = async () => {
    if (requireAuth?.()) return
    setSaving(true)
    try {
      await createSupplierDocument(user.uid, form)
      await refresh()
      setForm(blank)
      setOpen(false)
    } finally { setSaving(false) }
  }
  return <Box className="page-stack">
    <PageHeader title="Suppliers" subtitle="Manage vendors, purchase history and outstanding payables." actions={<>
      <Button onClick={() => navigate('purchases')}>View purchases</Button>
      <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setOpen(true)}>Add supplier</Button>
    </>} />
    <TextField value={query} onChange={(event) => setQuery(event.target.value)} size="small" placeholder="Search suppliers" slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon /></InputAdornment> } }} />
    <Box className="customer-grid">
      {suppliers.map((supplier) => {
        const purchases = supplier.purchases || []
        const payable = purchases.reduce((sum, purchase) => sum + Math.max(0, Number(purchase.total || 0) - Number(purchase.paidAmount || 0)), 0)
        return <SectionCard key={supplier.id} title={supplier.name} subtitle={[supplier.contactPerson, supplier.phone].filter(Boolean).join(' · ') || 'No contact details'}>
          <Typography variant="body2" color="text.secondary">{supplier.email || supplier.address || 'No additional details'}</Typography>
          <Box className="customer-stats"><span><b>{purchases.length}</b><small>Purchases</small></span><span><b>{formatKs(payable)}</b><small>Payable</small></span><span><b>{supplier.isActive ? 'Active' : 'Inactive'}</b><small>Status</small></span></Box>
        </SectionCard>
      })}
    </Box>
    {!suppliers.length ? <EmptyState title="No suppliers found" message="Add a supplier before creating a purchase order." /> : null}
    <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Add supplier</DialogTitle>
      <DialogContent className="dialog-form">{Object.keys(blank).map((field) => <TextField key={field} label={field.replace(/([A-Z])/g, ' $1')} value={form[field]} required={field === 'name'} multiline={field === 'notes'} onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))} />)}</DialogContent>
      <DialogActions><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="contained" disabled={!form.name.trim() || saving} onClick={save}>Save supplier</Button></DialogActions>
    </Dialog>
  </Box>
}
