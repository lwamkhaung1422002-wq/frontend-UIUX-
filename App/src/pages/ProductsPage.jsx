import { useMemo, useState } from 'react'
import { Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, InputAdornment, TextField, Typography } from '@mui/material'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded'
import { useData } from '../contexts/DataContext.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import PageHeader from '../components/PageHeader.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { formatKs } from '../utils/storage.js'
import { createProductDocument } from '../services/shopApiService.js'

export default function ProductsPage({ navigate, refresh, requireAuth }) {
  const { data } = useData()
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [importRows, setImportRows] = useState([])
  const [importErrors, setImportErrors] = useState([])
  const [importing, setImporting] = useState(false)
  const products = useMemo(() => {
    const term = query.trim().toLowerCase()
    return (data.products || []).filter((product) =>
      !term || [product.name, product.sku].some((value) => String(value || '').toLowerCase().includes(term)),
    )
  }, [data.products, query])
  const availableByProduct = useMemo(() => (data.stocks || []).reduce((map, stock) => {
    map[stock.productId] = (map[stock.productId] || 0) + Math.max(0, Number(stock.quantity || 0) - Number(stock.reservedQuantity || 0))
    return map
  }, {}), [data.stocks])
  const downloadTemplate = () => {
    const blob = new Blob(['name,sku,price,cost\nPremium Rice 5kg,RICE-5KG,25000,20000\n'], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'greenmart-product-import-template.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }
  const readCsv = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const lines = (await file.text()).split(/\r?\n/).filter(Boolean)
    const headers = (lines.shift() || '').split(',').map((value) => value.trim().toLowerCase())
    const required = ['name', 'sku', 'price', 'cost']
    if (required.some((header) => !headers.includes(header))) {
      setImportErrors(['CSV must contain name, sku, price, and cost columns.'])
      setImportRows([])
      return
    }
    const existingSkus = new Set((data.products || []).map((product) => String(product.sku || '').toLowerCase()).filter(Boolean))
    const seen = new Set()
    const errors = []
    const rows = lines.map((line, index) => {
      const values = line.split(',').map((value) => value.trim())
      const row = Object.fromEntries(headers.map((header, position) => [header, values[position] || '']))
      row.price = Number(row.price)
      row.cost = Number(row.cost)
      if (!row.name) errors.push(`Row ${index + 2}: name is required.`)
      if (!row.sku) errors.push(`Row ${index + 2}: SKU is required.`)
      if (row.price < 0 || !Number.isFinite(row.price)) errors.push(`Row ${index + 2}: price is invalid.`)
      if (row.cost < 0 || !Number.isFinite(row.cost)) errors.push(`Row ${index + 2}: cost is invalid.`)
      const sku = row.sku.toLowerCase()
      if (existingSkus.has(sku) || seen.has(sku)) errors.push(`Row ${index + 2}: duplicate SKU ${row.sku}.`)
      seen.add(sku)
      return row
    })
    setImportRows(rows)
    setImportErrors(errors)
    event.target.value = ''
  }
  const confirmImport = async () => {
    if (requireAuth?.() || importErrors.length) return
    setImporting(true)
    try {
      for (const row of importRows) await createProductDocument(user.uid, row)
      await refresh()
      setImportRows([])
    } finally { setImporting(false) }
  }

  return (
    <Box className="page-stack">
      <PageHeader title="Products" subtitle="Manage your catalog, pricing, variants and availability." actions={<>
        <Button onClick={downloadTemplate}>CSV template</Button>
        <Button component="label">Import CSV<input hidden type="file" accept=".csv,text/csv" onChange={readCsv} /></Button>
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => navigate('settings')}>Add product</Button>
      </>} />
      <TextField
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search products or SKU"
        size="small"
        slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon /></InputAdornment> } }}
      />
      <Box className="product-grid">
        {products.map((product) => (
          <Card key={product.id} variant="outlined" className="product-card">
            <Box className="product-image"><Inventory2RoundedIcon /></Box>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                <Typography fontWeight={800}>{product.name}</Typography>
                <Chip size="small" color={product.isActive === false ? 'default' : 'success'} label={product.isActive === false ? 'Archived' : 'Active'} />
              </Box>
              <Typography variant="caption" color="text.secondary">{product.sku || 'No SKU'} · {(product.variants || []).length} variants</Typography>
              <Typography variant="h6" sx={{ mt: 1 }}>{formatKs(product.price)}</Typography>
              <Typography variant="body2" color="text.secondary">{availableByProduct[product.id] || 0} available</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
      {!products.length ? <EmptyState title="No products found" message="Add a product or try a different search." /> : null}
      <Dialog open={Boolean(importRows.length || importErrors.length)} onClose={() => { setImportRows([]); setImportErrors([]) }} maxWidth="md" fullWidth>
        <DialogTitle>Product import preview</DialogTitle>
        <DialogContent>
          {importErrors.map((error) => <Typography key={error} color="error" variant="body2">{error}</Typography>)}
          {importRows.map((row) => <Box key={row.sku} className="purchase-line"><span><b>{row.name}</b><small>{row.sku}</small></span><b>{formatKs(row.price)}</b></Box>)}
        </DialogContent>
        <DialogActions><Button onClick={() => { setImportRows([]); setImportErrors([]) }}>Cancel</Button><Button variant="contained" disabled={Boolean(importErrors.length) || importing} onClick={confirmImport}>Import {importRows.length} products</Button></DialogActions>
      </Dialog>
    </Box>
  )
}
