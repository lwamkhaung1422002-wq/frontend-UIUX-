import { useMemo, useState } from 'react'
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Paper, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, ToggleButton, ToggleButtonGroup, Typography, useMediaQuery,
} from '@mui/material'
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded'
import PrintRoundedIcon from '@mui/icons-material/PrintRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import { useData } from '../contexts/DataContext.jsx'
import { formatKs, getToday } from '../utils/storage.js'

const money = (value) => formatKs(Number(value || 0))

function orderDate(order) {
  return String(order.date || order.createdAt || '').slice(0, 10)
}

function orderTime(order) {
  const date = new Date(order.createdAt || order.completedAt || `${orderDate(order)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Yangon' }).format(date)
}

function receiptNumber(order) {
  return order.orderNumber || String(order.id || '').slice(-5) || '-----'
}

function isCredit(order) {
  return order.paymentStatus === 'unpaid' || Number(order.balanceDue || 0) > 0
}

function paymentMethodLabel(order) {
  const method = String(order.paymentMethod || '').trim()
  const labels = { CASH: 'ငွေသား', MOBILE: 'မိုဘိုင်းငွေပေးချေမှု', CREDIT: 'အကြွေး' }
  return labels[method.toUpperCase()] || method || 'ငွေသား'
}

function productKey(item) {
  return String(item.productId || item.productName || item.type || item.name || item.id || '')
}

function hasPromotion(item) {
  return Boolean(item.promotionName || item.promotionId || Number(item.promotionDiscount || 0) > 0)
}

function SummaryMetric({ label, value, accent = false }) {
  return <Box className={`sales-summary-metric${accent ? ' is-accent' : ''}`}>
    <Typography component="dt">{label}</Typography>
    <Typography component="dd">{value}</Typography>
  </Box>
}

function OrderActions({ order, onDetails, onPrint }) {
  return <Stack direction="row" spacing={0.25} className="sales-order-actions">
    <IconButton aria-label={`${receiptNumber(order)} အချက်အလက်ကြည့်ရန်`} onClick={() => onDetails(order)}><VisibilityOutlinedIcon /></IconButton>
    <IconButton aria-label="အရောင်းမှတ်တမ်းထုတ်ရန်" onClick={onPrint}><PrintRoundedIcon /></IconButton>
  </Stack>
}

export default function SalesPage() {
  const mobile = useMediaQuery('(max-width:899px)')
  const { data } = useData()
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState(getToday)
  const [to, setTo] = useState(getToday)
  const [status, setStatus] = useState('all')
  const [details, setDetails] = useState(null)

  const orders = useMemo(() => (data.orders || [])
    .filter((order) => order.fulfillmentStatus !== 'cancelled')
    .sort((left, right) => new Date(right.createdAt || right.date).getTime() - new Date(left.createdAt || left.date).getTime()), [data.orders])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return orders.filter((order) => {
      const date = orderDate(order)
      const inRange = (!from || date >= from) && (!to || date <= to)
      const typeMatches = status === 'all' || (status === 'paid' ? !isCredit(order) : isCredit(order))
      const searchable = [receiptNumber(order), ...(order.items || []).map((item) => item.type || item.productName || item.name)]
        .join(' ').toLowerCase().includes(term)
      return inRange && typeMatches && searchable
    })
  }, [orders, from, to, search, status])

  const summary = useMemo(() => {
    const productTypes = new Set()
    let totalSales = 0
    let creditTotal = 0
    let creditOrders = 0
    let itemCount = 0
    filtered.forEach((order) => {
      totalSales += Number(order.total || 0)
      if (isCredit(order)) {
        creditOrders += 1
        creditTotal += Number(order.balanceDue || order.total || 0)
      }
      ;(order.items || []).forEach((item) => {
        const key = productKey(item)
        if (key) productTypes.add(key)
        itemCount += Number(item.quantity || 0)
      })
    })
    return { totalSales, creditTotal, orderCount: filtered.length, creditOrders, productTypeCount: productTypes.size, itemCount }
  }, [filtered])

  const printReport = () => {
    window.print()
  }

  return <Box className="page-stack sales-report-page">
    <Paper className="sales-summary" variant="outlined" component="section" aria-label="အရောင်းအနှစ်ချုပ်">
      <Box component="dl" className="sales-summary-grid">
        <SummaryMetric label="ရောင်းရငွေ စုစုပေါင်း" value={money(summary.totalSales)} accent />
        <SummaryMetric label="အကြွေး စုစုပေါင်း" value={money(summary.creditTotal)} />
        <SummaryMetric label="အရောင်းဘောက်ချာ" value={`${summary.orderCount} စောင်`} />
        <SummaryMetric label="အကြွေးဘောက်ချာ" value={`${summary.creditOrders} စောင်`} />
        <SummaryMetric label="ပစ္စည်းအမျိုးအစား" value={`${summary.productTypeCount} မျိုး`} />
        <SummaryMetric label="ရောင်းပြီး item" value={`${summary.itemCount} ခု`} />
      </Box>
    </Paper>

    <Paper className="sales-controls" variant="outlined" component="section" aria-label="အရောင်းမှတ်တမ်းရှာဖွေရန်">
      <Box className="sales-filter-row">
        <TextField fullWidth size="small" value={search} onChange={(event) => setSearch(event.target.value)} label="ဘောက်ချာနံပါတ် သို့မဟုတ် ကုန်ပစ္စည်းရှာရန်" slotProps={{ input: { startAdornment: <SearchRoundedIcon color="action" sx={{ mr: 1 }} /> } }} />
        <Stack direction="row" spacing={1} className="sales-date-range">
          <TextField fullWidth size="small" type="date" label="မှ" value={from} onChange={(event) => setFrom(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField fullWidth size="small" type="date" label="ထိ" value={to} onChange={(event) => setTo(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        </Stack>
      </Box>
      <ToggleButtonGroup exclusive value={status} onChange={(_, next) => next && setStatus(next)} size="small" className="sales-status-filter">
        <ToggleButton value="all">အားလုံး</ToggleButton>
        <ToggleButton value="paid">ငွေရှင်းပြီး</ToggleButton>
        <ToggleButton value="credit">အကြွေး</ToggleButton>
      </ToggleButtonGroup>
    </Paper>

    <Paper className="sales-list" variant="outlined" component="section" aria-label="အရောင်းစာရင်း">
      {filtered.length ? mobile ? <Box className="sales-mobile-list">
        {filtered.map((order) => <Box className="sales-mobile-row" key={order.id}>
          <Box className="sales-mobile-entry">
            <Box className="sales-mobile-entry-top"><Box><Typography className="sales-invoice-number">({receiptNumber(order)})</Typography><Typography className="sales-row-date">{orderDate(order)} · {orderTime(order)}</Typography></Box><Typography className="sales-mobile-amount">{money(order.total)}</Typography></Box>
            <Box className="sales-mobile-entry-bottom"><Chip size="small" color={isCredit(order) ? 'warning' : 'success'} label={isCredit(order) ? 'အကြွေး' : 'ငွေရှင်းပြီး'} /><OrderActions order={order} onDetails={setDetails} onPrint={printReport} /></Box>
          </Box>
        </Box>)}
      </Box> : <TableContainer>
        <Table className="sales-desktop-table" aria-label="အရောင်းမှတ်တမ်း">
          <TableHead><TableRow><TableCell>စဉ်</TableCell><TableCell>ဘောက်ချာ</TableCell><TableCell>ရက်စွဲ</TableCell><TableCell>အချိန်</TableCell><TableCell align="right" className="sales-amount-cell">ကျသင့်ငွေ</TableCell><TableCell className="sales-status-cell">အခြေအနေ</TableCell><TableCell align="right">လုပ်ဆောင်ချက်</TableCell></TableRow></TableHead>
          <TableBody>{filtered.map((order, index) => <TableRow key={order.id} hover>
            <TableCell className="sales-sequence">{index + 1}</TableCell>
            <TableCell><Typography className="sales-invoice-number">({receiptNumber(order)})</Typography></TableCell>
            <TableCell>{orderDate(order)}</TableCell><TableCell>{orderTime(order)}</TableCell>
            <TableCell align="right" className="sales-amount-cell" sx={{ fontWeight: 900 }}>{money(order.total)}</TableCell>
            <TableCell className="sales-status-cell"><Chip size="small" color={isCredit(order) ? 'warning' : 'success'} label={isCredit(order) ? 'အကြွေး' : 'ငွေရှင်းပြီး'} /></TableCell>
            <TableCell align="right"><OrderActions order={order} onDetails={setDetails} onPrint={printReport} /></TableCell>
          </TableRow>)}</TableBody>
        </Table>
      </TableContainer> : <Box className="sales-empty"><Typography color="text.secondary">ရွေးထားသောအခြေအနေအတွက် အရောင်းမှတ်တမ်း မရှိသေးပါ</Typography></Box>}
    </Paper>

    <Dialog open={Boolean(details)} onClose={() => setDetails(null)} fullWidth maxWidth="sm">
      {details ? <><DialogTitle>အရောင်းအသေးစိတ်</DialogTitle><DialogContent className="sales-details-content">
        <Stack spacing={1.5}>
          <Paper variant="outlined" className="sales-details-overview">
            <Typography className="sales-details-invoice">({receiptNumber(details)})</Typography>
            <Typography fontWeight={800}>{orderDate(details)} · {orderTime(details)}</Typography>
            {isCredit(details) ? <Typography className="sales-details-value" fontWeight={800}>{details.customer?.name || 'မသတ်မှတ်ထားပါ'}</Typography> : <><Typography className="sales-details-value" fontWeight={800} color="success.main">ငွေရှင်းပြီး</Typography><Typography fontWeight={800}>{paymentMethodLabel(details)}</Typography></>}
          </Paper>
          <Box className="sales-details-items">{(details.items || []).map((item) => <Box key={item.id} className="sales-details-item"><Box><Typography>{item.type || item.productName || item.name} × {item.quantity}</Typography>{hasPromotion(item) ? <Typography className="sales-promotion" variant="caption">{item.promotionName || 'ပရိုမိုးရှင်း'} · လျှော့စျေး {money(Number(item.promotionDiscount || 0) * Number(item.quantity || 0))}</Typography> : null}</Box><Typography fontWeight={800}>{money(item.lineTotal || Number(item.quantity || 0) * Number(item.unitPrice || 0))}</Typography></Box>)}</Box>
          <Paper variant="outlined" className="sales-details-total"><Typography fontWeight={800}>ကျသင့်ငွေ ပေါင်း</Typography><Typography fontWeight={900}>{money(details.total)}</Typography>{isCredit(details) ? <><Typography>အကြွေးကျန်</Typography><Typography fontWeight={900} color="warning.main">{money(details.balanceDue || details.total)}</Typography></> : null}</Paper>
        </Stack>
      </DialogContent><DialogActions><Button onClick={() => setDetails(null)}>ပိတ်မည်</Button><Button variant="contained" startIcon={<PictureAsPdfRoundedIcon />} onClick={printReport}>မှတ်တမ်းထုတ်မည်</Button></DialogActions></> : null}
    </Dialog>
  </Box>
}
