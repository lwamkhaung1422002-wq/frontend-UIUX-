import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Menu,
  MenuItem,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import ArchiveRoundedIcon from "@mui/icons-material/ArchiveRounded";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import QrCodeScannerRoundedIcon from "@mui/icons-material/QrCodeScannerRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import WaterDropRoundedIcon from "@mui/icons-material/WaterDropRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";

const products = [
  { id: "water", name: "Water", category: "Drinking", price: 1000, stock: 100, icon: <WaterDropRoundedIcon />, color: "#38a5dd" },
  { id: "air-x", name: "Air X", category: "Medicine", price: 1200, stock: 98, icon: <Inventory2RoundedIcon />, color: "#8a8a8a" },
];

const desktopProducts = [
  ...products,
  { id: "coca-cola", name: "Coca-Cola 330ml", category: "Drinking", price: 1000, stock: 8, icon: <Inventory2RoundedIcon />, color: "#e53935" },
  { id: "jasmine", name: "Jasmine Perfume", category: "Beauty", price: 3500, stock: 5, icon: <Inventory2RoundedIcon />, color: "#db6f9c" },
  { id: "nivea", name: "Nivea Roll On", category: "Beauty", price: 6500, stock: 7, icon: <Inventory2RoundedIcon />, color: "#3976bb" },
  { id: "oishi", name: "Oishi Green Tea", category: "Drinking", price: 1800, stock: 4, icon: <Inventory2RoundedIcon />, color: "#4f9b4b" },
  { id: "royal-d", name: "Royal-D 500ml", category: "Drinking", price: 1500, stock: 9, icon: <Inventory2RoundedIcon />, color: "#deae28" },
  { id: "cellox", name: "Cellox Facial Tissue", category: "Household", price: 1200, stock: 45, icon: <Inventory2RoundedIcon />, color: "#9a5ab7" },
];

const formatMoney = (amount) => `${new Intl.NumberFormat("en-US").format(amount)} ကျပ်`;

export default function StockPage() {
  const isMobile = useMediaQuery("(max-width:768px)");
  const navigate = useNavigate();
  const [inventoryProducts, setInventoryProducts] = useState(() => isMobile ? products : desktopProducts);
  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [sort, setSort] = useState("recent");
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuProduct, setMenuProduct] = useState(null);

  useEffect(() => {
    const updateSort = (event) => setSort(event.detail);
    window.addEventListener("inventory-sort", updateSort);
    return () => window.removeEventListener("inventory-sort", updateSort);
  }, []);

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = inventoryProducts.filter((product) => (!query || product.name.toLowerCase().includes(query)) && (!lowStockOnly || product.stock < 10));
    if (sort === "name") return [...result].sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "price") return [...result].sort((a, b) => b.price - a.price);
    if (sort === "stock") return [...result].sort((a, b) => a.stock - b.stock);
    return result;
  }, [inventoryProducts, lowStockOnly, search, sort]);

  const inventorySummary = useMemo(() => ({
    productCount: visibleProducts.length,
    quantity: visibleProducts.reduce((total, product) => total + product.stock, 0),
    value: visibleProducts.reduce((total, product) => total + (product.price * product.stock), 0),
  }), [visibleProducts]);

  const removeProduct = () => {
    setInventoryProducts((current) => current.filter((product) => product.id !== menuProduct?.id));
    setMenuAnchor(null);
    setMenuProduct(null);
  };

  if (!isMobile) return <DesktopInventoryPage products={visibleProducts} search={search} setSearch={setSearch} summary={inventorySummary} lowStockOnly={lowStockOnly} setLowStockOnly={setLowStockOnly} navigate={navigate} onDelete={(id) => setInventoryProducts((current) => current.filter((product) => product.id !== id))} />;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", px: 3, pt: 2, pb: "174px" }}>
      <Box sx={{ position: "relative" }}>
        <TextField
          fullWidth
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search products by name, SKU, or barcode"
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon /></InputAdornment> }}
          sx={{
            "& .MuiOutlinedInput-root": {
              minHeight: 60,
              px: 1,
              pr: 6.5,
              bgcolor: "#f5f5f5",
              borderRadius: 2,
              fontSize: 15,
              "& fieldset": { border: 0 },
            },
            "& .MuiInputAdornment-root": { color: "text.primary", mr: 1 },
          }}
        />
        <IconButton aria-label="Scan barcode" sx={{ position: "absolute", top: "50%", right: 7, transform: "translateY(-50%)", color: "text.primary" }}><QrCodeScannerRoundedIcon /></IconButton>
      </Box>

      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 0.75, mt: 2, mb: 1.5 }}>
        <Button variant="outlined" onClick={() => setLowStockOnly(false)} sx={filterButtonSx}>All Categories</Button>
        <Button variant="outlined" onClick={() => setLowStockOnly((value) => !value)} sx={{ ...filterButtonSx, ...(lowStockOnly ? { borderColor: "primary.main", color: "primary.main" } : {}) }}>Low Stock</Button>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, px: 0.25, mb: 1.75 }}>
        <Typography color="text.secondary" sx={{ minWidth: 0, fontSize: 13, whiteSpace: "nowrap" }}>
          {inventorySummary.productCount} Products · {inventorySummary.quantity} pcs
        </Typography>
        <Typography color="primary.main" sx={{ flexShrink: 0, fontSize: 16, fontWeight: 700, whiteSpace: "nowrap" }}>
          {formatMoney(inventorySummary.value)}
        </Typography>
      </Box>

      <Stack spacing={1.25}>
        {visibleProducts.map((product) => (
          <Card key={product.id} onClick={() => navigate(`/stock/${product.id}`)} sx={{ minHeight: 112, borderRadius: 2.5, bgcolor: "background.paper", boxShadow: "0 2px 7px rgba(15,23,42,0.16)", cursor: "pointer" }}>
            <CardContent sx={{ height: "100%", boxSizing: "border-box", p: 1.5, "&:last-child": { pb: 1.5 } }}>
              <Stack direction="row" alignItems="center" spacing={1.25}>
                <Box sx={{ display: "grid", placeItems: "center", width: 62, height: 66, borderRadius: 1.75, bgcolor: product.id === "water" ? "#e8f6fb" : "transparent", color: product.color, flexShrink: 0 }}>
                  {product.icon}
                </Box>
                <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                  <Typography color="text.primary" fontSize={18} fontWeight={600}>{product.name}</Typography>
                  <Typography color="text.secondary" sx={{ mt: 0.25 }}>{product.category}</Typography>
                  <Stack direction="row" alignItems="center" spacing={0.7} sx={{ mt: 0.65, color: product.stock < 10 ? "error.main" : "success.main" }}><Inventory2RoundedIcon fontSize="small" /><Typography variant="body2">{product.stock} pcs</Typography></Stack>
                </Box>
                <Box sx={{ alignSelf: "stretch", display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "flex-end" }}>
                  <Typography color="primary.main" fontWeight={700} fontSize={17}>{formatMoney(product.price)}</Typography>
                  <IconButton size="small" aria-label={`More actions for ${product.name}`} onClick={(event) => { event.stopPropagation(); setMenuAnchor(event.currentTarget); setMenuProduct(product); }}><MoreVertRoundedIcon /></IconButton>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={() => { navigate(`/stock/add?edit=${menuProduct?.id ?? ""}`); setMenuAnchor(null); }}><EditRoundedIcon sx={{ mr: 1.5 }} />Edit</MenuItem>
        <MenuItem onClick={removeProduct} sx={{ color: "error.main" }}><DeleteOutlineRoundedIcon sx={{ mr: 1.5 }} />Delete</MenuItem>
      </Menu>

      <Paper elevation={5} sx={{ position: "fixed", left: 0, right: 0, bottom: 72, px: 3, py: 2, borderTop: 1, borderColor: "divider", bgcolor: "background.paper", zIndex: 10 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => navigate("/stock/add")} sx={{ minHeight: 56, borderRadius: 2, bgcolor: "primary.main", fontSize: 15, textTransform: "none", "&:hover": { bgcolor: "primary.dark" } }}>Add Product</Button>
          <Button variant="outlined" startIcon={<HistoryRoundedIcon />} onClick={() => navigate("/stock/history")} sx={{ minHeight: 56, borderRadius: 2, borderColor: "text.primary", color: "primary.main", fontSize: 15, textTransform: "none" }}>Stock History</Button>
        </Box>
      </Paper>
    </Box>
  );
}

function DesktopInventoryPage({ products, search, setSearch, summary, lowStockOnly, setLowStockOnly, navigate, onDelete }) {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuProduct, setMenuProduct] = useState(null);
  return <Box sx={{ maxWidth: 1500, mx: "auto", py: 0.5 }}>
    <Box sx={{ display: "grid", gridTemplateColumns: "minmax(300px, 1fr) auto auto", gap: 1.5, alignItems: "center" }}>
      <TextField fullWidth value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by product code, name or barcode..." InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon /></InputAdornment> }} sx={{ "& .MuiOutlinedInput-root": { minHeight: 52, borderRadius: 2, bgcolor: "background.paper" } }} />
      <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => navigate("/stock/add")} sx={desktopPrimaryButtonSx}>Create Product</Button>
      <Button variant="outlined" startIcon={<ArchiveRoundedIcon />} onClick={() => navigate("/stock/movement/add")} sx={desktopSecondaryButtonSx}>Add Stock</Button>
    </Box>
    <Stack direction="row" spacing={1.5} sx={{ mt: 2.25, mb: 2.5 }}>
      <Button variant="outlined" startIcon={<CategoryRoundedIcon />} onClick={() => setLowStockOnly(false)} sx={{ ...desktopFilterButtonSx, ...(!lowStockOnly ? desktopActiveFilterSx : {}) }}>All Category</Button>
      <Button variant="outlined" startIcon={<WarningAmberRoundedIcon />} onClick={() => setLowStockOnly(true)} sx={{ ...desktopFilterButtonSx, ...(lowStockOnly ? desktopActiveFilterSx : {}) }}>Low Stock</Button>
      <Button variant="outlined" startIcon={<HistoryRoundedIcon />} onClick={() => navigate("/stock/history")} sx={desktopFilterButtonSx}>History</Button>
    </Stack>
    <Paper elevation={0} sx={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", border: "1px solid", borderColor: "divider", borderRadius: 2.5, overflow: "hidden", mb: 2.5, boxShadow: "0 2px 8px rgba(15,23,42,.05)" }}>
      <InventorySummary icon={<Inventory2RoundedIcon />} iconBg="#eaf3ff" iconColor="#1769e0" value={summary.productCount} label="Products" />
      <InventorySummary icon={<ArchiveRoundedIcon />} iconBg="#eaf8ef" iconColor="#27914a" value={`${summary.quantity} pcs`} label="Total Stock" bordered />
      <InventorySummary icon={<AccountBalanceWalletRoundedIcon />} iconBg="#fff3e1" iconColor="#dc8a19" value={formatMoney(summary.value)} label="Total Value" bordered />
    </Paper>
    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 2 }}>
      {products.map((product) => <Card key={product.id} onClick={() => navigate(`/stock/${product.id}`)} sx={{ minWidth: 0, borderRadius: 2.25, border: "1px solid", borderColor: "divider", boxShadow: "0 2px 8px rgba(15,23,42,.05)", cursor: "pointer", overflow: "hidden", "&:hover": { boxShadow: "0 7px 18px rgba(15,23,42,.12)", transform: "translateY(-1px)" } }}>
        <CardContent sx={{ p: 1.75, "&:last-child": { pb: 1.75 } }}>
          <Box sx={{ height: 86, display: "grid", placeItems: "center", borderRadius: 1.75, bgcolor: product.id === "water" ? "#eaf7fc" : "#f5f7fa", color: product.color, "& .MuiSvgIcon-root": { fontSize: 44 } }}>{product.icon}</Box>
          <Typography noWrap sx={{ fontSize: 17, fontWeight: 700, mt: 1.5 }}>{product.name}</Typography>
          <Typography noWrap color="text.secondary" sx={{ fontSize: 13, mt: 0.5 }}>{product.category} product</Typography>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 1.5 }}><Box><Typography color="text.secondary" sx={{ fontSize: 12 }}>Category</Typography><Box sx={{ display: "inline-flex", mt: 0.6, px: 1, py: 0.35, borderRadius: 1, bgcolor: "#eaf3ff", color: "primary.main", fontSize: 12, fontWeight: 700 }}>{product.category}</Box></Box><IconButton aria-label={`Actions for ${product.name}`} onClick={(event) => { event.stopPropagation(); setMenuAnchor(event.currentTarget); setMenuProduct(product); }} size="small"><MoreVertRoundedIcon /></IconButton></Box>
          <Divider sx={{ my: 1.5 }} />
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}><Box><Typography color="text.secondary" sx={{ fontSize: 12 }}>Stock</Typography><Typography color={product.stock < 10 ? "error.main" : "success.main"} sx={{ fontSize: 15, fontWeight: 800, mt: .5 }}>{product.stock} pcs</Typography></Box><Box sx={{ textAlign: "right" }}><Typography color="text.secondary" sx={{ fontSize: 12 }}>Unit Price</Typography><Typography sx={{ fontSize: 15, fontWeight: 800, mt: .5, whiteSpace: "nowrap" }}>{formatMoney(product.price)}</Typography></Box></Box>
          <Divider sx={{ my: 1.5 }} />
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><Typography color="text.secondary" sx={{ fontSize: 12 }}>Total Value</Typography><Typography sx={{ fontSize: 14, fontWeight: 800 }}>{formatMoney(product.price * product.stock)}</Typography></Box>
        </CardContent>
      </Card>)}
    </Box>
    <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}><MenuItem onClick={() => { navigate(`/stock/add?edit=${menuProduct?.id ?? ""}`); setMenuAnchor(null); }}><EditRoundedIcon sx={{ mr: 1.25 }} />Edit</MenuItem><MenuItem onClick={() => { onDelete(menuProduct?.id); setMenuAnchor(null); }} sx={{ color: "error.main" }}><DeleteOutlineRoundedIcon sx={{ mr: 1.25 }} />Delete</MenuItem></Menu>
  </Box>;
}

function InventorySummary({ icon, iconBg, iconColor, value, label, bordered }) { return <Box sx={{ minWidth: 0, display: "flex", alignItems: "center", gap: 1.75, px: 3, py: 2.25, borderLeft: bordered ? "1px solid" : 0, borderColor: "divider" }}><Box sx={{ width: 52, height: 52, flexShrink: 0, borderRadius: "50%", display: "grid", placeItems: "center", bgcolor: iconBg, color: iconColor }}>{icon}</Box><Box><Typography noWrap sx={{ fontSize: 24, lineHeight: 1.1, fontWeight: 800 }}>{value}</Typography><Typography color="text.secondary" sx={{ mt: .5, fontSize: 14 }}>{label}</Typography></Box></Box>; }

const desktopPrimaryButtonSx = { minHeight: 52, px: 2.25, borderRadius: 1.75, textTransform: "none", fontWeight: 700, whiteSpace: "nowrap" };
const desktopSecondaryButtonSx = { minHeight: 52, px: 2.25, borderRadius: 1.75, borderColor: "divider", color: "text.primary", textTransform: "none", fontWeight: 700, whiteSpace: "nowrap" };
const desktopFilterButtonSx = { minHeight: 48, minWidth: 174, borderRadius: 1.75, borderColor: "divider", color: "text.secondary", textTransform: "none", fontWeight: 600, "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" } };
const desktopActiveFilterSx = { borderColor: "primary.main", color: "primary.main", bgcolor: "#f7fbff" };

const filterButtonSx = { minHeight: 48, borderRadius: 1.75, borderColor: "text.primary", color: "text.primary", bgcolor: "background.paper", fontSize: 15, fontWeight: 600, px: 2, textTransform: "none" };
