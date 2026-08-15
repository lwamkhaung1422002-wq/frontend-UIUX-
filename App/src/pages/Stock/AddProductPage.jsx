import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { AppBar, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Fab, IconButton, InputAdornment, MenuItem, Paper, Stack, TextField, Toolbar, Typography, useMediaQuery } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import AddPhotoAlternateRoundedIcon from "@mui/icons-material/AddPhotoAlternateRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CurrencyExchangeRoundedIcon from "@mui/icons-material/CurrencyExchangeRounded";
import DocumentScannerRoundedIcon from "@mui/icons-material/DocumentScannerRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import NumbersRoundedIcon from "@mui/icons-material/NumbersRounded";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import QrCode2RoundedIcon from "@mui/icons-material/QrCode2Rounded";
import QrCodeScannerRoundedIcon from "@mui/icons-material/QrCodeScannerRounded";
import SellRoundedIcon from "@mui/icons-material/SellRounded";
import ShoppingBagRoundedIcon from "@mui/icons-material/ShoppingBagRounded";
import StraightenRoundedIcon from "@mui/icons-material/StraightenRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";

export default function AddProductPage() {
  const isMobile = useMediaQuery("(max-width:768px)");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEditMode = Boolean(searchParams.get("edit"));
  const [form, setForm] = useState({ name: "", description: "", sku: "", barcode: "", category: "", cost: "0.00", price: "0.00", stock: "0", unit: "pcs", minimum: "10" });
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const update = (name) => (event) => setForm((current) => ({ ...current, [name]: event.target.value }));
  const selectCategory = (category) => {
    setForm((current) => ({ ...current, category }));
    setCategoryDialogOpen(false);
  };
  const scanBarcode = () => setForm((current) => ({ ...current, barcode: "8886474921025" }));
  if (!isMobile) return <DesktopAddProduct form={form} update={update} categoryDialogOpen={categoryDialogOpen} setCategoryDialogOpen={setCategoryDialogOpen} selectCategory={selectCategory} navigate={navigate} isEditMode={isEditMode} />;
  return <Box sx={{ minHeight: "100vh", bgcolor: "#fafafa", pb: "96px" }}>
    <AppBar position="sticky" elevation={0} sx={{ bgcolor: "#1976d2" }}><Toolbar sx={{ minHeight: 64, display: "grid", gridTemplateColumns: "1fr auto 1fr" }}><IconButton onClick={() => navigate("/stock")} sx={{ color: "#fff", justifySelf: "start" }}><ArrowBackRoundedIcon /></IconButton><Typography variant="h6" fontWeight={700}>Add Product</Typography><Box /></Toolbar></AppBar>
    <Box sx={{ px: 3, py: 2.25 }}>
      <Stack spacing={1.25} sx={{ width: "100%", mb: 3, alignItems: "center" }}><Box sx={{ display: "grid", placeItems: "center", width: 176, height: 176, border: "2px solid #bdbdbd", borderRadius: 2.5, color: "#757575", bgcolor: "#f4f4f4" }}><AddPhotoAlternateRoundedIcon sx={{ fontSize: 48 }} /></Box><Button startIcon={<PhotoCameraRoundedIcon />} sx={{ color: "primary.main", textTransform: "none", fontSize: 16, fontWeight: 600 }}>Add Product Image</Button></Stack>
      <Field label="Product Name" placeholder="Enter product name" value={form.name} onChange={update("name")} icon={<ShoppingBagRoundedIcon />} />
      <Field label="Description (Optional)" placeholder="Enter product description" value={form.description} onChange={update("description")} icon={<DocumentScannerRoundedIcon />} multiline minRows={3} />
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}><Field label="SKU (Optional)" placeholder="Enter..." value={form.sku} onChange={update("sku")} icon={<NumbersRoundedIcon />} endIcon={<AutoAwesomeRoundedIcon />} /><Field label="Barcode (Optional)" placeholder="Scan ..." value={form.barcode} onChange={update("barcode")} icon={<QrCode2RoundedIcon />} endIcon={<IconButton size="small" aria-label="Scan barcode" onClick={scanBarcode}><QrCodeScannerRoundedIcon /></IconButton>} /></Box>
      <CategorySelector value={form.category} onClick={() => setCategoryDialogOpen(true)} />
      {!isEditMode && <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}><Field label="Cost Price" value={form.cost} onChange={update("cost")} icon={<CurrencyExchangeRoundedIcon />} /><Field label="Selling Price" value={form.price} onChange={update("price")} icon={<SellRoundedIcon />} /></Box>}
      <Box sx={{ display: "grid", gridTemplateColumns: isEditMode ? "1fr" : "1fr 1fr", gap: 1.5 }}>{!isEditMode && <Field label="Stock Quantity" value={form.stock} onChange={update("stock")} icon={<Inventory2RoundedIcon />} />}<Field label="Unit" select value={form.unit} onChange={update("unit")} icon={<StraightenRoundedIcon />}><MenuItem value="pcs">pcs</MenuItem><MenuItem value="box">box</MenuItem></Field></Box>
      <Field label="Minimum Stock Alert Level (Optional)" value={form.minimum} onChange={update("minimum")} icon={<WarningAmberRoundedIcon />} />
    </Box>
    <CategoryDialog open={categoryDialogOpen} onClose={() => setCategoryDialogOpen(false)} onSelect={selectCategory} />
    <Fab aria-label="Scan barcode" onClick={scanBarcode} sx={{ position: "fixed", right: 24, bottom: 88, width: 58, height: 58, bgcolor: "primary.main", color: "common.white", boxShadow: "0 5px 14px rgba(25,118,210,0.32)", "&:hover": { bgcolor: "primary.dark" } }}><QrCodeScannerRoundedIcon /></Fab>
    <Paper elevation={6} sx={{ position: "fixed", left: 0, right: 0, bottom: 0, px: 3, py: 2, borderTop: "1px solid #e5e7eb", bgcolor: "background.paper" }}><Button fullWidth variant="contained" startIcon={<CheckRoundedIcon />} onClick={() => navigate("/stock")} sx={{ minHeight: 56, bgcolor: "primary.main", borderRadius: 2, fontSize: 17, textTransform: "none" }}>Save</Button></Paper>
  </Box>;
}

function DesktopAddProduct({ form, update, categoryDialogOpen, setCategoryDialogOpen, selectCategory, navigate, isEditMode }) {
  return <><Dialog open fullWidth maxWidth="md" onClose={() => navigate("/stock")} slotProps={{ paper: { sx: { maxWidth: 980, borderRadius: 3, maxHeight: "88vh" } } }}><DialogTitle sx={{ px: 2.5, py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}><Box><Typography sx={{ fontSize: 21, fontWeight: 800 }}>{isEditMode ? "Edit Product" : "Create Product"}</Typography><Typography color="text.secondary" sx={{ mt: .2, fontSize: 13 }}>Product details, pricing, and stock information.</Typography></Box></DialogTitle><DialogContent dividers sx={{ p: 2.5 }}><Box sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1.25fr) minmax(240px, .75fr)", gap: 2 }}><Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.25 }}><Box sx={{ gridColumn: "1 / -1" }}><Field label="Product Name" placeholder="Enter product name" value={form.name} onChange={update("name")} icon={<ShoppingBagRoundedIcon />} /></Box><Box sx={{ gridColumn: "1 / -1" }}><Field label="Description (Optional)" placeholder="Enter product description" value={form.description} onChange={update("description")} icon={<DocumentScannerRoundedIcon />} multiline minRows={3} /></Box><Field label="SKU (Optional)" placeholder="Enter SKU" value={form.sku} onChange={update("sku")} icon={<NumbersRoundedIcon />} endIcon={<AutoAwesomeRoundedIcon />} /><Field label="Barcode (Optional)" placeholder="Scan barcode" value={form.barcode} onChange={update("barcode")} icon={<QrCode2RoundedIcon />} endIcon={<IconButton size="small" aria-label="Scan barcode"><QrCodeScannerRoundedIcon /></IconButton>} /><Box sx={{ gridColumn: "1 / -1" }}><CategorySelector value={form.category} onClick={() => setCategoryDialogOpen(true)} /></Box>{!isEditMode && <><Field label="Cost Price" value={form.cost} onChange={update("cost")} icon={<CurrencyExchangeRoundedIcon />} /><Field label="Selling Price" value={form.price} onChange={update("price")} icon={<SellRoundedIcon />} /><Field label="Stock Quantity" value={form.stock} onChange={update("stock")} icon={<Inventory2RoundedIcon />} /></>}<Field label="Unit" select value={form.unit} onChange={update("unit")} icon={<StraightenRoundedIcon />}><MenuItem value="pcs">pcs</MenuItem><MenuItem value="box">box</MenuItem></Field><Box sx={{ gridColumn: "1 / -1" }}><Field label="Minimum Stock Alert Level (Optional)" value={form.minimum} onChange={update("minimum")} icon={<WarningAmberRoundedIcon />} /></Box></Box><Box><Typography sx={{ fontSize: 15, fontWeight: 700, mb: 1 }}>Product image</Typography><Box sx={{ height: 170, display: "grid", placeItems: "center", border: "1px dashed", borderColor: "divider", borderRadius: 2, bgcolor: "#f8fafc", color: "text.secondary" }}><Stack sx={{ alignItems: "center", gap: .5 }}><AddPhotoAlternateRoundedIcon sx={{ fontSize: 42 }} /><Button startIcon={<PhotoCameraRoundedIcon />} sx={{ textTransform: "none" }}>Upload image</Button></Stack></Box></Box></Box></DialogContent><DialogActions sx={{ px: 2.5, py: 1.25, borderTop: "1px solid", borderColor: "divider" }}><Button onClick={() => navigate("/stock")} sx={{ textTransform: "none" }}>Cancel</Button><Button variant="contained" startIcon={<CheckRoundedIcon />} onClick={() => navigate("/stock")} sx={{ minHeight: 40, textTransform: "none", fontWeight: 700 }}>Save Product</Button></DialogActions></Dialog><CategoryDialog open={categoryDialogOpen} onClose={() => setCategoryDialogOpen(false)} onSelect={selectCategory} /></>;
}

function CategorySelector({ value, onClick }) {
  return (
    <Box sx={{ mb: { xs: 2, md: 1.25 } }}>
      <Typography color="text.primary" fontSize={16} fontWeight={700} sx={{ mb: 0.75 }}>Category (Optional)</Typography>
      <Button
        fullWidth
        variant="outlined"
        onClick={onClick}
        startIcon={<CategoryRoundedIcon />}
        endIcon={<KeyboardArrowDownRoundedIcon />}
        sx={{ minHeight: 64, justifyContent: "flex-start", borderRadius: 1.5, borderColor: "#b8b8b8", color: value ? "text.primary" : "text.secondary", fontSize: 16, fontWeight: 400, textTransform: "none", px: 1.75, "& .MuiButton-startIcon": { mr: 1, color: "text.primary" }, "& .MuiButton-endIcon": { ml: "auto", color: "text.secondary" } }}
      >
        {value || "Select Category"}
      </Button>
    </Box>
  );
}

function CategoryDialog({ open, onClose, onSelect }) {
  const categories = ["Drinking", "Food", "Groceries", "Medicine"];
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="select-category-title"
      slotProps={{
        paper: { sx: { width: "calc(100% - 64px)", maxWidth: 448, minHeight: "78vh", m: 0, borderRadius: 4, boxShadow: "0 18px 48px rgba(0,0,0,0.3)", alignSelf: "center" } },
        backdrop: { sx: { bgcolor: "rgba(0, 0, 0, 0.55)" } },
      }}
    >
      <DialogContent sx={{ p: 5, "&:first-of-type": { pt: 5 } }}>
        <Typography id="select-category-title" sx={{ fontSize: 34, fontWeight: 400, lineHeight: 1.15, mb: 4.25 }}>Select Category</Typography>
        <Button startIcon={<AddRoundedIcon />} onClick={() => {}} sx={{ minHeight: 52, px: 2.5, color: "text.primary", fontSize: 22, fontWeight: 400, textTransform: "none", "& .MuiButton-startIcon": { mr: 2 } }}>Add New Category</Button>
        <Divider sx={{ borderColor: "text.primary", my: 1.5 }} />
        <Stack spacing={0.5} sx={{ pt: 1.5 }}>
          {categories.map((category) => <Button key={category} onClick={() => onSelect(category)} sx={{ justifyContent: "flex-start", minHeight: 72, px: 2.5, color: "text.primary", fontSize: 23, fontWeight: 400, textTransform: "none" }}>{category}</Button>)}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, icon, endIcon, multiline, minRows, selectPlaceholder, children, ...props }) {
  return (
    <Box sx={{ mb: { xs: 2, md: 1.25 } }}>
      <Typography color="text.primary" fontSize={16} fontWeight={700} sx={{ mb: 0.75 }}>{label}</Typography>
      <TextField
        fullWidth
        multiline={multiline}
        minRows={minRows}
        {...props}
        slotProps={{
          input: {
            startAdornment: icon ? <InputAdornment position="start" sx={{ color: "text.primary", mr: 1 }}>{icon}</InputAdornment> : undefined,
            endAdornment: endIcon ? <InputAdornment position="end" sx={{ ml: 0.5 }}>{endIcon}</InputAdornment> : undefined,
          },
          select: selectPlaceholder ? {
            displayEmpty: true,
            renderValue: (selected) => selected || selectPlaceholder,
          } : undefined,
        }}
        sx={{
          "& .MuiOutlinedInput-root": {
            minHeight: multiline ? { xs: 116, md: 96 } : { xs: 64, md: 56 },
            borderRadius: 1.5,
            fontSize: 16,
            alignItems: multiline ? "flex-start" : "center",
            "& fieldset": { borderColor: "#b8b8b8" },
          },
          "& .MuiInputBase-inputMultiline": { pt: 1.5 },
        }}
      >
        {children}
      </TextField>
    </Box>
  );
}
