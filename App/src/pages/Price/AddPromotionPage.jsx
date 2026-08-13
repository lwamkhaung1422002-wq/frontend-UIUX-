import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { AppBar, Box, Button, Divider, FormControl, FormControlLabel, IconButton, InputAdornment, InputLabel, MenuItem, Paper, Radio, RadioGroup, Select, TextField, Toolbar, Typography } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import QrCodeScannerRoundedIcon from "@mui/icons-material/QrCodeScannerRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";

const products = [
  { id: "jasmine", name: "Jasmine Perfume", description: "Long-lasting floral fragrance", category: "Beauty", price: 3500 },
  { id: "nivea", name: "Nivea Roll On", description: "48-hour deodorant protection", category: "Beauty", price: 6500 },
  { id: "coke", name: "Coca-Cola 330ml", description: "Carbonated soft drink", category: "Drinks", price: 1000 },
];
const money = (value) => `${new Intl.NumberFormat("en-US").format(value)} ကျပ်`;

export default function AddPromotionPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editing = Boolean(params.get("edit"));
  const [scope, setScope] = useState(editing ? "individual" : "all");
  const [category, setCategory] = useState("Beauty");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(editing ? params.get("edit") : "");
  const [form, setForm] = useState({ name: "", start: "", end: "", percentage: "", manualPrice: "", reason: "" });
  const selected = products.find((product) => product.id === selectedId);
  const results = useMemo(() => products.filter((product) => !search || [product.name, product.description, product.category].some((value) => value.toLowerCase().includes(search.toLowerCase()))), [search]);
  const calculatedPrice = selected && form.percentage !== "" ? Math.round(selected.price * (1 - Number(form.percentage) / 100)) : "";
  const shownPrice = form.manualPrice || (calculatedPrice ? String(calculatedPrice) : "");
  const shownPercentage = selected && form.manualPrice ? ((selected.price - Number(form.manualPrice)) / selected.price * 100).toFixed(1) : form.percentage;
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const setPercentage = (value) => setForm((current) => ({ ...current, percentage: value.replace(/[^0-9.]/g, ""), manualPrice: "" }));
  const setManualPrice = (value) => setForm((current) => ({ ...current, manualPrice: value.replace(/[^0-9]/g, ""), percentage: "" }));
  const changeScope = (value) => { setScope(value); if (value !== "individual") setSelectedId(""); };

  return <Box sx={{ minHeight: "100dvh", pb: 12, bgcolor: "#f8fafc", fontFamily: "Inter, Roboto, 'Noto Sans Myanmar', sans-serif" }}>
    <AppBar position="sticky" elevation={0} sx={{ bgcolor: "primary.main" }}><Toolbar sx={{ minHeight: 64, display: "grid", gridTemplateColumns: "1fr auto 1fr" }}><IconButton aria-label="Back to price and promotion" onClick={() => navigate("/price")} sx={{ color: "common.white", justifySelf: "start" }}><ArrowBackRoundedIcon /></IconButton><Typography fontWeight={700}>{editing ? "Edit Promotion" : "Add Promotion"}</Typography><Box /></Toolbar></AppBar>
    <Box sx={{ p: 2.5, maxWidth: 620, mx: "auto" }}>
      <Typography sx={{ fontSize: 18, fontWeight: 700, mb: 1 }}>Apply promotion to</Typography>
      <Paper elevation={0} sx={scopePaperSx}><RadioGroup row value={scope} onChange={(event) => changeScope(event.target.value)} sx={scopeGroupSx}><FormControlLabel value="individual" control={<Radio />} label="Individual" sx={scopeOptionSx} /><FormControlLabel value="category" control={<Radio />} label="Category" sx={scopeOptionSx} /><FormControlLabel value="all" control={<Radio />} label="All" sx={scopeOptionSx} /></RadioGroup></Paper>
      {scope === "category" && <FormControl fullWidth sx={{ mt: 2 }}><InputLabel>Select category</InputLabel><Select label="Select category" value={category} onChange={(event) => setCategory(event.target.value)}><MenuItem value="Beauty">Beauty</MenuItem><MenuItem value="Drinks">Drinks</MenuItem></Select></FormControl>}
      {scope === "individual" && <><TextField fullWidth value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product by name or barcode" slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon color="action" /></InputAdornment>, endAdornment: <InputAdornment position="end"><IconButton aria-label="Scan barcode"><QrCodeScannerRoundedIcon /></IconButton></InputAdornment> } }} sx={searchSx} /><Paper elevation={1} sx={{ mt: 1.25, overflow: "hidden", borderRadius: 2 }}>{results.map((product, index) => <Box key={product.id} role="button" tabIndex={0} onClick={() => setSelectedId(product.id)} onKeyDown={(event) => event.key === "Enter" && setSelectedId(product.id)} sx={{ px: 2, py: 1.5, cursor: "pointer", bgcolor: selectedId === product.id ? "#eaf3ff" : "background.paper", "&:hover": { bgcolor: "action.hover" } }}><Typography noWrap sx={{ fontSize: 15, fontWeight: 600 }}>{product.name} <Box component="span" sx={{ color: "text.secondary", fontSize: 13, fontWeight: 400 }}>· {product.description} · {product.category}</Box></Typography>{index < results.length - 1 && <Divider sx={{ mt: 1.5 }} />}</Box>)}</Paper></>}
      <TextField fullWidth label="Promotion name" value={form.name} onChange={update("name")} placeholder="e.g. August discount" sx={{ mt: 2.5 }} />
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5, mt: 2 }}><TextField label="Start date" type="date" value={form.start} onChange={update("start")} slotProps={{ inputLabel: { shrink: true } }} /><TextField label="End date" type="date" value={form.end} onChange={update("end")} slotProps={{ inputLabel: { shrink: true } }} /></Box>
      {scope === "individual" && selected ? <IndividualDiscount product={selected} percentage={shownPercentage} promotionPrice={shownPrice} onPercentage={setPercentage} onManualPrice={setManualPrice} /> : <Paper elevation={1} sx={{ mt: 2.5, p: 2, borderRadius: 2 }}><Typography sx={{ fontSize: 16, fontWeight: 700 }}>Discount</Typography><Typography color="text.secondary" sx={{ mt: 0.5, fontSize: 13 }}>Set one percentage for {scope === "all" ? "all products" : `the ${category} category`}.</Typography><TextField fullWidth label="Discount percentage" value={form.percentage} onChange={(event) => setPercentage(event.target.value)} placeholder="e.g. 10" inputMode="decimal" sx={{ mt: 2 }} /></Paper>}
      <TextField fullWidth label="Reason" value={form.reason} onChange={update("reason")} placeholder="Why is this promotion being created?" multiline minRows={3} sx={{ mt: 2 }} />
    </Box>
    <Paper elevation={5} sx={footerSx}><Box sx={{ display: "grid", gridTemplateColumns: "0.85fr 1.4fr", gap: 1.5 }}><Button variant="outlined" onClick={() => navigate("/price")} sx={cancelSx}>Cancel</Button><Button variant="contained" startIcon={<CheckRoundedIcon />} onClick={() => navigate("/price")} sx={saveSx}>{editing ? "Save Promotion" : "Create Promotion"}</Button></Box></Paper>
  </Box>;
}

function IndividualDiscount({ product, percentage, promotionPrice, onPercentage, onManualPrice }) { return <Paper elevation={1} sx={{ mt: 2.5, p: 2, borderRadius: 2 }}><Typography sx={{ fontSize: 17, fontWeight: 700 }}>{product.name}</Typography><Box sx={{ display: "grid", gridTemplateColumns: "1fr 1px 1fr", columnGap: 1.5, mt: 2 }}><Info label="Current Sell Price" value={money(product.price)} /><Box sx={{ bgcolor: "divider" }} /><Info label="Promotion Price" value={promotionPrice ? money(promotionPrice) : "Not set"} /></Box><TextField fullWidth label="Discount percentage" value={percentage} onChange={(event) => onPercentage(event.target.value)} placeholder="e.g. 10" inputMode="decimal" sx={{ mt: 2.25 }} /><TextField fullWidth label="Manual promotion price" value={promotionPrice} onChange={(event) => onManualPrice(event.target.value)} placeholder="Enter promotion price" inputMode="numeric" sx={{ mt: 1.5 }} /></Paper>; }
function Info({ label, value }) { return <Box><Typography color="text.secondary" sx={{ fontSize: 13 }}>{label}</Typography><Typography sx={{ mt: 0.5, fontWeight: 700 }}>{value}</Typography></Box>; }
const scopePaperSx = { px: 0.75, py: 0.75, border: "1px solid", borderColor: "divider", borderRadius: 2, bgcolor: "background.paper" };
const scopeGroupSx = { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", alignItems: "center" };
const scopeOptionSx = { m: 0, minWidth: 0, minHeight: 62, justifyContent: "center", flexDirection: "column", gap: 0.15, "& .MuiRadio-root": { p: 0.35 }, "& .MuiFormControlLabel-label": { fontSize: { xs: 12.5, sm: 14 }, fontWeight: 600, lineHeight: 1.1, whiteSpace: "nowrap" } };
const searchSx = { mt: 2, "& .MuiOutlinedInput-root": { minHeight: 56, borderRadius: 1.5, bgcolor: "background.paper" } };
const footerSx = { position: "fixed", bottom: 0, left: 0, right: 0, p: 2.5, bgcolor: "background.paper" };
const cancelSx = { minHeight: 56, borderRadius: 1.5, borderColor: "divider", color: "text.secondary", fontWeight: 700, textTransform: "none" };
const saveSx = { minHeight: 56, borderRadius: 1.5, fontWeight: 700, textTransform: "none" };
