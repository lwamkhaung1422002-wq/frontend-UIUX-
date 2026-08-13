import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Box, Button, Chip, Dialog, DialogContent, IconButton, InputAdornment, Paper, Stack, TextField, Typography, useMediaQuery } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { DesktopPlaceholder } from "../../components/Desktop/DesktopUI";

const products = [
  { id: "jasmine", name: "Jasmine Perfume", code: "JAS-001", cost: 2900, price: 3500, promotion: true, start: "2026-08-01", end: "2026-08-31" },
  { id: "nivea", name: "Nivea Roll On", code: "NIV-002", cost: 5800, price: 6500, promotion: false },
  { id: "coke", name: "Coca-Cola 330ml", code: "COC-003", cost: 800, price: 1000, promotion: true, start: "2026-08-01", end: "2026-08-15" },
];
const money = (value) => `${new Intl.NumberFormat("en-US").format(value)} ကျပ်`;

export default function PricePage() {
  const mobile = useMediaQuery("(max-width:768px)");
  const navigate = useNavigate();
  const [tab, setTab] = useState("price");
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [dateMode, setDateMode] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const visible = useMemo(() => products.filter((product) => {
    const query = search.trim().toLowerCase();
    const today = new Date().toISOString().slice(0, 10);
    return (!query || [product.name, product.code].some((value) => value.toLowerCase().includes(query)))
      && (tab === "price" || product.promotion)
      && (dateMode !== "today" || product.start === today)
      && (dateMode !== "custom" || ((!from || product.start >= from) && (!to || product.start <= to)));
  }), [dateMode, from, search, tab, to]);
  const total = visible.reduce((sum, product) => sum + product.price, 0);

  if (!mobile) return <DesktopPlaceholder title="Price & Promotion" description="Manage selling prices, margins, and time-bound product promotions." primaryLabel="Add Price" onPrimary={() => navigate("/price/add")}><Typography color="text.secondary">Use the mobile workspace to manage individual prices and promotions.</Typography></DesktopPlaceholder>;
  return <Box sx={{ minHeight: "100dvh", pb: "104px", bgcolor: "#fff", fontFamily: "Inter, Roboto, 'Noto Sans Myanmar', sans-serif" }}>
    <Box sx={barSx}><IconButton aria-label="Back to settings" onClick={() => navigate("/settings")} sx={barIconSx}><ArrowBackRoundedIcon sx={{ fontSize: 32 }} /></IconButton><Typography align="center" sx={{ fontSize: 22, fontWeight: 700 }}>Price &amp; Promotion</Typography><IconButton aria-label="Filter prices and promotions" onClick={() => setFilterOpen(true)} sx={barIconSx}><FilterAltOutlinedIcon sx={{ fontSize: 30 }} /></IconButton></Box>
    <Box sx={{ px: 2.5, pt: 2 }}>
      <TextField fullWidth value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product by name or code" slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ color: "text.secondary", fontSize: 29 }} /></InputAdornment> } }} sx={searchSx} />
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.25, mt: 1.5 }}><TabButton label="Price" active={tab === "price"} onClick={() => setTab("price")} tone="primary.main" /><TabButton label="Promotion" active={tab === "promotion"} onClick={() => setTab("promotion")} tone="success.main" /></Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 2.25, mb: 1.75 }}><Typography sx={{ fontSize: 16, fontWeight: 500 }}>{visible.length} {tab === "price" ? "Products" : "Promotions"}</Typography><Typography sx={{ fontSize: 16, fontWeight: 700 }}>{money(total)}</Typography></Box>
      <Stack spacing={1.75}>{visible.map((product) => <ProductCard key={product.id} product={product} promotion={tab === "promotion"} onEdit={() => navigate(tab === "price" ? `/price/add?edit=${product.id}` : `/price/promotion/add?edit=${product.id}`)} />)}</Stack>
    </Box>
    <Paper elevation={5} sx={footerSx}><Box sx={{ display: "grid", gridTemplateColumns: "1.65fr 0.9fr", gap: 1.5 }}><Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => navigate(tab === "price" ? "/price/add" : "/price/promotion/add")} sx={footerPrimarySx}>{tab === "price" ? "Add Price" : "Add Promotion"}</Button><Button variant="outlined" startIcon={<HistoryRoundedIcon />} onClick={() => navigate("/price/history")} sx={footerSecondarySx}>History</Button></Box></Paper>
    <Dialog open={filterOpen} onClose={() => setFilterOpen(false)} fullWidth slotProps={{ paper: { sx: { m: 2.5, borderRadius: 2.5, maxWidth: 420 } } }}><DialogContent sx={{ p: 2.5 }}><Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2.5 }}><Typography sx={{ fontSize: 20, fontWeight: 600 }}>Filter {tab === "price" ? "prices" : "promotions"}</Typography><IconButton onClick={() => setFilterOpen(false)}><CloseRoundedIcon /></IconButton></Box><Typography sx={{ fontSize: 14, fontWeight: 600, color: "text.secondary" }}>Date</Typography><Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, mt: 1 }}>{[["all", "All"], ["today", "Today"], ["custom", "Custom"]].map(([value, label]) => <Button key={value} variant={dateMode === value ? "contained" : "outlined"} onClick={() => setDateMode(value)} sx={{ minHeight: 48, borderRadius: 1.5, textTransform: "none" }}>{label}</Button>)}</Box>{dateMode === "custom" && <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5, mt: 1.75 }}><TextField label="From" type="date" value={from} onChange={(event) => setFrom(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} /><TextField label="To" type="date" value={to} onChange={(event) => setTo(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} /></Box>}<Button fullWidth variant="contained" onClick={() => setFilterOpen(false)} sx={{ mt: 2.5, minHeight: 54, borderRadius: 1.5, fontSize: 16, fontWeight: 600, textTransform: "none" }}>Apply filters</Button></DialogContent></Dialog>
  </Box>;
}

function TabButton({ label, active, onClick, tone }) { return <Button onClick={onClick} startIcon={<LocalOfferOutlinedIcon />} sx={{ minHeight: 54, borderRadius: 1.25, border: "1px solid", borderColor: active ? tone : "#dfe3e8", bgcolor: active ? "#eaf3ff" : "background.paper", color: tone, fontSize: 16, fontWeight: 700, textTransform: "none" }}>{label}</Button>; }
function ProductCard({ product, promotion, onEdit }) {
  const period = product.start ? `${new Date(`${product.start}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}–${new Date(`${product.end}T00:00:00`).toLocaleDateString("en-US", { day: "numeric" })}` : "";
  return <Paper elevation={2} sx={{ p: { xs: 1.75, sm: 2.25 }, borderRadius: 1.75, boxShadow: "0 2px 8px rgba(15,23,42,0.12)" }}>
    <Box sx={{ display: "grid", gridTemplateColumns: promotion ? "auto minmax(0, 1fr) auto auto" : "auto minmax(0, 1fr) auto", gap: { xs: 0.65, sm: 1 }, alignItems: "center" }}>
      <Chip label={promotion ? "Promotion" : "Price"} size="small" sx={{ height: 28, bgcolor: promotion ? "#e3f5e6" : "#eaf3ff", color: promotion ? "#168437" : "primary.main", borderRadius: 1, fontSize: 12, fontWeight: 600, "& .MuiChip-label": { px: 0.8 } }} />
      <Typography noWrap sx={{ minWidth: 0, fontSize: { xs: 16, sm: 17 }, fontWeight: 600 }}>{product.name}</Typography>
      {promotion && <Chip label={period} size="small" sx={{ maxWidth: { xs: 72, sm: 120 }, height: 26, borderRadius: 99, bgcolor: "#e3f5e6", color: "#168437", fontSize: 10, fontWeight: 700, "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis", px: 0.8 } }} />}
      <Button variant="outlined" startIcon={<EditOutlinedIcon />} onClick={onEdit} sx={{ minHeight: 42, px: { xs: 0.8, sm: 1.25 }, borderRadius: 1, fontSize: 13, fontWeight: 600, textTransform: "none", whiteSpace: "nowrap", "& .MuiButton-startIcon": { mr: { xs: 0.35, sm: 0.7 } } }}>{promotion ? "Edit" : "Edit Price"}</Button>
    </Box>
    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1px 1fr", columnGap: 1.5, mt: 2 }}><Metric label="Cost Price" value={money(product.cost)} /><Box sx={{ bgcolor: "#d9dee5" }} /><Metric label="Sell Price" value={money(product.price)} /></Box>
  </Paper>;
}
function Metric({ label, value }) { return <Box><Typography color="text.secondary" sx={{ fontSize: 13 }}>{label}</Typography><Typography sx={{ mt: 0.5, fontSize: 17, fontWeight: 600 }}>{value}</Typography></Box>; }
const barSx = { height: 68, px: 1.5, bgcolor: "primary.main", color: "common.white", display: "grid", gridTemplateColumns: "48px minmax(0, 1fr) 48px", alignItems: "center" }; const barIconSx = { width: 48, height: 48, color: "inherit" }; const searchSx = { "& .MuiOutlinedInput-root": { minHeight: 56, px: 1.5, borderRadius: 1.5, bgcolor: "#f7f8fa", fontSize: 16, "& fieldset": { borderColor: "#e3e6ea" } } }; const footerSx = { position: "fixed", left: 0, right: 0, bottom: 0, px: 2.5, py: 2, bgcolor: "background.paper", borderTop: "1px solid", borderColor: "divider", zIndex: 10 }; const footerPrimarySx = { minHeight: 58, borderRadius: 1.5, fontSize: 17, fontWeight: 700, textTransform: "none" }; const footerSecondarySx = { minHeight: 58, borderRadius: 1.5, borderColor: "divider", color: "primary.main", fontSize: 17, fontWeight: 700, textTransform: "none" };
