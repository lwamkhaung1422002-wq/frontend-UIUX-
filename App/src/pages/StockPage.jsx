import { useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded'
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded'
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded'
import QrCodeScannerRoundedIcon from '@mui/icons-material/QrCodeScannerRounded'
import PageHeader from '../components/PageHeader.jsx'
import MetricCard from '../components/MetricCard.jsx'
import EmptyState from '../components/EmptyState.jsx'
import DataToolbar from '../components/DataToolbar.jsx'
import SectionCard from '../components/SectionCard.jsx'
import BarcodeScannerDialog from '../components/BarcodeScannerDialog.jsx'
import BarcodeLinkDialog from '../components/BarcodeLinkDialog.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useData } from '../contexts/DataContext.jsx'
import { useFeedback } from '../contexts/FeedbackContext.jsx'
import {
  adjustStockBatch,
  createStockBatch,
  createVariantDocument,
  transferStockBalance,
  updateProductDocument,
  updateVariantDocument,
} from '../services/shopApiService.js'
import { buildStockState, formatKs, getStockVariantKey, getToday } from '../utils/storage.js'
import {
  normalizeOptionTree,
  optionPathFromValueIds,
  optionPathSignature,
  optionValuesForLevel,
  valueIdsFromOptionPath,
} from '../utils/catalog.js'
import useSessionState from '../hooks/useSessionState.js'
import { api, getStoredShopId } from '../services/api.js'

const emptyStockForm = {
  date: getToday(),
  productId: '',
  variantId: '',
  optionValueIds: [],
  unitCost: '',
  salePrice: '',
  quantity: 1,
  deli: 0,
  unitId: '',
  locationId: '',
  lotNumber: '',
  expiresAt: '',
  serials: '',
}

function rowText(row) {
  return [
    row.date,
    row.productName,
    row.variantName,
    row.optionPath?.map((entry) => `${entry.label} ${entry.value}`).join(' '),
    row.note,
    row.unitCost,
    row.salePrice,
    row.quantity,
    row.available,
  ]
    .join(' ')
    .toLowerCase()
}

function buildRows(state, search) {
  const grouped = {}

  state.stocks.forEach((stock) => {
    const key = `${stock.date || '-'}__${getStockVariantKey(stock)}__${stock.unitCost}__${stock.salePrice}__${stock.ledgerMode ? stock.locationId : ''}`
    if (!grouped[key]) {
      grouped[key] = {
        date: stock.date || '-',
        productId: stock.productId,
        variantId: stock.variantId,
        productName: stock.type || '-',
        variantName: stock.variantName || [stock.size, stock.color].filter(Boolean).join(' / ') || 'Default',
        optionPath: stock.optionPath || [],
        note: stock.note || '',
        unitCost: Number(stock.unitCost || 0),
        salePrice: Number(stock.salePrice || stock.price || 0),
        quantity: 0,
        reservedQuantity: 0,
        deli: 0,
        ledgerMode: Boolean(stock.ledgerMode),
        locationId: stock.locationId || '',
        locationName: stock.locationName || '',
        ledgerBalanceIds: [],
        ledgerVersions: [],
        ids: [],
      }
    }
    grouped[key].quantity += Number(stock.quantity || 0)
    grouped[key].reservedQuantity += Number(stock.reservedQuantity || 0)
    grouped[key].deli += Number(stock.deli || 0)
    grouped[key].ids.push(String(stock.id))
    if (stock.ledgerBalanceId) grouped[key].ledgerBalanceIds.push(String(stock.ledgerBalanceId))
    if (stock.ledgerBalanceId) grouped[key].ledgerVersions.push(Number(stock.ledgerVersion || 0))
  })

  const rows = Object.values(grouped)
    .map((row) => {
      const legacySold = (state.soldQtyMap[getStockVariantKey(row)] || []).reduce(
        (sum, item) => sum + Number(item.qty || 0),
        0,
      )
      const allocatedSold = row.ids.reduce(
        (sum, id) => sum + Number(state.soldBatchMap?.[id] || 0),
        0,
      )
      const reservedSold = Number(row.reservedQuantity || 0)
      const sold = row.ledgerMode ? reservedSold : (allocatedSold || reservedSold || legacySold)
      const adjustments = state.adjustmentMap[getStockVariantKey(row)] || []
      const adjusted = row.ledgerMode ? 0 : adjustments.reduce(
        (sum, item) => sum + (item.action === 'SUB' ? -1 : 1) * Number(item.qty || item.quantity || 0),
        0,
      )
      const adjustedQty = Math.max(0, Number(row.quantity || 0) + adjusted)
      return {
        ...row,
        adjustedQty,
        sold,
        available: Math.max(0, adjustedQty - sold),
      }
    })
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))

  const term = String(search || '').trim().toLowerCase()
  const filteredRows = term ? rows.filter((row) => rowText(row).includes(term)) : rows
  const totals = filteredRows.reduce(
    (acc, row) => {
      acc.totalAvailable += row.available
      acc.totalQuantity += row.adjustedQty
      acc.totalSold += row.sold
      acc.totalValue += row.adjustedQty * row.unitCost
      acc.totalAvailableValue += row.available * row.unitCost
      acc.totalDeliveryCost += row.deli
      return acc
    },
    {
      totalAvailable: 0,
      totalQuantity: 0,
      totalSold: 0,
      totalValue: 0,
      totalAvailableValue: 0,
      totalDeliveryCost: 0,
    },
  )

  return { rows: filteredRows, totals }
}

function stockTone(value) {
  if (value <= 0) return 'error'
  if (value <= 3) return 'warning'
  return 'success'
}

function moneyOrBlank(value) {
  const amount = Number(value ?? 0)
  return amount > 0 ? amount : ''
}

function variantForPath(product, optionPath) {
  const signature = optionPathSignature(optionPath)
  return (product?.variants || []).find(
    (variant) => variant.isActive !== false && optionPathSignature(variant.optionPath) === signature,
  )
}

export default function StockPage({ refresh, requireAuth, navigate }) {
  const { user } = useAuth()
  const { data } = useData()
  const { notify } = useFeedback()
  const state = useMemo(() => buildStockState(data), [data])
  const [search, setSearch] = useSessionState('stock:main-search', '')
  const [stockDialogOpen, setStockDialogOpen] = useState(false)
  const [stockForm, setStockForm] = useState(emptyStockForm)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [unknownBarcode, setUnknownBarcode] = useState('')
  const [lastBarcode, setLastBarcode] = useState(null)
  const [confirmBusy, setConfirmBusy] = useState(false)
  const [adjustTarget, setAdjustTarget] = useState(null)
  const [adjustDraft, setAdjustDraft] = useState({
    action: 'ADD',
    quantity: 1,
    reason: '',
  })
  const [workspace, setWorkspace] = useSessionState('inventory:workspace', 'balances')
  const [warrantyWorkflow, setWarrantyWorkflow] = useState(null)
  const [serialDisposition, setSerialDisposition] = useState(null)
  const [transferTarget, setTransferTarget] = useState(null)
  const [countTarget, setCountTarget] = useState(null)
  const [locationDraft, setLocationDraft] = useState(null)

  const { rows, totals } = useMemo(() => buildRows(state, search), [search, state])
  const selectedProduct = data.products.find((product) => String(product.id) === String(stockForm.productId))
  const optionTree = normalizeOptionTree(selectedProduct?.optionTree)
  const selectedOptionPath = optionPathFromValueIds(optionTree, stockForm.optionValueIds)
  const selectedVariant = selectedProduct?.variants?.find((variant) => String(variant.id) === String(stockForm.variantId))
    || variantForPath(selectedProduct, selectedOptionPath)
  const hasOptions = optionTree.levels.length > 0
  const allOptionsSelected = !hasOptions || optionTree.levels.every((_, index) => stockForm.optionValueIds[index])

  const openStockDialog = () => {
    if (requireAuth?.('add stock')) return
    const firstProduct = data.products[0]
    const firstVariant = (firstProduct?.variants || []).find((variant) => variant.isActive !== false)
    setStockForm({
      ...emptyStockForm,
      productId: firstProduct?.id || '',
      variantId: '',
      optionValueIds: firstVariant ? valueIdsFromOptionPath(firstVariant.optionPath) : [],
      unitCost: moneyOrBlank(firstVariant?.cost ?? firstProduct?.cost),
      salePrice: moneyOrBlank(firstVariant?.price ?? firstProduct?.price),
      unitId: firstProduct?.units?.find((unit) => unit.isBase)?.unitId || data.units?.[0]?.id || '',
      locationId: data.inventoryLocations?.find((location) => location.type === 'SELLABLE')?.id || data.inventoryLocations?.[0]?.id || '',
    })
    setStockDialogOpen(true)
  }

  const updateProduct = (productId) => {
    const product = data.products.find((entry) => String(entry.id) === String(productId))
    const variant = (product?.variants || []).find((entry) => entry.isActive !== false)
    setStockForm((current) => ({
      ...current,
      productId,
      variantId: '',
      optionValueIds: variant ? valueIdsFromOptionPath(variant.optionPath) : [],
      unitCost: moneyOrBlank(variant?.cost ?? product?.cost ?? current.unitCost),
      salePrice: moneyOrBlank(variant?.price ?? product?.price ?? current.salePrice),
    }))
  }

  const updateOptionValue = (levelIndex, valueId) => {
    const nextValueIds = [
      ...stockForm.optionValueIds.slice(0, levelIndex),
      valueId,
      ...stockForm.optionValueIds.slice(levelIndex + 1),
    ]
    const path = optionPathFromValueIds(optionTree, nextValueIds)
    const variant = path.length === optionTree.levels.length ? variantForPath(selectedProduct, path) : null
    setStockForm((current) => ({
      ...current,
      variantId: variant?.id || '',
      optionValueIds: nextValueIds,
      unitCost: moneyOrBlank(variant?.cost ?? selectedProduct?.cost ?? current.unitCost),
      salePrice: moneyOrBlank(variant?.price ?? selectedProduct?.price ?? current.salePrice),
    }))
  }

  const resolveSelectedVariant = async () => {
    if (!hasOptions) return null
    const path = optionPathFromValueIds(optionTree, stockForm.optionValueIds)
    if (path.length !== optionTree.levels.length) {
      throw new Error('Select every option before saving stock.')
    }
    const existing = variantForPath(selectedProduct, path)
    if (existing) return existing
    const result = await createVariantDocument(user.uid, selectedProduct.id, {
      name: path.map((entry) => entry.value).join(' / '),
      price: Number(stockForm.salePrice || selectedProduct?.price || 0),
      cost: Number(stockForm.unitCost || selectedProduct?.cost || 0),
      optionPath: path,
    })
    return result.variant || result
  }

  const saveStock = async () => {
    if (requireAuth?.('save stock')) return
    if (!stockForm.productId || !stockForm.date || Number(stockForm.quantity || 0) <= 0) {
      notify('Product, date, and quantity are required.', 'warning')
      return
    }
    if (!allOptionsSelected) {
      notify('Select every option before saving stock.', 'warning')
      return
    }

    try {
      const resolvedVariant = await resolveSelectedVariant()
      const nextCost = Number(stockForm.unitCost || resolvedVariant?.cost || selectedVariant?.cost || selectedProduct?.cost || 0)
      const nextSalePrice = Number(stockForm.salePrice || resolvedVariant?.price || selectedVariant?.price || selectedProduct?.price || 0)
      if (selectedProduct && !hasOptions) {
        await updateProductDocument(user.uid, selectedProduct.id, {
          ...selectedProduct,
          cost: nextCost,
          price: nextSalePrice,
        })
      } else if (selectedProduct && resolvedVariant) {
        await updateVariantDocument(user.uid, selectedProduct.id, resolvedVariant.id, {
          ...resolvedVariant,
          cost: nextCost,
          price: nextSalePrice,
        })
      }
      const advancedTracking = ['LOT', 'EXPIRY', 'SERIAL'].includes(selectedProduct?.trackingMode)
      if (advancedTracking) {
        const serials = String(stockForm.serials || '').split(/\r?\n|,/).map((value) => value.trim()).filter(Boolean)
        await api.receiveInventoryOperation(getStoredShopId() || user.uid, {
          productId: stockForm.productId,
          variantId: resolvedVariant?.id || stockForm.variantId || undefined,
          unitId: stockForm.unitId,
          locationId: stockForm.locationId,
          enteredQuantity: Number(stockForm.quantity || 0),
          unitCost: nextCost,
          reason: 'Inventory receiving workflow',
          ...(selectedProduct?.trackingMode === 'SERIAL' ? { serials: serials.map((serial) => ({ serial })) } : {}),
          ...(['LOT', 'EXPIRY'].includes(selectedProduct?.trackingMode) ? {
            lot: {
              lotNumber: stockForm.lotNumber,
              ...(stockForm.expiresAt ? { expiresAt: new Date(stockForm.expiresAt).toISOString() } : {}),
            },
          } : {}),
        }, crypto.randomUUID())
      } else await createStockBatch(user.uid, {
        productId: stockForm.productId,
        variantId: resolvedVariant?.id || stockForm.variantId || undefined,
        type: selectedProduct?.name,
        size: resolvedVariant?.optionPath?.[0]?.value || selectedVariant?.optionPath?.[0]?.value || 'Default',
        color: resolvedVariant?.optionPath?.[1]?.value || selectedVariant?.optionPath?.[1]?.value || '-',
        date: stockForm.date,
        unitCost: nextCost,
        salePrice: nextSalePrice,
        price: nextSalePrice,
        quantity: Number(stockForm.quantity || 0),
        deli: Number(stockForm.deli || 0),
      })
      notify('Stock batch added.')
      setStockDialogOpen(false)
      await refresh?.()
    } catch (error) {
      notify(error.message || 'Stock could not be added.', 'error')
    }
  }

  const saveAdjustment = async () => {
    if (requireAuth?.('adjust stock')) return
    if (!adjustDraft.reason.trim() || Number(adjustDraft.quantity || 0) <= 0) {
      notify('Adjustment quantity and reason are required.', 'warning')
      return
    }
    setConfirmBusy(true)
    try {
      await adjustStockBatch(user.uid, adjustTarget, adjustDraft)
      notify('Stock adjustment recorded.')
      setAdjustTarget(null)
      refresh()
    } catch (error) {
      notify(error.message || 'Stock could not be adjusted.', 'error')
    } finally {
      setConfirmBusy(false)
    }
  }

  const exportStock = async () => {
    const { exportStockPDF } = await import('../utils/reports.js')
    exportStockPDF(rows, totals)
  }

  const selectBarcodeTarget = (barcode) => {
    const product = data.products.find((entry) => entry.id === barcode.productId)
    if (!product) throw new Error('The linked product is not available in this store catalog.')
    const variant = (product.variants || []).find((entry) => entry.id === barcode.variantId)
    const productUnit = (product.units || []).find((entry) => entry.id === barcode.productUnitId)
      || (product.units || []).find((entry) => entry.isBase)
    setStockForm((current) => ({
      ...current,
      productId: product.id,
      variantId: variant?.id || '',
      optionValueIds: variant ? valueIdsFromOptionPath(variant.optionPath) : [],
      unitId: productUnit?.unitId || current.unitId,
      quantity: 1,
      unitCost: moneyOrBlank(variant?.cost ?? product.cost ?? current.unitCost),
      salePrice: moneyOrBlank(variant?.price ?? product.price ?? current.salePrice),
    }))
    setLastBarcode({ value: barcode.value, productName: product.name, unitName: productUnit?.unit?.name || productUnit?.unit?.symbol || 'Base unit' })
  }

  const scanStockBarcode = async (value) => {
    try {
      const result = await api.lookupBarcode(getStoredShopId() || user.uid, value, 'INVENTORY')
      setScannerOpen(false)
      if (!result.known) {
        setUnknownBarcode(result.normalizedValue || value.trim())
        return
      }
      selectBarcodeTarget(result.barcode)
      notify('Barcode matched. Product, variant and package were selected.')
    } catch (error) {
      notify(error.message || 'Barcode lookup failed.', 'error')
    }
  }

  const generateStockBarcode = async () => {
    if (!selectedProduct) {
      notify('Select a product before generating a barcode.', 'warning')
      return
    }
    try {
      const productUnit = (selectedProduct.units || []).find((entry) => entry.unitId === stockForm.unitId)
      const result = await api.createInternalBarcode(getStoredShopId() || user.uid, {
        productId: selectedProduct.id,
        variantId: selectedVariant?.id || stockForm.variantId || null,
        productUnitId: productUnit?.id || null,
        packageQuantity: Number(productUnit?.conversionFactor || 1),
        isPrimary: true,
      })
      selectBarcodeTarget(result.barcode)
      notify(`Internal barcode ${result.barcode.value} generated and linked.`)
    } catch (error) {
      notify(error.message || 'Internal barcode could not be generated.', 'error')
    }
  }

  const saveTransfer = async () => {
    if (!transferTarget?.targetLocationId || !transferTarget.reason.trim() || Number(transferTarget.quantity || 0) <= 0) {
      notify('Target location, quantity and reason are required.', 'warning')
      return
    }
    setConfirmBusy(true)
    try {
      await transferStockBalance(user.uid, transferTarget.stock, transferTarget)
      notify('Inventory transfer recorded.')
      setTransferTarget(null)
      await refresh?.()
    } catch (error) {
      notify(error.message || 'Inventory could not be transferred.', 'error')
    } finally {
      setConfirmBusy(false)
    }
  }

  const openTransfer = (stock) => {
    const targetLocation = (data.inventoryLocations || []).find(
      (location) => location.isActive !== false && String(location.id) !== String(stock.locationId),
    )
    setTransferTarget({
      stock,
      targetLocationId: targetLocation?.id || '',
      quantity: 1,
      reason: '',
      idempotencyKey: crypto.randomUUID(),
    })
  }

  const saveCount = async () => {
    const counted = Number(countTarget?.countedQuantity)
    const current = Number(countTarget?.stock?.adjustedQty || 0)
    if (!Number.isFinite(counted) || counted < 0 || !countTarget?.reason.trim()) {
      notify('Counted quantity and reason are required.', 'warning')
      return
    }
    const difference = counted - current
    if (Math.abs(difference) < 0.0005) {
      notify('The physical count already matches the ledger.', 'info')
      setCountTarget(null)
      return
    }
    setConfirmBusy(true)
    try {
      await adjustStockBatch(user.uid, countTarget.stock, {
        action: difference > 0 ? 'ADD' : 'SUB',
        quantity: Math.abs(difference),
        reason: `COUNT RECONCILIATION: ${countTarget.reason}`,
      })
      notify('Physical count reconciled.')
      setCountTarget(null)
      await refresh?.()
    } catch (error) {
      notify(error.message || 'Physical count could not be reconciled.', 'error')
    } finally {
      setConfirmBusy(false)
    }
  }

  const saveLocation = async () => {
    if (!locationDraft?.name.trim()) {
      notify('Location name is required.', 'warning')
      return
    }
    setConfirmBusy(true)
    try {
      await api.createInventoryLocation(getStoredShopId() || user.uid, locationDraft)
      notify('Inventory location created.')
      setLocationDraft(null)
      await refresh?.()
    } catch (error) {
      notify(error.message || 'Inventory location could not be created.', 'error')
    } finally {
      setConfirmBusy(false)
    }
  }
  const saveWarrantyWorkflow = async () => {
    if (!warrantyWorkflow?.notes?.trim()) {
      notify('Warranty notes are required.', 'warning')
      return
    }
    setConfirmBusy(true)
    try {
      const shopId = getStoredShopId() || user.uid
      if (warrantyWorkflow.mode === 'create') {
        if (!warrantyWorkflow.serialId || !warrantyWorkflow.startsAt || !warrantyWorkflow.endsAt) {
          notify('Serial, start date, and end date are required.', 'warning')
          return
        }
        await api.createWarranty(shopId, {
          serialId: warrantyWorkflow.serialId,
          startsAt: new Date(warrantyWorkflow.startsAt).toISOString(),
          endsAt: new Date(warrantyWorkflow.endsAt).toISOString(),
          notes: warrantyWorkflow.notes.trim(),
        })
        notify('Warranty record created.')
      } else {
        await api.updateWarrantyStatus(shopId, warrantyWorkflow.warranty.id, {
          status: warrantyWorkflow.status,
          notes: warrantyWorkflow.notes.trim(),
        })
        notify(`Warranty marked ${warrantyWorkflow.status.toLowerCase()}.`)
      }
      setWarrantyWorkflow(null)
      await refresh?.()
    } catch (error) {
      notify(error.message || 'Warranty could not be updated.', 'error')
    } finally {
      setConfirmBusy(false)
    }
  }
  const saveSerialDisposition = async () => {
    if (!serialDisposition?.reason?.trim()) {
      notify('Inspection reason is required.', 'warning')
      return
    }
    setConfirmBusy(true)
    try {
      await api.dispositionSerial(
        getStoredShopId() || user.uid,
        serialDisposition.serial.id,
        { disposition: serialDisposition.disposition, reason: serialDisposition.reason.trim() },
        serialDisposition.idempotencyKey,
      )
      notify(serialDisposition.disposition === 'RESTOCK' ? 'Serial released to sellable stock.' : 'Serial marked for supplier return.')
      setSerialDisposition(null)
      await refresh?.()
    } catch (error) {
      notify(error.message || 'Serial disposition could not be completed.', 'error')
    } finally {
      setConfirmBusy(false)
    }
  }
  const lowStockThreshold = Number(data.catalogSettings?.lowStockDefault ?? 5)
  const reorderRows = rows
    .filter((row) => row.available <= lowStockThreshold)
    .sort((a, b) => a.available - b.available)
    .map((row) => ({ ...row, suggested: Math.max(1, 10 - row.available, Number(row.sold || 0)) }))
  const lowStockCount = reorderRows.length
  const inventoryTimeline = [
    ...(data.adjustments || []).map((item) => ({
      id: `adjustment-${item.id}`,
      date: item.date,
      title: item.action === 'ADD' ? 'Stock added' : 'Stock removed',
      detail: `${item.type} · ${item.quantity} · ${item.reason}`,
      tone: item.action === 'ADD' ? 'success' : 'warning',
    })),
    ...(data.purchases || []).flatMap((purchase) => (purchase.receipts || []).map((receipt) => ({
      id: `receipt-${receipt.id}`,
      date: String(receipt.receivedAt || '').slice(0, 10),
      title: `Purchase received · ${purchase.purchaseNumber}`,
      detail: `${receipt.quantity} item(s) added to inventory`,
      tone: 'success',
    }))),
  ].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 12)

  return (
    <Box className="page-stack">
      <PageHeader
        title="ကုန်ပစ္စည်းလက်ကျန်"
        subtitle="လက်ကျန်ပစ္စည်းနှင့် ဝယ်ဈေးကို စီမံပါ"
        actions={
          <>
            <Button variant="outlined" startIcon={<QrCodeScannerRoundedIcon />} onClick={() => { openStockDialog(); setScannerOpen(true) }}>
              ဘားကုဒ်စကင်
            </Button>
            <Button className="inventory-export-button" variant="outlined" startIcon={<PictureAsPdfRoundedIcon />} onClick={exportStock}>
              PDF ထုတ်ရန်
            </Button>
            <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openStockDialog}>
              ပစ္စည်းထည့်ရန်
            </Button>
          </>
        }
      />

      <DataToolbar title="ကုန်ပစ္စည်းရှာရန်" subtitle="အမည် သို့မဟုတ် ကုဒ်ဖြင့်ရှာနိုင်သည်">
        <TextField
          label="ပစ္စည်းရှာရန်"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="ဥပမာ - Jasmine, SKU"
          fullWidth
          size="small"
        />
      </DataToolbar>

      <div className="inventory-summary-grid">
        <MetricCard title="လက်ကျန်" value={`${totals.totalAvailable} ခု`} tone="success" icon={<Inventory2RoundedIcon />} />
        <MetricCard title="ကုန်ပစ္စည်းအမျိုးအစား" value={`${rows.length} မျိုး`} tone="primary" icon={<SettingsRoundedIcon />} />
        <MetricCard title="လက်ကျန်တန်ဖိုး" value={formatKs(totals.totalAvailableValue)} tone="success" icon={<PictureAsPdfRoundedIcon />} />
        <MetricCard title="ပြန်ဝယ်ရန်" value={`${lowStockCount} မျိုး`} tone={lowStockCount ? 'warning' : 'success'} icon={<AddRoundedIcon />} />
      </div>

      <SectionCard title="လက်ကျန်စီမံခန့်ခွဲမှု" subtitle="အသေးစိတ် စာရင်းများ">
        <Tabs value={workspace} onChange={(_, value) => setWorkspace(value)} variant="scrollable" scrollButtons="auto" aria-label="ကုန်ပစ္စည်း စာရင်းများ">
          <Tab value="balances" label="လက်ကျန်" />
          <Tab value="movements" label="ဝင်/ထွက်" />
          <Tab value="locations" label="သိုလှောင်နေရာ" />
          <Tab value="counts" label="ရေတွက်ရန်" />
          {data.storeConfiguration?.effectiveCapabilities?.includes('inventory.lots') || data.inventoryLots?.length ? <Tab value="lots" label="အုပ်စု / သက်တမ်း" /> : null}
          {data.storeConfiguration?.effectiveCapabilities?.includes('inventory.serials') || data.inventorySerials?.length ? <Tab value="serials" label="Serial / IMEI" /> : null}
          {data.storeConfiguration?.effectiveCapabilities?.includes('inventory.warranty') || data.warranties?.length ? <Tab value="warranties" label="အာမခံ" /> : null}
        </Tabs>
        {workspace === 'balances' ? <Stack spacing={1} sx={{ mt: 2 }}>
          {(data.inventoryBalances || []).slice(0, 10).map((balance) => (
            <Box key={balance.id} className="purchase-line">
              <span><b>{balance.product?.name || 'Product'}</b><small>{balance.location?.name || 'Default location'} · Version {balance.version}</small></span>
              <span><b>{Number(balance.available ?? Number(balance.onHand || 0) - Number(balance.reserved || 0))} available</b><small>{Number(balance.onHand || 0)} on hand · {Number(balance.reserved || 0)} reserved</small></span>
            </Box>
          ))}
          {!data.inventoryBalances?.length ? <Typography color="text.secondary">Ledger balances will appear after the first dual-written inventory operation.</Typography> : null}
        </Stack> : null}
        {workspace === 'movements' ? <TableContainer sx={{ mt: 2 }}>
          <Table size="small">
            <TableHead><TableRow><TableCell>Date</TableCell><TableCell>Product</TableCell><TableCell>Type</TableCell><TableCell>Location</TableCell><TableCell align="right">Quantity</TableCell></TableRow></TableHead>
            <TableBody>
              {(data.inventoryMovements || []).map((movement) => <TableRow key={movement.id}><TableCell>{String(movement.occurredAt || movement.createdAt || '').slice(0, 10)}</TableCell><TableCell>{movement.product?.name || '-'}</TableCell><TableCell><Chip size="small" label={movement.type} /></TableCell><TableCell>{movement.location?.name || '-'}</TableCell><TableCell align="right">{movement.direction === 'OUT' ? '-' : '+'}{Number(movement.quantity || 0)}</TableCell></TableRow>)}
              {!data.inventoryMovements?.length ? <TableRow><TableCell colSpan={5} align="center">No ledger movements yet</TableCell></TableRow> : null}
            </TableBody>
          </Table>
        </TableContainer> : null}
        {workspace === 'locations' ? <Stack spacing={1} sx={{ mt: 2 }}>
          <Box>
            <Button variant="outlined" startIcon={<AddRoundedIcon />} onClick={() => setLocationDraft({ name: '', type: 'SELLABLE' })}>
              Add location
            </Button>
          </Box>
          {(data.inventoryLocations || []).map((location) => <Box key={location.id} className="purchase-line"><span><b>{location.name}</b><small>{location.type}</small></span><Chip size="small" label={location.isActive === false ? 'Inactive' : 'Active'} color={location.isActive === false ? 'default' : 'success'} /></Box>)}
          {!data.inventoryLocations?.length ? <Typography color="text.secondary">No inventory locations configured.</Typography> : null}
        </Stack> : null}
        {workspace === 'counts' ? <Stack spacing={1} sx={{ mt: 2 }}>
          {rows.map((row) => (
            <Box key={`count-${row.productId}-${row.variantId || 'default'}-${row.locationId || 'main'}`} className="purchase-line">
              <span>
                <b>{row.productName} · {row.variantName}</b>
                <small>{row.locationName || 'Main'} · Ledger on-hand {row.adjustedQty}</small>
              </span>
              <Button
                size="small"
                variant="outlined"
                disabled={!row.ledgerMode}
                onClick={() => setCountTarget({ stock: row, countedQuantity: row.adjustedQty, reason: '' })}
              >
                Enter count
              </Button>
            </Box>
          ))}
          {!rows.length ? <Typography color="text.secondary">No inventory balances to count.</Typography> : null}
        </Stack> : null}
        {workspace === 'lots' ? <TableContainer sx={{ mt: 2 }}>
          <Table size="small"><TableHead><TableRow><TableCell>Lot</TableCell><TableCell>Product</TableCell><TableCell>Location</TableCell><TableCell>Expiry</TableCell><TableCell align="right">Quantity</TableCell></TableRow></TableHead><TableBody>
            {(data.inventoryLots || []).map((lot) => <TableRow key={lot.id}><TableCell>{lot.lotNumber}</TableCell><TableCell>{lot.product?.name || '-'}</TableCell><TableCell>{lot.location?.name || '-'}</TableCell><TableCell>{lot.expiresAt ? String(lot.expiresAt).slice(0, 10) : 'No expiry'}</TableCell><TableCell align="right">{Number(lot.quantity || 0)}</TableCell></TableRow>)}
            {!data.inventoryLots?.length ? <TableRow><TableCell colSpan={5} align="center">No tracked lots</TableCell></TableRow> : null}
          </TableBody></Table>
        </TableContainer> : null}
        {workspace === 'serials' ? <TableContainer sx={{ mt: 2 }}>
          <Table size="small"><TableHead><TableRow><TableCell>Serial</TableCell><TableCell>IMEI</TableCell><TableCell>Product</TableCell><TableCell>Location</TableCell><TableCell>Status</TableCell><TableCell>Inspection</TableCell></TableRow></TableHead><TableBody>
            {(data.inventorySerials || []).map((serial) => <TableRow key={serial.id}><TableCell>{serial.serial}</TableCell><TableCell>{serial.imei || '-'}</TableCell><TableCell>{serial.product?.name || '-'}</TableCell><TableCell>{serial.location?.name || '-'}</TableCell><TableCell><Chip size="small" label={serial.status} /></TableCell><TableCell>{['RETURNED', 'QUARANTINED'].includes(serial.status) ? <Button size="small" onClick={() => setSerialDisposition({ serial, disposition: 'RESTOCK', reason: '', idempotencyKey: crypto.randomUUID() })}>Inspect</Button> : '-'}</TableCell></TableRow>)}
            {!data.inventorySerials?.length ? <TableRow><TableCell colSpan={6} align="center">No tracked serials</TableCell></TableRow> : null}
          </TableBody></Table>
        </TableContainer> : null}
        {workspace === 'warranties' ? <Stack spacing={2} sx={{ mt: 2 }}>
          <Box>
            <Button
              variant="contained"
              onClick={() => setWarrantyWorkflow({
                mode: 'create',
                serialId: data.inventorySerials?.find((serial) => ['SOLD', 'RETURNED'].includes(serial.status))?.id || '',
                startsAt: getToday(),
                endsAt: '',
                notes: '',
              })}
            >
              Add warranty
            </Button>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead><TableRow><TableCell>Serial</TableCell><TableCell>Product</TableCell><TableCell>Coverage</TableCell><TableCell>Status</TableCell><TableCell>Actions</TableCell></TableRow></TableHead>
              <TableBody>
                {(data.warranties || []).map((warranty) => (
                  <TableRow key={warranty.id}>
                    <TableCell>{warranty.serial?.serial || '-'}</TableCell>
                    <TableCell>{warranty.serial?.product?.name || '-'}</TableCell>
                    <TableCell>{String(warranty.startsAt).slice(0, 10)} – {String(warranty.endsAt).slice(0, 10)}</TableCell>
                    <TableCell><Chip size="small" label={warranty.status} color={warranty.status === 'ACTIVE' ? 'success' : warranty.status === 'CLAIMED' ? 'warning' : 'default'} /></TableCell>
                    <TableCell>
                      <Stack direction="row" gap={1}>
                        {warranty.status === 'ACTIVE' ? <Button size="small" onClick={() => setWarrantyWorkflow({ mode: 'status', warranty, status: 'CLAIMED', notes: '' })}>Claim</Button> : null}
                        {warranty.status === 'CLAIMED' ? <Button size="small" onClick={() => setWarrantyWorkflow({ mode: 'status', warranty, status: 'RESOLVED', notes: '' })}>Resolve</Button> : null}
                        {['ACTIVE', 'CLAIMED'].includes(warranty.status) ? <Button size="small" color="error" onClick={() => setWarrantyWorkflow({ mode: 'status', warranty, status: 'VOID', notes: '' })}>Void</Button> : null}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
                {!data.warranties?.length ? <TableRow><TableCell colSpan={5} align="center">No warranty records</TableCell></TableRow> : null}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack> : null}
      </SectionCard>

      <Box className="inventory-insight-grid">
        <SectionCard title="ပြန်ဝယ်ရန်လိုသော ပစ္စည်းများ" subtitle="လက်ကျန်နည်းနေသော ပစ္စည်းများ">
          <Stack spacing={1}>
            {reorderRows.slice(0, 8).map((row) => (
              <Box key={`reorder-${row.id}`} className="purchase-line">
                <span><b>{row.productName}</b><small>{row.variantName} · {row.available} available</small></span>
                <Chip
                  label={`${row.suggested} ခု ထည့်ရန်`}
                  color={row.available <= 0 ? 'error' : 'warning'}
                  variant="outlined"
                  size="small"
                  sx={row.available <= 0 ? undefined : { color: '#7a4f00', borderColor: '#9a6700' }}
                />
              </Box>
            ))}
            {!reorderRows.length ? <Typography color="text.secondary">ကုန်ပစ္စည်းအားလုံး လက်ကျန်ကောင်းနေပါသည်။</Typography> : null}
          </Stack>
        </SectionCard>
        <SectionCard title="နောက်ဆုံး လှုပ်ရှားမှုများ" subtitle="ပစ္စည်းထည့်ခြင်းနှင့် ပြင်ဆင်မှုများ">
          <Stack spacing={1}>
            {inventoryTimeline.map((event) => (
              <Box key={event.id} className="timeline-row">
                <span className={`timeline-dot timeline-dot--${event.tone}`} />
                <span><b>{event.title}</b><small>{event.detail} · {event.date}</small></span>
              </Box>
            ))}
            {!inventoryTimeline.length ? <Typography color="text.secondary">ပစ္စည်းလှုပ်ရှားမှု မရှိသေးပါ။</Typography> : null}
          </Stack>
        </SectionCard>
      </Box>

      <Box className="mobile-data-list">
        {rows.map((row) => (
          <Paper key={`${row.date}-${row.variantId || row.productName}-${row.unitCost}-${row.locationId || ''}`} variant="outlined" className="mobile-data-card">
            <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}>
              <Box>
                <Typography fontWeight={900}>{row.productName}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {row.variantName} - {row.date}
                </Typography>
              </Box>
              <Chip size="small" label={`${row.available} ခု`} color={stockTone(row.available)} variant="outlined" />
            </Stack>
            <Box className="mobile-detail-grid">
              <MobileDetail label="စုစုပေါင်း" value={`${row.adjustedQty} ခု`} />
              <MobileDetail label="ရောင်းပြီး" value={`${row.sold} ခု`} />
              <MobileDetail label="ဝယ်ဈေး" value={formatKs(row.unitCost)} />
              <MobileDetail label="ရောင်းဈေး" value={formatKs(row.salePrice)} />
            </Box>
            <Stack direction="row" gap={1}>
              <Button fullWidth variant="outlined" onClick={() => setAdjustTarget(row)}>လက်ကျန်ပြင်ရန်</Button>
              {row.ledgerMode && data.inventoryLocations?.length > 1
                ? <Button fullWidth variant="outlined" onClick={() => openTransfer(row)}>နေရာပြောင်းရန်</Button>
                : null}
            </Stack>
          </Paper>
        ))}
        {!rows.length ? <EmptyStock /> : null}
      </Box>

      <TableContainer component={Paper} variant="outlined" className="desktop-data-table">
        <Table className="nowrap-table" size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>No</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Product</TableCell>
              <TableCell>Variant</TableCell>
              <TableCell align="right">Unit Cost</TableCell>
              <TableCell align="right">Sale Price</TableCell>
              <TableCell align="right">Total Stock</TableCell>
              <TableCell align="right">Sold</TableCell>
              <TableCell align="right">Available</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={`${row.date}-${row.variantId || row.productName}-${row.unitCost}-${row.locationId || ''}`}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{row.date}</TableCell>
                <TableCell>{row.productName}</TableCell>
                <TableCell>{row.variantName}</TableCell>
                <TableCell align="right">{formatKs(row.unitCost)}</TableCell>
                <TableCell align="right">{formatKs(row.salePrice)}</TableCell>
                <TableCell align="right">{row.adjustedQty}</TableCell>
                <TableCell align="right">{row.sold}</TableCell>
                <TableCell align="right">
                  <Chip size="small" label={row.available} color={stockTone(row.available)} variant="outlined" />
                </TableCell>
                <TableCell>
                  <Box className="table-actions">
                    <Button size="small" variant="outlined" onClick={() => setAdjustTarget(row)}>Adjust</Button>
                    {row.ledgerMode && data.inventoryLocations?.length > 1
                      ? <Button size="small" variant="outlined" onClick={() => openTransfer(row)}>Transfer</Button>
                      : null}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            {!rows.length ? (
              <TableRow>
                <TableCell colSpan={10} align="center">No stock records</TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={stockDialogOpen} onClose={() => setStockDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>ပစ္စည်းလက်ခံထည့်သွင်းရန်</DialogTitle>
        <DialogContent dividers>
          {!data.products.length ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              ပစ္စည်းထည့်ရန် ကုန်ပစ္စည်းစာရင်းတွင် ပစ္စည်းအရင်ဖန်တီးပါ။
            </Alert>
          ) : null}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
            <Button variant="outlined" startIcon={<QrCodeScannerRoundedIcon />} onClick={() => setScannerOpen(true)}>ဘားကုဒ်စကင်ရန်</Button>
            <Button variant="outlined" disabled={!selectedProduct} onClick={generateStockBarcode}>ကိုယ်ပိုင်ဘားကုဒ်ထုတ်ရန်</Button>
            <Button onClick={() => navigate('pricing')}>ဘားကုဒ်စီမံရန်</Button>
          </Stack>
          {lastBarcode ? <Alert severity="success" sx={{ mb: 2 }}>Selected from barcode <b>{lastBarcode.value}</b>: {lastBarcode.productName} · {lastBarcode.unitName}</Alert> : null}
          <Box className="form-grid" sx={{ pt: 1 }}>
            <FormControl className="span-12">
              <InputLabel>ကုန်ပစ္စည်း</InputLabel>
              <Select label="ကုန်ပစ္စည်း" value={stockForm.productId} onChange={(event) => updateProduct(event.target.value)}>
                {data.products.map((product) => (
                  <MenuItem key={product.id} value={product.id}>{product.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            {hasOptions ? optionTree.levels.map((level, index) => (
              <FormControl key={level.id} className="span-4">
                <InputLabel>{level.label}</InputLabel>
                <Select
                  label={level.label}
                  value={stockForm.optionValueIds[index] || ''}
                  onChange={(event) => updateOptionValue(index, event.target.value)}
                >
                  {optionValuesForLevel(optionTree, index).map((value) => (
                    <MenuItem key={value.id} value={value.id}>{value.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )) : null}
            <TextField className="span-4" type="date" label="လက်ခံသည့်ရက်" value={stockForm.date} onChange={(event) => setStockForm((current) => ({ ...current, date: event.target.value }))} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField className="span-4" type="number" label="တစ်ခုချင်းဝယ်ဈေး" value={stockForm.unitCost} onChange={(event) => setStockForm((current) => ({ ...current, unitCost: event.target.value }))} slotProps={{ htmlInput: { min: 0 } }} />
            <TextField className="span-4" type="number" label="ရောင်းဈေး" value={stockForm.salePrice} onChange={(event) => setStockForm((current) => ({ ...current, salePrice: event.target.value }))} slotProps={{ htmlInput: { min: 0 } }} />
            <TextField className="span-6" type="number" label="ထည့်မည့်အရေအတွက်" value={stockForm.quantity} onChange={(event) => setStockForm((current) => ({ ...current, quantity: event.target.value }))} slotProps={{ htmlInput: { min: 1 } }} />
            <TextField className="span-6" type="number" label="ပို့ဆောင်ခ" value={stockForm.deli} onChange={(event) => setStockForm((current) => ({ ...current, deli: event.target.value }))} slotProps={{ htmlInput: { min: 0 } }} />
            {['LOT', 'EXPIRY'].includes(selectedProduct?.trackingMode) ? <>
              <TextField required className="span-6" label="Lot number" value={stockForm.lotNumber} onChange={(event) => setStockForm((current) => ({ ...current, lotNumber: event.target.value }))} />
              <TextField required={selectedProduct?.trackingMode === 'EXPIRY'} className="span-6" type="date" label="Expiry date" value={stockForm.expiresAt} onChange={(event) => setStockForm((current) => ({ ...current, expiresAt: event.target.value }))} slotProps={{ inputLabel: { shrink: true } }} />
            </> : null}
            {selectedProduct?.trackingMode === 'SERIAL' ? <TextField required className="span-12" multiline minRows={4} label="Serial / IMEI values" helperText="Enter one unique serial per line. The count must equal the receiving quantity." value={stockForm.serials} onChange={(event) => setStockForm((current) => ({ ...current, serials: event.target.value }))} /> : null}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStockDialogOpen(false)}>မလုပ်တော့ပါ</Button>
          <Button variant="contained" onClick={saveStock} disabled={!data.products.length}>ပစ္စည်းသိမ်းရန်</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(adjustTarget)} onClose={() => setAdjustTarget(null)} fullWidth maxWidth="sm">
        <DialogTitle>Adjust stock</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField select label="Action" value={adjustDraft.action} onChange={(event) => setAdjustDraft((current) => ({ ...current, action: event.target.value }))}>
              <MenuItem value="ADD">Add stock</MenuItem>
              <MenuItem value="SUB">Remove stock</MenuItem>
            </TextField>
            <TextField type="number" label="Quantity" value={adjustDraft.quantity} onChange={(event) => setAdjustDraft((current) => ({ ...current, quantity: event.target.value }))} slotProps={{ htmlInput: { min: 1 } }} />
            <TextField label="Reason" value={adjustDraft.reason} onChange={(event) => setAdjustDraft((current) => ({ ...current, reason: event.target.value }))} multiline minRows={3} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdjustTarget(null)} disabled={confirmBusy}>Cancel</Button>
          <Button variant="contained" onClick={saveAdjustment} disabled={confirmBusy}>{confirmBusy ? 'Saving...' : 'Save adjustment'}</Button>
        </DialogActions>
      </Dialog>

      <BarcodeScannerDialog open={scannerOpen} onClose={() => setScannerOpen(false)} onScan={scanStockBarcode} />
      <BarcodeLinkDialog
        open={Boolean(unknownBarcode)}
        barcodeValue={unknownBarcode}
        products={data.products}
        shopId={getStoredShopId() || user.uid}
        onClose={() => setUnknownBarcode('')}
        onLinked={async (barcode) => {
          selectBarcodeTarget(barcode)
          notify('Barcode linked. You can continue adding stock without losing the form.')
        }}
        onCreateProduct={() => {
          setUnknownBarcode('')
          setStockDialogOpen(false)
          navigate('products')
        }}
      />

      <Dialog open={Boolean(transferTarget)} onClose={() => setTransferTarget(null)} fullWidth maxWidth="sm">
        <DialogTitle>Transfer inventory</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="info">
              {transferTarget?.stock?.productName || 'Product'} from {transferTarget?.stock?.locationName || 'source location'}
            </Alert>
            <FormControl fullWidth>
              <InputLabel>Target location</InputLabel>
              <Select
                label="Target location"
                value={transferTarget?.targetLocationId || ''}
                onChange={(event) => setTransferTarget((current) => ({ ...current, targetLocationId: event.target.value }))}
              >
                {(data.inventoryLocations || [])
                  .filter((location) => location.isActive !== false && String(location.id) !== String(transferTarget?.stock?.locationId))
                  .map((location) => <MenuItem key={location.id} value={location.id}>{location.name} · {location.type}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField
              type="number"
              label="Quantity"
              value={transferTarget?.quantity || ''}
              onChange={(event) => setTransferTarget((current) => ({ ...current, quantity: event.target.value }))}
              slotProps={{ htmlInput: { min: 0.001, step: 0.001 } }}
            />
            <TextField
              required
              label="Reason"
              value={transferTarget?.reason || ''}
              onChange={(event) => setTransferTarget((current) => ({ ...current, reason: event.target.value }))}
              multiline
              minRows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransferTarget(null)} disabled={confirmBusy}>Cancel</Button>
          <Button variant="contained" onClick={saveTransfer} disabled={confirmBusy}>
            {confirmBusy ? 'Transferring...' : 'Confirm transfer'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(countTarget)} onClose={() => setCountTarget(null)} fullWidth maxWidth="sm">
        <DialogTitle>Reconcile physical count</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="info">
              Ledger on-hand: {countTarget?.stock?.adjustedQty ?? 0} · {countTarget?.stock?.locationName || 'Main'}
            </Alert>
            <TextField
              type="number"
              label="Counted quantity"
              value={countTarget?.countedQuantity ?? ''}
              onChange={(event) => setCountTarget((current) => ({ ...current, countedQuantity: event.target.value }))}
              slotProps={{ htmlInput: { min: 0, step: 0.001 } }}
            />
            <TextField
              required
              label="Count reason / note"
              value={countTarget?.reason || ''}
              onChange={(event) => setCountTarget((current) => ({ ...current, reason: event.target.value }))}
              multiline
              minRows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCountTarget(null)} disabled={confirmBusy}>Cancel</Button>
          <Button variant="contained" onClick={saveCount} disabled={confirmBusy}>
            {confirmBusy ? 'Reconciling...' : 'Confirm count'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(locationDraft)} onClose={() => setLocationDraft(null)} fullWidth maxWidth="sm">
        <DialogTitle>Add inventory location</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              required
              label="Location name"
              value={locationDraft?.name || ''}
              onChange={(event) => setLocationDraft((current) => ({ ...current, name: event.target.value }))}
            />
            <TextField
              select
              label="Location type"
              value={locationDraft?.type || 'SELLABLE'}
              onChange={(event) => setLocationDraft((current) => ({ ...current, type: event.target.value }))}
            >
              <MenuItem value="SELLABLE">Sellable</MenuItem>
              <MenuItem value="QUARANTINE">Quarantine</MenuItem>
              <MenuItem value="DAMAGED">Damaged</MenuItem>
              <MenuItem value="TRANSIT">Transit</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLocationDraft(null)} disabled={confirmBusy}>Cancel</Button>
          <Button variant="contained" onClick={saveLocation} disabled={confirmBusy}>
            {confirmBusy ? 'Creating...' : 'Create location'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(warrantyWorkflow)} onClose={() => setWarrantyWorkflow(null)} fullWidth maxWidth="sm">
        <DialogTitle>{warrantyWorkflow?.mode === 'create' ? 'Create warranty' : `${warrantyWorkflow?.status || ''} warranty`}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {warrantyWorkflow?.mode === 'create' ? <>
              <FormControl fullWidth>
                <InputLabel>Sold serial / IMEI</InputLabel>
                <Select label="Sold serial / IMEI" value={warrantyWorkflow.serialId} onChange={(event) => setWarrantyWorkflow((current) => ({ ...current, serialId: event.target.value }))}>
                  {(data.inventorySerials || []).filter((serial) => ['SOLD', 'RETURNED'].includes(serial.status)).map((serial) => (
                    <MenuItem key={serial.id} value={serial.id}>{serial.serial}{serial.imei ? ` / ${serial.imei}` : ''} · {serial.product?.name || ''}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField type="date" label="Starts at" value={warrantyWorkflow.startsAt} onChange={(event) => setWarrantyWorkflow((current) => ({ ...current, startsAt: event.target.value }))} slotProps={{ inputLabel: { shrink: true } }} />
              <TextField type="date" label="Ends at" value={warrantyWorkflow.endsAt} onChange={(event) => setWarrantyWorkflow((current) => ({ ...current, endsAt: event.target.value }))} slotProps={{ inputLabel: { shrink: true } }} />
            </> : (
              <Alert severity="info">Warranty lifecycle changes do not change the serial inventory status.</Alert>
            )}
            <TextField required multiline minRows={3} label="Notes / reason" value={warrantyWorkflow?.notes || ''} onChange={(event) => setWarrantyWorkflow((current) => ({ ...current, notes: event.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWarrantyWorkflow(null)} disabled={confirmBusy}>Cancel</Button>
          <Button variant="contained" onClick={saveWarrantyWorkflow} disabled={confirmBusy}>{confirmBusy ? 'Saving...' : 'Confirm'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(serialDisposition)} onClose={() => setSerialDisposition(null)} fullWidth maxWidth="sm">
        <DialogTitle>Inspect returned serial</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="warning">
              {serialDisposition?.serial.serial} remains unavailable for sale until this inspection is confirmed.
            </Alert>
            <FormControl fullWidth>
              <InputLabel>Disposition</InputLabel>
              <Select label="Disposition" value={serialDisposition?.disposition || 'RESTOCK'} onChange={(event) => setSerialDisposition((current) => ({ ...current, disposition: event.target.value }))}>
                <MenuItem value="RESTOCK">Passed inspection — return to sellable stock</MenuItem>
                <MenuItem value="SUPPLIER_RETURN">Return to supplier</MenuItem>
              </Select>
            </FormControl>
            <TextField required multiline minRows={3} label="Inspection result / reason" value={serialDisposition?.reason || ''} onChange={(event) => setSerialDisposition((current) => ({ ...current, reason: event.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSerialDisposition(null)} disabled={confirmBusy}>Cancel</Button>
          <Button variant="contained" onClick={saveSerialDisposition} disabled={confirmBusy}>{confirmBusy ? 'Saving...' : 'Confirm disposition'}</Button>
        </DialogActions>
      </Dialog>

    </Box>
  )
}

function EmptyStock() {
  return (
    <EmptyState
      title="No stock records"
      message="Add stock after creating a product in App Settings."
      compact
    />
  )
}

function MobileDetail({ label, value }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography fontWeight={800}>{value}</Typography>
    </Box>
  )
}
