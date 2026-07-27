import { useMemo, useState } from 'react'
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, InputAdornment, TextField, Typography } from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import { useData } from '../contexts/DataContext.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import PageHeader from '../components/PageHeader.jsx'
import SectionCard from '../components/SectionCard.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { createCustomerDocument } from '../services/shopApiService.js'
import { formatKs } from '../utils/storage.js'

const blankCustomer = { name: '', phone: '', email: '', address: '', city: '', notes: '' }

export default function CustomersPage({ refresh, requireAuth }) {
  const { data } = useData()
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(blankCustomer)
  const [saving, setSaving] = useState(false)
  const customers = useMemo(() => {
    const term = query.toLowerCase()
    return (data.customers || []).filter((customer) => [customer.name, customer.phone, customer.email].some((value) => String(value || '').toLowerCase().includes(term)))
  }, [data.customers, query])
  const totals = useMemo(() => (data.orders || []).reduce((map, order) => {
    const key = order.customer?.phone || order.customer?.name
    if (key) map[key] = { orders: (map[key]?.orders || 0) + 1, spend: (map[key]?.spend || 0) + Number(order.total || 0), outstanding: (map[key]?.outstanding || 0) + Number(order.balanceDue || 0) }
    return map
  }, {}), [data.orders])
  const save = async () => {
    if (requireAuth?.()) return
    setSaving(true)
    try {
      await createCustomerDocument(user.uid, form)
      await refresh()
      setOpen(false)
      setForm(blankCustomer)
    } finally { setSaving(false) }
  }

  return (
    <Box className="page-stack">
      <PageHeader title="Customers" subtitle="Customer contacts, order value and outstanding balances." actions={
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setOpen(true)}>Add customer</Button>
      } />
      <TextField value={query} onChange={(event) => setQuery(event.target.value)} size="small" placeholder="Search name, phone or email" slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon /></InputAdornment> } }} />
      <Box className="customer-grid">
        {customers.map((customer) => {
          const summary = totals[customer.phone || customer.name] || {}
          return <SectionCard key={customer.id} title={customer.name} subtitle={[customer.phone, customer.email].filter(Boolean).join(' · ') || 'No contact details'}>
            <Typography variant="body2" color="text.secondary">{[customer.address, customer.city].filter(Boolean).join(', ') || 'No address'}</Typography>
            <Box className="customer-stats"><span><b>{summary.orders || 0}</b><small>Orders</small></span><span><b>{formatKs(summary.spend || 0)}</b><small>Total spend</small></span><span><b>{formatKs(summary.outstanding || 0)}</b><small>Outstanding</small></span></Box>
          </SectionCard>
        })}
      </Box>
      {!customers.length ? <EmptyState title="No customers found" message="Add your first customer or try another search." /> : null}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add customer</DialogTitle>
        <DialogContent className="dialog-form">
          {Object.keys(blankCustomer).map((field) => <TextField key={field} label={field[0].toUpperCase() + field.slice(1)} value={form[field]} onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))} required={field === 'name'} multiline={field === 'notes'} />)}
        </DialogContent>
        <DialogActions><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="contained" disabled={!form.name.trim() || saving} onClick={save}>Save customer</Button></DialogActions>
      </Dialog>
    </Box>
  )
}
