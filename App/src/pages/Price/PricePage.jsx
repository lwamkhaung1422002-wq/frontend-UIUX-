import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Box, Button, Chip, Dialog, DialogContent, Divider, FormControl, FormControlLabel, IconButton, InputAdornment, InputLabel, MenuItem, Paper, Radio, RadioGroup, Select, Stack, TextField, Typography, useMediaQuery } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import SpaOutlinedIcon from "@mui/icons-material/SpaOutlined";
import LocalDrinkOutlinedIcon from "@mui/icons-material/LocalDrinkOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import { useCategoriesQuery, useProductsQuery, usePromotionCampaignsQuery } from "../../hooks/usePosQueries";
import { usePosApi } from "../../hooks/useApiResource";
import { useQueryClient } from "@tanstack/react-query";
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
  const [desktopDialog, setDesktopDialog] = useState("");
  const { data: productResult } = useProductsQuery({ status: "active", page: 1, pageSize: 100, sort: "name", direction: "asc" });
  const { data: categoryResult } = useCategoriesQuery();
  const { data: campaignResult } = usePromotionCampaignsQuery();
  const catalog = useMemo(() => (productResult?.products || []).map((product) => ({ ...product, code: product.sku || product.barcodes?.[0]?.value || "", cost: Number(product.cost || 0), price: Number(product.price || 0), start: product.createdAt, icon: "box", color: "#eaf3ff" })), [productResult]);
  const promotionRows = useMemo(() => (campaignResult?.campaigns || []).map((campaign) => { const sample = campaign.sampleProduct || {}; const first = campaign.promotions?.[0] || {}; return { id: campaign.id, name: campaign.name, code: sample.sku || "", cost: Number(sample.cost || 0), price: Number(sample.price || 0), promotion: true, start: first.startsAt, end: first.endsAt, reason: first.reason || "", icon: "box", color: "#e5f5e8" }; }), [campaignResult]);
  const sourceProducts = tab === "promotion" ? promotionRows : catalog;
  const visible = useMemo(() => sourceProducts.filter((product) => {
    const query = search.trim().toLowerCase();
    const today = new Date().toISOString().slice(0, 10);
    const productDate = product.start || "2026-08-15";
    return (!query || [product.name, product.code].some((value) => value.toLowerCase().includes(query)))
      && (tab === "price" || product.promotion)
      && (dateMode !== "today" || productDate === today)
      && (dateMode !== "custom" || ((!from || productDate >= from) && (!to || productDate <= to)));
  }), [dateMode, from, search, sourceProducts, tab, to]);
  const total = visible.reduce((sum, product) => sum + product.price, 0);

  if (!mobile) return <DesktopPricePromotion tab={tab} setTab={setTab} search={search} setSearch={setSearch} products={visible} catalog={catalog} categories={categoryResult?.categories || []} total={total} dateMode={dateMode} setDateMode={setDateMode} from={from} setFrom={setFrom} to={to} setTo={setTo} dialog={desktopDialog} setDialog={setDesktopDialog} />;
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

function DesktopPricePromotion({ tab, setTab, search, setSearch, products: visibleProducts, catalog, categories, total, dateMode, setDateMode, from, setFrom, to, setTo, dialog, setDialog }) {
  const tabLabel = tab === "price" ? "Products" : "Promotions";
  const closeDialog = () => setDialog("");
  return <Paper sx={desktopPricePageSx}>
    <Box sx={desktopPriceToolbarSx}>
      <TextField fullWidth value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product by name or code" slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ color: "text.secondary", fontSize: 22 }} /></InputAdornment> } }} sx={desktopPriceSearchSx} />
      <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setDialog("price")} sx={desktopAddPriceSx}>Add Price</Button>
      <Button variant="contained" color="success" startIcon={<AddRoundedIcon />} onClick={() => setDialog("promotion")} sx={desktopAddPriceSx}>Add Promotion</Button>
      <Button variant="outlined" startIcon={<CalendarMonthRoundedIcon />} onClick={() => setDialog("date")} sx={desktopDateFilterSx}>Date and time</Button>
    </Box>
    <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
      <DesktopPriceTab active={tab === "price"} label="Price" tone="primary.main" onClick={() => setTab("price")} />
      <DesktopPriceTab active={tab === "promotion"} label="Promotion" tone="#278a45" onClick={() => setTab("promotion")} />
      <Button variant="outlined" startIcon={<HistoryRoundedIcon />} onClick={() => setDialog("history")} sx={desktopHistoryTabSx}>History</Button>
    </Stack>
    <Box sx={desktopPriceSummarySx}>
      <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{visibleProducts.length} {tabLabel}</Typography>
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 1.5 }}><Typography color="text.secondary" sx={{ fontSize: 13 }}>Total Value</Typography><Typography sx={{ fontSize: 20, fontWeight: 700 }}>{money(total)}</Typography></Box>
    </Box>
    <Box sx={desktopProductGridSx}>{visibleProducts.map((product) => <DesktopProductCard key={product.id} product={product} promotion={tab === "promotion"} onEdit={() => setDialog(tab === "promotion" ? "promotion" : "price")} />)}</Box>
    {!visibleProducts.length && <Typography align="center" color="text.secondary" sx={{ py: 8 }}>No {tabLabel.toLowerCase()} found.</Typography>}
    <DesktopPriceDialog type={dialog} onClose={closeDialog} products={catalog} categories={categories} dateMode={dateMode} setDateMode={setDateMode} from={from} setFrom={setFrom} to={to} setTo={setTo} />
  </Paper>;
}

function DesktopPriceTab({ active, label, tone, onClick }) {
  return <Button variant="outlined" onClick={onClick} startIcon={<LocalOfferOutlinedIcon />} sx={{ minWidth: 148, minHeight: 42, borderRadius: 1.25, textTransform: "none", fontWeight: 700, borderColor: active ? tone : "divider", bgcolor: active ? "#f6faff" : "background.paper", color: tone, "&:hover": { borderColor: tone, bgcolor: active ? "#f1f7ff" : "action.hover" } }}>{label}</Button>;
}

function DesktopProductCard({ product, promotion, onEdit }) {
  return <Paper variant="outlined" sx={desktopProductCardSx}>
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 24 }}>
      <Chip label={promotion ? "Promotion" : "Price"} size="small" sx={{ height: 22, borderRadius: 1, bgcolor: promotion ? "#e5f5e8" : "#edf5ff", color: promotion ? "#278a45" : "primary.main", fontSize: 11, fontWeight: 700, "& .MuiChip-label": { px: .75 } }} />
      <IconButton aria-label={`Edit ${product.name}`} onClick={onEdit} size="small" sx={{ color: "text.secondary", mr: -0.75 }}><MoreVertRoundedIcon fontSize="small" /></IconButton>
    </Box>
    <ProductArtwork product={product} />
    <Typography noWrap align="center" sx={{ mt: .5, pb: 1, fontSize: 14, fontWeight: 700, borderBottom: "1px solid", borderColor: "divider" }}>{product.name}</Typography>
    <Box sx={{ display: "grid", gridTemplateColumns: promotion ? "minmax(0, .85fr) minmax(0, 1.15fr)" : "1fr 1fr", gap: 1.25, pt: 1.25 }}>
      <DesktopPriceMetric label="Cost Price" value={money(product.cost)} />
      {promotion ? <Box sx={{ minWidth: 0, display: "flex", alignItems: "end", justifyContent: "space-between", gap: .45 }}><DesktopPriceMetric label="Sell Price" value={money(product.price)} /><Chip label="Aug 01–15" size="small" sx={{ mb: .1, height: 22, maxWidth: 78, borderRadius: 1, bgcolor: "#e5f5e8", color: "#278a45", fontSize: 9.5, fontWeight: 700, "& .MuiChip-label": { px: .55 } }} /></Box> : <DesktopPriceMetric label="Sell Price" value={money(product.price)} />}
    </Box>
    <Typography noWrap color="text.secondary" sx={{ mt: 1.15, fontSize: 11.5 }}>{promotion ? "Name" : "Reason"}: {promotion ? "Anniversary" : product.reason}</Typography>
    <Button fullWidth variant="outlined" startIcon={<EditOutlinedIcon />} onClick={onEdit} sx={{ mt: 1.5, minHeight: 34, borderRadius: 1, textTransform: "none", fontWeight: 700, fontSize: 12 }}>Edit {promotion ? "Promotion" : "Price"}</Button>
  </Paper>;
}

function ProductArtwork({ product }) {
  const icon = product.icon === "water" || product.icon === "drink" ? <LocalDrinkOutlinedIcon /> : product.icon === "spa" || product.icon === "care" ? <SpaOutlinedIcon /> : <Inventory2OutlinedIcon />;
  return <Box sx={{ height: 92, mt: 1, display: "grid", placeItems: "center" }}><Box sx={{ width: 68, height: 76, display: "grid", placeItems: "center", borderRadius: 2.5, bgcolor: product.color, color: "primary.main", boxShadow: "inset 0 0 0 1px rgba(25,118,210,.08)", "& .MuiSvgIcon-root": { fontSize: 42 } }}>{icon}</Box></Box>;
}

function DesktopPriceMetric({ label, value }) { return <Box><Typography color="text.secondary" sx={{ fontSize: 11.5, lineHeight: 1.2 }}>{label}</Typography><Typography sx={{ mt: .3, fontSize: 14, lineHeight: 1.25, fontWeight: 700 }}>{value}</Typography></Box>; }

function DesktopPriceDialog({ type, onClose, products, categories, dateMode, setDateMode, from, setFrom, to, setTo }) {
  const isDate = type === "date";
  const isHistory = type === "history";
  const isPromotion = type === "promotion";
  const isPrice = type === "price";
  return <Dialog open={Boolean(type)} onClose={onClose} fullWidth maxWidth={isHistory ? "md" : "sm"} slotProps={{ paper: { sx: { borderRadius: 2.5, m: 2.5, maxHeight: "calc(100vh - 40px)" } } }}>
    {isDate && <DialogContent sx={desktopDialogContentSx}><Box sx={desktopDialogTitleSx}><Typography sx={{ fontSize: 20, fontWeight: 700 }}>Date and time</Typography><IconButton aria-label="Close date filter" onClick={onClose}><CloseRoundedIcon /></IconButton></Box><Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1.25 }}><DesktopDateChoice label="All" active={dateMode === "all"} onClick={() => setDateMode("all")} /><DesktopDateChoice label="Today" active={dateMode === "today"} onClick={() => setDateMode("today")} /><DesktopDateChoice label="Custom" active={dateMode === "custom"} onClick={() => setDateMode("custom")} /></Box>{dateMode === "custom" && <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5, mt: 2 }}><TextField label="From date" type="date" value={from} onChange={(event) => setFrom(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} /><TextField label="To date" type="date" value={to} onChange={(event) => setTo(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} /></Box>}<Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.25, mt: 3 }}><Button onClick={() => { setDateMode("all"); setFrom(""); setTo(""); }} sx={desktopTextButtonSx}>Reset</Button><Button variant="contained" onClick={onClose} sx={desktopModalButtonSx}>Apply</Button></Box></DialogContent>}
    {(isPrice || isPromotion) && <DesktopPriceForm products={products} categories={categories} promotion={isPromotion} onClose={onClose} />}
    {isHistory && <DesktopPriceHistory onClose={onClose} />}
  </Dialog>;
}

function DesktopDateChoice({ label, active, onClick }) { return <Button onClick={onClick} variant={active ? "contained" : "outlined"} sx={{ minHeight: 48, borderRadius: 1.5, textTransform: "none", fontWeight: 700 }}>{label}</Button>; }

function DesktopPriceForm({ products, categories, promotion, onClose }) {
  const api = usePosApi();
  const queryClient = useQueryClient();
  const [scope, setScope] = useState("all");
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [percentage, setPercentage] = useState("");
  const [manualPrice, setManualPrice] = useState("");
  const [reason, setReason] = useState("");
  const [promotionName, setPromotionName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);
  const selected = products.find((product) => product.id === selectedId);
  const results = products.filter((product) => !query || [product.name, product.code].some((value) => value.toLowerCase().includes(query.toLowerCase())));
  const updatePercentage = (value) => { setPercentage(value.replace(/[^0-9.]/g, "")); setManualPrice(""); };
  const updateManualPrice = (value) => { setManualPrice(value.replace(/[^0-9]/g, "")); setPercentage(""); };
  const calculated = selected && percentage ? Math.round((promotion ? selected.price * (1 - Number(percentage) / 100) : selected.cost * (1 + Number(percentage) / 100))) : "";
  const shownPrice = manualPrice || (calculated ? String(calculated) : "");
  const manualPercentage = selected && manualPrice ? (promotion ? ((selected.price - Number(manualPrice)) / selected.price) * 100 : ((Number(manualPrice) - selected.cost) / selected.cost) * 100) : null;
  const shownPercentage = manualPercentage !== null && Number.isFinite(manualPercentage) ? manualPercentage.toFixed(1) : percentage;
  const submit = async () => {
    if (!reason.trim() || (!promotion && !shownPrice && !percentage) || (promotion && (!promotionName.trim() || !start || !end || !percentage))) { setSubmitError("Complete the required fields before saving."); return; }
    if (scope === "individual" && !selectedId) { setSubmitError("Select a product."); return; }
    if (scope === "category" && !category) { setSubmitError("Select a category."); return; }
    setSaving(true); setSubmitError("");
    try {
      if (promotion) {
        await api.pricing.createPromotionCampaign({ name: promotionName.trim(), scope: scope === "individual" ? "PRODUCT" : scope.toUpperCase(), ...(scope === "individual" ? { productId: selectedId } : scope === "category" ? { categoryId: category } : {}), type: "PERCENTAGE", value: Number(percentage), startsAt: start, endsAt: end, state: "SCHEDULED", reason: reason.trim(), timeZone: "Asia/Yangon" });
      } else if (scope === "individual") {
        await api.pricing.createPrice({ productId: selectedId, unitPrice: Number(shownPrice), effectiveFrom: new Date().toISOString(), reason: reason.trim() });
      } else {
        await api.pricing.bulkPrices({ scope: scope.toUpperCase(), ...(scope === "category" ? { categoryId: category } : {}), marginPercent: Number(percentage), reason: reason.trim() });
      }
      await queryClient.invalidateQueries(); onClose();
    } catch (error) { setSubmitError(error.message || "Unable to save pricing."); } finally { setSaving(false); }
  };
  return <DialogContent sx={desktopDialogContentSx}>
    <Box sx={desktopDialogTitleSx}><Box><Typography sx={{ fontSize: 20, fontWeight: 700 }}>{promotion ? "Add Promotion" : "Add Price"}</Typography><Typography color="text.secondary" sx={{ mt: .35, fontSize: 13 }}>{promotion ? "Set a discount price and promotion period." : "Set a selling price and margin."}</Typography></Box><IconButton aria-label="Close dialog" onClick={onClose}><CloseRoundedIcon /></IconButton></Box>
    <Typography sx={{ fontSize: 15, fontWeight: 700, mb: 1 }}>Apply {promotion ? "promotion" : "price"} to</Typography>
    <Paper variant="outlined" sx={{ p: .75, borderRadius: 1.75 }}><RadioGroup row value={scope} onChange={(event) => { setScope(event.target.value); if (event.target.value !== "individual") setSelectedId(""); }} sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}><DesktopScope value="individual" label="Individual" /><DesktopScope value="category" label="Category" /><DesktopScope value="all" label="All" /></RadioGroup></Paper>
    {scope === "category" && <FormControl fullWidth sx={{ mt: 2 }}><InputLabel>Select category</InputLabel><Select label="Select category" value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}</Select></FormControl>}
    {scope === "individual" && <><TextField fullWidth value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search product by name or barcode" slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon color="action" /></InputAdornment> } }} sx={{ mt: 2 }} /><Paper variant="outlined" sx={{ mt: 1, borderRadius: 1.5, overflow: "hidden", maxHeight: 170, overflowY: "auto" }}>{results.map((product, index) => <Box key={product.id} onClick={() => setSelectedId(product.id)} sx={{ px: 1.75, py: 1.2, cursor: "pointer", bgcolor: selectedId === product.id ? "#eaf3ff" : "background.paper" }}><Typography sx={{ fontSize: 14, fontWeight: 700 }}>{product.name} <Box component="span" sx={{ color: "text.secondary", fontWeight: 400 }}>· {product.code}</Box></Typography>{index < results.length - 1 && <Divider sx={{ mt: 1.15 }} />}</Box>)}</Paper></>}
    {promotion && <><TextField fullWidth label="Promotion name" value={promotionName} onChange={(event) => setPromotionName(event.target.value)} placeholder="e.g. August discount" sx={{ mt: 2 }} /><Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5, mt: 1.5 }}><TextField label="Start date" type="date" value={start} onChange={(event) => setStart(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} /><TextField label="End date" type="date" value={end} onChange={(event) => setEnd(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} /></Box></>}
    {selected && <Paper variant="outlined" sx={{ mt: 2, p: 1.5, borderRadius: 1.5 }}><Typography sx={{ fontSize: 15, fontWeight: 700 }}>{selected.name}</Typography><Box sx={{ display: "grid", gridTemplateColumns: "1fr 1px 1fr", columnGap: 1.5, mt: 1.25 }}><DesktopPriceMetric label={promotion ? "Current Sell Price" : "Cost Price"} value={money(promotion ? selected.price : selected.cost)} /><Box sx={{ bgcolor: "divider" }} /><DesktopPriceMetric label={promotion ? "Promotion Price" : "Current Sell Price"} value={shownPrice ? money(Number(shownPrice)) : money(selected.price)} /></Box></Paper>}
    {scope === "individual" ? <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5, mt: 2 }}><TextField label={promotion ? "Discount percentage" : "Margin percentage"} value={shownPercentage} onChange={(event) => updatePercentage(event.target.value)} placeholder={promotion ? "e.g. 10" : "e.g. 15"} inputMode="decimal" /><TextField label={promotion ? "Manual promotion price" : "New sell price"} value={shownPrice} onChange={(event) => updateManualPrice(event.target.value)} inputMode="numeric" /></Box> : <TextField fullWidth label={promotion ? "Discount percentage" : "Margin percentage"} value={percentage} onChange={(event) => updatePercentage(event.target.value)} placeholder={promotion ? "e.g. 10" : "e.g. 15"} inputMode="decimal" sx={{ mt: 2 }} />}
    <TextField fullWidth label="Reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder={promotion ? "Why is this promotion being created?" : "Why is this price being changed?"} multiline minRows={2} sx={{ mt: 1.5 }} />
    {submitError && <Typography color="error" sx={{ mt: 1.5 }}>{submitError}</Typography>}<Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.25, mt: 2.5 }}><Button onClick={onClose} variant="outlined" sx={desktopCancelButtonSx}>Cancel</Button><Button onClick={submit} disabled={saving} variant="contained" startIcon={<CheckRoundedIcon />} sx={desktopModalButtonSx}>{saving ? "Saving…" : promotion ? "Create Promotion" : "Apply Price"}</Button></Box>
  </DialogContent>;
}

function DesktopScope({ value, label }) { return <FormControlLabel value={value} control={<Radio size="small" />} label={label} sx={{ m: 0, justifyContent: "center", "& .MuiFormControlLabel-label": { fontSize: 13, fontWeight: 700 } }} />; }

function DesktopPriceHistory({ onClose }) {
  const records = [{ type: "Price", name: "Nivea Roll On", old: 6000, next: 6500, date: "11/08/2026", time: "11:20 PM", reason: "Market price increased" }, { type: "Promotion", name: "Jasmine Perfume", action: "Promotion set: 10% off", period: "01/08/2026 — 31/08/2026", date: "10/08/2026", time: "03:15 PM" }, { type: "Promotion", name: "Coca-Cola 330ml", action: "Promotion edited: 15% off", date: "09/08/2026", time: "09:45 AM" }];
  return <DialogContent sx={{ ...desktopDialogContentSx, maxHeight: "78vh" }}><Box sx={desktopDialogTitleSx}><Typography sx={{ fontSize: 20, fontWeight: 700 }}>Price History</Typography><IconButton aria-label="Close price history" onClick={onClose}><CloseRoundedIcon /></IconButton></Box><Stack spacing={1}>{records.map((record) => <Paper key={record.name} variant="outlined" sx={{ px: 1.5, py: 1.2, borderRadius: 1.5 }}><Box sx={{ display: "grid", gridTemplateColumns: "minmax(150px, .82fr) minmax(230px, 1.4fr) 138px", gap: 2, alignItems: "center" }}><Box sx={{ minWidth: 0 }}><Chip label={record.type} size="small" sx={{ height: 22, bgcolor: record.type === "Price" ? "#2459d6" : "#168437", color: "common.white", fontWeight: 700, mb: .55 }} /><Typography noWrap sx={{ fontSize: 15, fontWeight: 700 }}>{record.name}</Typography></Box><Box sx={{ minWidth: 0 }}>{record.type === "Price" ? <><Typography noWrap sx={{ fontSize: 14, fontWeight: 700 }}>{money(record.old)} → {money(record.next)}</Typography><Typography noWrap color="text.secondary" sx={{ mt: .3, fontSize: 12.5 }}>Reason: {record.reason}</Typography></> : <><Typography noWrap sx={{ fontSize: 14, fontWeight: 700, color: "#278a45" }}>{record.action}</Typography><Typography noWrap color="text.secondary" sx={{ mt: .3, fontSize: 12.5 }}>{record.period || "Name: Anniversary"}</Typography></>}</Box><Stack spacing={.35} sx={{ color: "text.secondary", justifySelf: "end", textAlign: "right" }}><Typography sx={{ fontSize: 12.5 }}>{record.date}</Typography><Typography sx={{ fontSize: 12.5 }}>{record.time}</Typography></Stack></Box></Paper>)}</Stack></DialogContent>;
}

const barSx = { height: 68, px: 1.5, bgcolor: "primary.main", color: "common.white", display: "grid", gridTemplateColumns: "48px minmax(0, 1fr) 48px", alignItems: "center" }; const barIconSx = { width: 48, height: 48, color: "inherit" }; const searchSx = { "& .MuiOutlinedInput-root": { minHeight: 56, px: 1.5, borderRadius: 1.5, bgcolor: "#f7f8fa", fontSize: 16, "& fieldset": { borderColor: "#e3e6ea" } } }; const footerSx = { position: "fixed", left: 0, right: 0, bottom: 0, px: 2.5, py: 2, bgcolor: "background.paper", borderTop: "1px solid", borderColor: "divider", zIndex: 10 }; const footerPrimarySx = { minHeight: 58, borderRadius: 1.5, fontSize: 17, fontWeight: 700, textTransform: "none" }; const footerSecondarySx = { minHeight: 58, borderRadius: 1.5, borderColor: "divider", color: "primary.main", fontSize: 17, fontWeight: 700, textTransform: "none" };

const desktopPricePageSx = { maxWidth: 1600, mx: "auto", p: 2.25, borderRadius: 2.25, border: "1px solid", borderColor: "divider", boxShadow: "0 2px 10px rgba(15,23,42,.05)", bgcolor: "background.paper" };
const desktopPriceToolbarSx = { display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto auto auto", gap: 1.25, alignItems: "center" };
const desktopPriceSearchSx = { "& .MuiOutlinedInput-root": { minHeight: 44, borderRadius: 1.25, bgcolor: "background.paper" } };
const desktopAddPriceSx = { minHeight: 44, px: 2.25, borderRadius: 1.25, textTransform: "none", fontWeight: 700, whiteSpace: "nowrap" };
const desktopDateFilterSx = { minHeight: 44, px: 1.75, borderRadius: 1.25, textTransform: "none", fontWeight: 700, whiteSpace: "nowrap", color: "text.primary", borderColor: "divider" };
const desktopHistoryTabSx = { minHeight: 42, minWidth: 126, borderRadius: 1.25, textTransform: "none", fontWeight: 700, borderColor: "divider", color: "text.primary" };
const desktopPriceSummarySx = { display: "flex", alignItems: "center", justifyContent: "space-between", mt: 2.25, pb: 1.75, borderBottom: "1px solid", borderColor: "divider" };
const desktopProductGridSx = { display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 1.75, pt: 1.75, "@media (max-width: 1200px)": { gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }, "@media (max-width: 1000px)": { gridTemplateColumns: "repeat(3, minmax(0, 1fr))" } };
const desktopProductCardSx = { minWidth: 0, p: 1.5, borderRadius: 1.5, borderColor: "divider", boxShadow: "0 2px 7px rgba(15,23,42,.05)", bgcolor: "background.paper" };
const desktopDialogContentSx = { p: 2.5, "&:last-child": { pb: 2.5 } };
const desktopDialogTitleSx = { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2, mb: 2.25 };
const desktopTextButtonSx = { minHeight: 40, textTransform: "none", fontWeight: 700 };
const desktopModalButtonSx = { minHeight: 42, px: 2.25, borderRadius: 1.25, textTransform: "none", fontWeight: 700 };
const desktopCancelButtonSx = { minHeight: 42, px: 2.25, borderRadius: 1.25, textTransform: "none", fontWeight: 700, borderColor: "divider", color: "text.secondary" };
