import { useNavigate, useParams } from "react-router";
import {
  AppBar,
  Box,
  Card,
  CardContent,
  IconButton,
  LinearProgress,
  Toolbar,
  Typography,
  useMediaQuery,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import WaterDropRoundedIcon from "@mui/icons-material/WaterDropRounded";
import { DesktopPage, DesktopPanel, DesktopStat } from "../../components/Desktop/DesktopUI";

const detailProducts = {
  water: {
    name: "Water",
    description: "Pure drinking water",
    sku: "Not set",
    barcode: "8886474921025",
    category: "Drinking",
    created: "11/08/2026 11:20 PM",
    updated: "11/08/2026 11:20 PM",
    cost: 500,
    price: 1000,
    stock: 100,
    minimumStock: 10,
    icon: <WaterDropRoundedIcon />,
    movement: { type: "IN", quantity: "+100", reason: "Initial Stock", date: "11/08/2026" },
  },
  "air-x": {
    name: "Air X",
    description: "Not set",
    sku: "Not set",
    barcode: "Not set",
    category: "Medicine",
    created: "11/08/2026 11:20 PM",
    updated: "11/08/2026 11:20 PM",
    cost: 900,
    price: 1200,
    stock: 98,
    minimumStock: 10,
    icon: <Inventory2RoundedIcon />,
    movement: { type: "OUT", quantity: "-1", reason: "Sale - Order #ORD-20260811-0003", date: "11/08/2026" },
  },
};

const formatMoney = (amount) => `${new Intl.NumberFormat("en-US").format(amount)} ကျပ်`;

export default function ProductDetailsPage() {
  const isMobile = useMediaQuery("(max-width:768px)");
  const navigate = useNavigate();
  const { productId } = useParams();
  const product = detailProducts[productId] ?? detailProducts.water;
  const profit = product.price - product.cost;
  const profitPercent = product.cost ? (profit / product.cost) * 100 : 0;
  const stockHealth = Math.min(100, Math.round((product.stock / Math.max(product.minimumStock, 1)) * 100));

  if (!isMobile) return <DesktopProductDetails product={product} productId={productId} profit={profit} profitPercent={profitPercent} stockHealth={stockHealth} navigate={navigate} />;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pb: 3 }}>
      <AppBar position="sticky" elevation={0} sx={{ bgcolor: "primary.main" }}>
        <Toolbar sx={{ minHeight: 68, px: 2.5 }}>
          <IconButton aria-label="Back to inventory" onClick={() => navigate("/stock")} sx={{ color: "common.white", mr: 1.25, p: 0.75 }}>
            <ArrowBackRoundedIcon sx={{ fontSize: 32 }} />
          </IconButton>
          <Typography sx={{ flexGrow: 1, color: "common.white", fontSize: 26, fontWeight: 700, lineHeight: 1.1 }}>{product.name}</Typography>
          <IconButton aria-label="Edit product" onClick={() => navigate(`/stock/add?edit=${productId}`)} sx={{ color: "common.white", p: 0.75 }}>
            <EditRoundedIcon sx={{ fontSize: 29 }} />
          </IconButton>
          <IconButton aria-label="Delete product" onClick={() => navigate("/stock")} sx={{ color: "common.white", ml: 1, p: 0.75 }}>
            <DeleteRoundedIcon sx={{ fontSize: 29 }} />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ px: 3, py: 3.25, display: "grid", gap: 3 }}>
        <Card sx={cardSx}>
          <CardContent sx={{ p: 3.5, "&:last-child": { pb: 3.5 } }}>
            <ProductImage product={product} productId={productId} />
            <Typography align="center" sx={{ fontSize: 36, fontWeight: 700, lineHeight: 1.15, mb: 4 }}>{product.name}</Typography>
            <Box sx={{ display: "grid", rowGap: 2.25 }}>
              <DetailRow label="Description" value={product.description} muted={product.description === "Not set"} />
              <DetailRow label="SKU" value={product.sku} muted={product.sku === "Not set"} />
              <DetailRow label="Barcode" value={product.barcode} muted={product.barcode === "Not set"} />
              <DetailRow label="Category" value={product.category} />
              <DetailRow label="Created" value={product.created} />
              <DetailRow label="Updated" value={product.updated} />
            </Box>
          </CardContent>
        </Card>

        <Card sx={cardSx}>
          <CardContent sx={{ p: 3.5, "&:last-child": { pb: 3.5 } }}>
            <Box sx={{ display: "grid", gap: 2.25 }}>
              <DetailRow label="Cost Price" value={formatMoney(product.cost)} emphasis />
              <DetailRow label="Selling Price" value={formatMoney(product.price)} emphasis />
            </Box>
            <Box sx={{ mt: 3.5, p: 2.75, border: 1, borderColor: "success.light", borderRadius: 2.25, bgcolor: "#f0f9f1", display: "grid", gap: 2 }}>
              <DetailRow label="Profit Margin" value={formatMoney(profit)} valueColor="success.main" emphasis />
              <DetailRow label="Profit %" value={`${profitPercent.toFixed(1)}%`} valueColor="success.main" emphasis />
            </Box>
          </CardContent>
        </Card>

        <Card sx={cardSx}>
          <CardContent sx={{ p: 3.5, "&:last-child": { pb: 3.5 } }}>
            <Box sx={{ width: 208, height: 174, mx: "auto", display: "grid", placeItems: "center", borderRadius: 2.5, bgcolor: "#e8f2fd", mb: 3.75 }}>
              <Box sx={{ textAlign: "center" }}>
                <Typography color="text.secondary" sx={{ fontSize: 18, mb: 1.25 }}>Current Stock</Typography>
                <Typography color="primary.main" sx={{ fontSize: 43, fontWeight: 700, lineHeight: 1 }}>{product.stock} pcs</Typography>
              </Box>
            </Box>
            <DetailRow label="Min Stock Alert" value={`${product.minimumStock} pcs`} />
            <Box sx={{ mt: 3.5 }}>
              <DetailRow label="Stock Health" value={`${stockHealth}%`} valueColor="success.main" emphasis />
              <LinearProgress variant="determinate" value={stockHealth} color="success" sx={{ mt: 1.5, height: 12, borderRadius: 999, bgcolor: "#e7f5ea" }} />
            </Box>
          </CardContent>
        </Card>

        <Card sx={cardSx}>
          <CardContent sx={{ p: 3.5, "&:last-child": { pb: 3.5 } }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
              <Typography sx={{ minWidth: 0, fontSize: 20, fontWeight: 700, whiteSpace: "nowrap", "@media (min-width:400px)": { fontSize: 24 } }}>Recent Stock Movements</Typography>
              <Typography color="primary.main" onClick={() => navigate("/stock/history")} sx={{ fontSize: 18, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>View All</Typography>
            </Box>
            <Box sx={{ display: "grid", gridTemplateColumns: "auto minmax(0, 1fr) auto", columnGap: 1.75, alignItems: "start" }}>
              <Box sx={{ border: 1.5, borderColor: product.movement.type === "IN" ? "success.main" : "error.main", color: product.movement.type === "IN" ? "success.main" : "error.main", borderRadius: 999, px: 1.4, py: 0.8, fontSize: 16, fontWeight: 700 }}>{product.movement.type}</Box>
              <Box><Typography color={product.movement.type === "IN" ? "success.main" : "error.main"} sx={{ fontSize: 21, fontWeight: 700, lineHeight: 1.15 }}>{product.movement.quantity}</Typography><Typography color="text.secondary" sx={{ mt: 1, fontSize: 17 }}>{product.movement.reason}</Typography></Box>
              <Typography color="text.secondary" sx={{ fontSize: 15, whiteSpace: "nowrap" }}>{product.movement.date}</Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}

function DesktopProductDetails({ product, productId, profit, profitPercent, stockHealth, navigate }) {
  return <DesktopPage title={product.name} subtitle="Product details, pricing, and current stock." actionLabel="Edit Product" onAction={() => navigate(`/stock/add?edit=${productId}`)} actionIcon={<EditRoundedIcon />}><Box sx={{ display: "grid", gridTemplateColumns: "minmax(360px, 0.75fr) minmax(0, 1.25fr)", gap: 3 }}><DesktopPanel><Box sx={{ width: 260, height: 260, mx: "auto", display: "grid", placeItems: "center", bgcolor: productId === "water" ? "#e8f6fb" : "#f2f2f2", color: productId === "water" ? "#2b8ec3" : "#666", borderRadius: 3, "& .MuiSvgIcon-root": { fontSize: 110 } }}>{product.icon}</Box><Typography align="center" sx={{ fontSize: 28, fontWeight: 700, mt: 2.5 }}>{product.name}</Typography><Box sx={{ display: "grid", gap: 1.5, mt: 3 }}><DesktopDetail label="Description" value={product.description} muted={product.description === "Not set"} /><DesktopDetail label="SKU" value={product.sku} muted={product.sku === "Not set"} /><DesktopDetail label="Barcode" value={product.barcode} muted={product.barcode === "Not set"} /><DesktopDetail label="Category" value={product.category} /><DesktopDetail label="Created" value={product.created} /><DesktopDetail label="Updated" value={product.updated} /></Box></DesktopPanel><Box sx={{ display: "grid", gap: 3, alignContent: "start" }}><Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2.25 }}><DesktopStat label="Cost Price" value={formatMoney(product.cost)} /><DesktopStat label="Selling Price" value={formatMoney(product.price)} color="primary.main" /></Box><DesktopPanel><Typography sx={{ fontSize: 19, fontWeight: 700, mb: 2 }}>Profitability</Typography><Box sx={{ p: 2.5, borderRadius: 2.5, bgcolor: "#f0f9f1", border: "1px solid", borderColor: "success.light", display: "grid", gap: 1.5 }}><DesktopDetail label="Profit Margin" value={formatMoney(profit)} color="success.main" /><DesktopDetail label="Profit %" value={`${profitPercent.toFixed(1)}%`} color="success.main" /></Box></DesktopPanel><DesktopPanel><Box sx={{ display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: 3, alignItems: "center" }}><Box sx={{ p: 3, borderRadius: 2.5, bgcolor: "#eaf3ff", textAlign: "center" }}><Typography color="text.secondary">Current Stock</Typography><Typography color="primary.main" sx={{ fontSize: 36, fontWeight: 700, mt: 1 }}>{product.stock} pcs</Typography></Box><Box><DesktopDetail label="Min Stock Alert" value={`${product.minimumStock} pcs`} /><Box sx={{ mt: 2.5 }}><DesktopDetail label="Stock Health" value={`${stockHealth}%`} color="success.main" /><LinearProgress variant="determinate" value={stockHealth} color="success" sx={{ mt: 1.25, height: 10, borderRadius: 99 }} /></Box></Box></Box></DesktopPanel><DesktopPanel><Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}><Typography sx={{ fontSize: 19, fontWeight: 700 }}>Recent Stock Movements</Typography><Typography color="primary.main" onClick={() => navigate("/stock/history")} sx={{ cursor: "pointer", fontWeight: 700 }}>View All</Typography></Box><Box sx={{ display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", gap: 2 }}><Box sx={{ border: 1, borderColor: product.movement.type === "IN" ? "success.main" : "error.main", color: product.movement.type === "IN" ? "success.main" : "error.main", px: 1.25, py: 0.75, borderRadius: 99, fontWeight: 700 }}>{product.movement.type}</Box><Box><Typography color={product.movement.type === "IN" ? "success.main" : "error.main"} fontWeight={700}>{product.movement.quantity}</Typography><Typography color="text.secondary" sx={{ mt: 0.5 }}>{product.movement.reason}</Typography></Box><Typography color="text.secondary">{product.movement.date}</Typography></Box></DesktopPanel></Box></Box></DesktopPage>;
}

function DesktopDetail({ label, value, muted, color = "text.primary" }) { return <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}><Typography color="text.secondary">{label}</Typography><Typography color={muted ? "text.disabled" : color} fontWeight={600}>{value}</Typography></Box>; }

function ProductImage({ product, productId }) {
  if (product.image) {
    return <Box component="img" src={product.image} alt={product.name} sx={{ display: "block", width: "min(78vw, 320px)", height: "min(78vw, 320px)", mx: "auto", mb: 3.5, borderRadius: 3, objectFit: "cover" }} />;
  }

  return (
    <Box sx={{ display: "grid", placeItems: "center", width: "min(78vw, 320px)", height: "min(78vw, 320px)", mx: "auto", mb: 3.5, borderRadius: 3, bgcolor: productId === "water" ? "#e8f6fb" : "#f2f2f2", color: productId === "water" ? "#2b8ec3" : "#666", "& .MuiSvgIcon-root": { fontSize: 112 } }}>
      {product.icon}
    </Box>
  );
}

function DetailRow({ label, value, muted = false, emphasis = false, valueColor = "text.primary" }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 2, alignItems: "baseline" }}>
      <Typography color="text.secondary" sx={{ fontSize: 18, lineHeight: 1.3 }}>{label}</Typography>
      <Typography color={muted ? "text.disabled" : valueColor} sx={{ fontSize: emphasis ? 21 : 18, fontWeight: emphasis ? 700 : 600, textAlign: "right", lineHeight: 1.3 }}>{value}</Typography>
    </Box>
  );
}

const cardSx = { borderRadius: 3, bgcolor: "background.paper", boxShadow: "0 4px 12px rgba(15,23,42,0.16)" };
