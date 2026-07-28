import { useMemo, useState } from 'react'
import { Box, Button, Card, CardActions, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, IconButton, InputAdornment, InputLabel, MenuItem, Select, Step, StepLabel, Stepper, TextField, Typography, useMediaQuery } from '@mui/material'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import { useData } from '../contexts/DataContext.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useFeedback } from '../contexts/FeedbackContext.jsx'
import PageHeader from '../components/PageHeader.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { formatKs } from '../utils/storage.js'
import { createProductDocument, updateProductDocument } from '../services/shopApiService.js'
import useSessionState from '../hooks/useSessionState.js'
import { api, getStoredShopId } from '../services/api.js'

const emptyProduct = {
  id: '', name: '', sku: '', price: 0, cost: 0, description: '', categoryId: '',
  trackingMode: 'NONE', quantityPrecision: 0, baseUnitId: '', sellingUnitId: '',
  sellingConversionFactor: 1, minimumOrderQty: 1, openingQuantity: 0,
}

export default function ProductsPage({ navigate, refresh, requireAuth }) {
  const { data } = useData()
  const { user } = useAuth()
  const { notify } = useFeedback()
  const [query, setQuery] = useSessionState('products:query', '')
  const [importRows, setImportRows] = useState([])
  const [importErrors, setImportErrors] = useState([])
  const [importing, setImporting] = useState(false)
  const [productDraft, setProductDraft] = useState(null)
  const [wizardStep, setWizardStep] = useState(0)
  const [wholesalePricing, setWholesalePricing] = useState(null)
  const [recipeDraft, setRecipeDraft] = useState(null)
  const fullScreen = useMediaQuery('(max-width:600px)')
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
  const saveProduct = async () => {
    if (requireAuth?.() || !productDraft?.name.trim()) return
    setImporting(true)
    try {
      const trackingCapabilities = {
        LOT: ['inventory.lots'],
        SERIAL: ['inventory.serials'],
        EXPIRY: ['inventory.lots', 'inventory.expiry'],
      }
      const payload = {
        name: productDraft.name,
        sku: productDraft.sku,
        price: Number(productDraft.price),
        cost: Number(productDraft.cost),
        description: productDraft.description,
        trackingMode: productDraft.trackingMode,
        quantityPrecision: Number(productDraft.quantityPrecision || 0),
        capabilities: trackingCapabilities[productDraft.trackingMode] || [],
        categoryId: productDraft.categoryId || undefined,
        ...(productDraft.baseUnitId ? {
          units: [
            {
              unitId: productDraft.baseUnitId,
              conversionFactor: 1,
              isBase: true,
              canSell: true,
              canPurchase: true,
              minimumOrderQty: Number(productDraft.minimumOrderQty || 1),
            },
            ...(productDraft.sellingUnitId && productDraft.sellingUnitId !== productDraft.baseUnitId ? [{
              unitId: productDraft.sellingUnitId,
              conversionFactor: Number(productDraft.sellingConversionFactor || 1),
              isBase: false,
              canSell: true,
              canPurchase: true,
              minimumOrderQty: Number(productDraft.minimumOrderQty || 1),
            }] : []),
          ],
        } : {}),
      }
      if (productDraft.id) await updateProductDocument(user.uid, productDraft.id, payload)
      else {
        const created = await createProductDocument(user.uid, payload)
        const productId = created.product?.id || created.id
        if (Number(productDraft.openingQuantity || 0) > 0 && productDraft.trackingMode === 'NONE') {
          await api.createInventory(getStoredShopId() || user.uid, {
            productId,
            quantity: Number(productDraft.openingQuantity),
            unitCost: Number(productDraft.cost || 0),
            note: 'Product Wizard opening inventory',
          })
        }
      }
      await refresh()
      notify(productDraft.id ? 'Product updated.' : 'Product and opening inventory saved.')
      setProductDraft(null)
      setWizardStep(0)
    } catch (error) {
      notify(error.message || 'Product could not be saved.', 'error')
    } finally { setImporting(false) }
  }
  const addPriceGroup = async () => {
    if (!wholesalePricing?.groupName.trim()) return
    try {
      await api.createPriceGroup(getStoredShopId() || user.uid, { name: wholesalePricing.groupName.trim() })
      setWholesalePricing((current) => ({ ...current, groupName: '' }))
      await refresh?.()
      notify('Customer price group created.')
    } catch (error) { notify(error.message || 'Price group could not be created.', 'error') }
  }
  const addPriceTier = async () => {
    if (!wholesalePricing?.productId || Number(wholesalePricing.minimumQuantity) <= 0 || Number(wholesalePricing.unitPrice) < 0) return
    try {
      await api.createPriceTier(getStoredShopId() || user.uid, {
        productId: wholesalePricing.productId,
        minimumQuantity: Number(wholesalePricing.minimumQuantity),
        unitPrice: Number(wholesalePricing.unitPrice),
        ...(wholesalePricing.priceGroupId ? { priceGroupId: wholesalePricing.priceGroupId } : {}),
      })
      setWholesalePricing((current) => ({ ...current, minimumQuantity: 1, unitPrice: 0 }))
      await refresh?.()
      notify('Wholesale tier created.')
    } catch (error) { notify(error.message || 'Price tier could not be created.', 'error') }
  }
  const openRecipe = (product) => {
    const recipe = (data.recipes || []).find((entry) => entry.productId === product.id)
    setRecipeDraft({
      productId: product.id,
      productName: product.name,
      yieldQuantity: Number(recipe?.yieldQuantity || 1),
      components: (recipe?.components || []).map((entry) => ({
        ingredientProductId: entry.ingredientProductId,
        quantity: Number(entry.quantity),
      })),
      modifierGroups: (recipe?.modifierGroups || []).map((group) => ({
        name: group.name,
        required: Boolean(group.required),
        minSelect: Number(group.minSelect || 0),
        maxSelect: Number(group.maxSelect || 1),
        options: (group.options || []).map((option) => {
          const delta = Array.isArray(option.ingredientDelta) ? option.ingredientDelta[0] : null
          return {
            name: option.name,
            priceDelta: Number(option.priceDelta || 0),
            ingredientProductId: delta?.productId || '',
            ingredientQuantity: Number(delta?.quantity || 0),
          }
        }),
      })),
    })
  }
  const saveRecipe = async () => {
    if (!recipeDraft?.components.length) {
      notify('Add at least one ingredient.', 'warning')
      return
    }
    setImporting(true)
    try {
      await api.replaceRecipe(getStoredShopId() || user.uid, recipeDraft.productId, {
        yieldQuantity: Number(recipeDraft.yieldQuantity),
        components: recipeDraft.components.map((entry) => ({
          ingredientProductId: entry.ingredientProductId,
          quantity: Number(entry.quantity),
        })),
        modifierGroups: recipeDraft.modifierGroups.map((group) => ({
          name: group.name,
          required: group.required,
          minSelect: Number(group.minSelect),
          maxSelect: Number(group.maxSelect),
          options: group.options.map((option) => ({
            name: option.name,
            priceDelta: Number(option.priceDelta),
            ingredientDelta: option.ingredientProductId && Number(option.ingredientQuantity)
              ? [{ productId: option.ingredientProductId, quantity: Number(option.ingredientQuantity) }]
              : [],
          })),
        })),
      })
      await refresh?.()
      setRecipeDraft(null)
      notify('Recipe and modifiers saved.')
    } catch (error) {
      notify(error.message || 'Recipe could not be saved.', 'error')
    } finally { setImporting(false) }
  }

  return (
    <Box className="page-stack">
      <PageHeader title="Products" subtitle="Manage your catalog, pricing, variants and availability." actions={<>
        {data.storeConfiguration?.effectiveCapabilities?.includes('wholesale.tierPricing') ? <Button onClick={() => setWholesalePricing({ groupName: '', productId: data.products?.[0]?.id || '', priceGroupId: '', minimumQuantity: 1, unitPrice: 0 })}>Wholesale pricing</Button> : null}
        <Button onClick={downloadTemplate}>CSV template</Button>
        <Button component="label">Import CSV<input hidden type="file" accept=".csv,text/csv" onChange={readCsv} /></Button>
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => { setWizardStep(0); setProductDraft({ ...emptyProduct, baseUnitId: data.units?.[0]?.id || '' }) }}>Add product</Button>
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
                <Chip
                  size="small"
                  variant="outlined"
                  label={product.isActive === false ? 'Archived' : 'Active'}
                  sx={product.isActive === false ? undefined : { color: 'primary.dark', borderColor: 'primary.main', fontWeight: 700 }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary">{product.sku || 'No SKU'} · {(product.variants || []).length} variants</Typography>
              <Typography variant="h6" sx={{ mt: 1 }}>{formatKs(product.price)}</Typography>
              <Typography variant="body2" color="text.secondary">{availableByProduct[product.id] || 0} available</Typography>
            </CardContent>
            <CardActions>
              <Button onClick={() => { setWizardStep(0); setProductDraft({ ...emptyProduct, ...product, baseUnitId: product.units?.find((unit) => unit.isBase)?.unitId || '' }) }}>View / edit</Button>
              <Button onClick={() => navigate('stock')}>Inventory</Button>
              {data.storeConfiguration?.effectiveCapabilities?.includes('restaurant.recipes')
                ? <Button onClick={() => openRecipe(product)}>Recipe</Button>
                : null}
            </CardActions>
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
      <Dialog open={Boolean(productDraft)} onClose={() => !importing && setProductDraft(null)} maxWidth="md" fullWidth fullScreen={fullScreen}>
        <DialogTitle>{productDraft?.id ? 'Edit product' : `Add ${data.storeConfiguration?.template?.terminology?.product || 'product'}`}</DialogTitle>
        <DialogContent className="dialog-form">
          {!productDraft?.id ? <Stepper activeStep={wizardStep} alternativeLabel sx={{ mb: 1 }}>
            {['Basics', 'Units', 'Tracking', 'Opening', 'Review'].map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
          </Stepper> : null}
          {(productDraft?.id || wizardStep === 0) ? <>
            <TextField autoFocus required label="Product name" value={productDraft?.name || ''} onChange={(event) => setProductDraft((current) => ({ ...current, name: event.target.value }))} />
            <TextField label="SKU" value={productDraft?.sku || ''} onChange={(event) => setProductDraft((current) => ({ ...current, sku: event.target.value }))} />
            <TextField select label="Category" value={productDraft?.categoryId || ''} onChange={(event) => setProductDraft((current) => ({ ...current, categoryId: event.target.value }))}>
              <MenuItem value="">No category</MenuItem>
              {(data.productTypes || []).map((category) => <MenuItem key={category.id} value={category.id}>{category.name}</MenuItem>)}
            </TextField>
            <TextField type="number" label="Selling price" value={productDraft?.price ?? 0} onChange={(event) => setProductDraft((current) => ({ ...current, price: event.target.value }))} />
            <TextField type="number" label="Cost" value={productDraft?.cost ?? 0} onChange={(event) => setProductDraft((current) => ({ ...current, cost: event.target.value }))} />
            <TextField multiline minRows={2} label="Description" value={productDraft?.description || ''} onChange={(event) => setProductDraft((current) => ({ ...current, description: event.target.value }))} />
          </> : null}
          {!productDraft?.id && wizardStep === 1 ? <>
            <FormControl fullWidth>
              <InputLabel id="base-unit-label">Base unit</InputLabel>
              <Select labelId="base-unit-label" label="Base unit" value={productDraft?.baseUnitId || ''} onChange={(event) => {
                const unit = data.units?.find((entry) => entry.id === event.target.value)
                setProductDraft((current) => ({ ...current, baseUnitId: event.target.value, quantityPrecision: unit?.precision ?? 0 }))
              }}>
                {(data.units || []).map((unit) => <MenuItem key={unit.id} value={unit.id}>{unit.name} ({unit.symbol})</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="selling-unit-label">Additional selling unit</InputLabel>
              <Select labelId="selling-unit-label" label="Additional selling unit" value={productDraft?.sellingUnitId || ''} onChange={(event) => setProductDraft((current) => ({ ...current, sellingUnitId: event.target.value }))}>
                <MenuItem value="">Base unit only</MenuItem>
                {(data.units || []).filter((unit) => unit.id !== productDraft?.baseUnitId).map((unit) => <MenuItem key={unit.id} value={unit.id}>{unit.name} ({unit.symbol})</MenuItem>)}
              </Select>
            </FormControl>
            {productDraft?.sellingUnitId ? <TextField type="number" label="Units contained in selling unit" helperText="Example: one carton contains 24 base pieces." value={productDraft.sellingConversionFactor} onChange={(event) => setProductDraft((current) => ({ ...current, sellingConversionFactor: event.target.value }))} slotProps={{ htmlInput: { min: 1, step: '0.001' } }} /> : null}
            <TextField type="number" label="Minimum order quantity" value={productDraft?.minimumOrderQty || 1} onChange={(event) => setProductDraft((current) => ({ ...current, minimumOrderQty: event.target.value }))} slotProps={{ htmlInput: { min: 1, step: '0.001' } }} />
          </> : null}
          {!productDraft?.id && wizardStep === 2 ? <>
            <FormControl fullWidth>
              <InputLabel id="tracking-mode-label">Tracking</InputLabel>
              <Select labelId="tracking-mode-label" label="Tracking" value={productDraft?.trackingMode || 'NONE'} onChange={(event) => setProductDraft((current) => ({ ...current, trackingMode: event.target.value }))}>
                <MenuItem value="NONE">No advanced tracking</MenuItem>
                {data.storeConfiguration?.effectiveCapabilities?.includes('inventory.lots') ? <MenuItem value="LOT">Lot / batch</MenuItem> : null}
                {data.storeConfiguration?.effectiveCapabilities?.includes('inventory.expiry') ? <MenuItem value="EXPIRY">Lot and expiry</MenuItem> : null}
                {data.storeConfiguration?.effectiveCapabilities?.includes('inventory.serials') ? <MenuItem value="SERIAL">Serial / IMEI</MenuItem> : null}
              </Select>
            </FormControl>
            <Typography variant="body2" color="text.secondary">Only released capabilities enabled for this store are shown. Serial products use whole-number quantities.</Typography>
          </> : null}
          {!productDraft?.id && wizardStep === 3 ? <>
            {productDraft?.trackingMode === 'NONE'
              ? <TextField type="number" label="Opening quantity" helperText="Creates an audited opening inventory batch. Fractional opening balances use the Inventory receiving workflow during compatibility mode." value={productDraft?.openingQuantity || 0} onChange={(event) => setProductDraft((current) => ({ ...current, openingQuantity: event.target.value }))} slotProps={{ htmlInput: { min: 0, step: 1 } }} />
              : <Typography color="text.secondary">Tracked products require exact lot, expiry, or serial details. Save the product first, then use the Inventory receiving workflow.</Typography>}
          </> : null}
          {!productDraft?.id && wizardStep === 4 ? <Box sx={{ display: 'grid', gap: 1 }}>
            <Typography variant="h6">{productDraft?.name}</Typography>
            <Typography color="text.secondary">{productDraft?.sku || 'No SKU'} · {productDraft?.trackingMode === 'NONE' ? 'Simple inventory' : productDraft?.trackingMode}</Typography>
            <Typography>{formatKs(productDraft?.price || 0)} selling price · {formatKs(productDraft?.cost || 0)} cost</Typography>
            <Chip sx={{ justifySelf: 'start' }} color="success" label={`${data.storeConfiguration?.template?.label || 'General Store'} policy checked`} />
          </Box> : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setProductDraft(null); setWizardStep(0) }}>Cancel</Button>
          {!productDraft?.id && wizardStep > 0 ? <Button onClick={() => setWizardStep((step) => step - 1)}>Back</Button> : null}
          {!productDraft?.id && wizardStep < 4
            ? <Button variant="contained" disabled={(wizardStep === 0 && !productDraft?.name.trim()) || (wizardStep === 1 && !productDraft?.baseUnitId)} onClick={() => setWizardStep((step) => step + 1)}>Continue</Button>
            : <Button variant="contained" disabled={importing || !productDraft?.name.trim()} onClick={saveProduct}>{importing ? 'Saving…' : 'Save product'}</Button>}
        </DialogActions>
      </Dialog>
      <Dialog open={Boolean(wholesalePricing)} onClose={() => setWholesalePricing(null)} maxWidth="md" fullWidth>
        <DialogTitle>Wholesale customer groups and tier pricing</DialogTitle>
        <DialogContent className="dialog-form">
          <Typography variant="h6">Customer groups</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField fullWidth label="New group name" value={wholesalePricing?.groupName || ''} onChange={(event) => setWholesalePricing((current) => ({ ...current, groupName: event.target.value }))} />
            <Button variant="outlined" onClick={addPriceGroup}>Add</Button>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {(data.priceGroups || []).map((group) => <Chip key={group.id} label={`${group.name} · ${group.tiers?.length || 0} tiers`} />)}
          </Box>
          <Typography variant="h6" sx={{ mt: 2 }}>Add quantity tier</Typography>
          <TextField select label="Product" value={wholesalePricing?.productId || ''} onChange={(event) => setWholesalePricing((current) => ({ ...current, productId: event.target.value }))}>
            {(data.products || []).map((product) => <MenuItem key={product.id} value={product.id}>{product.name}</MenuItem>)}
          </TextField>
          <TextField select label="Customer group (optional)" value={wholesalePricing?.priceGroupId || ''} onChange={(event) => setWholesalePricing((current) => ({ ...current, priceGroupId: event.target.value }))}>
            <MenuItem value="">All customers</MenuItem>
            {(data.priceGroups || []).map((group) => <MenuItem key={group.id} value={group.id}>{group.name}</MenuItem>)}
          </TextField>
          <TextField type="number" label="Minimum base quantity" value={wholesalePricing?.minimumQuantity || 1} onChange={(event) => setWholesalePricing((current) => ({ ...current, minimumQuantity: event.target.value }))} slotProps={{ htmlInput: { min: 1 } }} />
          <TextField type="number" label="Tier unit price" value={wholesalePricing?.unitPrice ?? 0} onChange={(event) => setWholesalePricing((current) => ({ ...current, unitPrice: event.target.value }))} slotProps={{ htmlInput: { min: 0 } }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWholesalePricing(null)}>Close</Button>
          <Button variant="contained" onClick={addPriceTier}>Add tier</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={Boolean(recipeDraft)} onClose={() => !importing && setRecipeDraft(null)} maxWidth="md" fullWidth fullScreen={fullScreen}>
        <DialogTitle>Recipe and modifiers · {recipeDraft?.productName}</DialogTitle>
        <DialogContent className="dialog-form">
          <TextField type="number" label="Menu yield quantity" value={recipeDraft?.yieldQuantity || 1} onChange={(event) => setRecipeDraft((current) => ({ ...current, yieldQuantity: event.target.value }))} slotProps={{ htmlInput: { min: 0.001, step: 0.001 } }} />
          <Typography variant="h6">Ingredients</Typography>
          {(recipeDraft?.components || []).map((component, index) => <Box key={`${component.ingredientProductId}-${index}`} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 140px auto' }, gap: 1 }}>
            <TextField select label="Ingredient" value={component.ingredientProductId} onChange={(event) => setRecipeDraft((current) => ({ ...current, components: current.components.map((entry, position) => position === index ? { ...entry, ingredientProductId: event.target.value } : entry) }))}>
              {(data.products || []).filter((entry) => entry.id !== recipeDraft.productId).map((entry) => <MenuItem key={entry.id} value={entry.id}>{entry.name}</MenuItem>)}
            </TextField>
            <TextField type="number" label="Base quantity" value={component.quantity} onChange={(event) => setRecipeDraft((current) => ({ ...current, components: current.components.map((entry, position) => position === index ? { ...entry, quantity: event.target.value } : entry) }))} slotProps={{ htmlInput: { min: 0.001, step: 0.001 } }} />
            <IconButton aria-label="Remove ingredient" onClick={() => setRecipeDraft((current) => ({ ...current, components: current.components.filter((_, position) => position !== index) }))}><DeleteOutlineRoundedIcon /></IconButton>
          </Box>)}
          <Button startIcon={<AddRoundedIcon />} onClick={() => setRecipeDraft((current) => ({ ...current, components: [...current.components, { ingredientProductId: data.products?.find((entry) => entry.id !== current.productId)?.id || '', quantity: 1 }] }))}>Add ingredient</Button>
          <Typography variant="h6" sx={{ mt: 2 }}>Modifier groups</Typography>
          {(recipeDraft?.modifierGroups || []).map((group, groupIndex) => <Box key={groupIndex} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 2, display: 'grid', gap: 1 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 90px 90px auto' }, gap: 1 }}>
              <TextField label="Group name" value={group.name} onChange={(event) => setRecipeDraft((current) => ({ ...current, modifierGroups: current.modifierGroups.map((entry, position) => position === groupIndex ? { ...entry, name: event.target.value } : entry) }))} />
              <TextField type="number" label="Min" value={group.minSelect} onChange={(event) => setRecipeDraft((current) => ({ ...current, modifierGroups: current.modifierGroups.map((entry, position) => position === groupIndex ? { ...entry, minSelect: event.target.value } : entry) }))} />
              <TextField type="number" label="Max" value={group.maxSelect} onChange={(event) => setRecipeDraft((current) => ({ ...current, modifierGroups: current.modifierGroups.map((entry, position) => position === groupIndex ? { ...entry, maxSelect: event.target.value } : entry) }))} />
              <IconButton aria-label="Remove modifier group" onClick={() => setRecipeDraft((current) => ({ ...current, modifierGroups: current.modifierGroups.filter((_, position) => position !== groupIndex) }))}><DeleteOutlineRoundedIcon /></IconButton>
            </Box>
            {(group.options || []).map((option, optionIndex) => <Box key={optionIndex} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 120px 1fr 120px auto' }, gap: 1 }}>
              <TextField label="Option" value={option.name} onChange={(event) => setRecipeDraft((current) => ({ ...current, modifierGroups: current.modifierGroups.map((entry, position) => position === groupIndex ? { ...entry, options: entry.options.map((item, itemIndex) => itemIndex === optionIndex ? { ...item, name: event.target.value } : item) } : entry) }))} />
              <TextField type="number" label="Price +" value={option.priceDelta} onChange={(event) => setRecipeDraft((current) => ({ ...current, modifierGroups: current.modifierGroups.map((entry, position) => position === groupIndex ? { ...entry, options: entry.options.map((item, itemIndex) => itemIndex === optionIndex ? { ...item, priceDelta: event.target.value } : item) } : entry) }))} />
              <TextField select label="Extra ingredient" value={option.ingredientProductId} onChange={(event) => setRecipeDraft((current) => ({ ...current, modifierGroups: current.modifierGroups.map((entry, position) => position === groupIndex ? { ...entry, options: entry.options.map((item, itemIndex) => itemIndex === optionIndex ? { ...item, ingredientProductId: event.target.value } : item) } : entry) }))}>
                <MenuItem value="">None</MenuItem>
                {(data.products || []).filter((entry) => entry.id !== recipeDraft.productId).map((entry) => <MenuItem key={entry.id} value={entry.id}>{entry.name}</MenuItem>)}
              </TextField>
              <TextField type="number" label="Extra qty" value={option.ingredientQuantity} onChange={(event) => setRecipeDraft((current) => ({ ...current, modifierGroups: current.modifierGroups.map((entry, position) => position === groupIndex ? { ...entry, options: entry.options.map((item, itemIndex) => itemIndex === optionIndex ? { ...item, ingredientQuantity: event.target.value } : item) } : entry) }))} />
              <IconButton aria-label="Remove modifier option" onClick={() => setRecipeDraft((current) => ({ ...current, modifierGroups: current.modifierGroups.map((entry, position) => position === groupIndex ? { ...entry, options: entry.options.filter((_, itemIndex) => itemIndex !== optionIndex) } : entry) }))}><DeleteOutlineRoundedIcon /></IconButton>
            </Box>)}
            <Button onClick={() => setRecipeDraft((current) => ({ ...current, modifierGroups: current.modifierGroups.map((entry, position) => position === groupIndex ? { ...entry, options: [...entry.options, { name: '', priceDelta: 0, ingredientProductId: '', ingredientQuantity: 0 }] } : entry) }))}>Add option</Button>
          </Box>)}
          <Button startIcon={<AddRoundedIcon />} onClick={() => setRecipeDraft((current) => ({ ...current, modifierGroups: [...current.modifierGroups, { name: '', required: false, minSelect: 0, maxSelect: 1, options: [] }] }))}>Add modifier group</Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRecipeDraft(null)}>Cancel</Button>
          <Button variant="contained" disabled={importing || !recipeDraft?.components.length} onClick={saveRecipe}>Save recipe</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
