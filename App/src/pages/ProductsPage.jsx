import { useMemo, useState } from 'react'
import { Box, Button, Card, CardContent, Chip, InputAdornment, TextField, Typography } from '@mui/material'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded'
import { useData } from '../contexts/DataContext.jsx'
import PageHeader from '../components/PageHeader.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { formatKs } from '../utils/storage.js'

export default function ProductsPage({ navigate }) {
  const { data } = useData()
  const [query, setQuery] = useState('')
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

  return (
    <Box className="page-stack">
      <PageHeader title="Products" subtitle="Manage your catalog, pricing, variants and availability." actions={
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => navigate('settings')}>Add product</Button>
      } />
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
    </Box>
  )
}
