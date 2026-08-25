import { useMemo, useRef, useState } from "react";
import { Alert, AppBar, Box, Button, Card, CardContent, CircularProgress, IconButton, Popover, Stack, TextField, Toolbar, Typography, useMediaQuery } from "@mui/material";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import ShoppingBagRoundedIcon from "@mui/icons-material/ShoppingBagRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import MonetizationOnRoundedIcon from "@mui/icons-material/MonetizationOnRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import { useSalesReportQuery } from "../../hooks/usePosQueries";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router";
import MobileReportNavigation from "../../components/Report/MobileReportNavigation";

const reportTabs = ["Overview", "Daily", "Weekly", "Monthly", "Yearly", "Compare"];
const trendTabs = ["daily", "weekly", "monthly", "yearly"];
const money = (value) => new Intl.NumberFormat("en-US").format(Math.round(Number(value ?? 0)));
const formatDate = (value) => value ? new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Yangon", day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00+06:30`)) : "";

function yangonDateKey(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Yangon", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  const part = (type) => parts.find((entry) => entry.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function addCalendarDays(dateKey, days) {
  const date = new Date(`${dateKey}T00:00:00+06:30`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function monthToDate() {
  const today = yangonDateKey();
  return { from: `${today.slice(0, 7)}-01`, to: today };
}

function reportQuery(range, trend) {
  const today = yangonDateKey();
  const dates = range.mode === "today"
    ? { from: today, to: today }
    : range.mode === "all"
      ? { from: "2000-01-01", to: today }
      : range.mode === "custom"
        ? { from: range.from, to: range.to }
        : monthToDate();
  return { ...dates, trend };
}

function guestDemoReport(query) {
  const current = { totalSales: 296000, orders: 18, itemsSold: 47, totalCostPrice: 202500, grossProfit: 93500 };
  const previous = { totalSales: 241500, orders: 15, itemsSold: 39, totalCostPrice: 168200, grossProfit: 73300 };
  const metric = (value, prior) => ({ current: value, previous: prior, change: value - prior, percentage: Number((((value - prior) / prior) * 100).toFixed(1)) });
  const summary = Object.fromEntries(Object.keys(current).map((key) => [key, metric(current[key], previous[key])]));
  const today = yangonDateKey();
  const previousFrom = query.from === query.to ? addCalendarDays(query.from, -1) : addCalendarDays(query.from, -(Math.round((new Date(`${query.to}T00:00:00+06:30`) - new Date(`${query.from}T00:00:00+06:30`)) / 86400000) + 1));
  const previousTo = addCalendarDays(query.from, -1);
  const reportMetrics = (label, values) => ({ label, ...values });

  return {
    range: { from: query.from, to: query.to, previous: { from: previousFrom, to: previousTo } },
    summary,
    trend: [
      { key: addCalendarDays(today, -4), sales: 42000, orders: 3 },
      { key: addCalendarDays(today, -3), sales: 54000, orders: 4 },
      { key: addCalendarDays(today, -2), sales: 61000, orders: 3 },
      { key: addCalendarDays(today, -1), sales: 68000, orders: 4 },
      { key: today, sales: 71000, orders: 4 },
    ],
    categories: [{ name: "Drinks", amount: 118400, percentage: 40 }, { name: "Food", amount: 88800, percentage: 30 }, { name: "Beauty", amount: 59200, percentage: 20 }, { name: "Household", amount: 29600, percentage: 10 }],
    paymentCollections: [{ method: "Cash", amount: 142000, percentage: 48 }, { method: "KPay", amount: 95000, percentage: 32.1 }, { method: "WavePay", amount: 59000, percentage: 19.9 }],
    collectionTotal: current.totalSales,
    salesSummary: [
      reportMetrics("Today", { totalSales: 71000, orders: 4, itemsSold: 11, totalCostPrice: 48400, grossProfit: 22600 }),
      reportMetrics("This Week", { totalSales: 296000, orders: 18, itemsSold: 47, totalCostPrice: 202500, grossProfit: 93500 }),
      reportMetrics("Last Week", previous),
      reportMetrics("This Month", current),
      reportMetrics("Last Month", { totalSales: 684000, orders: 43, itemsSold: 112, totalCostPrice: 467000, grossProfit: 217000 }),
    ],
    comparison: [["Total Sales", current.totalSales, previous.totalSales], ["Orders", current.orders, previous.orders], ["Items Sold", current.itemsSold, previous.itemsSold], ["Total Cost Price", current.totalCostPrice, previous.totalCostPrice], ["Gross Profit", current.grossProfit, previous.grossProfit]].map(([metricName, value, prior]) => ({ metric: metricName, ...metric(value, prior) })),
  };
}

function growthText(metric) {
  if (!metric || metric.percentage === null) return metric?.current ? "New" : "—";
  return `${metric.percentage > 0 ? "+" : ""}${metric.percentage}%`;
}

function growthSx(metric) {
  if (!metric || metric.percentage === null) return metric?.current ? { color: "#16813a", bgcolor: "#e9f8ee" } : { color: "#64748b", bgcolor: "#f1f5f9" };
  if (metric.percentage > 0) return { color: "#16813a", bgcolor: "#e9f8ee" };
  if (metric.percentage < 0) return { color: "#c62828", bgcolor: "#ffebee" };
  return { color: "#64748b", bgcolor: "#f1f5f9" };
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

function compactMobileAmount(value) {
  const amount = Number(value ?? 0);
  if (Math.abs(amount) < 1_000) return String(Math.round(amount));
  const divisor = Math.abs(amount) >= 1_000_000 ? 1_000_000 : 1_000;
  const suffix = divisor === 1_000_000 ? "M" : "K";
  return `${Number((amount / divisor).toFixed(1))}${suffix}`;
}

function compactRangeLabel(from, to) {
  if (!from || !to) return "Date range";
  const start = new Date(`${from}T00:00:00+06:30`);
  const end = new Date(`${to}T00:00:00+06:30`);
  const startDay = new Intl.DateTimeFormat("en-GB", { day: "2-digit", timeZone: "Asia/Yangon" }).format(start);
  const endDay = new Intl.DateTimeFormat("en-GB", { day: "2-digit", timeZone: "Asia/Yangon" }).format(end);
  const startMonth = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "Asia/Yangon" }).format(start);
  const endMonth = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "Asia/Yangon" }).format(end);
  const startYear = new Intl.DateTimeFormat("en-GB", { year: "numeric", timeZone: "Asia/Yangon" }).format(start);
  const endYear = new Intl.DateTimeFormat("en-GB", { year: "numeric", timeZone: "Asia/Yangon" }).format(end);
  if (startYear === endYear && startMonth === endMonth) return `${startDay}–${endDay} ${endMonth} ${endYear}`;
  if (startYear === endYear) return `${startDay} ${startMonth}–${endDay} ${endMonth} ${endYear}`;
  return `${startDay} ${startMonth} ${startYear}–${endDay} ${endMonth} ${endYear}`;
}

function compactKpiRangeLabel(from, to) {
  if (!from || !to) return "Previous period";
  const start = new Date(`${from}T00:00:00+06:30`);
  const end = new Date(`${to}T00:00:00+06:30`);
  const formatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Yangon" });
  const startParts = Object.fromEntries(formatter.formatToParts(start).map(({ type, value }) => [type, value]));
  const endParts = Object.fromEntries(formatter.formatToParts(end).map(({ type, value }) => [type, value]));
  return startParts.month === endParts.month
    ? `${startParts.day}\u2013${endParts.day} ${endParts.month}`
    : `${startParts.day} ${startParts.month}\u2013${endParts.day} ${endParts.month}`;
}

void guestDemoReport;

export default function SalesReportPage() {
  const isMobile = useMediaQuery("(max-width:768px)");
  const navigate = useNavigate();
  const { isGuest } = useAuth();
  const [tab, setTab] = useState("Overview");
  const [trend, setTrend] = useState("daily");
  const [dateAnchor, setDateAnchor] = useState(null);
  const [draftRange, setDraftRange] = useState({ mode: "mtd", ...monthToDate() });
  const [range, setRange] = useState({ mode: "mtd", ...monthToDate() });
  const [comparisonFocused, setComparisonFocused] = useState(false);
  const comparisonRef = useRef(null);
  const mobileComparisonRef = useRef(null);
  const query = useMemo(() => reportQuery(range, trend), [range, trend]);
  const { data: report, error: reportError, isLoading } = useSalesReportQuery(query, { enabled: !isGuest });
  const activeReport = isGuest ? null : report;
  const error = reportError?.message || "";
  const loading = !isGuest && isLoading;

  const selectTab = (next) => {
    setTab(next);
    if (trendTabs.includes(next.toLowerCase())) setTrend(next.toLowerCase());
    if (next === "Compare") {
      requestAnimationFrame(() => {
        (isMobile ? mobileComparisonRef : comparisonRef).current?.scrollIntoView({ behavior: "smooth", block: "start" });
        setComparisonFocused(true);
        window.setTimeout(() => setComparisonFocused(false), 1250);
      });
    }
  };
  const summary = activeReport?.summary;
  const stats = [
    { key: "totalSales", label: "Total Sales", icon: <TrendingUpRoundedIcon />, tone: "purple" },
    { key: "orders", label: "Orders", icon: <ShoppingBagRoundedIcon />, tone: "blue", plain: true },
    { key: "itemsSold", label: "Items Sold", icon: <Inventory2RoundedIcon />, tone: "green", plain: true },
    { key: "totalCostPrice", label: "Total Cost Price", icon: <MonetizationOnRoundedIcon />, tone: "orange" },
    { key: "grossProfit", label: "Gross Profit", icon: <AccountBalanceWalletRoundedIcon />, tone: "amber" },
  ];
  const rangeLabel = report?.range ? `${formatDate(report.range.from)} – ${formatDate(report.range.to)}` : "This month to date";

  if (isMobile) return <MobileSalesReport report={activeReport} loading={loading} error={error} range={range} draftRange={draftRange} setDraftRange={setDraftRange} setRange={setRange} dateAnchor={dateAnchor} setDateAnchor={setDateAnchor} tab={tab} selectTab={selectTab} trend={trend} setTrend={setTrend} navigate={navigate} comparisonRef={mobileComparisonRef} comparisonFocused={comparisonFocused} />;

  return <Box sx={{ maxWidth: 1500, mx: "auto", py: 1 }}>
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, mb: 2.5 }}>
      <Stack direction="row" spacing={0.5}>{reportTabs.map((item) => <Button key={item} variant={tab === item ? "contained" : "text"} onClick={() => selectTab(item)} sx={{ minHeight: 40, px: 1.75, borderRadius: 1.5, textTransform: "none", color: tab === item ? "common.white" : "text.secondary", fontWeight: tab === item ? 700 : 600 }}>{item}</Button>)}</Stack>
      <Button variant="outlined" startIcon={<CalendarMonthRoundedIcon />} onClick={(event) => { setDraftRange(range); setDateAnchor(event.currentTarget); }} sx={toolbarButtonSx}>{rangeLabel}</Button>
    </Box>
    {loading && <Box sx={{ minHeight: 430, display: "grid", placeItems: "center" }}><Stack alignItems="center" spacing={1.5}><CircularProgress /><Typography color="text.secondary">Loading sales analytics…</Typography></Stack></Box>}
    {!loading && error && <Alert severity="error">{error}</Alert>}
    {!loading && !error && activeReport && <>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 1.75, mb: 2.25 }}>{stats.map((stat) => <SalesStat key={stat.key} {...stat} metric={summary?.[stat.key]} previousRange={activeReport?.range?.previous} />)}</Box>
      {summary?.orders?.current === 0 ? <EmptyReport /> : <>
        <Box sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1.45fr) minmax(340px, .9fr)", gap: 2.25 }}><SalesTrend trend={trend} onTrend={setTrend} entries={activeReport.trend} /><DonutCard title="Sales by Payment Method (Collected)" total={activeReport.collectionTotal} items={activeReport.paymentCollections.map((entry) => [entry.method, entry.amount, entry.percentage])} /></Box>
        <Box sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1.45fr) minmax(340px, .9fr)", gap: 2.25, mt: 2.25 }}><SalesSummary rows={activeReport.salesSummary} /><DonutCard title="Sales by Category" total={summary.totalSales.current} items={activeReport.categories.map((entry) => [entry.name, entry.amount, entry.percentage])} /></Box>
        <Box ref={comparisonRef} sx={{ scrollMarginTop: 24, borderRadius: 2.5, outline: comparisonFocused ? "2px solid #1976d2" : "2px solid transparent", outlineOffset: 4, transition: "outline-color .25s ease" }}><ComparisonTable comparison={activeReport.comparison} range={activeReport.range} /></Box>
      </>}
    </>}
    <DatePopover anchor={dateAnchor} onClose={() => setDateAnchor(null)} draftRange={draftRange} setDraftRange={setDraftRange} setRange={setRange} />
  </Box>;
}

function MobileSalesReport({ report, loading, error, range, draftRange, setDraftRange, setRange, dateAnchor, setDateAnchor, tab, selectTab, trend, setTrend, navigate, comparisonRef, comparisonFocused }) {
  const summary = report?.summary;
  const mobileStats = [
    { key: "totalSales", label: "Total Sales", icon: <TrendingUpRoundedIcon />, tone: "purple" },
    { key: "orders", label: "Orders", icon: <ShoppingBagRoundedIcon />, tone: "blue", plain: true },
    { key: "totalCostPrice", label: "Total Cost Price", icon: <MonetizationOnRoundedIcon />, tone: "orange" },
    { key: "grossProfit", label: "Gross Profit", icon: <AccountBalanceWalletRoundedIcon />, tone: "amber" },
  ];
  return <Box sx={{ pb: 3 }}>
    <AppBar position="static" elevation={0} sx={{ bgcolor: "#1976d2" }}><Toolbar sx={{ minHeight: 62, display: "grid", gridTemplateColumns: "40px minmax(0, 1fr) 40px", px: 1 }}><IconButton aria-label="Back to settings" onClick={() => navigate("/settings")} sx={{ color: "common.white" }}><ArrowBackRoundedIcon /></IconButton><Typography noWrap align="center" sx={{ px: .5, fontSize: 17, fontWeight: 800 }}>Sales Reports &amp; Analytics</Typography><IconButton aria-label="Choose date range" onClick={(event) => { setDraftRange(range); setDateAnchor(event.currentTarget); }} sx={{ color: "common.white" }}><CalendarMonthRoundedIcon /></IconButton></Toolbar></AppBar>
    <MobileReportNavigation />
    <Box sx={{ px: 1.5, pt: 1.5 }}>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: .35, p: .35, border: "1px solid", borderColor: "divider", borderRadius: 1.5, bgcolor: "background.paper" }}>{reportTabs.map((item) => <Button key={item} variant={tab === item ? "contained" : "text"} onClick={() => selectTab(item)} sx={{ minWidth: 0, minHeight: 34, px: .3, borderRadius: 1, textTransform: "none", fontSize: 9.5, fontWeight: 800, whiteSpace: "nowrap" }}>{item}</Button>)}</Box>
      {loading && <Box sx={{ minHeight: 340, display: "grid", placeItems: "center" }}><CircularProgress /></Box>}
      {!loading && error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}
      {!loading && !error && report && <>{summary?.orders?.current === 0 ? <Box sx={{ mt: 1.5 }}><EmptyReport /></Box> : <>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 1, mt: 1.5 }}>{mobileStats.map((stat) => <MobileSalesStat key={stat.key} {...stat} metric={summary?.[stat.key]} previousRange={report.range?.previous} />)}</Box>
        <Box sx={{ mt: 1.25 }}><SalesTrend trend={trend} onTrend={setTrend} entries={report.trend} /></Box>
        <Box sx={{ mt: 1.25 }}><MobileDonutCard title="Sales by Payment Method" total={report.collectionTotal} items={report.paymentCollections.map((entry) => [entry.method, entry.amount, entry.percentage])} /></Box>
        <Box sx={{ mt: 1.25 }}><MobileTable kind="summary" title="Sales Summary" columns={["Period", "Sales", "Orders", "Items", "Cost", "Profit"]} rows={report.salesSummary.map((row) => [row.label, compactMobileAmount(row.totalSales), compactMobileAmount(row.orders), compactMobileAmount(row.itemsSold), compactMobileAmount(row.totalCostPrice), compactMobileAmount(row.grossProfit)])} /></Box>
        <Box sx={{ mt: 1.25 }}><MobileDonutCard title="Sales by Category" total={summary.totalSales.current} items={report.categories.map((entry) => [entry.name, entry.amount, entry.percentage])} /></Box>
        <Box ref={comparisonRef} sx={{ mt: 1.25, scrollMarginTop: 16, borderRadius: 2, outline: comparisonFocused ? "2px solid #1976d2" : "2px solid transparent", outlineOffset: 3, transition: "outline-color .25s ease" }}><MobileTable kind="comparison" title="Sales Comparison" columns={["Metric", compactRangeLabel(report.range.from, report.range.to), compactRangeLabel(report.range.previous.from, report.range.previous.to), "Change", "Growth"]} rows={report.comparison.map((row) => [row.metric, compactMobileAmount(row.current), compactMobileAmount(row.previous), `${row.change > 0 ? "+" : ""}${compactMobileAmount(row.change)}`, growthText(row)])} growthMetrics={report.comparison} /></Box>
      </>}</>}
    </Box>
    <DatePopover anchor={dateAnchor} onClose={() => setDateAnchor(null)} draftRange={draftRange} setDraftRange={setDraftRange} setRange={setRange} mobile />
  </Box>;
}

function MobileSalesStat({ label, metric, icon, tone, plain = false, previousRange }) {
  const tones = { purple: ["#f0ecff", "#7656e9"], blue: ["#e9f2ff", "#4285ee"], orange: ["#fff3e5", "#f49a29"], amber: ["#fff5df", "#e99c20"] };
  const [bg, color] = tones[tone]; const arrow = metric?.percentage > 0 ? "↑" : metric?.percentage < 0 ? "↓" : "";
  const previousLabel = previousRange ? compactKpiRangeLabel(previousRange.from, previousRange.to) : "Previous period";
  return <Card sx={cardSx}><CardContent sx={{ p: 1.15, "&:last-child": { pb: 1.15 } }}><Box sx={{ display: "grid", gridTemplateColumns: "31px minmax(0, 1fr) auto", gridTemplateRows: "auto auto", columnGap: .8, rowGap: .25, alignItems: "center" }}><Box sx={{ gridRow: "1 / span 2", width: 31, height: 31, borderRadius: 1.25, display: "grid", placeItems: "center", bgcolor: bg, color, "& .MuiSvgIcon-root": { fontSize: 18 } }}>{icon}</Box><Typography color="text.secondary" noWrap sx={{ minWidth: 0, fontSize: 11, fontWeight: 800 }}>{label}</Typography><Box component="span" sx={{ justifySelf: "end", display: "inline-flex", alignItems: "center", px: .45, py: .1, borderRadius: .75, fontSize: 10, fontWeight: 800, whiteSpace: "nowrap", ...growthSx(metric) }}>{arrow}{growthText(metric)}</Box><Typography noWrap sx={{ minWidth: 0, fontSize: 17, lineHeight: 1.25, fontWeight: 800 }}>{money(metric?.current)}{plain ? "" : " ကျပ်"}</Typography><Typography color="text.secondary" noWrap sx={{ justifySelf: "end", fontSize: 9, fontWeight: 600 }}>{previousLabel}</Typography></Box></CardContent></Card>;
}

function MobileDonutCard({ title, total, items }) {
  const colors = ["#7c5cf0", "#4a90f5", "#55bd8a", "#f8ad39", "#e76f51", "#64748b"]; let accumulated = 0;
  const gradient = items.length ? items.map(([, , percentage], index) => { const start = accumulated; accumulated += Math.max(0, percentage); return `${colors[index % colors.length]} ${start}% ${accumulated}%`; }).join(", ") : "#e7edf5 0 100%";
  return <Card sx={cardSx}><CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}><Typography sx={{ fontSize: 15, fontWeight: 800 }}>{title}</Typography><Box sx={{ display: "grid", gridTemplateColumns: "126px minmax(0, 1fr)", alignItems: "center", gap: 1, mt: 1.25 }}><Box sx={{ position: "relative", width: 120, height: 120, mx: "auto", borderRadius: "50%", background: `conic-gradient(${gradient})`, "&::after": { content: '""', position: "absolute", inset: 26, borderRadius: "50%", bgcolor: "background.paper" } }}><Box sx={{ position: "absolute", inset: 0, zIndex: 1, display: "grid", placeItems: "center", textAlign: "center" }}><Box><Typography sx={{ fontSize: 13, fontWeight: 800 }}>{money(total)}</Typography><Typography color="text.secondary" sx={{ fontSize: 9 }}>Total</Typography></Box></Box></Box><Stack spacing={.75}>{items.map(([label, amount, percentage], index) => <Box key={label} sx={{ display: "grid", gridTemplateColumns: "9px minmax(0, 1fr)", gap: .55 }}><Box sx={{ width: 7, height: 7, mt: .45, borderRadius: .5, bgcolor: colors[index % colors.length] }} /><Box><Typography sx={{ fontSize: 11, fontWeight: 800 }}>{label}</Typography><Typography color="text.secondary" sx={{ fontSize: 10 }}>{money(amount)} ({percentage.toFixed(1)}%)</Typography></Box></Box>)}</Stack></Box></CardContent></Card>;
}

function MobileTable({ title, columns, rows, growthMetrics, kind }) {
  const isComparison = kind === "comparison";
  const gridTemplateColumns = isComparison ? "1.08fr 1.38fr 1.38fr .82fr .88fr" : "1.02fr 1.08fr .68fr .68fr 1.08fr 1.08fr";
  const headerFontSize = isComparison ? 8.6 : 8.2;
  const rowFontSize = isComparison ? 10.2 : 9;
  return <Card sx={cardSx}><CardContent sx={{ p: 1.1, "&:last-child": { pb: 1.1 } }}><Typography sx={{ mb: .8, px: .4, fontSize: isComparison ? 15 : 14, fontWeight: 800 }}>{title}</Typography><Box sx={{ width: "100%", border: "1px solid", borderColor: "divider", borderRadius: 1, overflow: "hidden" }}><Box sx={{ display: "grid", gridTemplateColumns, columnGap: .3, px: .6, minHeight: isComparison ? 38 : 29, alignItems: "center", bgcolor: "#f7f9fc" }}>{columns.map((column, index) => <Typography key={column} noWrap sx={{ overflow: "hidden", textOverflow: "clip", color: "text.secondary", fontSize: isComparison && index > 0 && index < 3 ? 7.9 : headerFontSize, lineHeight: 1.1, fontWeight: 800, textTransform: index > 0 && index < 3 && isComparison ? "none" : "uppercase", textAlign: index === 0 ? "left" : "right" }}>{column}</Typography>)}</Box>{rows.map((row, rowIndex) => <Box key={`${row[0]}-${rowIndex}`} sx={{ display: "grid", gridTemplateColumns, columnGap: .3, px: .6, minHeight: isComparison ? 33 : 29, alignItems: "center", borderTop: "1px solid", borderColor: "divider" }}>{row.map((cell, index) => growthMetrics && (index === row.length - 2 || index === row.length - 1) ? <Box key={`${row[0]}-${index}`} sx={{ justifySelf: "end", minWidth: 0, px: isComparison ? .3 : .25, py: .05, borderRadius: .55, fontSize: isComparison ? 9 : 8.3, lineHeight: 1.15, fontWeight: 800, whiteSpace: "nowrap", ...growthSx(growthMetrics[rowIndex]) }}>{index === row.length - 1 && (growthMetrics[rowIndex]?.percentage > 0 ? "↑ " : growthMetrics[rowIndex]?.percentage < 0 ? "↓ " : "")}{cell}</Box> : <Typography key={`${row[0]}-${index}`} noWrap sx={{ minWidth: 0, overflow: "hidden", textOverflow: "clip", fontSize: rowFontSize, lineHeight: 1.1, fontWeight: isComparison ? (index === 0 ? 800 : 700) : 700, textAlign: index === 0 ? "left" : "right" }}>{cell}</Typography>)}</Box>)}</Box></CardContent></Card>;
}

function SalesStat({ label, metric, icon, tone, plain = false, previousRange }) {
  const tones = { purple: ["#f0ecff", "#7656e9"], blue: ["#e9f2ff", "#4285ee"], green: ["#eaf9f1", "#39ae71"], orange: ["#fff3e5", "#f49a29"], amber: ["#fff5df", "#e99c20"] };
  const [bg, color] = tones[tone];
  const arrow = metric?.percentage > 0 ? "↑" : metric?.percentage < 0 ? "↓" : "";
  const previousLabel = previousRange ? `${formatDate(previousRange.from)} – ${formatDate(previousRange.to)}` : "previous period";
  return <Card sx={cardSx}><CardContent sx={{ p: 1.75, "&:last-child": { pb: 1.75 } }}><Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.25 }}><Box sx={{ width: 40, height: 40, display: "grid", placeItems: "center", borderRadius: 1.5, bgcolor: bg, color, flexShrink: 0 }}>{icon}</Box><Box sx={{ minWidth: 0 }}><Typography color="text.secondary" sx={{ fontSize: 12, fontWeight: 700 }}>{label}</Typography><Typography noWrap sx={{ mt: 0.45, fontSize: 20, fontWeight: 800 }}>{money(metric?.current)}{plain ? "" : " ကျပ်"}</Typography><Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.35, px: 0.7, py: 0.25, mt: 0.65, borderRadius: 1, fontSize: 11, fontWeight: 800, ...growthSx(metric) }}>{arrow}{growthText(metric)}</Box><Typography color="text.secondary" sx={{ mt: 0.7, fontSize: 10.5, whiteSpace: "nowrap" }}>vs {previousLabel}</Typography></Box></Box></CardContent></Card>;
}

function SalesTrend({ trend, onTrend, entries }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const maxSales = niceMaximum(Math.max(...entries.map((entry) => entry.sales), 0));
  const maxOrders = niceMaximum(Math.max(...entries.map((entry) => entry.orders), 0));
  const left = 58; const chartWidth = 540; const baseline = 252; const top = 34; const chartHeight = 218; const count = Math.max(entries.length, 1);
  const x = (index) => left + ((index + 0.5) * chartWidth) / count;
  const salesY = (value) => baseline - (value / maxSales) * chartHeight;
  const ordersY = (value) => baseline - (value / maxOrders) * chartHeight;
  const points = entries.map((entry, index) => `${x(index)},${ordersY(entry.orders)}`).join(" ");
  const label = (key) => trend === "daily" ? key.slice(5) : key;
  const active = activeIndex === null ? null : entries[activeIndex];
  const barWidth = Math.min(38, chartWidth / count / 1.8);
  return <ReportCard title="Sales Trend" action={<Stack direction="row" spacing={0.35}>{trendTabs.map((item) => <Button key={item} variant={item === trend ? "contained" : "text"} size="small" onClick={() => onTrend(item)} sx={{ minWidth: 0, px: 1, minHeight: 30, textTransform: "capitalize", fontSize: 11, fontWeight: 700 }}>{item}</Button>)}</Stack>}><Stack direction="row" spacing={2} sx={{ mb: 1.25 }}><Legend color="#9579ef" label="Sales (MMK)" /><Legend color="#348cf5" label="Orders" /></Stack><Box sx={{ position: "relative" }}><Box component="svg" viewBox="0 0 640 305" sx={{ width: "100%", height: 305, display: "block", overflow: "visible" }}><defs><linearGradient id="sales-bar-gradient" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#8f70ed" /><stop offset="100%" stopColor="#bcaaf5" /></linearGradient></defs><g stroke="#e5eaf2" strokeWidth="1">{[0, 1, 2, 3, 4, 5].map((index) => <line key={index} x1={left} x2={left + chartWidth} y1={top + index * (chartHeight / 5)} y2={top + index * (chartHeight / 5)} />)}</g>{entries.map((entry, index) => <g key={entry.key} onMouseEnter={() => setActiveIndex(index)} onMouseLeave={() => setActiveIndex(null)} onClick={() => setActiveIndex(index)}><rect x={x(index) - barWidth / 2} y={salesY(entry.sales)} width={barWidth} height={baseline - salesY(entry.sales)} rx="5" fill="url(#sales-bar-gradient)" opacity={activeIndex === null || activeIndex === index ? 1 : .48} /><rect x={x(index) - Math.max(barWidth, chartWidth / count) / 2} y={top} width={Math.max(barWidth, chartWidth / count)} height={chartHeight} fill="transparent" /><text x={x(index)} y="282" textAnchor="middle" fill="#6f7c92" fontSize="10">{label(entry.key)}</text></g>)}{entries.length > 1 && <polyline points={points} fill="none" stroke="#348cf5" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />}{entries.map((entry, index) => <circle key={`${entry.key}-point`} cx={x(index)} cy={ordersY(entry.orders)} r={activeIndex === index ? "5.5" : "4"} fill="#fff" stroke="#348cf5" strokeWidth="3" pointerEvents="none" />)}{[0, 1, 2, 3, 4, 5].map((index) => <g key={`axis-${index}`}><text x="6" y={baseline + 4 - index * (chartHeight / 5)} fill="#6f7c92" fontSize="11">{compactAmount((maxSales / 5) * index)}</text><text x="610" y={baseline + 4 - index * (chartHeight / 5)} fill="#6f7c92" fontSize="11" textAnchor="end">{Math.round((maxOrders / 5) * index)}</text></g>)}</Box>{active && <Box sx={{ position: "absolute", top: 10, left: `${((activeIndex + .5) / count) * 100}%`, transform: "translateX(-50%)", zIndex: 1, minWidth: 156, p: 1, borderRadius: 1.5, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", boxShadow: "0 8px 20px rgba(15,23,42,.16)", pointerEvents: "none" }}><Typography sx={{ fontSize: 11, fontWeight: 800 }}>{active.key}</Typography><Typography sx={{ mt: .35, fontSize: 11, color: "#7656e9", fontWeight: 700 }}>Sales: {money(active.sales)} ကျပ်</Typography><Typography sx={{ mt: .2, fontSize: 11, color: "#348cf5", fontWeight: 700 }}>Orders: {active.orders}</Typography></Box>}</Box></ReportCard>;
}

function DonutCard({ title, total, items }) {
  const colors = ["#7c5cf0", "#4a90f5", "#55bd8a", "#f8ad39", "#e76f51", "#64748b"];
  let accumulated = 0;
  const gradient = items.length ? items.map(([, , percentage], index) => { const start = accumulated; accumulated += Math.max(0, percentage); return `${colors[index % colors.length]} ${start}% ${accumulated}%`; }).join(", ") : "#e7edf5 0 100%";
  return <ReportCard title={title}><Box sx={{ display: "grid", gridTemplateColumns: "minmax(160px, .85fr) minmax(150px, 1fr)", alignItems: "center", minHeight: 290, gap: 1.25 }}><Box sx={{ position: "relative", width: 190, height: 190, mx: "auto", borderRadius: "50%", background: `conic-gradient(${gradient})`, "&::after": { content: '""', position: "absolute", inset: 39, borderRadius: "50%", bgcolor: "background.paper" } }}><Box sx={{ position: "absolute", inset: 0, zIndex: 1, display: "grid", placeItems: "center", textAlign: "center" }}><Box><Typography sx={{ fontSize: 19, fontWeight: 800 }}>{money(total)}</Typography><Typography color="text.secondary" sx={{ fontSize: 12 }}>MMK total</Typography></Box></Box></Box><Stack spacing={1.6}>{items.length ? items.map(([label, amount, percentage], index) => <Box key={label} sx={{ display: "grid", gridTemplateColumns: "12px minmax(0, 1fr)", alignItems: "start", gap: 0.75 }}><Box sx={{ width: 9, height: 9, mt: 0.5, borderRadius: 0.5, bgcolor: colors[index % colors.length] }} /><Box><Typography sx={{ fontSize: 13, fontWeight: 700 }}>{label}</Typography><Typography color="text.secondary" sx={{ mt: 0.2, fontSize: 12 }}>{money(amount)} ({percentage.toFixed(1)}%)</Typography></Box></Box>) : <Typography color="text.secondary" sx={{ fontSize: 13 }}>No data for this period.</Typography>}</Stack></Box></ReportCard>;
}

function SalesSummary({ rows }) { return <ReportCard title="Sales Summary"><DataGrid columns={["Period", "Sales (MMK)", "Orders", "Items Sold", "Cost Price (MMK)", "Gross Profit (MMK)"]} rows={rows.map((row) => [row.label, money(row.totalSales), money(row.orders), money(row.itemsSold), money(row.totalCostPrice), money(row.grossProfit)])} /></ReportCard>; }
function ComparisonTable({ comparison, range }) { const current = `${formatDate(range.from)} – ${formatDate(range.to)}`; const previous = `${formatDate(range.previous.from)} – ${formatDate(range.previous.to)}`; return <Box sx={{ mt: 2.25 }}><ReportCard title="Sales Comparison"><DataGrid columns={["Metric", current, previous, "Change", "Growth"]} rows={comparison.map((row) => [row.metric, money(row.current), money(row.previous), `${row.change > 0 ? "+" : ""}${money(row.change)}`, growthText(row)])} growthMetrics={comparison} /></ReportCard></Box>; }
function DataGrid({ columns, rows, growthMetrics }) { return <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.5, overflow: "hidden" }}><Box sx={{ display: "grid", gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`, minHeight: 37, alignItems: "center", px: 1.25, columnGap: 1, bgcolor: "#f7f9fc" }}>{columns.map((column, index) => <Typography key={column} sx={{ color: "text.secondary", fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", textAlign: index === 0 ? "left" : "right" }}>{column}</Typography>)}</Box>{rows.map((row, rowIndex) => <Box key={`${row[0]}-${rowIndex}`} sx={{ display: "grid", gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`, minHeight: 41, alignItems: "center", px: 1.25, columnGap: 1, borderBottom: rowIndex === rows.length - 1 ? 0 : "1px solid", borderColor: "divider" }}>{row.map((cell, index) => growthMetrics && (index === row.length - 2 || index === row.length - 1) ? <Box key={`${row[0]}-${index}`} sx={{ justifySelf: "end", display: "inline-flex", alignItems: "center", px: 0.65, py: 0.2, borderRadius: 1, fontSize: 11, fontWeight: 800, whiteSpace: "nowrap", ...growthSx(growthMetrics[rowIndex]) }}>{index === row.length - 1 && (growthMetrics[rowIndex]?.percentage > 0 ? "↑ " : growthMetrics[rowIndex]?.percentage < 0 ? "↓ " : "")}{cell}</Box> : <Typography key={`${row[0]}-${index}`} sx={{ fontSize: 12, fontWeight: index === 0 ? 700 : 600, textAlign: index === 0 ? "left" : "right", whiteSpace: "nowrap" }}>{cell}</Typography>)}</Box>)}</Box>; }
function ReportCard({ title, action, children }) { return <Card sx={cardSx}><CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}><Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 1.5 }}><Typography sx={{ fontSize: 17, fontWeight: 800 }}>{title}</Typography>{action}</Box>{children}</CardContent></Card>; }
function Legend({ color, label }) { return <Box sx={{ display: "flex", alignItems: "center", gap: 0.7 }}><Box sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: color }} /><Typography color="text.secondary" sx={{ fontSize: 12 }}>{label}</Typography></Box>; }
function EmptyReport() { return <Card sx={{ border: "1px dashed", borderColor: "divider", borderRadius: 2 }}><CardContent sx={{ minHeight: 250, display: "grid", placeItems: "center", textAlign: "center" }}><Box><Typography sx={{ fontWeight: 800, fontSize: 18 }}>No completed sales in this period</Typography><Typography color="text.secondary" sx={{ mt: 0.75 }}>Complete an order or choose another date range to view analytics.</Typography></Box></CardContent></Card>; }
function DatePopover({ anchor, onClose, draftRange, setDraftRange, setRange, mobile = false }) { return <Popover open={Boolean(anchor)} anchorEl={anchor} onClose={onClose} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }} slotProps={{ paper: { sx: { width: mobile ? "calc(100vw - 28px)" : 410, maxWidth: 410, p: 2, borderRadius: 2 } } }}><Typography sx={{ fontSize: 16, fontWeight: 800, mb: 1.5 }}>Date and time</Typography><Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1 }}>{[["mtd", "This month"], ["today", "Today"], ["all", "All history"], ["custom", "Custom"]].map(([mode, label]) => <Button key={mode} variant="outlined" onClick={() => setDraftRange((current) => ({ ...current, mode }))} sx={{ minHeight: 42, borderColor: draftRange.mode === mode ? "primary.main" : "divider", bgcolor: draftRange.mode === mode ? "#eaf3ff" : "transparent", color: draftRange.mode === mode ? "primary.main" : "text.primary", textTransform: "none", fontSize: 12 }}>{label}</Button>)}</Box>{draftRange.mode === "custom" && <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, mt: 1.5 }}><TextField type="date" label="From" size="small" value={draftRange.from} onChange={(event) => setDraftRange((current) => ({ ...current, from: event.target.value }))} slotProps={{ inputLabel: { shrink: true } }} /><TextField type="date" label="To" size="small" value={draftRange.to} onChange={(event) => setDraftRange((current) => ({ ...current, to: event.target.value }))} slotProps={{ inputLabel: { shrink: true } }} /></Box>}<Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mt: 1.5 }}><Button onClick={() => { const next = { mode: "mtd", ...monthToDate() }; setDraftRange(next); setRange(next); }} sx={{ textTransform: "uppercase" }}>Reset</Button><Button variant="contained" disabled={draftRange.mode === "custom" && (!draftRange.from || !draftRange.to || draftRange.from > draftRange.to)} onClick={() => { setRange(draftRange); onClose(); }} sx={{ textTransform: "uppercase" }}>Apply</Button></Stack></Popover>; }
const cardSx = { minWidth: 0, border: "1px solid", borderColor: "divider", borderRadius: 2, boxShadow: "0 2px 9px rgba(15,23,42,.05)" };
const toolbarButtonSx = { minHeight: 42, borderColor: "divider", color: "text.primary", borderRadius: 1.5, textTransform: "none", fontWeight: 600, whiteSpace: "nowrap" };
