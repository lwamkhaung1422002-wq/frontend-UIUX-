import { useMemo, useState } from "react";
import { Box, Button, Card, CardContent, Chip, IconButton, InputAdornment, MenuItem, Popover, Stack, TextField, Tooltip, Typography, useMediaQuery } from "@mui/material";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import FilterAltRoundedIcon from "@mui/icons-material/FilterAltRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { useNavigate } from "react-router";
import MobileReportNavigation from "../../components/Report/MobileReportNavigation";

const tabs = ["Overview", "Top Seller", "Slow Seller", "Low Stock", "Out of Stock"];
const reports = {
  top: { title: "Top Selling Products", columns: ["#", "Product", "Qty Sold", "Revenue (MMK)"], rows: [["Jasmine Perfume", "28", "98,000 ကျပ်"], ["Nivea Roll On", "19", "123,500 ကျပ်"], ["Coca-Cola 330ml", "16", "16,000 ကျပ်"], ["Oishi Green Tea", "13", "23,400 ကျပ်"], ["Royal-D 500ml", "11", "16,500 ကျပ်"]] },
  slow: { title: "Slow Selling Products", columns: ["#", "Product", "Last Sold", "Qty In Stock"], rows: [["Cellox Facial Tissue", "45 days ago", "45"], ["Dettol Soap 125g", "38 days ago", "32"], ["Lux Body Wash 250ml", "30 days ago", "28"], ["Oreo Biscuit 137g", "28 days ago", "18"], ["Lay's Potato Chips", "25 days ago", "22"]] },
  low: { title: "Low Stock Products", columns: ["#", "Product", "Qty In Stock", "Reorder Level"], rows: [["Oishi Green Tea", "4", "10"], ["Jasmine Perfume", "5", "10"], ["Nivea Roll On", "7", "12"], ["Royal-D 500ml", "9", "15"], ["Dettol Soap 125g", "9", "15"]] },
  out: { title: "Out of Stock Products", columns: ["#", "Product", "Last Sold", "Status"], rows: [["Fresh Milk 1L", "3 days ago", "Out of Stock"], ["Yogurt 500ml", "5 days ago", "Out of Stock"], ["Chicken Breast", "6 days ago", "Out of Stock"], ["Cheese 200g", "7 days ago", "Out of Stock"], ["Sausage 500g", "8 days ago", "Out of Stock"]] },
};

const productCategories = {
  "Jasmine Perfume": "Beauty", "Nivea Roll On": "Beauty", "Coca-Cola 330ml": "Drinks", "Oishi Green Tea": "Drinks", "Royal-D 500ml": "Drinks",
  "Cellox Facial Tissue": "Household", "Dettol Soap 125g": "Household", "Lux Body Wash 250ml": "Beauty", "Oreo Biscuit 137g": "Food", "Lay's Potato Chips": "Food",
  "Fresh Milk 1L": "Food", "Yogurt 500ml": "Food", "Chicken Breast": "Food", "Cheese 200g": "Food", "Sausage 500g": "Food",
};

const currency = "\u1000\u103b\u1015\u103a";
const money = (value) => `${new Intl.NumberFormat("en-US").format(value)} ${currency}`;
const productReportStartDate = "2026-08-01";

function yangonDateKey(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Yangon", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  const part = (type) => parts.find((entry) => entry.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function formatReportDate(value) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Yangon", day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00+06:30`));
}

function productReportRangeLabel(range, from, to) {
  const today = yangonDateKey();
  const dates = range === "all"
    ? { from: productReportStartDate, to: today }
    : range === "today"
      ? { from: today, to: today }
      : { from, to };
  return dates.from && dates.to ? `${formatReportDate(dates.from)} – ${formatReportDate(dates.to)}` : "Select date range";
}

const detailedReports = {
  top: [
    { product: "Jasmine Perfume", qtySold: 28, costPrice: 2500, sellingPrice: 3500, revenue: 98000, margin: 28.6, grossProfit: 28000 },
    { product: "Nivea Roll On", qtySold: 19, costPrice: 4500, sellingPrice: 6500, revenue: 123500, margin: 30.8, grossProfit: 38000 },
    { product: "Coca-Cola 330ml", qtySold: 16, costPrice: 700, sellingPrice: 1000, revenue: 16000, margin: 30, grossProfit: 4800 },
    { product: "Oishi Green Tea", qtySold: 13, costPrice: 1200, sellingPrice: 1800, revenue: 23400, margin: 33.3, grossProfit: 7800 },
    { product: "Royal-D 500ml", qtySold: 11, costPrice: 1000, sellingPrice: 1500, revenue: 16500, margin: 33.3, grossProfit: 5500 },
  ],
  slow: [
    { product: "Cellox Facial Tissue", lastSold: "45 days ago", qtySold: 2, qtyInStock: 45, costPrice: 850, sellingPrice: 1200, margin: 29.2, stockValue: 38250, grossProfit: 700 },
    { product: "Dettol Soap 125g", lastSold: "38 days ago", qtySold: 3, qtyInStock: 32, costPrice: 1250, sellingPrice: 1800, margin: 30.6, stockValue: 40000, grossProfit: 1650 },
    { product: "Lux Body Wash 250ml", lastSold: "30 days ago", qtySold: 4, qtyInStock: 28, costPrice: 3200, sellingPrice: 4500, margin: 28.9, stockValue: 89600, grossProfit: 5200 },
    { product: "Oreo Biscuit 137g", lastSold: "28 days ago", qtySold: 5, qtyInStock: 18, costPrice: 900, sellingPrice: 1300, margin: 30.8, stockValue: 16200, grossProfit: 2000 },
    { product: "Lay's Potato Chips", lastSold: "25 days ago", qtySold: 5, qtyInStock: 22, costPrice: 1100, sellingPrice: 1600, margin: 31.3, stockValue: 24200, grossProfit: 2500 },
  ],
  low: [
    { product: "Oishi Green Tea", qtyInStock: 4, reorderLevel: 10, demand: "Top Seller", dailySales: 1.9, priority: "Urgent reorder" },
    { product: "Jasmine Perfume", qtyInStock: 5, reorderLevel: 10, demand: "Top Seller", dailySales: 1.2, priority: "Urgent reorder" },
    { product: "Nivea Roll On", qtyInStock: 7, reorderLevel: 12, demand: "Top Seller", dailySales: 0.9, priority: "Reorder soon" },
    { product: "Royal-D 500ml", qtyInStock: 9, reorderLevel: 15, demand: "Top Seller", dailySales: 0.7, priority: "Reorder soon" },
    { product: "Dettol Soap 125g", qtyInStock: 9, reorderLevel: 15, demand: "Slow Seller", dailySales: 0.1, priority: "Review first" },
  ],
  out: [
    { product: "Fresh Milk 1L", lastSold: "3 days ago", outSince: "2 days ago", demand: "Top Seller", dailySales: 2.4, reorder: 24, priority: "Urgent reorder" },
    { product: "Yogurt 500ml", lastSold: "5 days ago", outSince: "4 days ago", demand: "Top Seller", dailySales: 1.6, reorder: 16, priority: "Urgent reorder" },
    { product: "Chicken Breast", lastSold: "6 days ago", outSince: "5 days ago", demand: "Slow Seller", dailySales: 0.2, reorder: 4, priority: "Review first" },
    { product: "Cheese 200g", lastSold: "7 days ago", outSince: "6 days ago", demand: "Slow Seller", dailySales: 0.2, reorder: 4, priority: "Review first" },
    { product: "Sausage 500g", lastSold: "8 days ago", outSince: "7 days ago", demand: "No sales", dailySales: 0, reorder: 0, priority: "Do not reorder" },
  ],
};

export default function ProductReportPage() {
  const isMobile = useMediaQuery("(max-width:768px)");
  const navigate = useNavigate();
  const [tab, setTab] = useState("Overview");
  const [dateAnchor, setDateAnchor] = useState(null);
  const [filterAnchor, setFilterAnchor] = useState(null);
  const [dateRange, setDateRange] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [category, setCategory] = useState("All categories");
  const [search, setSearch] = useState("");
  const dateRangeLabel = productReportRangeLabel(dateRange, from, to);
  const visible = useMemo(() => tab === "Overview" ? ["top", "slow", "low", "out"] : ({ "Top Seller": ["top"], "Slow Seller": ["slow"], "Low Stock": ["low"], "Out of Stock": ["out"] }[tab] ?? ["top"]), [tab]);
  const visibleReports = useMemo(() => visible.map((key) => ({ key, ...reports[key], rows: reports[key].rows.filter((row) => (category === "All categories" || productCategories[row[0]] === category) && row[0].toLowerCase().includes(search.trim().toLowerCase())) })), [category, search, visible]);
  const detailKey = tab === "Top Seller" ? "top" : tab === "Slow Seller" ? "slow" : tab === "Low Stock" ? "low" : tab === "Out of Stock" ? "out" : null;
  const detailRows = useMemo(() => detailKey ? detailedReports[detailKey].filter((row) => (category === "All categories" || productCategories[row.product] === category) && row.product.toLowerCase().includes(search.trim().toLowerCase())) : [], [category, detailKey, search]);

  if (isMobile) return <MobileProductReport tab={tab} setTab={setTab} visibleReports={visibleReports} detailKey={detailKey} detailRows={detailRows} navigate={navigate} filterAnchor={filterAnchor} setFilterAnchor={setFilterAnchor} dateRange={dateRange} setDateRange={setDateRange} from={from} setFrom={setFrom} to={to} setTo={setTo} category={category} setCategory={setCategory} search={search} setSearch={setSearch} />;

  return <Box sx={{ maxWidth: 1500, mx: "auto", py: 1 }}>
    <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2.5 }}>
      <Stack direction="row" spacing={0.5} sx={{ minWidth: 0 }}>
        {tabs.map((item) => <Button key={item} variant={tab === item ? "contained" : "text"} onClick={() => setTab(item)} sx={{ minHeight: 40, px: 1.5, borderRadius: 1.5, textTransform: "none", color: tab === item ? "common.white" : "text.secondary", whiteSpace: "nowrap", fontWeight: tab === item ? 700 : 600 }}>{item}</Button>)}
      </Stack>
      <TextField value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products" size="small" sx={{ ml: "auto", width: 230, "& .MuiOutlinedInput-root": { minHeight: 42 } }} slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> } }} />
      <Stack direction="row" spacing={1} flexShrink={0}>
        <Button aria-label={`Choose date range: ${dateRangeLabel}`} variant="outlined" startIcon={<CalendarMonthRoundedIcon />} onClick={(event) => setDateAnchor(event.currentTarget)} sx={toolbarButtonSx}>{dateRangeLabel}</Button>
        <Tooltip title="Filter by category"><IconButton aria-label="Filter by category" onClick={(event) => setFilterAnchor(event.currentTarget)} sx={{ width: 42, height: 42, border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}><CategoryOutlinedIcon /></IconButton></Tooltip>
      </Stack>
    </Box>

    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 2, mb: 2.5 }}>
      <SummaryCard icon={<Inventory2RoundedIcon />} tone="blue" label="Total Products" value="18" helper="Active Products" />
      <SummaryCard icon={<Inventory2RoundedIcon />} tone="green" label="Total Quantity" value="342" helper="In Stock" />
      <SummaryCard icon={<WarningAmberRoundedIcon />} tone="orange" label="Low Stock Items" value="5" helper="Need Attention" />
      <SummaryCard icon={<ErrorOutlineRoundedIcon />} tone="red" label="Out of Stock Items" value="0" helper="Currently Out" />
    </Box>

    {detailKey ? <DetailedReportTable kind={detailKey} rows={detailRows} /> : <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(560px, 1fr))", gap: 2.25 }}>{visibleReports.map(({ key, ...report }) => <ReportTable key={key} kind={key} {...report} />)}</Box>}
    {tab === "Overview" && <InventoryStatusCard />}

    <Popover open={Boolean(dateAnchor)} anchorEl={dateAnchor} onClose={() => setDateAnchor(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }} slotProps={{ paper: { sx: { width: 370, p: 2, borderRadius: 2 } } }}>
      <Typography sx={{ fontSize: 16, fontWeight: 800, mb: 1.5 }}>Date and time</Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1 }}>{["all", "today", "custom"].map((range) => <Button key={range} variant="outlined" onClick={() => setDateRange(range)} sx={{ minHeight: 42, borderColor: dateRange === range ? "primary.main" : "divider", bgcolor: dateRange === range ? "#eaf3ff" : "transparent", color: dateRange === range ? "primary.main" : "text.primary", textTransform: "uppercase", fontSize: 12 }}>{range}</Button>)}</Box>
      {dateRange === "custom" && <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, mt: 1.5 }}><TextField type="date" label="From" size="small" value={from} onChange={(event) => setFrom(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} /><TextField type="date" label="To" size="small" value={to} onChange={(event) => setTo(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} /></Box>}
      <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mt: 1.5 }}><Button onClick={() => { setDateRange("all"); setFrom(""); setTo(""); }} sx={{ textTransform: "uppercase" }}>Reset</Button><Button variant="contained" onClick={() => setDateAnchor(null)} sx={{ textTransform: "uppercase" }}>Apply</Button></Stack>
    </Popover>
    <Popover open={Boolean(filterAnchor)} anchorEl={filterAnchor} onClose={() => setFilterAnchor(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }} slotProps={{ paper: { sx: { width: 260, p: 2, borderRadius: 2 } } }}>
      <Typography sx={{ fontSize: 16, fontWeight: 800, mb: 1.25 }}>Filter by category</Typography>
      <TextField select fullWidth size="small" label="Category" value={category} onChange={(event) => setCategory(event.target.value)}>{["All categories", "Drinks", "Beauty", "Food", "Household"].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</TextField>
      <Button fullWidth variant="contained" onClick={() => setFilterAnchor(null)} sx={{ mt: 1.5, minHeight: 42, textTransform: "none", fontWeight: 700 }}>Apply filter</Button>
    </Popover>
  </Box>;
}

function MobileProductReport({ tab, setTab, visibleReports, detailKey, detailRows, navigate, filterAnchor, setFilterAnchor, dateRange, setDateRange, from, setFrom, to, setTo, category, setCategory, search, setSearch }) {
  const isOverview = tab === "Overview";
  return <Box sx={{ pb: 3 }}><Box sx={{ height: 62, px: 1, display: "grid", gridTemplateColumns: "40px minmax(0, 1fr) 40px", alignItems: "center", bgcolor: "#1976d2", color: "common.white" }}><IconButton aria-label="Back to settings" onClick={() => navigate("/settings")} sx={{ color: "inherit" }}><ArrowBackRoundedIcon /></IconButton><Typography noWrap align="center" sx={{ px: .5, fontSize: 17, fontWeight: 800 }}>Product Reports &amp; Analytics</Typography><MobileProductFilter anchor={filterAnchor} onOpen={(event) => setFilterAnchor(event.currentTarget)} onClose={() => setFilterAnchor(null)} dateRange={dateRange} setDateRange={setDateRange} from={from} setFrom={setFrom} to={to} setTo={setTo} category={category} setCategory={setCategory} /></Box><MobileReportNavigation /><Box sx={{ px: 1.5, pt: 1.5 }}><Stack direction="row" spacing={.5} sx={{ overflowX: "auto", pb: .5, "&::-webkit-scrollbar": { display: "none" } }}>{tabs.map((item) => <Button key={item} variant={tab === item ? "contained" : "outlined"} onClick={() => setTab(item)} sx={{ flexShrink: 0, minHeight: 34, px: 1.1, borderRadius: 1, textTransform: "none", fontSize: 11, fontWeight: 800, whiteSpace: "nowrap" }}>{item}</Button>)}</Stack><TextField fullWidth value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products" size="small" sx={{ mt: 1, "& .MuiOutlinedInput-root": { minHeight: 42, fontSize: 14 } }} slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon /></InputAdornment> } }} />{isOverview ? <><Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 1, mt: 1.25 }}><MobileProductStat label="Total Products" value="18" tone="blue" /><MobileProductStat label="Total Quantity" value="342" tone="green" /><MobileProductStat label="Low Stock Items" value="5" tone="orange" /><MobileProductStat label="Out of Stock" value="0" tone="red" /></Box><Stack spacing={1.25} sx={{ mt: 1.25 }}>{visibleReports.map(({ key, ...report }) => <MobileProductTable key={key} {...report} onViewAll={() => setTab({ top: "Top Seller", slow: "Slow Seller", low: "Low Stock", out: "Out of Stock" }[key])} />)}</Stack><MobileInventoryStatus /></> : <Box sx={{ mt: 1.25 }}><MobileDetailedProductReport kind={detailKey} rows={detailRows} /></Box>}</Box></Box>;
}

function MobileProductFilter({ anchor, onOpen, onClose, dateRange, setDateRange, from, setFrom, to, setTo, category, setCategory }) {
  return <><IconButton aria-label="Filter product reports" onClick={onOpen} sx={{ color: "inherit" }}><FilterAltRoundedIcon /></IconButton><Popover open={Boolean(anchor)} anchorEl={anchor} onClose={onClose} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }} slotProps={{ paper: { sx: { width: "calc(100vw - 28px)", maxWidth: 420, p: 2, borderRadius: 2 } } }}><Typography sx={{ fontSize: 16, fontWeight: 800 }}>Filters</Typography><Typography color="text.secondary" sx={{ mt: 1.5, mb: .75, fontSize: 12, fontWeight: 800 }}>DATE AND TIME</Typography><Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1 }}>{["all", "today", "custom"].map((range) => <Button key={range} variant="outlined" onClick={() => setDateRange(range)} sx={{ minHeight: 40, borderColor: dateRange === range ? "primary.main" : "divider", bgcolor: dateRange === range ? "#eaf3ff" : "transparent", color: dateRange === range ? "primary.main" : "text.primary", textTransform: "uppercase", fontSize: 11 }}>{range}</Button>)}</Box>{dateRange === "custom" && <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, mt: 1.25 }}><TextField type="date" label="From" size="small" value={from} onChange={(event) => setFrom(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} /><TextField type="date" label="To" size="small" value={to} onChange={(event) => setTo(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} /></Box>}<Typography color="text.secondary" sx={{ mt: 2, mb: .75, fontSize: 12, fontWeight: 800 }}>CATEGORY</Typography><TextField select fullWidth size="small" label="Category" value={category} onChange={(event) => setCategory(event.target.value)}>{["All categories", "Drinks", "Beauty", "Food", "Household"].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</TextField><Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mt: 2 }}><Button onClick={() => { setDateRange("all"); setFrom(""); setTo(""); setCategory("All categories"); }} sx={{ textTransform: "uppercase" }}>Reset</Button><Button variant="contained" onClick={onClose} sx={{ textTransform: "uppercase" }}>Apply</Button></Stack></Popover></>;
}

function MobileDetailedProductReport({ kind, rows }) {
  const config = {
    top: { title: "Top Selling Products", fields: [["Qty Sold", (row) => `${row.qtySold} pcs`], ["Cost Price", (row) => money(row.costPrice)], ["Selling Price", (row) => money(row.sellingPrice)], ["Margin", (row) => `${row.margin}%`], ["Revenue", (row) => money(row.revenue)], ["Gross Profit", (row) => money(row.grossProfit)]] },
    slow: { title: "Slow Selling Products", fields: [["Last Sold", (row) => row.lastSold], ["Qty Sold", (row) => `${row.qtySold} pcs`], ["In Stock", (row) => `${row.qtyInStock} pcs`], ["Cost Price", (row) => money(row.costPrice)], ["Selling Price", (row) => money(row.sellingPrice)], ["Margin", (row) => `${row.margin}%`], ["Stock Value", (row) => money(row.stockValue)], ["Gross Profit", (row) => money(row.grossProfit)]] },
    low: { title: "Low Stock Products", fields: [["In Stock", (row) => `${row.qtyInStock} pcs`], ["Reorder Level", (row) => `${row.reorderLevel} pcs`], ["Demand Status", (row) => row.demand], ["Avg. Daily Sales", (row) => `${row.dailySales} pcs/day`], ["Reorder Priority", (row) => row.priority]] },
    out: { title: "Out of Stock Products", fields: [["Last Sold", (row) => row.lastSold], ["Out of Stock Since", (row) => row.outSince], ["Demand Status", (row) => row.demand], ["Avg. Daily Sales", (row) => `${row.dailySales} pcs/day`], ["Suggested Reorder", (row) => `${row.reorder} pcs`], ["Reorder Priority", (row) => row.priority]] },
  }[kind];
  return <><Typography sx={{ mb: 1, fontSize: 16, fontWeight: 800 }}>{config.title}</Typography><Stack spacing={1}>{rows.map((row, index) => <Card key={row.product} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, boxShadow: "0 2px 8px rgba(15,23,42,.05)" }}><CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}><Box sx={{ display: "grid", gridTemplateColumns: "28px minmax(0, 1fr)", gap: .75, alignItems: "center", pb: 1.1, borderBottom: "1px solid", borderColor: "divider" }}><Typography color="text.secondary" sx={{ fontSize: 12, fontWeight: 800 }}>{index + 1}</Typography><Typography sx={{ fontSize: 15, fontWeight: 800 }}>{row.product}</Typography></Box><Stack spacing={.8} sx={{ pt: 1.1 }}>{config.fields.map(([label, value]) => <Box key={label} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}><Typography color="text.secondary" sx={{ fontSize: 12 }}>{label}</Typography><MobileDetailValue label={label} value={value(row)} /></Box>)}</Stack></CardContent></Card>)}</Stack>{!rows.length && <Typography align="center" color="text.secondary" sx={{ py: 4 }}>No products in this category.</Typography>}</>;
}

function MobileDetailValue({ label, value }) {
  if (label === "Demand Status") return <DemandChip label={value} />;
  if (label === "Reorder Priority") return <PriorityChip label={value} />;
  return <Typography sx={{ fontSize: 12, fontWeight: 700, textAlign: "right" }}>{value}</Typography>;
}

function MobileProductStat({ label, value, tone }) { const colors = { blue: ["#eef2ff", "#5262f5"], green: ["#eafaf1", "#1fa45b"], orange: ["#fff3e8", "#ec9128"], red: ["#fff0f1", "#ef4b5a"] }; const [bg, color] = colors[tone]; return <Card sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, boxShadow: "0 2px 8px rgba(15,23,42,.05)" }}><CardContent sx={{ p: 1.25, "&:last-child": { pb: 1.25 } }}><Box sx={{ minHeight: 36, display: "grid", gridTemplateColumns: "30px minmax(0, 1fr) auto", alignItems: "center", gap: .65 }}><Box sx={{ width: 28, height: 28, display: "grid", placeItems: "center", borderRadius: 1, bgcolor: bg, color }}><Inventory2RoundedIcon sx={{ fontSize: 17 }} /></Box><Typography noWrap color="text.secondary" sx={{ minWidth: 0, fontSize: 11, fontWeight: 800 }}>{label}</Typography><Typography sx={{ fontSize: 19, fontWeight: 800 }}>{value}</Typography></Box></CardContent></Card>; }

function MobileProductTable({ title, columns, rows, onViewAll }) { return <Card sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, boxShadow: "0 2px 8px rgba(15,23,42,.05)" }}><CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}><Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}><Typography sx={{ fontSize: 15, fontWeight: 800 }}>{title}</Typography><Button size="small" onClick={onViewAll} sx={{ minWidth: 0, px: .5, textTransform: "none", fontSize: 11, fontWeight: 800 }}>View all</Button></Box><Stack spacing={.75}>{rows.map((row, index) => <Box key={row[0]} sx={{ display: "grid", gridTemplateColumns: "28px minmax(0, 1fr) auto", alignItems: "center", gap: .75, py: .75, borderTop: index ? "1px solid" : 0, borderColor: "divider" }}><Typography color="text.secondary" sx={{ fontSize: 11, fontWeight: 800 }}>{index + 1}</Typography><Box><Typography noWrap sx={{ fontSize: 12, fontWeight: 800 }}>{row[0]}</Typography><Typography color="text.secondary" sx={{ mt: .15, fontSize: 10.5 }}>{columns[2]}: {row[1]}</Typography></Box><Typography noWrap sx={{ fontSize: 11, fontWeight: 800, textAlign: "right" }}>{row[2]}</Typography></Box>)}</Stack></CardContent></Card>; }

function MobileInventoryStatus() {
  const rows = [["In Stock", "14", "309", "90.2%", "#50b982"], ["Low Stock", "3", "26", "7.6%", "#f6b55c"], ["Out of Stock", "1", "7", "2.1%", "#ef6767"]];
  return <Card sx={{ mt: 1.25, border: "1px solid", borderColor: "divider", borderRadius: 2, boxShadow: "0 2px 8px rgba(15,23,42,.05)" }}><CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}><Typography sx={{ fontSize: 16, fontWeight: 800 }}>Inventory Summary by Status</Typography><Box sx={{ display: "grid", gridTemplateColumns: "118px minmax(0, 1fr)", alignItems: "center", gap: 1.25, mt: 1.25 }}><Box sx={{ position: "relative", width: 110, height: 110, borderRadius: "50%", background: "conic-gradient(#50b982 0 90.2%, #f6b55c 90.2% 97.7%, #ef6767 97.7% 100%)", "&::after": { content: '""', position: "absolute", inset: 18, borderRadius: "50%", bgcolor: "background.paper" } }}><Box sx={{ position: "absolute", inset: 0, zIndex: 1, display: "grid", placeItems: "center", textAlign: "center" }}><Box><Typography sx={{ fontSize: 20, fontWeight: 800 }}>342</Typography><Typography color="text.secondary" sx={{ fontSize: 10 }}>Total Quantity</Typography></Box></Box></Box><Stack spacing={.8}>{rows.map(([label, , quantity, percentage, color]) => <Box key={label}><Box sx={{ display: "flex", alignItems: "center", gap: .6 }}><Box sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: color }} /><Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>{label}</Typography></Box><Typography color="text.secondary" sx={{ ml: 1.9, fontSize: 12 }}>{quantity} pcs · {percentage}</Typography></Box>)}</Stack></Box><Box sx={{ mt: 1.4, border: "1px solid", borderColor: "divider", borderRadius: 1, overflow: "hidden" }}>{rows.map(([label, items, quantity, percentage], index) => <Box key={label} sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 38px 46px 50px", gap: .5, px: 1, minHeight: 34, alignItems: "center", borderTop: index ? "1px solid" : 0, borderColor: "divider" }}><Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>{label}</Typography><Typography sx={{ fontSize: 12, textAlign: "right" }}>{items}</Typography><Typography sx={{ fontSize: 12, textAlign: "right" }}>{quantity}</Typography><Typography sx={{ fontSize: 12, textAlign: "right" }}>{percentage}</Typography></Box>)}<Box sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 38px 46px 50px", gap: .5, px: 1, minHeight: 34, alignItems: "center", borderTop: "1px solid", borderColor: "divider", bgcolor: "#f7f9fc" }}><Typography sx={{ fontSize: 12.5, fontWeight: 800 }}>Total</Typography><Typography sx={{ fontSize: 12, textAlign: "right", fontWeight: 800 }}>18</Typography><Typography sx={{ fontSize: 12, textAlign: "right", fontWeight: 800 }}>342</Typography><Typography sx={{ fontSize: 12, textAlign: "right", fontWeight: 800 }}>100%</Typography></Box></Box></CardContent></Card>;
}

function SummaryCard({ icon, tone, label, value, helper }) {
  const tones = { blue: ["#eef2ff", "#5262f5"], green: ["#eafaf1", "#1fa45b"], orange: ["#fff3e8", "#ec9128"], red: ["#fff0f1", "#ef4b5a"] };
  const [bg, color] = tones[tone];
  return <Card sx={{ minWidth: 0, border: "1px solid", borderColor: "divider", borderRadius: 2, boxShadow: "0 2px 9px rgba(15,23,42,.05)" }}><CardContent sx={{ p: 2.25, display: "flex", alignItems: "center", gap: 1.75, "&:last-child": { pb: 2.25 } }}><Box sx={{ width: 52, height: 52, display: "grid", placeItems: "center", borderRadius: 2, bgcolor: bg, color, flexShrink: 0 }}>{icon}</Box><Box><Typography color="text.secondary" sx={{ fontSize: 13, fontWeight: 700 }}>{label}</Typography><Typography sx={{ mt: 0.4, fontSize: 26, lineHeight: 1.1, fontWeight: 800 }}>{value}</Typography><Typography color="text.secondary" sx={{ mt: 0.55, fontSize: 13 }}>{helper}</Typography></Box></CardContent></Card>;
}

function ReportTable({ title, columns, rows, kind }) {
  const grid = kind === "top" ? "48px minmax(220px, 1fr) 130px 180px" : kind === "out" ? "48px minmax(220px, 1fr) 160px 140px" : "48px minmax(220px, 1fr) 150px 150px";
  return <Card sx={{ minWidth: 0, border: "1px solid", borderColor: "divider", borderRadius: 2, boxShadow: "0 2px 9px rgba(15,23,42,.05)" }}><CardContent sx={{ p: 1.75, "&:last-child": { pb: 1.75 } }}><Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.25 }}><Typography sx={{ fontSize: 17, fontWeight: 800 }}>{title}</Typography><Button size="small" sx={{ textTransform: "none", fontWeight: 700 }}>View All</Button></Box><Box sx={{ display: "grid", gridTemplateColumns: grid, alignItems: "center", columnGap: 1, px: 1.5, minHeight: 42, bgcolor: "#f7f9fc", borderRadius: 1 }}><Typography sx={tableHeaderSx}>{columns[0]}</Typography><Typography sx={tableHeaderSx}>{columns[1]}</Typography><Typography sx={{ ...tableHeaderSx, textAlign: "right" }}>{columns[2]}</Typography><Typography sx={{ ...tableHeaderSx, textAlign: "right" }}>{columns[3]}</Typography></Box>{rows.map((row, index) => <Box key={row[0]} sx={{ display: "grid", gridTemplateColumns: grid, alignItems: "center", columnGap: 1, px: 1.5, minHeight: 58, borderBottom: index === rows.length - 1 ? 0 : "1px solid", borderColor: "divider" }}><Typography color="text.secondary" sx={{ fontSize: 13, fontWeight: 700 }}>{index + 1}</Typography><Typography noWrap sx={{ fontSize: 13.5, fontWeight: 700 }}>{row[0]}</Typography><Typography color="text.secondary" sx={{ fontSize: 13, textAlign: "right" }}>{row[1]}{kind === "top" ? " pcs" : ""}</Typography>{kind === "out" ? <Box sx={{ justifySelf: "end" }}><Chip label={row[2]} size="small" sx={{ height: 24, bgcolor: "#fff0f1", color: "error.main", fontSize: 11, fontWeight: 700 }} /></Box> : <Typography color={kind === "low" ? "error.main" : "text.primary"} sx={{ fontSize: 13, fontWeight: 700, textAlign: "right" }}>{row[2]}</Typography>}</Box>)}{!rows.length && <Typography align="center" color="text.secondary" sx={{ py: 4, fontSize: 14 }}>No products in this category.</Typography>}</CardContent></Card>;
}

function DetailedReportTable({ kind, rows }) {
  const config = {
    top: { title: "Top Selling Products", helper: "Ranked by net quantity sold for the selected period", columns: ["#", "Product", "Qty Sold", "Cost Price", "Selling Price", "Margin", "Revenue", "Gross Profit"], grid: "48px minmax(200px, 1fr) 100px 128px 128px 86px 142px 142px" },
    slow: { title: "Slow Selling Products", helper: "Products with the lowest positive sales in the selected period", columns: ["#", "Product", "Last Sold", "Qty Sold", "In Stock", "Cost Price", "Selling Price", "Margin", "Stock Value", "Gross Profit"], grid: "48px minmax(190px, 1fr) 132px 92px 92px 124px 124px 82px 132px 132px" },
    low: { title: "Low Stock Products", helper: "Reorder priority is based on current stock and sales demand", columns: ["#", "Product", "In Stock", "Reorder Level", "Demand Status", "Avg. Daily Sales", "Reorder Priority"], grid: "48px minmax(250px, 1fr) 110px 130px 140px 132px 150px" },
    out: { title: "Out of Stock Products", helper: "Stock-out risk is ranked using recent sales demand", columns: ["#", "Product", "Last Sold", "Out of Stock Since", "Demand Status", "Avg. Daily Sales", "Suggested Reorder", "Reorder Priority"], grid: "48px minmax(200px, 1fr) 126px 148px 132px 132px 142px 150px" },
  }[kind];

  return <Card sx={{ minWidth: 0, border: "1px solid", borderColor: "divider", borderRadius: 2, boxShadow: "0 2px 9px rgba(15,23,42,.05)" }}>
    <CardContent sx={{ p: 2.25, "&:last-child": { pb: 2.25 } }}>
      <Box sx={{ mb: 1.75 }}><Typography sx={{ fontSize: 18, fontWeight: 800 }}>{config.title}</Typography><Typography color="text.secondary" sx={{ mt: .4, fontSize: 13 }}>{config.helper}</Typography></Box>
      <Box sx={{ overflowX: "auto", pb: .25, "&::-webkit-scrollbar": { height: 7 }, "&::-webkit-scrollbar-thumb": { bgcolor: "divider", borderRadius: 8 } }}>
        <Box sx={{ minWidth: kind === "slow" ? 1260 : kind === "top" ? 1050 : kind === "out" ? 1100 : 880 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: config.grid, alignItems: "center", columnGap: 1, px: 1.5, minHeight: 44, bgcolor: "#f7f9fc", borderRadius: 1 }}>{config.columns.map((column, index) => <Typography key={column} sx={{ ...tableHeaderSx, textAlign: index < 2 ? "left" : "right" }}>{column}</Typography>)}</Box>
          {rows.map((row, index) => <DetailedReportRow key={row.product} row={row} index={index} kind={kind} grid={config.grid} />)}
          {!rows.length && <Typography align="center" color="text.secondary" sx={{ py: 5, fontSize: 14 }}>No products in this category.</Typography>}
        </Box>
      </Box>
    </CardContent>
  </Card>;
}

function DetailedReportRow({ row, index, kind, grid }) {
  const baseSx = { fontSize: 13.5, color: "text.primary", textAlign: "right", whiteSpace: "nowrap" };
  const cell = (value, sx = {}) => <Typography sx={{ ...baseSx, ...sx }}>{value}</Typography>;
  const demandChip = <DemandChip label={row.demand} />;
  const priorityChip = <PriorityChip label={row.priority} />;
  const cells = kind === "top"
    ? [cell(index + 1, { textAlign: "left", color: "text.secondary", fontWeight: 700 }), cell(row.product, { textAlign: "left", fontWeight: 700 }), cell(`${row.qtySold} pcs`), cell(money(row.costPrice)), cell(money(row.sellingPrice)), cell(`${row.margin}%`, { color: "success.main", fontWeight: 700 }), cell(money(row.revenue), { fontWeight: 600 }), cell(money(row.grossProfit), { color: "success.main", fontWeight: 700 })]
    : kind === "slow"
      ? [cell(index + 1, { textAlign: "left", color: "text.secondary", fontWeight: 700 }), cell(row.product, { textAlign: "left", fontWeight: 700 }), cell(row.lastSold), cell(`${row.qtySold} pcs`), cell(`${row.qtyInStock} pcs`), cell(money(row.costPrice)), cell(money(row.sellingPrice)), cell(`${row.margin}%`, { color: "success.main", fontWeight: 700 }), cell(money(row.stockValue), { color: "warning.dark", fontWeight: 700 }), cell(money(row.grossProfit), { color: "success.main", fontWeight: 700 })]
      : kind === "low"
        ? [cell(index + 1, { textAlign: "left", color: "text.secondary", fontWeight: 700 }), cell(row.product, { textAlign: "left", fontWeight: 700 }), cell(`${row.qtyInStock} pcs`, { color: "error.main", fontWeight: 700 }), cell(`${row.reorderLevel} pcs`), <Box key="demand" sx={{ justifySelf: "end" }}>{demandChip}</Box>, cell(`${row.dailySales} pcs/day`), <Box key="priority" sx={{ justifySelf: "end" }}>{priorityChip}</Box>]
        : [cell(index + 1, { textAlign: "left", color: "text.secondary", fontWeight: 700 }), cell(row.product, { textAlign: "left", fontWeight: 700 }), cell(row.lastSold), cell(row.outSince), <Box key="demand" sx={{ justifySelf: "end" }}>{demandChip}</Box>, cell(`${row.dailySales} pcs/day`), cell(`${row.reorder} pcs`), <Box key="priority" sx={{ justifySelf: "end" }}>{priorityChip}</Box>];
  return <Box sx={{ display: "grid", gridTemplateColumns: grid, alignItems: "center", columnGap: 1, px: 1.5, minHeight: 60, borderBottom: "1px solid", borderColor: "divider" }}>{cells}</Box>;
}

function DemandChip({ label }) { const tone = label === "Top Seller" ? { bg: "#eaf3ff", color: "primary.main" } : label === "Slow Seller" ? { bg: "#fff4e8", color: "#b76000" } : { bg: "#f1f3f5", color: "text.secondary" }; return <Chip label={label} size="small" sx={{ height: 26, bgcolor: tone.bg, color: tone.color, fontSize: 11, fontWeight: 700 }} />; }
function PriorityChip({ label }) { const tone = label === "Urgent reorder" ? { bg: "#fff0f1", color: "error.main" } : label === "Reorder soon" ? { bg: "#fff4e8", color: "#b76000" } : { bg: "#f1f3f5", color: "text.secondary" }; return <Chip label={label} size="small" sx={{ height: 26, bgcolor: tone.bg, color: tone.color, fontSize: 11, fontWeight: 700 }} />; }

function InventoryStatusCard() {
  return <Card sx={{ mt: 2.25, border: "1px solid", borderColor: "divider", borderRadius: 2, boxShadow: "0 2px 9px rgba(15,23,42,.05)" }}><CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}><Typography sx={{ fontSize: 17, fontWeight: 800, mb: 2 }}>Inventory Summary by Status</Typography><Box sx={{ display: "grid", gridTemplateColumns: "290px minmax(0, 1fr)", alignItems: "center", gap: 3 }}><Box sx={{ display: "flex", alignItems: "center", gap: 2 }}><Box sx={{ position: "relative", width: 142, height: 142, flexShrink: 0, borderRadius: "50%", background: "conic-gradient(#50b982 0 90.2%, #f6b55c 90.2% 97.7%, #ef6767 97.7% 100%)", "&::after": { content: '""', position: "absolute", inset: 22, bgcolor: "background.paper", borderRadius: "50%" } }}><Box sx={{ position: "absolute", inset: 0, zIndex: 1, display: "grid", placeItems: "center", textAlign: "center" }}><Box><Typography sx={{ fontSize: 19, fontWeight: 800 }}>342</Typography><Typography color="text.secondary" sx={{ fontSize: 11 }}>Total Quantity</Typography></Box></Box></Box><Stack spacing={0.75}>{[["#50b982", "In Stock", "309 (90.2%)"], ["#f6b55c", "Low Stock", "26 (7.6%)"], ["#ef6767", "Out of Stock", "7 (2.1%)"]].map(([color, label, value]) => <Box key={label} sx={{ display: "grid", gridTemplateColumns: "10px auto", columnGap: .75, alignItems: "center" }}><Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: color }} /><Typography sx={{ fontSize: 12, fontWeight: 700 }}>{label}<Typography component="span" color="text.secondary" sx={{ ml: .5, fontSize: 12 }}>{value}</Typography></Typography></Box>)}</Stack></Box><Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.5, overflow: "hidden" }}><StatusRow status="In Stock" items="14" quantity="309" percentage="90.2%" /><StatusRow status="Low Stock" items="3" quantity="26" percentage="7.6%" /><StatusRow status="Out of Stock" items="1" quantity="7" percentage="2.1%" /><StatusRow status="Total" items="18" quantity="342" percentage="100%" last /></Box></Box></CardContent></Card>;
}

function StatusRow({ status, items, quantity, percentage, last }) { return <Box sx={{ display: "grid", gridTemplateColumns: "1.3fr repeat(3, 1fr)", px: 1.5, minHeight: 38, alignItems: "center", borderBottom: last ? 0 : "1px solid", borderColor: "divider", bgcolor: status === "Total" ? "#f8fafc" : "transparent" }}><Typography sx={{ fontSize: 12.5, fontWeight: status === "Total" ? 800 : 600 }}>{status}</Typography><Typography sx={{ fontSize: 12.5 }}>{items}</Typography><Typography sx={{ fontSize: 12.5 }}>{quantity}</Typography><Typography sx={{ fontSize: 12.5 }}>{percentage}</Typography></Box>; }

const toolbarButtonSx = { minHeight: 42, borderColor: "divider", color: "text.primary", borderRadius: 1.5, textTransform: "none", fontWeight: 600, whiteSpace: "nowrap" };
const tableHeaderSx = { color: "text.secondary", fontSize: 11, fontWeight: 800, textTransform: "uppercase" };
