import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  AppBar,
  Autocomplete,
  Box,
  Button,
  Fab,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import AddCircleOutlineRoundedIcon from "@mui/icons-material/AddCircleOutlineRounded";
import CurrencyExchangeRoundedIcon from "@mui/icons-material/CurrencyExchangeRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import NotesRoundedIcon from "@mui/icons-material/NotesRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import QrCodeScannerRoundedIcon from "@mui/icons-material/QrCodeScannerRounded";
import RemoveCircleOutlineRoundedIcon from "@mui/icons-material/RemoveCircleOutlineRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import WaterDropRoundedIcon from "@mui/icons-material/WaterDropRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

const products = [
  { id: "water", name: "Water", sku: "N/A", barcode: "8886474921025", stock: 2100, cost: 500, icon: <WaterDropRoundedIcon />, color: "#38a5dd" },
  { id: "air-x", name: "Air X", sku: "AIR-X-001", barcode: "8886474921026", stock: 98, cost: 800, icon: <Inventory2RoundedIcon />, color: "#707070" },
];

const money = (amount) => `${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2 }).format(amount)} ကျပ်`;
const fieldSx = {
  mb: 2,
  "& .MuiOutlinedInput-root": { minHeight: 56, borderRadius: 1.5, bgcolor: "action.hover", "& fieldset": { border: 0 } },
  "& .MuiInputBase-input": { fontSize: 16 },
  "& input[type=number]": { MozAppearance: "textfield" },
  "& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button": { WebkitAppearance: "none", margin: 0 },
  "& .MuiInputLabel-root": { fontSize: 14, fontWeight: 500 },
};

export default function AddStockMovementPage() {
  const navigate = useNavigate();
  const [movementType, setMovementType] = useState("in");
  const [adjustmentType, setAdjustmentType] = useState("increase");
  const [query, setQuery] = useState("");
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState("");
  const [cost, setCost] = useState("");
  const [supplier, setSupplier] = useState(null);
  const [notes, setNotes] = useState("");
  const [adjustedBy, setAdjustedBy] = useState("");
  const [errors, setErrors] = useState({});

  const filteredProducts = useMemo(() => products.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()) || item.sku.toLowerCase().includes(query.toLowerCase()) || item.barcode.includes(query)), [query]);
  const selectProduct = (nextProduct) => {
    setProduct(nextProduct);
    setQuery(nextProduct?.name ?? "");
    setCost(nextProduct ? String(nextProduct.cost) : "");
    setErrors((current) => ({ ...current, product: false, cost: false }));
  };
  const scanBarcode = () => selectProduct(products[0]);
  const saveMovement = () => {
    const nextErrors = {
      product: !product,
      quantity: !quantity || Number(quantity) <= 0,
      cost: movementType === "in" && (!cost || Number(cost) < 0),
      notes: !notes.trim(),
      adjustedBy: movementType === "adjustment" && !adjustedBy.trim(),
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;
    navigate("/stock/history");
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pb: "128px", fontFamily: "Inter, Roboto, Noto Sans Myanmar, sans-serif" }}>
      <AppBar position="sticky" elevation={0} sx={{ bgcolor: "primary.main" }}>
        <Toolbar sx={{ minHeight: 64, display: "grid", gridTemplateColumns: "1fr auto 1fr" }}>
          <IconButton aria-label="Back to stock history" onClick={() => navigate("/stock/history")} sx={{ justifySelf: "start", color: "common.white" }}><ArrowBackRoundedIcon /></IconButton>
          <Typography sx={{ fontSize: 20, fontWeight: 600 }}>Add Stock Movement</Typography>
          <Box />
        </Toolbar>
      </AppBar>

      <Box sx={{ width: "100%", maxWidth: 520, mx: "auto", px: 2.5, pt: 3 }}>
        <Typography sx={sectionLabelSx}>SELECT PRODUCT</Typography>
        <Autocomplete
            freeSolo
            options={filteredProducts}
            getOptionLabel={(option) => typeof option === "string" ? option : option.name}
            inputValue={query}
            onInputChange={(_, value) => { setQuery(value); if (!value) setProduct(null); }}
            onChange={(_, value) => selectProduct(typeof value === "string" ? products.find((item) => item.name === value) ?? null : value)}
            renderInput={(params) => <TextField {...params} placeholder="Search product" error={Boolean(errors.product)} helperText={errors.product ? "Select a product" : ""} slotProps={{ input: { ...params.slotProps?.input, startAdornment: <InputAdornment position="start"><SearchRoundedIcon color="action" /></InputAdornment>, endAdornment: product ? <InputAdornment position="end"><IconButton aria-label="Clear selected product" onClick={() => selectProduct(null)}><CloseRoundedIcon /></IconButton></InputAdornment> : params.slotProps?.input?.endAdornment } }} sx={{ ...fieldSx, mb: 0 }} />}
          />

        {product && <SelectedProduct product={product} onClear={() => selectProduct(null)} />}

        <Typography sx={{ ...sectionLabelSx, mt: 3.5 }}>MOVEMENT DETAILS</Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5, mb: 2.5 }}>
          <MovementButton active={movementType === "in"} onClick={() => setMovementType("in")} icon={<AddCircleOutlineRoundedIcon />} label="Stock IN" tone="success" />
          <MovementButton active={movementType === "adjustment"} onClick={() => setMovementType("adjustment")} icon={<Inventory2RoundedIcon />} label="Stock Adjustment" tone="primary" />
        </Box>

        {movementType === "in" ? (
          <StockInForm quantity={quantity} setQuantity={setQuantity} cost={cost} setCost={setCost} supplier={supplier} setSupplier={setSupplier} notes={notes} setNotes={setNotes} errors={errors} />
        ) : (
          <AdjustmentForm adjustmentType={adjustmentType} setAdjustmentType={setAdjustmentType} quantity={quantity} setQuantity={setQuantity} notes={notes} setNotes={setNotes} adjustedBy={adjustedBy} setAdjustedBy={setAdjustedBy} errors={errors} />
        )}
      </Box>

      <Fab aria-label="Scan product barcode" onClick={scanBarcode} sx={{ position: "fixed", zIndex: 21, right: 20, bottom: 104, width: 56, height: 56, bgcolor: "primary.main", color: "common.white", boxShadow: 4, "&:hover": { bgcolor: "primary.dark" } }}><QrCodeScannerRoundedIcon /></Fab>
      <Paper elevation={5} sx={{ position: "fixed", zIndex: 20, left: 0, right: 0, bottom: 0, px: 2.5, py: 2, bgcolor: "background.paper", borderTop: "1px solid", borderColor: "divider" }}>
        <Box sx={{ width: "100%", maxWidth: 472, mx: "auto" }}><Button fullWidth variant="contained" onClick={saveMovement} sx={{ minHeight: 56, borderRadius: 1.5, fontSize: 16, fontWeight: 600, textTransform: "none" }}>{movementType === "in" ? "Save Stock In" : "Save Adjustment"}</Button></Box>
      </Paper>
    </Box>
  );
}

function SelectedProduct({ product, onClear }) {
  return <Box sx={{ mt: 2, p: 1.5, display: "grid", gridTemplateColumns: "64px minmax(0, 1fr) auto", alignItems: "center", gap: 1.5, border: "1px solid", borderColor: "primary.light", borderRadius: 1.5, bgcolor: "#edf7ff" }}><Box sx={{ width: 64, height: 70, borderRadius: 1.5, display: "grid", placeItems: "center", bgcolor: "#dceffd", color: product.color, "& .MuiSvgIcon-root": { fontSize: 36 } }}>{product.icon}</Box><Box sx={{ minWidth: 0 }}><Typography sx={{ fontSize: 17, fontWeight: 600 }}>{product.name}</Typography><Typography color="text.secondary" sx={{ mt: 0.25, fontSize: 14 }}>SKU: {product.sku}</Typography><Typography sx={{ mt: 0.75, fontWeight: 600, fontSize: 14 }}>Current Stock: {product.stock} pcs</Typography><Typography color="text.secondary" sx={{ mt: 0.25, fontSize: 14 }}>Current Cost Price: {money(product.cost)}</Typography></Box><IconButton aria-label="Remove selected product" onClick={onClear} size="small"><CloseRoundedIcon /></IconButton></Box>;
}

function MovementButton({ active, onClick, icon, label, tone, compact = false }) {
  const activeColor = tone === "success" ? "success.main" : "primary.main";
  return <Button onClick={onClick} startIcon={icon} sx={{ minHeight: compact ? 54 : 58, px: 1, borderRadius: 1.5, border: "1px solid", borderColor: active ? activeColor : "divider", color: active ? "common.white" : "text.secondary", bgcolor: active ? activeColor : "background.paper", fontSize: 16, fontWeight: 600, textTransform: "none", whiteSpace: "nowrap", "& .MuiButton-startIcon": { mr: 0.75, "& .MuiSvgIcon-root": { fontSize: 20 } }, "&:hover": { bgcolor: active ? activeColor : "action.hover", borderColor: active ? activeColor : "divider" } }}>{label}</Button>;
}

function StockInForm({ quantity, setQuantity, cost, setCost, supplier, setSupplier, notes, setNotes, errors }) {
  return <><InputField label="Quantity *" value={quantity} onChange={(event) => setQuantity(event.target.value)} icon={<Inventory2RoundedIcon />} inputMode="numeric" type="number" error={errors.quantity} helperText="Enter a valid quantity" /><InputField label="Cost Price *" value={cost} onChange={(event) => setCost(event.target.value)} icon={<CurrencyExchangeRoundedIcon />} inputMode="decimal" type="number" error={errors.cost} helperText="Enter a cost price" endAdornment="ကျပ်" /><InputField label="Supplier (Optional)" placeholder="Select Supplier" value={supplier ?? ""} onChange={(event) => setSupplier(event.target.value)} icon={<StorefrontRoundedIcon />} /><InputField label="Notes *" value={notes} onChange={(event) => setNotes(event.target.value)} icon={<NotesRoundedIcon />} multiline minRows={4} error={errors.notes} helperText="Notes are required" /></>;
}

function AdjustmentForm({ adjustmentType, setAdjustmentType, quantity, setQuantity, notes, setNotes, adjustedBy, setAdjustedBy, errors }) {
  return <><Typography sx={{ fontSize: 14, fontWeight: 500, mb: 1 }}>Adjustment Type *</Typography><Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5, mb: 2 }}><MovementButton compact active={adjustmentType === "increase"} onClick={() => setAdjustmentType("increase")} icon={<AddCircleOutlineRoundedIcon />} label="Increase" tone="success" /><Button onClick={() => setAdjustmentType("decrease")} startIcon={<RemoveCircleOutlineRoundedIcon />} sx={{ minHeight: 54, borderRadius: 1.5, border: "1px solid", borderColor: adjustmentType === "decrease" ? "error.main" : "divider", color: adjustmentType === "decrease" ? "common.white" : "text.secondary", bgcolor: adjustmentType === "decrease" ? "error.main" : "background.paper", fontSize: 16, fontWeight: 600, textTransform: "none", "& .MuiButton-startIcon": { mr: 0.75, "& .MuiSvgIcon-root": { fontSize: 20 } }, "&:hover": { bgcolor: adjustmentType === "decrease" ? "error.main" : "action.hover" } }}>Decrease</Button></Box><InputField label="Quantity *" value={quantity} onChange={(event) => setQuantity(event.target.value)} icon={<Inventory2RoundedIcon />} inputMode="numeric" type="number" error={errors.quantity} helperText="Enter a valid quantity" /><InputField label="Notes *" placeholder="Reason for stock adjustment" value={notes} onChange={(event) => setNotes(event.target.value)} icon={<NotesRoundedIcon />} multiline minRows={4} error={errors.notes} helperText="Notes are required" /><InputField label="Adjusted By *" placeholder="Enter staff name" value={adjustedBy} onChange={(event) => setAdjustedBy(event.target.value)} icon={<PersonOutlineRoundedIcon />} error={errors.adjustedBy} helperText="Enter the staff name" /></>;
}

function InputField({ label, icon, endAdornment, error, helperText, multiline, minRows, ...props }) {
  return <TextField fullWidth label={label} error={Boolean(error)} helperText={error ? helperText : ""} multiline={multiline} minRows={minRows} slotProps={{ input: { startAdornment: <InputAdornment position="start" sx={{ color: "text.secondary", alignSelf: multiline ? "flex-start" : "center", mt: multiline ? 0.5 : 0 }}>{icon}</InputAdornment>, endAdornment: endAdornment ? <InputAdornment position="end">{endAdornment}</InputAdornment> : undefined } }} sx={{ ...fieldSx, ...(multiline ? { "& .MuiOutlinedInput-root": { ...fieldSx["& .MuiOutlinedInput-root"], minHeight: 116, alignItems: "flex-start", py: 1 } } : {}) }} {...props} />;
}

const sectionLabelSx = { color: "text.secondary", fontWeight: 600, fontSize: 14, letterSpacing: 0.3, mb: 1.25 };
