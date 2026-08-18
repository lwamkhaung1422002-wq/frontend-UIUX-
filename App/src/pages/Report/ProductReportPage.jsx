import { useMemo, useState } from "react";
import { Box, Button, Card, CardContent, Chip, IconButton, MenuItem, Popover, Stack, TextField, Tooltip, Typography, useMediaQuery } from "@mui/material";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import FilterListRoundedIcon from "@mui/icons-material/FilterListRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";

const tabs = ["Overview", "Top Seller", "Slow Seller", "Low Stock", "Out of Stock"];
const reports = {
  top: { title: "Top Selling Products", columns: ["#", "Product", "Qty Sold", "Revenue (MMK)"], rows: [["Jasmine Perfume", "28", "98,000 ကျပ်"], ["Nivea Roll On", "19", "123,500 ကျပ်"], ["Coca-Cola 330ml", "16", "16,000 ကျပ်"], ["Oishi Green Tea", "13", "23,400 ကျပ်"], ["Royal-D 500ml", "11", "16,500 ကျပ်"]] },
  slow: { title: "Slow Selling Products", columns: ["#", "Product", "Last Sold", "Qty In Stock"], rows: [["Cellox Facial Tissue", "45 days ago", "45"], ["Dettol Soap 125g", "38 days ago", "32"], ["Lux Body Wash 250ml", "30 days ago", "28"], ["Oreo Biscuit 137g", "28 days ago", "18"], ["Lay's Potato Chips", "25 days ago", "22"]] },
  low: { title: "Low Stock Products", columns: ["#", "Product", "Qty In Stock", "Reorder Level"], rows: [["Oishi Green Tea", "4", "10"], ["Jasmine Perfume", "5", "10"], ["Nivea Roll On", "7", "12"], ["Royal-D 500ml", "9", "15"], ["Dettol Soap 125g", "9", "15"]] },
  out: { title: "Out of Stock Products", columns: ["#", "Product", "Last Sold", "Status"], rows: [["Fresh Milk 1L", "3 days ago", "Out of Stock"], ["Yogurt 500ml", "5 days ago", "Out of Stock"], ["Chicken Breast", "6 days ago", "Out of Stock"], ["Cheese 200g", "7 days ago", "Out of Stock"], ["Sausage 500g", "8 days ago", "Out of Stock"]] },
};

export default function ProductReportPage() {
  const isMobile = useMediaQuery("(max-width:768px)");
  const [tab, setTab] = useState("Overview");
  const [dateAnchor, setDateAnchor] = useState(null);
  const [filterAnchor, setFilterAnchor] = useState(null);
  const [dateRange, setDateRange] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [category, setCategory] = useState("All categories");
  const visible = useMemo(() => tab === "Overview" ? ["top", "slow", "low", "out"] : ({ "Top Seller": ["top"], "Slow Seller": ["slow"], "Low Stock": ["low"], "Out of Stock": ["out"] }[tab] ?? ["top"]), [tab]);

  if (isMobile) return null;

  return <Box sx={{ maxWidth: 1500, mx: "auto", py: 1 }}>
    <Typography sx={{ fontSize: 30, lineHeight: 1.2, fontWeight: 700 }}>Product Reports &amp; Analytics</Typography>
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, mt: 2.5, mb: 2.5 }}>
      <Stack direction="row" spacing={0.5} sx={{ minWidth: 0 }}>
        {tabs.map((item) => <Button key={item} variant={tab === item ? "contained" : "text"} onClick={() => setTab(item)} sx={{ minHeight: 40, px: 1.5, borderRadius: 1.5, textTransform: "none", color: tab === item ? "common.white" : "text.secondary", whiteSpace: "nowrap", fontWeight: tab === item ? 700 : 600 }}>{item}</Button>)}
      </Stack>
      <Stack direction="row" spacing={1} flexShrink={0}>
        <Button variant="outlined" startIcon={<CalendarMonthRoundedIcon />} onClick={(event) => setDateAnchor(event.currentTarget)} sx={toolbarButtonSx}>Date and time</Button>
        <Tooltip title="Filter products"><IconButton aria-label="Filter products" onClick={(event) => setFilterAnchor(event.currentTarget)} sx={{ width: 42, height: 42, border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}><FilterListRoundedIcon /></IconButton></Tooltip>
      </Stack>
    </Box>

    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 2, mb: 2.5 }}>
      <SummaryCard icon={<Inventory2RoundedIcon />} tone="blue" label="Total Products" value="18" helper="Active Products" />
      <SummaryCard icon={<Inventory2RoundedIcon />} tone="green" label="Total Quantity" value="342" helper="In Stock" />
      <SummaryCard icon={<WarningAmberRoundedIcon />} tone="orange" label="Low Stock Items" value="5" helper="Need Attention" />
      <SummaryCard icon={<ErrorOutlineRoundedIcon />} tone="red" label="Out of Stock Items" value="0" helper="Currently Out" />
    </Box>

    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 2.25 }}>
      {visible.map((key) => <ReportTable key={key} kind={key} {...reports[key]} />)}
    </Box>
    {tab === "Overview" && <InventoryStatusCard />}

    <Popover open={Boolean(dateAnchor)} anchorEl={dateAnchor} onClose={() => setDateAnchor(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }} slotProps={{ paper: { sx: { width: 370, p: 2, borderRadius: 2 } } }}>
      <Typography sx={{ fontSize: 16, fontWeight: 800, mb: 1.5 }}>Date and time</Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1 }}>{["all", "today", "custom"].map((range) => <Button key={range} variant="outlined" onClick={() => setDateRange(range)} sx={{ minHeight: 42, borderColor: dateRange === range ? "primary.main" : "divider", bgcolor: dateRange === range ? "#eaf3ff" : "transparent", color: dateRange === range ? "primary.main" : "text.primary", textTransform: "uppercase", fontSize: 12 }}>{range}</Button>)}</Box>
      {dateRange === "custom" && <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, mt: 1.5 }}><TextField type="date" label="From" size="small" value={from} onChange={(event) => setFrom(event.target.value)} /><TextField type="date" label="To" size="small" value={to} onChange={(event) => setTo(event.target.value)} /></Box>}
      <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mt: 1.5 }}><Button onClick={() => { setDateRange("all"); setFrom(""); setTo(""); }} sx={{ textTransform: "uppercase" }}>Reset</Button><Button variant="contained" onClick={() => setDateAnchor(null)} sx={{ textTransform: "uppercase" }}>Apply</Button></Stack>
    </Popover>
    <Popover open={Boolean(filterAnchor)} anchorEl={filterAnchor} onClose={() => setFilterAnchor(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }} slotProps={{ paper: { sx: { width: 260, p: 2, borderRadius: 2 } } }}>
      <Typography sx={{ fontSize: 16, fontWeight: 800, mb: 1.25 }}>Filter products</Typography>
      <TextField select fullWidth size="small" label="Category" value={category} onChange={(event) => setCategory(event.target.value)}>{["All categories", "Drinking", "Beauty", "Household"].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</TextField>
      <Button fullWidth variant="contained" onClick={() => setFilterAnchor(null)} sx={{ mt: 1.5, minHeight: 42, textTransform: "none", fontWeight: 700 }}>Apply filter</Button>
    </Popover>
  </Box>;
}

function SummaryCard({ icon, tone, label, value, helper }) {
  const tones = { blue: ["#eef2ff", "#5262f5"], green: ["#eafaf1", "#1fa45b"], orange: ["#fff3e8", "#ec9128"], red: ["#fff0f1", "#ef4b5a"] };
  const [bg, color] = tones[tone];
  return <Card sx={{ minWidth: 0, border: "1px solid", borderColor: "divider", borderRadius: 2, boxShadow: "0 2px 9px rgba(15,23,42,.05)" }}><CardContent sx={{ p: 2.25, display: "flex", alignItems: "center", gap: 1.75, "&:last-child": { pb: 2.25 } }}><Box sx={{ width: 52, height: 52, display: "grid", placeItems: "center", borderRadius: 2, bgcolor: bg, color, flexShrink: 0 }}>{icon}</Box><Box><Typography color="text.secondary" sx={{ fontSize: 13, fontWeight: 700 }}>{label}</Typography><Typography sx={{ mt: 0.4, fontSize: 26, lineHeight: 1.1, fontWeight: 800 }}>{value}</Typography><Typography color="text.secondary" sx={{ mt: 0.55, fontSize: 13 }}>{helper}</Typography></Box></CardContent></Card>;
}

function ReportTable({ title, columns, rows, kind }) {
  const grid = kind === "out" ? "38px minmax(0, 1fr) 1fr auto" : "38px minmax(0, 1.4fr) 1fr 1fr";
  return <Card sx={{ minWidth: 0, border: "1px solid", borderColor: "divider", borderRadius: 2, boxShadow: "0 2px 9px rgba(15,23,42,.05)" }}><CardContent sx={{ p: 1.75, "&:last-child": { pb: 1.75 } }}><Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.25 }}><Typography sx={{ fontSize: 17, fontWeight: 800 }}>{title}</Typography><Button size="small" sx={{ textTransform: "none", fontWeight: 700 }}>View All</Button></Box><Box sx={{ display: "grid", gridTemplateColumns: grid, alignItems: "center", columnGap: 1, px: 1.25, minHeight: 34, bgcolor: "#f7f9fc", borderRadius: 1 }}><Typography sx={tableHeaderSx}>{columns[0]}</Typography><Typography sx={tableHeaderSx}>{columns[1]}</Typography><Typography sx={tableHeaderSx}>{columns[2]}</Typography><Typography sx={{ ...tableHeaderSx, textAlign: "right" }}>{columns[3]}</Typography></Box>{rows.map((row, index) => <Box key={row[0]} sx={{ display: "grid", gridTemplateColumns: grid, alignItems: "center", columnGap: 1, px: 1.25, minHeight: 47, borderBottom: index === rows.length - 1 ? 0 : "1px solid", borderColor: "divider" }}><Typography color="text.secondary" sx={{ fontSize: 13, fontWeight: 700 }}>{index + 1}</Typography><Typography noWrap sx={{ fontSize: 13.5, fontWeight: 700 }}>{row[0]}</Typography><Typography color="text.secondary" sx={{ fontSize: 13, textAlign: kind === "top" ? "right" : "left" }}>{row[1]}</Typography>{kind === "out" ? <Chip label={row[2]} size="small" sx={{ height: 24, bgcolor: "#fff0f1", color: "error.main", fontSize: 11, fontWeight: 700 }} /> : <Typography color={kind === "low" ? "error.main" : "text.primary"} sx={{ fontSize: 13, fontWeight: 700, textAlign: "right" }}>{row[2]}</Typography>}</Box>)}</CardContent></Card>;
}

function InventoryStatusCard() {
  return <Card sx={{ mt: 2.25, border: "1px solid", borderColor: "divider", borderRadius: 2, boxShadow: "0 2px 9px rgba(15,23,42,.05)" }}><CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}><Typography sx={{ fontSize: 17, fontWeight: 800, mb: 2 }}>Inventory Summary by Status</Typography><Box sx={{ display: "grid", gridTemplateColumns: "290px minmax(0, 1fr)", alignItems: "center", gap: 3 }}><Box sx={{ display: "flex", alignItems: "center", gap: 2 }}><Box sx={{ position: "relative", width: 142, height: 142, flexShrink: 0, borderRadius: "50%", background: "conic-gradient(#50b982 0 90.2%, #f6b55c 90.2% 97.7%, #ef6767 97.7% 100%)", "&::after": { content: '""', position: "absolute", inset: 22, bgcolor: "background.paper", borderRadius: "50%" } }}><Box sx={{ position: "absolute", inset: 0, zIndex: 1, display: "grid", placeItems: "center", textAlign: "center" }}><Box><Typography sx={{ fontSize: 19, fontWeight: 800 }}>342</Typography><Typography color="text.secondary" sx={{ fontSize: 11 }}>Total Quantity</Typography></Box></Box></Box><Stack spacing={0.75}>{[["#50b982", "In Stock", "309 (90.2%)"], ["#f6b55c", "Low Stock", "26 (7.6%)"], ["#ef6767", "Out of Stock", "7 (2.1%)"]].map(([color, label, value]) => <Box key={label} sx={{ display: "grid", gridTemplateColumns: "10px auto", columnGap: .75, alignItems: "center" }}><Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: color }} /><Typography sx={{ fontSize: 12, fontWeight: 700 }}>{label}<Typography component="span" color="text.secondary" sx={{ ml: .5, fontSize: 12 }}>{value}</Typography></Typography></Box>)}</Stack></Box><Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.5, overflow: "hidden" }}><StatusRow status="In Stock" items="14" quantity="309" percentage="90.2%" /><StatusRow status="Low Stock" items="3" quantity="26" percentage="7.6%" /><StatusRow status="Out of Stock" items="1" quantity="7" percentage="2.1%" /><StatusRow status="Total" items="18" quantity="342" percentage="100%" last /></Box></Box></CardContent></Card>;
}

function StatusRow({ status, items, quantity, percentage, last }) { return <Box sx={{ display: "grid", gridTemplateColumns: "1.3fr repeat(3, 1fr)", px: 1.5, minHeight: 38, alignItems: "center", borderBottom: last ? 0 : "1px solid", borderColor: "divider", bgcolor: status === "Total" ? "#f8fafc" : "transparent" }}><Typography sx={{ fontSize: 12.5, fontWeight: status === "Total" ? 800 : 600 }}>{status}</Typography><Typography sx={{ fontSize: 12.5 }}>{items}</Typography><Typography sx={{ fontSize: 12.5 }}>{quantity}</Typography><Typography sx={{ fontSize: 12.5 }}>{percentage}</Typography></Box>; }

const toolbarButtonSx = { minHeight: 42, borderColor: "divider", color: "text.primary", borderRadius: 1.5, textTransform: "none", fontWeight: 600, whiteSpace: "nowrap" };
const tableHeaderSx = { color: "text.secondary", fontSize: 11, fontWeight: 800, textTransform: "uppercase" };
