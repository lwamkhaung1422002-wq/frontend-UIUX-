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
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import QrCodeScannerRoundedIcon from "@mui/icons-material/QrCodeScannerRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import WaterDropRoundedIcon from "@mui/icons-material/WaterDropRounded";
import { DesktopPage, DesktopPanel, DesktopSearch, DesktopStat } from "../../components/Desktop/DesktopUI";

const products = [
  { id: "water", name: "Water", category: "Drinking", price: 1000, stock: 100, icon: <WaterDropRoundedIcon />, color: "#38a5dd" },
  { id: "air-x", name: "Air X", category: "Medicine", price: 1200, stock: 98, icon: <Inventory2RoundedIcon />, color: "#8a8a8a" },
];

const formatMoney = (amount) => `${new Intl.NumberFormat("en-US").format(amount)} ကျပ်`;

export default function StockPage() {
  const isMobile = useMediaQuery("(max-width:768px)");
  const navigate = useNavigate();
  const [inventoryProducts, setInventoryProducts] = useState(products);
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

  if (!isMobile) return <DesktopInventoryPage products={visibleProducts} search={search} setSearch={setSearch} summary={inventorySummary} navigate={navigate} />;

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

function DesktopInventoryPage({ products, search, setSearch, summary, navigate }) {
  return <DesktopPage title="Inventory" subtitle="Manage products, prices, and stock levels." actionLabel="Add Product" onAction={() => navigate("/stock/add")}><Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2.25, mb: 3 }}><DesktopStat label="Product Types" value={summary.productCount} helper="Active products" /><DesktopStat label="Total Quantity" value={`${summary.quantity} pcs`} color="success.main" helper="Available stock" /><DesktopStat label="Stock Value" value={formatMoney(summary.value)} color="primary.main" helper="Current inventory value" /></Box><DesktopPanel><Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, mb: 3 }}><DesktopSearch value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products by name, SKU, or barcode" /><Button variant="outlined" onClick={() => navigate("/stock/history")} sx={{ minHeight: 44, textTransform: "none" }}>Stock History</Button></Box><Box sx={{ display: "grid", gridTemplateColumns: "72px minmax(0, 1.4fr) 0.9fr 0.8fr 0.9fr auto", columnGap: 2, alignItems: "center", px: 1.5, pb: 1.25 }}><Box /><TableHeader>PRODUCT</TableHeader><TableHeader>CATEGORY</TableHeader><TableHeader>STOCK</TableHeader><TableHeader align="right">SELLING PRICE</TableHeader><Box /></Box><Divider /><Box>{products.map((product) => <Box key={product.id} onClick={() => navigate(`/stock/${product.id}`)} sx={{ display: "grid", gridTemplateColumns: "72px minmax(0, 1.4fr) 0.9fr 0.8fr 0.9fr auto", columnGap: 2, alignItems: "center", px: 1.5, py: 1.5, borderBottom: "1px solid", borderColor: "divider", cursor: "pointer", "&:hover": { bgcolor: "action.hover" } }}><Box sx={{ width: 54, height: 54, display: "grid", placeItems: "center", borderRadius: 1.5, bgcolor: product.id === "water" ? "#e8f6fb" : "#f5f5f5", color: product.color }}>{product.icon}</Box><Typography fontWeight={700}>{product.name}</Typography><Typography color="text.secondary">{product.category}</Typography><Typography color={product.stock < 10 ? "error.main" : "success.main"} fontWeight={700}>{product.stock} pcs</Typography><Typography color="primary.main" fontWeight={700} textAlign="right">{formatMoney(product.price)}</Typography><IconButton aria-label={`Edit ${product.name}`} onClick={(event) => { event.stopPropagation(); navigate(`/stock/add?edit=${product.id}`); }}><EditRoundedIcon /></IconButton></Box>)}</Box></DesktopPanel></DesktopPage>;
}

function TableHeader({ children, align }) { return <Typography color="text.secondary" sx={{ fontSize: 12, fontWeight: 700, textAlign: align }}>{children}</Typography>; }

const filterButtonSx = { minHeight: 48, borderRadius: 1.75, borderColor: "text.primary", color: "text.primary", bgcolor: "background.paper", fontSize: 15, fontWeight: 600, px: 2, textTransform: "none" };
