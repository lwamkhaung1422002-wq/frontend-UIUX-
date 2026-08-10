import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  MenuItem,
  TextField,
  Typography,
  Alert,
  Autocomplete,
} from '@mui/material'
import AddCircleRoundedIcon from '@mui/icons-material/AddCircleRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded'
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded'
import MoreHorizRoundedIcon from '@mui/icons-material/MoreHorizRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import SettingsSuggestRoundedIcon from '@mui/icons-material/SettingsSuggestRounded'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import { useAppHeaderActions } from '../contexts/AppHeaderActionsContext.jsx'
import useSessionState from '../hooks/useSessionState.js'

const initialProducts = [
  { id: 1, name: 'Jasmine အနံ့ဆီ', category: 'အလှကုန်', supplier: 'Pahtama Group', sku: '1001', price: 3500, cost: 2900, quantity: 68 },
  { id: 2, name: 'Nivea Roll on', category: 'အလှကုန်', supplier: 'Pahtama Group', sku: '1002', price: 6500, cost: 5800, quantity: 29 },
  { id: 3, name: 'Coca-Cola 330ml', category: 'အအေး', supplier: 'Unilever', sku: '1228', price: 1000, cost: 800, quantity: 20 },
  { id: 4, name: 'ကွမ်းယာ', category: 'အထွေထွေ', supplier: 'Pahtama Group', sku: '1004', price: 5000, cost: 4300, quantity: 2 },
  { id: 5, name: 'Premium Coffee Beans', category: 'စားသောက်ကုန်', supplier: 'Pahtama Group', sku: '1029', price: 13000, cost: 9800, quantity: 15 },
  { id: 6, name: 'Organic Green Tea', category: 'စားသောက်ကုန်', supplier: 'Pahtama Group', sku: '1033', price: 4500, cost: 3200, quantity: 5 },
  { id: 7, name: 'Almond Milk 1L', category: 'အအေး', supplier: 'Unilever', sku: '1045', price: 9600, cost: 7500, quantity: 0 },
  { id: 8, name: 'Sunlight Lemon 400ml', category: 'လူသုံးကုန်', supplier: 'Unilever', sku: '3012', price: 1500, cost: 1200, quantity: 115 },
  { id: 9, name: 'Mama Noodles Cup', category: 'စားသောက်ကုန်', supplier: 'Pahtama Group', sku: '4008', price: 1200, cost: 900, quantity: 5 },
  { id: 10, name: 'Paper Cups', category: 'လူသုံးကုန်', supplier: 'Pahtama Group', sku: '4012', price: 3000, cost: 2200, quantity: 120 },
  { id: 11, name: 'Shwe Phi Oo Tea', category: 'စားသောက်ကုန်', supplier: 'Pahtama Group', sku: '5001', price: 7200, cost: 5400, quantity: 5 },
  { id: 12, name: 'Pure Cooking Oil 1L', category: 'လူသုံးကုန်', supplier: 'Unilever', sku: '5004', price: 8200, cost: 6500, quantity: 0 },
]

const emptyProductDraft = { name: '', category: '', supplier: '', sku: '', voucher: '', price: '', cost: '', quantity: '' }
const emptyStockDraft = { product: null, category: '', supplier: '', voucher: '', quantity: '', purchasePrice: '', sellingPrice: '', receivedDate: '' }
const money = (amount) => `${Number(amount || 0).toLocaleString('en-US')} ကျပ်`
const nowLabel = () => new Intl.DateTimeFormat('en-GB', { dateStyle: 'short', timeStyle: 'short', hour12: true }).format(new Date())

export default function ProductsPage() {
  // Versioned key resets the old, mismatched browser demo state to this purchase-consistent set.
  const [products, setProducts] = useSessionState('products:demo-items:v3', initialProducts)
  const [categories, setCategories] = useSessionState('products:demo-categories:v3', ['အလှကုန်', 'အအေး', 'အထွေထွေ', 'စားသောက်ကုန်', 'လူသုံးကုန်'])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('အားလုံး')
  const [stockFilter, setStockFilter] = useState('all')
  const [stockDraft, setStockDraft] = useState(null)
  const [productDraft, setProductDraft] = useState(null)
  const [quantityEditDraft, setQuantityEditDraft] = useState(null)
  const [detail, setDetail] = useState(null)
  const [recordProduct, setRecordProduct] = useState(null)
  const [records, setRecords] = useSessionState('products:demo-records:v2', {
    1: [
      { type: 'လက်ခံခြင်း', supplier: 'Pahtama Group', quantity: 68, cost: 2900, price: 3500, time: '10/05/2026, 10:05 am', voucher: '125978' },
    ],
    2: [{ type: 'လက်ခံခြင်း', supplier: 'Pahtama Group', quantity: 29, cost: 5800, price: 6500, time: '10/05/2026, 10:05 am', voucher: '125978' }],
    3: [{ type: 'လက်ခံခြင်း', supplier: 'Unilever', quantity: 20, cost: 800, price: 1000, time: '11/06/2026, 12:05 pm', voucher: '111548' }],
    4: [{ type: 'လက်ခံခြင်း', supplier: 'Pahtama Group', quantity: 2, cost: 4300, price: 5000, time: '10/05/2026, 10:05 am', voucher: '125978' }],
  })
  const [categoryDraft, setCategoryDraft] = useState('')
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const setAppHeaderActions = useAppHeaderActions()

  const categoryOptions = useMemo(() => ['အားလုံး', ...categories], [categories])
  const supplierOptions = useMemo(() => [...new Set([
    ...products.map((product) => product.supplier),
    ...Object.values(records).flat().map((record) => record.supplier),
  ].filter(Boolean))].sort((left, right) => left.localeCompare(right)), [products, records])
  const shownProducts = useMemo(() => products.filter((product) => {
    const keyword = query.trim().toLowerCase()
    return (!keyword || `${product.name} ${product.sku}`.toLowerCase().includes(keyword))
      && (category === 'အားလုံး' || product.category === category)
      && (stockFilter !== 'low' || Number(product.quantity || 0) <= 5)
  }), [products, query, category, stockFilter])
  const totalValue = products.reduce((total, product) => total + product.quantity * product.cost, 0)
  const totalQuantity = products.reduce((total, product) => total + product.quantity, 0)
  const lowStockCount = products.filter((product) => Number(product.quantity || 0) <= 5).length
  const duplicateProductName = productDraft?.name && products.some((product) => product.id !== productDraft.id && product.name.trim().toLowerCase() === productDraft.name.trim().toLowerCase())
  const duplicateProductCode = productDraft?.sku && products.some((product) => product.id !== productDraft.id && product.sku === productDraft.sku)
  const invalidProductCode = productDraft?.sku && !/^\d{4}$/.test(productDraft.sku)

  const saveStock = () => {
    if (!stockDraft?.product || Number(stockDraft.quantity) <= 0) return
    setProducts((current) => current.map((product) => product.id === stockDraft.product.id ? {
      ...product,
      category: stockDraft.category || product.category,
      supplier: stockDraft.supplier || product.supplier,
      quantity: product.quantity + Number(stockDraft.quantity),
      cost: Number(stockDraft.purchasePrice || product.cost),
      price: Number(stockDraft.sellingPrice || product.price),
    } : product))
    setRecords((current) => ({ ...current, [stockDraft.product.id]: [{
      type: 'လက်ခံခြင်း', voucher: stockDraft.voucher, quantity: Number(stockDraft.quantity), supplier: stockDraft.supplier || stockDraft.product.supplier, cost: Number(stockDraft.purchasePrice || stockDraft.product.cost), price: Number(stockDraft.sellingPrice || stockDraft.product.price), time: stockDraft.receivedDate,
    }, ...(current[stockDraft.product.id] || [])] }))
    setStockDraft(null)
  }

  const saveProductDefinition = () => {
    if (!productDraft?.name.trim() || !productDraft.voucher.trim()) return
    if (duplicateProductName || duplicateProductCode || invalidProductCode) return
    const productId = Date.now()
    setProducts((current) => [...current, {
      ...productDraft,
      id: productId,
      sku: productDraft.sku,
      price: Number(productDraft.price),
      cost: Number(productDraft.cost || 0),
      quantity: Number(productDraft.quantity || 0),
    }])
    setRecords((current) => ({ ...current, [productId]: [{
      type: 'လက်ခံခြင်း', voucher: productDraft.voucher, quantity: Number(productDraft.quantity || 0), supplier: productDraft.supplier, cost: Number(productDraft.cost || 0), price: Number(productDraft.price || 0), time: nowLabel(),
    }] }))
    setProductDraft(null)
  }

  const saveQuantityEdit = () => {
    if (!quantityEditDraft || !quantityEditDraft.reason.trim() || !quantityEditDraft.editorName.trim()) return
    const nextQuantity = Number(quantityEditDraft.quantity)
    if (!Number.isFinite(nextQuantity) || nextQuantity < 0 || nextQuantity === quantityEditDraft.product.quantity) return
    setProducts((current) => current.map((product) => product.id === quantityEditDraft.product.id ? { ...product, quantity: nextQuantity } : product))
    setRecords((current) => ({ ...current, [quantityEditDraft.product.id]: [{
      type: 'အရေအတွက်ပြင်ခြင်း',
      previousQuantity: quantityEditDraft.product.quantity,
      quantity: nextQuantity,
      supplier: quantityEditDraft.product.supplier,
      reason: quantityEditDraft.reason.trim(),
      editorName: quantityEditDraft.editorName.trim(),
      time: nowLabel(),
    }, ...(current[quantityEditDraft.product.id] || [])] }))
    setQuantityEditDraft(null)
  }

  const deleteProduct = (product) => {
    if (Number(product.quantity) !== 0) return
    setProducts((current) => current.filter((item) => item.id !== product.id))
    setDetail(null)
  }

  const saveCategory = () => {
    const name = categoryDraft.trim()
    if (!name || categories.some((item) => item.toLowerCase() === name.toLowerCase())) return
    setCategories((current) => [...current, name])
    setProductDraft((current) => current ? { ...current, category: name } : current)
    setCategoryDraft('')
    setCategoryModalOpen(false)
  }

  useEffect(() => {
    setAppHeaderActions(<>
      <Button className="app-product-setup-action" variant="outlined" startIcon={<SettingsSuggestRoundedIcon />} onClick={() => setProductDraft({ ...emptyProductDraft, category: categories[0] || '' })}>ကုန်ပစ္စည်းသတ်မှတ်မည်</Button>
      <Button className="app-product-add-action" variant="contained" startIcon={<AddCircleRoundedIcon />} onClick={() => setStockDraft({ ...emptyStockDraft })}>ထည့်မည်</Button>
    </>)
    return () => setAppHeaderActions(null)
  }, [categories, setAppHeaderActions])

  return (
    <Box className="page-stack products-page">
      <Box className="products-summary-grid">
        <Box className="products-summary-card is-value"><Box className="products-summary-icon"><Inventory2RoundedIcon /></Box><Box><Typography>ကုန်ပစ္စည်းတန်ဖိုး</Typography><Typography component="strong">{money(totalValue)}</Typography></Box></Box>
        <Box className="products-summary-card is-category"><Box className="products-summary-icon"><SettingsSuggestRoundedIcon /></Box><Box><Typography>အမျိုးအစား</Typography><Typography component="strong">{categories.length} မျိုး</Typography></Box></Box>
        <Box className="products-summary-card is-quantity"><Box className="products-summary-icon"><Inventory2RoundedIcon /></Box><Box><Typography>ကုန်ပစ္စည်းအရေအတွက်</Typography><Typography component="strong">{totalQuantity} ခု</Typography></Box></Box>
        <Box className="products-summary-card is-low"><Box className="products-summary-icon"><MoreHorizRoundedIcon /></Box><Box><Typography>လက်ကျန်နည်း</Typography><Typography component="strong">{lowStockCount} ခု</Typography></Box></Box>
      </Box>

      <Box className="products-status-tabs" role="tablist">
        <Button role="tab" className={stockFilter === 'all' ? 'is-active' : ''} onClick={() => setStockFilter('all')}>အားလုံး ({products.length})</Button>
        <Button role="tab" className={stockFilter === 'low' ? 'is-active' : ''} onClick={() => setStockFilter('low')}>လက်ကျန်နည်း ({lowStockCount})</Button>
      </Box>

      <Box className="products-toolbar">
        <TextField
          fullWidth
          size="small"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="ကုန်ပစ္စည်း သို့မဟုတ် ကုဒ်ဖြင့်ရှာပါ"
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon /></InputAdornment> } }}
        />
        <TextField select size="small" value={category} onChange={(event) => setCategory(event.target.value)}>
          {categoryOptions.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
        </TextField>
      </Box>

      <Box className="products-mobile-list">
        {shownProducts.map((product) => <Box key={product.id} className="product-mobile-card">
          <Box className="product-mobile-main">
            <Box className="product-mini-icon"><Inventory2RoundedIcon /></Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography fontWeight={800}>{product.name}</Typography>
              <Typography variant="caption" color="text.secondary">{product.sku} · {product.category}</Typography>
              <Typography variant="body2" sx={{ mt: .5 }}>ရောင်း {money(product.price)} · အရင်း {money(product.cost)}</Typography>
            </Box>
          </Box>
          <Box className="product-mobile-side">
            <Box className={`product-stock-indicator ${product.quantity === 0 ? 'is-empty' : product.quantity <= 5 ? 'is-low' : ''}`}>
              <Typography component="span">လက်ကျန်</Typography>
              <Typography component="strong">{product.quantity}</Typography>
              {product.quantity === 0 ? <Typography component="em">ကုန်ပြီ</Typography> : product.quantity <= 5 ? <Typography component="em">နည်းနေ</Typography> : null}
            </Box>
            <Box>
              <IconButton aria-label="အသေးစိတ်" onClick={() => setDetail(product)}><VisibilityOutlinedIcon /></IconButton>
              <IconButton aria-label="အရေအတွက်ပြင်ဆင်မည်" onClick={() => setQuantityEditDraft({ product, quantity: product.quantity, reason: '', editorName: '' })}><EditOutlinedIcon /></IconButton>
              <IconButton aria-label="မှတ်တမ်း" onClick={() => setRecordProduct(product)}><HistoryRoundedIcon /></IconButton>
            </Box>
          </Box>
        </Box>)}
      </Box>

      <Box className="products-desktop-table">
        <Box className="products-table-head"><span>အမှတ်စဉ်</span><span>ကုန်ပစ္စည်း</span><span>အရင်း</span><span>ရောင်းဈေး</span><span>လက်ကျန်</span><span>လုပ်ဆောင်ချက်</span></Box>
        {shownProducts.map((product, index) => <Box key={product.id} className="products-table-row">
          <span>{index + 1}</span>
          <span><b>{product.name}</b><small>{product.sku} · {product.category}</small></span>
          <span>{money(product.cost)}</span><span>{money(product.price)}</span><span><Chip size="small" label={`${product.quantity}`} color={product.quantity <= 5 ? 'warning' : 'success'} /></span>
          <span><IconButton aria-label="အသေးစိတ်" onClick={() => setDetail(product)}><VisibilityOutlinedIcon /></IconButton><IconButton aria-label="အရေအတွက်ပြင်ဆင်မည်" onClick={() => setQuantityEditDraft({ product, quantity: product.quantity, reason: '', editorName: '' })}><EditOutlinedIcon /></IconButton><IconButton aria-label="မှတ်တမ်း" onClick={() => setRecordProduct(product)}><HistoryRoundedIcon /></IconButton></span>
        </Box>)}
      </Box>

      {!shownProducts.length ? <Box className="products-empty"><MoreHorizRoundedIcon /><Typography fontWeight={700}>ရှာဖွေမှုနှင့် ကိုက်ညီသည့် ကုန်ပစ္စည်းမရှိသေးပါ</Typography></Box> : null}

      <Dialog open={Boolean(stockDraft)} onClose={() => setStockDraft(null)} fullWidth maxWidth="sm">
        <DialogTitle>ကုန်ပစ္စည်းထည့်မည်</DialogTitle>
        <DialogContent className="product-form product-stock-form">
          <Box className="product-dialog-note"><Typography fontWeight={800}>ကုန်ပစ္စည်းအရင်ရွေးပါ</Typography><Button size="small" onClick={() => { setStockDraft(null); setProductDraft({ ...emptyProductDraft, category: categories[0] || '' }) }}>ကုန်ပစ္စည်းသတ်မှတ်မည်</Button></Box>
          <Autocomplete
            options={products}
            value={stockDraft?.product || null}
            getOptionLabel={(product) => `${product.name} (${product.sku})`}
            onChange={(_, product) => setStockDraft((value) => ({ ...value, product, category: product?.category ?? '', supplier: product?.supplier ?? '', voucher: product?.voucher ?? '', purchasePrice: product?.cost ?? '', sellingPrice: product?.price ?? '' }))}
            renderInput={(params) => <TextField {...params} autoFocus label="ကုန်ပစ္စည်း ရှာရန်" placeholder="ကုဒ် သို့မဟုတ် အမည်ဖြင့်ရှာပါ" />}
          />
          <TextField select label="ပစ္စည်းအမျိုးအစား" value={stockDraft?.category || ''} disabled={!stockDraft?.product} onChange={(event) => setStockDraft((value) => ({ ...value, category: event.target.value }))}>
            {categories.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
          </TextField>
          <Autocomplete freeSolo options={supplierOptions} value={stockDraft?.supplier || ''} disabled={!stockDraft?.product} onInputChange={(_, supplier) => setStockDraft((value) => ({ ...value, supplier }))} renderInput={(params) => <TextField {...params} label="ကုန်သည် / ကုမ္ပဏီ" placeholder="နာမည်ရိုက်၍ ရွေးပါ" />} />
          <TextField required label="ဘောက်ချာနံပါတ်" value={stockDraft?.voucher || ''} disabled={!stockDraft?.product} onChange={(event) => setStockDraft((value) => ({ ...value, voucher: event.target.value }))} />
          <TextField className="received-quantity-field" type="number" label="လက်ခံမည့် အရေအတွက်" helperText={stockDraft?.product ? `လက်ကျန် — ${stockDraft.product.quantity}` : 'ကုန်ပစ္စည်းရွေးပြီးနောက် လက်ကျန်ပြမည်'} value={stockDraft?.quantity || ''} onChange={(event) => setStockDraft((value) => ({ ...value, quantity: event.target.value }))} slotProps={{ htmlInput: { min: 1 } }} />
          <TextField type="number" label="ဝယ်ဈေး" helperText="ယခုလက်ခံသည့် ပစ္စည်း၏ ဝယ်ဈေး" value={stockDraft?.purchasePrice ?? ''} onChange={(event) => setStockDraft((value) => ({ ...value, purchasePrice: event.target.value }))} />
          <TextField type="number" label="ရောင်းဈေး" helperText="database ထဲက default ရောင်းဈေးကို ပြထားသည်" value={stockDraft?.sellingPrice ?? ''} onChange={(event) => setStockDraft((value) => ({ ...value, sellingPrice: event.target.value }))} />
          <TextField required type="date" label="ပစ္စည်းလက်ခံရက်" value={stockDraft?.receivedDate || ''} onChange={(event) => setStockDraft((value) => ({ ...value, receivedDate: event.target.value }))} InputLabelProps={{ shrink: true }} />
        </DialogContent>
        <DialogActions><Button onClick={() => setStockDraft(null)}>မလုပ်တော့ပါ</Button><Button variant="contained" disabled={!stockDraft?.product || !stockDraft?.voucher.trim() || !stockDraft?.receivedDate || Number(stockDraft.quantity) <= 0} onClick={saveStock}>ထည့်သွင်းမည်</Button></DialogActions>
      </Dialog>

      <Dialog open={Boolean(detail)} onClose={() => setDetail(null)} fullWidth maxWidth="xs">
        <DialogTitle>ကုန်ပစ္စည်းအသေးစိတ်</DialogTitle>
        <DialogContent className="product-detail">
          <Typography variant="h6">{detail?.name}</Typography><Typography>{detail?.category} · {detail?.sku}</Typography>
          <Typography>ဝယ်ဈေး — {money(detail?.cost)}</Typography><Typography>ရောင်းဈေး — {money(detail?.price)}</Typography><Typography>လက်ကျန် — {detail?.quantity}</Typography>
          <Typography>ကုန်သည် / ကုမ္ပဏီ — {detail?.supplier || 'မသတ်မှတ်ရသေးပါ'}</Typography>
          {(records[detail?.id] || []).filter((record) => record.voucher).map((record, index) => <Typography key={`${record.voucher}-${index}`}>ဘောက်ချာနံပါတ် — {record.voucher} · {record.supplier || detail?.supplier}</Typography>)}
        </DialogContent>
        <DialogActions><Button color="error" startIcon={<DeleteOutlineRoundedIcon />} disabled={Number(detail?.quantity) !== 0} onClick={() => detail && deleteProduct(detail)}>ဖျက်မည်</Button><Box sx={{ flex: 1 }} />{Number(detail?.quantity) !== 0 ? <Typography variant="caption" color="text.secondary">လက်ကျန် 0 ဖြစ်မှသာ ဖျက်နိုင်သည်</Typography> : null}<Button onClick={() => setDetail(null)}>ပိတ်မည်</Button></DialogActions>
      </Dialog>

      <Dialog open={Boolean(recordProduct)} onClose={() => setRecordProduct(null)} fullWidth maxWidth="xs">
        <DialogTitle>ကုန်ပစ္စည်း မှတ်တမ်း</DialogTitle>
        <DialogContent className="product-record-list">
          {(records[recordProduct?.id] || []).length ? (records[recordProduct?.id] || []).map((record, index) => <Box key={`${record.time}-${index}`} className="product-record-card">
            <Typography fontWeight={800}>အမျိုးအစား — ပစ္စည်း{record.type}</Typography>
            <Typography variant="h6">{recordProduct?.name}</Typography>
            <Typography variant="body2" color="text.secondary">{recordProduct?.sku} · {recordProduct?.category}</Typography>
            <Typography>ကုန်သည် / ကုမ္ပဏီ — {record.supplier || recordProduct?.supplier || 'မသတ်မှတ်ရသေးပါ'}</Typography>
            {record.voucher ? <Typography>ဘောက်ချာနံပါတ် — {record.voucher}</Typography> : null}
            {record.type === 'လက်ခံခြင်း' ? <><Typography>လက်ခံသည့်အရေအတွက် — {record.quantity}</Typography><Typography>ဝယ်ဈေး — {money(record.cost)}</Typography><Typography>ရောင်းဈေး — {money(record.price)}</Typography></> : <><Typography>မူလအရေအတွက် — {record.previousQuantity ?? 'မသတ်မှတ်ရသေးပါ'}</Typography><Typography>ပြင်ဆင်ထားသောအရေအတွက် — {record.quantity}</Typography><Typography>အကြောင်းပြချက် — {record.reason || 'မသတ်မှတ်ရသေးပါ'}</Typography><Typography>ပြင်ဆင်သူ — {record.editorName || 'မသတ်မှတ်ရသေးပါ'}</Typography></>}
            <Typography variant="caption" color="text.secondary">{record.type === 'လက်ခံခြင်း' ? 'ပစ္စည်းလက်ခံရက်' : 'ပြင်ဆင်ချိန်'} — {record.time}</Typography>
          </Box>) : <Typography color="text.secondary">ဤကုန်ပစ္စည်းအတွက် မှတ်တမ်းမရှိသေးပါ။</Typography>}
        </DialogContent>
        <DialogActions><Button onClick={() => setRecordProduct(null)}>ပိတ်မည်</Button></DialogActions>
      </Dialog>

      <Dialog open={Boolean(productDraft)} onClose={() => setProductDraft(null)} fullWidth maxWidth="sm">
        <DialogTitle>ကုန်ပစ္စည်းသတ်မှတ်မည်</DialogTitle>
        <DialogContent className="product-form product-definition-form">
          <TextField autoFocus required label="အမည်" value={productDraft?.name || ''} onChange={(event) => setProductDraft((value) => ({ ...value, name: event.target.value }))} />
          <Box className="category-field-row"><TextField select required label="ပစ္စည်းအမျိုးအစား" value={productDraft?.category || ''} onChange={(event) => setProductDraft((value) => ({ ...value, category: event.target.value }))}>{categories.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</TextField><Button variant="outlined" onClick={() => setCategoryModalOpen(true)}>အမျိုးအစားသတ်မှတ်မည်</Button></Box>
          <Autocomplete freeSolo options={supplierOptions} value={productDraft?.supplier || ''} onInputChange={(_, supplier) => setProductDraft((value) => ({ ...value, supplier }))} renderInput={(params) => <TextField {...params} label="ကုန်သည် / ကုမ္ပဏီ" placeholder="နာမည်ရိုက်၍ ရွေးပါ" />} />
          <TextField required label="ဘောက်ချာနံပါတ်" value={productDraft?.voucher || ''} onChange={(event) => setProductDraft((value) => ({ ...value, voucher: event.target.value }))} />
          <TextField required label="ကုဒ် (၄ လုံး)" placeholder="ဥပမာ 1005" value={productDraft?.sku || ''} onChange={(event) => setProductDraft((value) => ({ ...value, sku: event.target.value.replace(/\D/g, '').slice(0, 4) }))} error={Boolean(invalidProductCode || duplicateProductCode)} helperText={duplicateProductCode ? 'ဤကုဒ်ကို အသုံးပြုထားပြီးဖြစ်သည်' : invalidProductCode ? 'ဂဏန်း ၄ လုံး အတိအကျထည့်ပါ' : 'ဂဏန်း ၄ လုံး ထည့်ပါ'} />
          <TextField type="number" label="ကုန်ပစ္စည်း အရေအတွက်" helperText="ကုန်ပစ္စည်းအသစ်အတွက် အစလက်ကျန် ထည့်ပါ" value={productDraft?.quantity ?? ''} onChange={(event) => setProductDraft((value) => ({ ...value, quantity: event.target.value }))} slotProps={{ htmlInput: { min: 0 } }} />
          <TextField type="number" label="ဝယ်ဈေး" value={productDraft?.cost ?? ''} onChange={(event) => setProductDraft((value) => ({ ...value, cost: event.target.value }))} />
          <TextField type="number" label="ရောင်းဈေး" value={productDraft?.price ?? ''} onChange={(event) => setProductDraft((value) => ({ ...value, price: event.target.value }))} />
          {duplicateProductName ? <Alert severity="warning">ဤအမည်ဖြင့် ကုန်ပစ္စည်းရှိပြီးသားဖြစ်သည်။ “ထည့်မည်” ကိုသုံး၍ လက်ကျန်ဖြည့်ပါ။</Alert> : null}
        </DialogContent>
        <DialogActions><Button onClick={() => setProductDraft(null)}>မလုပ်တော့ပါ</Button><Button variant="contained" disabled={!productDraft?.name.trim() || !productDraft?.category || !productDraft?.sku || !productDraft?.voucher.trim() || invalidProductCode || duplicateProductName || duplicateProductCode} onClick={saveProductDefinition}>သတ်မှတ်မည်</Button></DialogActions>
      </Dialog>

      <Dialog open={Boolean(quantityEditDraft)} onClose={() => setQuantityEditDraft(null)} fullWidth maxWidth="xs">
        <DialogTitle>ပစ္စည်းအရေအတွက် ပြင်ဆင်မည်</DialogTitle>
        <DialogContent className="quantity-edit-form">
          <Box className="existing-product-summary"><Typography fontWeight={800}>{quantityEditDraft?.product.name}</Typography><Typography variant="body2" color="text.secondary">ကုဒ် {quantityEditDraft?.product.sku} · လက်ရှိအရေအတွက် {quantityEditDraft?.product.quantity}</Typography></Box>
          <TextField autoFocus required type="number" label="ပြင်ဆင်ပြီး အရေအတွက်" helperText="လက်ရှိအရေအတွက်ထက် တိုး/လျှော့၍ ပြင်နိုင်သည်" value={quantityEditDraft?.quantity ?? ''} onChange={(event) => setQuantityEditDraft((current) => ({ ...current, quantity: event.target.value }))} slotProps={{ htmlInput: { min: 0 } }} />
          <TextField required multiline minRows={2} label="အကြောင်းပြချက်" value={quantityEditDraft?.reason || ''} onChange={(event) => setQuantityEditDraft((current) => ({ ...current, reason: event.target.value }))} />
          <TextField required label="ပြင်ဆင်သူအမည်" value={quantityEditDraft?.editorName || ''} onChange={(event) => setQuantityEditDraft((current) => ({ ...current, editorName: event.target.value }))} />
        </DialogContent>
        <DialogActions><Button onClick={() => setQuantityEditDraft(null)}>မလုပ်တော့ပါ</Button><Button variant="contained" disabled={!quantityEditDraft?.reason.trim() || !quantityEditDraft?.editorName.trim() || Number(quantityEditDraft?.quantity) < 0 || Number(quantityEditDraft?.quantity) === quantityEditDraft?.product.quantity} onClick={saveQuantityEdit}>ပြင်ဆင်မည်</Button></DialogActions>
      </Dialog>

      <Dialog open={categoryModalOpen} onClose={() => setCategoryModalOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>ပစ္စည်းအမျိုးအစားသတ်မှတ်မည်</DialogTitle>
        <DialogContent className="category-dialog-content"><TextField autoFocus fullWidth label="အမျိုးအစားအမည်" value={categoryDraft} onChange={(event) => setCategoryDraft(event.target.value)} /></DialogContent>
        <DialogActions><Button onClick={() => setCategoryModalOpen(false)}>မလုပ်တော့ပါ</Button><Button variant="contained" disabled={!categoryDraft.trim() || categories.some((item) => item.toLowerCase() === categoryDraft.trim().toLowerCase())} onClick={saveCategory}>သတ်မှတ်မည်</Button></DialogActions>
      </Dialog>
    </Box>
  )
}
