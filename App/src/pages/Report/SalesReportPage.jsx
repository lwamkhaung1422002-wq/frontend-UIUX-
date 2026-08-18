import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Card, CardContent, CircularProgress, MenuItem, Popover, Stack, TextField, Typography, useMediaQuery } from "@mui/material";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import FilterListRoundedIcon from "@mui/icons-material/FilterListRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import ShoppingBagRoundedIcon from "@mui/icons-material/ShoppingBagRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import MonetizationOnRoundedIcon from "@mui/icons-material/MonetizationOnRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import { usePosApi } from "../../hooks/useApiResource";

const reportTabs = ["Overview", "Daily", "Weekly", "Monthly", "Yearly", "Compare"];
const trendTabs = ["daily", "weekly", "monthly", "yearly"];
const money = (value) => new Intl.NumberFormat("en-US").format(Math.round(Number(value ?? 0)));
const formatDate = (value) => value ? new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Yangon", day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00+06:30`)) : "";

function yangonDateKey(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Yangon", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  const part = (type) => parts.find((entry) => entry.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function monthToDate() {
  const today = yangonDateKey();
  return { from: `${today.slice(0, 7)}-01`, to: today };
}

function reportQuery(range, payment, trend) {
  const today = yangonDateKey();
  const dates = range.mode === "today"
    ? { from: today, to: today }
    : range.mode === "all"
      ? { from: "2000-01-01", to: today }
      : range.mode === "custom"
        ? { from: range.from, to: range.to }
        : monthToDate();
  return { ...dates, trend, ...(payment === "All payment methods" ? {} : { payment }) };
}

function growthText(metric) {
  if (!metric || metric.percentage === null) return metric?.current ? "New" : "—";
  return `${metric.percentage > 0 ? "+" : ""}${metric.percentage}%`;
}

function growthColor(metric) {
  if (!metric || metric.percentage === null || metric.percentage === 0) return "text.secondary";
  return metric.percentage > 0 ? "success.main" : "error.main";
}

function niceMaximum(value) {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  return (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude;
}

function compactAmount(value) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value % 1_000_000 ? 1 : 0)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}

export default function SalesReportPage() {
  const isMobile = useMediaQuery("(max-width:768px)");
  const api = usePosApi();
  const [tab, setTab] = useState("Overview");
  const [trend, setTrend] = useState("daily");
  const [dateAnchor, setDateAnchor] = useState(null);
  const [filterAnchor, setFilterAnchor] = useState(null);
  const [draftRange, setDraftRange] = useState({ mode: "mtd", ...monthToDate() });
  const [range, setRange] = useState({ mode: "mtd", ...monthToDate() });
  const [draftPayment, setDraftPayment] = useState("All payment methods");
  const [payment, setPayment] = useState("All payment methods");
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const query = useMemo(() => reportQuery(range, payment, trend), [range, payment, trend]);
  const loading = report === null && !error;

  useEffect(() => {
    if (isMobile) return undefined;
    let active = true;
    api.reports.sales(query)
      .then((response) => { if (active) { setReport(response); setError(""); } })
      .catch((requestError) => { if (active) { setReport(null); setError(requestError.message || "Could not load sales analytics."); } })
    return () => { active = false; };
  }, [api, isMobile, query]);

  if (isMobile) return null;

  const selectTab = (next) => {
    setTab(next);
    if (trendTabs.includes(next.toLowerCase())) setTrend(next.toLowerCase());
  };
  const summary = report?.summary;
  const stats = [
    { key: "totalSales", label: "Total Sales", icon: <TrendingUpRoundedIcon />, tone: "purple" },
    { key: "orders", label: "Orders", icon: <ShoppingBagRoundedIcon />, tone: "blue", plain: true },
    { key: "itemsSold", label: "Items Sold", icon: <Inventory2RoundedIcon />, tone: "green", plain: true },
    { key: "totalCostPrice", label: "Total Cost Price", icon: <MonetizationOnRoundedIcon />, tone: "orange" },
    { key: "grossProfit", label: "Gross Profit", icon: <AccountBalanceWalletRoundedIcon />, tone: "amber" },
  ];
  const rangeLabel = report?.range ? `${formatDate(report.range.from)} – ${formatDate(report.range.to)}` : "This month to date";

  return <Box sx={{ maxWidth: 1500, mx: "auto", py: 1 }}>
    <Typography sx={{ fontSize: 30, lineHeight: 1.2, fontWeight: 700 }}>Sales Reports &amp; Analytics</Typography>
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, mt: 2.5, mb: 2.5 }}>
      <Stack direction="row" spacing={0.5}>{reportTabs.map((item) => <Button key={item} variant={tab === item ? "contained" : "text"} onClick={() => selectTab(item)} sx={{ minHeight: 40, px: 1.75, borderRadius: 1.5, textTransform: "none", color: tab === item ? "common.white" : "text.secondary", fontWeight: tab === item ? 700 : 600 }}>{item}</Button>)}</Stack>
      <Stack direction="row" spacing={1}><Button variant="outlined" startIcon={<CalendarMonthRoundedIcon />} onClick={(event) => { setDraftRange(range); setDateAnchor(event.currentTarget); }} sx={toolbarButtonSx}>{rangeLabel}</Button><Button variant="outlined" startIcon={<FilterListRoundedIcon />} aria-label="Filter sales" onClick={(event) => { setDraftPayment(payment); setFilterAnchor(event.currentTarget); }} sx={toolbarButtonSx}>Filter</Button></Stack>
    </Box>
    {loading && <Box sx={{ minHeight: 430, display: "grid", placeItems: "center" }}><Stack alignItems="center" spacing={1.5}><CircularProgress /><Typography color="text.secondary">Loading sales analytics…</Typography></Stack></Box>}
    {!loading && error && <Alert severity="error">{error}</Alert>}
    {!loading && !error && report && <>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 1.75, mb: 2.25 }}>{stats.map((stat) => <SalesStat key={stat.key} {...stat} metric={summary?.[stat.key]} />)}</Box>
      {summary?.orders?.current === 0 ? <EmptyReport /> : <>
        <Box sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1.45fr) minmax(340px, .9fr)", gap: 2.25 }}><SalesTrend trend={trend} onTrend={setTrend} entries={report.trend} /><DonutCard title="Sales by Payment Method (Collected)" total={report.collectionTotal} items={report.paymentCollections.map((entry) => [entry.method, entry.amount, entry.percentage])} /></Box>
        <Box sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1.45fr) minmax(340px, .9fr)", gap: 2.25, mt: 2.25 }}><SalesSummary rows={report.salesSummary} /><DonutCard title="Sales by Category" total={summary.totalSales.current} items={report.categories.map((entry) => [entry.name, entry.amount, entry.percentage])} /></Box>
        <ComparisonTable comparison={report.comparison} range={report.range} />
      </>}
    </>}
    <DatePopover anchor={dateAnchor} onClose={() => setDateAnchor(null)} draftRange={draftRange} setDraftRange={setDraftRange} setRange={setRange} />
    <FilterPopover anchor={filterAnchor} onClose={() => setFilterAnchor(null)} payment={draftPayment} setPayment={setDraftPayment} apply={() => { setPayment(draftPayment); setFilterAnchor(null); }} />
  </Box>;
}

function SalesStat({ label, metric, icon, tone, plain = false }) {
  const tones = { purple: ["#f0ecff", "#7656e9"], blue: ["#e9f2ff", "#4285ee"], green: ["#eaf9f1", "#39ae71"], orange: ["#fff3e5", "#f49a29"], amber: ["#fff5df", "#e99c20"] };
  const [bg, color] = tones[tone];
  return <Card sx={cardSx}><CardContent sx={{ p: 1.75, "&:last-child": { pb: 1.75 } }}><Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.25 }}><Box sx={{ width: 40, height: 40, display: "grid", placeItems: "center", borderRadius: 1.5, bgcolor: bg, color, flexShrink: 0 }}>{icon}</Box><Box sx={{ minWidth: 0 }}><Typography color="text.secondary" sx={{ fontSize: 12, fontWeight: 700 }}>{label}</Typography><Stack direction="row" spacing={0.5} alignItems="baseline" sx={{ mt: 0.45 }}><Typography noWrap sx={{ fontSize: 20, fontWeight: 800 }}>{money(metric?.current)}{plain ? "" : " ကျပ်"}</Typography><Typography color={growthColor(metric)} sx={{ fontSize: 11, fontWeight: 800, whiteSpace: "nowrap" }}>{metric?.percentage > 0 ? "↑ " : metric?.percentage < 0 ? "↓ " : ""}{growthText(metric)}</Typography></Stack><Typography color="text.secondary" sx={{ mt: 0.75, fontSize: 11 }}>vs previous equal period</Typography></Box></Box></CardContent></Card>;
}

function SalesTrend({ trend, onTrend, entries }) {
  const values = entries.map((entry) => entry.sales);
  const max = niceMaximum(Math.max(...values, 0));
  const left = 54; const chartWidth = 466; const baseline = 245; const chartHeight = 200; const count = Math.max(entries.length, 1);
  const x = (index) => left + ((index + 0.5) * chartWidth) / count;
  const y = (value) => baseline - (value / max) * chartHeight;
  const points = entries.map((entry, index) => `${x(index)},${y(entry.sales)}`).join(" ");
  const label = (key) => trend === "daily" ? key.slice(5) : key;
  return <ReportCard title="Sales Trend" action={<Stack direction="row" spacing={0.35}>{trendTabs.map((item) => <Button key={item} variant={item === trend ? "contained" : "text"} size="small" onClick={() => onTrend(item)} sx={{ minWidth: 0, px: 1, minHeight: 30, textTransform: "capitalize", fontSize: 11, fontWeight: 700 }}>{item}</Button>)}</Stack>}><Stack direction="row" spacing={2} sx={{ mb: 1.25 }}><Legend color="#9579ef" label="Sales (MMK)" /><Legend color="#348cf5" label="Orders" /></Stack><Box component="svg" viewBox="0 0 540 290" sx={{ width: "100%", height: 290, display: "block" }}><g stroke="#e5eaf2" strokeWidth="1">{[0, 1, 2, 3, 4, 5].map((index) => <line key={index} x1={left} x2="520" y1={45 + index * 40} y2={45 + index * 40} />)}</g>{entries.map((entry, index) => <g key={entry.key}><rect x={x(index) - Math.min(24, chartWidth / count / 2.2)} y={y(entry.sales)} width={Math.min(28, chartWidth / count / 1.6)} height={baseline - y(entry.sales)} rx="3" fill="#9a80ef" opacity=".72"><title>{`${entry.key}: ${money(entry.sales)} ကျပ်, ${entry.orders} orders`}</title></rect><circle cx={x(index)} cy={y(entry.sales)} r="4" fill="#fff" stroke="#378cf5" strokeWidth="3"><title>{`${entry.key}: ${money(entry.sales)} ကျပ်, ${entry.orders} orders`}</title></circle><text x={x(index)} y="275" textAnchor="middle" fill="#6f7c92" fontSize="10">{label(entry.key)}</text></g>)}{entries.length > 1 && <polyline points={points} fill="none" stroke="#378cf5" strokeWidth="3" />}{[0, 1, 2, 3, 4, 5].map((index) => <text key={index} x="6" y={249 - index * 40} fill="#6f7c92" fontSize="11">{compactAmount((max / 5) * index)}</text>)}</Box></ReportCard>;
}

function DonutCard({ title, total, items }) {
  const colors = ["#7c5cf0", "#4a90f5", "#55bd8a", "#f8ad39", "#e76f51", "#64748b"];
  let accumulated = 0;
  const gradient = items.length ? items.map(([, , percentage], index) => { const start = accumulated; accumulated += Math.max(0, percentage); return `${colors[index % colors.length]} ${start}% ${accumulated}%`; }).join(", ") : "#e7edf5 0 100%";
  return <ReportCard title={title}><Box sx={{ display: "grid", gridTemplateColumns: "minmax(160px, .85fr) minmax(150px, 1fr)", alignItems: "center", minHeight: 290, gap: 1.25 }}><Box sx={{ position: "relative", width: 190, height: 190, mx: "auto", borderRadius: "50%", background: `conic-gradient(${gradient})`, "&::after": { content: '""', position: "absolute", inset: 39, borderRadius: "50%", bgcolor: "background.paper" } }}><Box sx={{ position: "absolute", inset: 0, zIndex: 1, display: "grid", placeItems: "center", textAlign: "center" }}><Box><Typography sx={{ fontSize: 19, fontWeight: 800 }}>{money(total)}</Typography><Typography color="text.secondary" sx={{ fontSize: 12 }}>MMK total</Typography></Box></Box></Box><Stack spacing={1.6}>{items.length ? items.map(([label, amount, percentage], index) => <Box key={label} sx={{ display: "grid", gridTemplateColumns: "12px minmax(0, 1fr)", alignItems: "start", gap: 0.75 }}><Box sx={{ width: 9, height: 9, mt: 0.5, borderRadius: 0.5, bgcolor: colors[index % colors.length] }} /><Box><Typography sx={{ fontSize: 13, fontWeight: 700 }}>{label}</Typography><Typography color="text.secondary" sx={{ mt: 0.2, fontSize: 12 }}>{money(amount)} ({percentage.toFixed(1)}%)</Typography></Box></Box>) : <Typography color="text.secondary" sx={{ fontSize: 13 }}>No data for this period.</Typography>}</Stack></Box></ReportCard>;
}

function SalesSummary({ rows }) { return <ReportCard title="Sales Summary"><DataGrid columns={["Period", "Sales (MMK)", "Orders", "Items Sold", "Cost Price (MMK)", "Gross Profit (MMK)"]} rows={rows.map((row) => [row.label, money(row.totalSales), money(row.orders), money(row.itemsSold), money(row.totalCostPrice), money(row.grossProfit)])} /></ReportCard>; }
function ComparisonTable({ comparison, range }) { const current = `${formatDate(range.from)} – ${formatDate(range.to)}`; const previous = `${formatDate(range.previous.from)} – ${formatDate(range.previous.to)}`; return <Box sx={{ mt: 2.25 }}><ReportCard title="Sales Comparison"><DataGrid columns={["Metric", current, previous, "Change", "Growth"]} rows={comparison.map((row) => [row.metric, money(row.current), money(row.previous), `${row.change > 0 ? "+" : ""}${money(row.change)}`, growthText(row)])} growthValues={comparison.map(growthColor)} /></ReportCard></Box>; }
function DataGrid({ columns, rows, growthValues }) { return <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.5, overflow: "hidden" }}><Box sx={{ display: "grid", gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`, minHeight: 37, alignItems: "center", px: 1.25, columnGap: 1, bgcolor: "#f7f9fc" }}>{columns.map((column, index) => <Typography key={column} sx={{ color: "text.secondary", fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", textAlign: index === 0 ? "left" : "right" }}>{column}</Typography>)}</Box>{rows.map((row, rowIndex) => <Box key={`${row[0]}-${rowIndex}`} sx={{ display: "grid", gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`, minHeight: 41, alignItems: "center", px: 1.25, columnGap: 1, borderBottom: rowIndex === rows.length - 1 ? 0 : "1px solid", borderColor: "divider" }}>{row.map((cell, index) => <Typography key={`${row[0]}-${index}`} color={growthValues && index === row.length - 1 ? growthValues[rowIndex] : "text.primary"} sx={{ fontSize: 12, fontWeight: index === 0 ? 700 : 600, textAlign: index === 0 ? "left" : "right", whiteSpace: "nowrap" }}>{cell}</Typography>)}</Box>)}</Box>; }
function ReportCard({ title, action, children }) { return <Card sx={cardSx}><CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}><Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 1.5 }}><Typography sx={{ fontSize: 17, fontWeight: 800 }}>{title}</Typography>{action}</Box>{children}</CardContent></Card>; }
function Legend({ color, label }) { return <Box sx={{ display: "flex", alignItems: "center", gap: 0.7 }}><Box sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: color }} /><Typography color="text.secondary" sx={{ fontSize: 12 }}>{label}</Typography></Box>; }
function EmptyReport() { return <Card sx={{ border: "1px dashed", borderColor: "divider", borderRadius: 2 }}><CardContent sx={{ minHeight: 250, display: "grid", placeItems: "center", textAlign: "center" }}><Box><Typography sx={{ fontWeight: 800, fontSize: 18 }}>No completed sales in this period</Typography><Typography color="text.secondary" sx={{ mt: 0.75 }}>Complete an order or choose another date range to view analytics.</Typography></Box></CardContent></Card>; }
function DatePopover({ anchor, onClose, draftRange, setDraftRange, setRange }) { return <Popover open={Boolean(anchor)} anchorEl={anchor} onClose={onClose} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }} slotProps={{ paper: { sx: { width: 410, p: 2, borderRadius: 2 } } }}><Typography sx={{ fontSize: 16, fontWeight: 800, mb: 1.5 }}>Date and time</Typography><Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1 }}>{[["mtd", "This month"], ["today", "Today"], ["all", "All history"], ["custom", "Custom"]].map(([mode, label]) => <Button key={mode} variant="outlined" onClick={() => setDraftRange((current) => ({ ...current, mode }))} sx={{ minHeight: 42, borderColor: draftRange.mode === mode ? "primary.main" : "divider", bgcolor: draftRange.mode === mode ? "#eaf3ff" : "transparent", color: draftRange.mode === mode ? "primary.main" : "text.primary", textTransform: "none", fontSize: 12 }}>{label}</Button>)}</Box>{draftRange.mode === "custom" && <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, mt: 1.5 }}><TextField type="date" label="From" size="small" value={draftRange.from} onChange={(event) => setDraftRange((current) => ({ ...current, from: event.target.value }))} /><TextField type="date" label="To" size="small" value={draftRange.to} onChange={(event) => setDraftRange((current) => ({ ...current, to: event.target.value }))} /></Box>}<Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mt: 1.5 }}><Button onClick={() => { const next = { mode: "mtd", ...monthToDate() }; setDraftRange(next); setRange(next); }} sx={{ textTransform: "uppercase" }}>Reset</Button><Button variant="contained" disabled={draftRange.mode === "custom" && (!draftRange.from || !draftRange.to || draftRange.from > draftRange.to)} onClick={() => { setRange(draftRange); onClose(); }} sx={{ textTransform: "uppercase" }}>Apply</Button></Stack></Popover>; }
function FilterPopover({ anchor, onClose, payment, setPayment, apply }) { return <Popover open={Boolean(anchor)} anchorEl={anchor} onClose={onClose} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }} slotProps={{ paper: { sx: { width: 260, p: 2, borderRadius: 2 } } }}><Typography sx={{ fontSize: 16, fontWeight: 800, mb: 1.25 }}>Filter sales</Typography><TextField select fullWidth size="small" label="Payment method" value={payment} onChange={(event) => setPayment(event.target.value)}>{["All payment methods", "Cash", "KPay", "Wave"].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</TextField><Button fullWidth variant="contained" onClick={apply} sx={{ mt: 1.5, minHeight: 42, textTransform: "none", fontWeight: 700 }}>Apply filter</Button></Popover>; }

const cardSx = { minWidth: 0, border: "1px solid", borderColor: "divider", borderRadius: 2, boxShadow: "0 2px 9px rgba(15,23,42,.05)" };
const toolbarButtonSx = { minHeight: 42, borderColor: "divider", color: "text.primary", borderRadius: 1.5, textTransform: "none", fontWeight: 600, whiteSpace: "nowrap" };
