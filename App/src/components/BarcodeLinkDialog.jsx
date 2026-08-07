import { useMemo, useState } from 'react'
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  MenuItem, Stack, TextField, useMediaQuery,
} from '@mui/material'
import { api } from '../services/api.js'

const initialDraft = { productId: '', variantId: '', productUnitId: '', kind: 'SUPPLIER', packageQuantity: 1 }

export default function BarcodeLinkDialog({ open, barcodeValue, products = [], shopId, onClose, onLinked, onCreateProduct }) {
  const fullScreen = useMediaQuery('(max-width:600px)')
  const [draft, setDraft] = useState(initialDraft)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const selectedProductId = draft.productId || products[0]?.id || ''
  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId),
    [products, selectedProductId],
  )

  const closeDialog = () => {
    setDraft(initialDraft)
    setError('')
    onClose?.()
  }

  const linkBarcode = async () => {
    if (!selectedProductId || !barcodeValue) return
    setBusy(true)
    setError('')
    try {
      const result = await api.createBarcode(shopId, {
        value: barcodeValue,
        productId: selectedProductId,
        variantId: draft.variantId || null,
        productUnitId: draft.productUnitId || null,
        kind: draft.kind,
        packageQuantity: Number(draft.packageQuantity || 1),
        isPrimary: true,
      })
      await onLinked?.(result.barcode)
      closeDialog()
    } catch (nextError) {
      setError(nextError.message || 'Barcode could not be linked.')
    } finally {
      setBusy(false)
    }
  }

  return <Dialog open={Boolean(open)} onClose={busy ? undefined : closeDialog} fullScreen={fullScreen} fullWidth maxWidth="sm">
    <DialogTitle>Unknown barcode</DialogTitle>
    <DialogContent>
      <Stack spacing={2} sx={{ pt: 1 }}>
        <Alert severity="warning">Barcode <b>{barcodeValue}</b> is not linked yet. Choose an existing product or create a new product, then continue the workflow.</Alert>
        {error ? <Alert severity="error">{error}</Alert> : null}
        <TextField select required label="Link to product" value={selectedProductId} onChange={(event) => setDraft((current) => ({ ...current, productId: event.target.value, variantId: '', productUnitId: '' }))}>
          {products.map((product) => <MenuItem key={product.id} value={product.id}>{product.name} · {product.sku || 'No SKU'}</MenuItem>)}
        </TextField>
        <TextField select label="Variant" value={draft.variantId} onChange={(event) => setDraft((current) => ({ ...current, variantId: event.target.value }))}>
          <MenuItem value="">Default product</MenuItem>
          {(selectedProduct?.variants || []).filter((variant) => variant.isActive !== false).map((variant) => <MenuItem key={variant.id} value={variant.id}>{variant.name}</MenuItem>)}
        </TextField>
        <TextField select label="Unit / package" value={draft.productUnitId} onChange={(event) => setDraft((current) => ({ ...current, productUnitId: event.target.value, packageQuantity: selectedProduct?.units?.find((unit) => unit.id === event.target.value)?.conversionFactor || 1 }))}>
          <MenuItem value="">Base/default unit</MenuItem>
          {(selectedProduct?.units || []).map((unit) => <MenuItem key={unit.id} value={unit.id}>{unit.unit?.name || unit.unit?.symbol || 'Unit'} × {unit.conversionFactor}</MenuItem>)}
        </TextField>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField fullWidth select label="Barcode type" value={draft.kind} onChange={(event) => setDraft((current) => ({ ...current, kind: event.target.value }))}>
            {['SUPPLIER', 'MANUFACTURER', 'PACK', 'CARTON'].map((kind) => <MenuItem key={kind} value={kind}>{kind}</MenuItem>)}
          </TextField>
          <TextField fullWidth type="number" label="Package quantity" value={draft.packageQuantity} onChange={(event) => setDraft((current) => ({ ...current, packageQuantity: event.target.value }))} slotProps={{ htmlInput: { min: 0.001, step: 0.001 } }} />
        </Stack>
      </Stack>
    </DialogContent>
    <DialogActions sx={{ flexWrap: 'wrap' }}>
      <Button onClick={closeDialog} disabled={busy}>Cancel</Button>
      <Button onClick={onCreateProduct} disabled={busy}>Create new product</Button>
      <Button variant="contained" onClick={linkBarcode} disabled={busy || !selectedProductId}>{busy ? 'Linking…' : 'Link & continue'}</Button>
    </DialogActions>
  </Dialog>
}
