import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  AppBar,
  Box,
  Card,
  CardContent,
  CircularProgress,
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
import { DesktopPage, DesktopPanel, DesktopStat } from "../../components/Desktop/DesktopUI";
import { usePosApi } from "../../hooks/useApiResource";

const formatMoney = (amount) => `${new Intl.NumberFormat("en-US").format(Number(amount || 0))} ကျပ်`;
const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : "Not set");
const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : "—");

export default function ProductDetailsPage() {
  const isMobile = useMediaQuery("(max-width:768px)");
  const navigate = useNavigate();
  const { productId } = useParams();
  const api = usePosApi();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const removeProduct = async () => {
    if (!window.confirm("Remove this product? This cannot be undone from the active product list.")) return;
    setDeleting(true);
    try {
      await api.products.remove(productId);
      navigate("/stock");
    } catch (requestError) {
      window.alert(requestError.message || "Unable to remove this product.");
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    let active = true;

    Promise.all([
      api.products.get(productId),
      api.inventory.list(),
      api.inventory.movements({ productId, limit: 5 }),
    ])
      .then(([productResult, inventoryResult, movementResult]) => {
        if (!active) return;

        const apiProduct = productResult.product;
        const stock = (inventoryResult.inventory || [])
          .filter((batch) => batch.productId === productId)
          .reduce((total, batch) => total + Number(batch.quantity || 0), 0);
        const latestMovement = (movementResult.movements || [])[0];
        const isOut = latestMovement?.direction === "OUT";
        const itemCode = (apiProduct.barcodes || []).find((barcode) => barcode.status === "ACTIVE" && !barcode.isPrimary && /^[A-Z]{2}[0-9]{4}$/.test(barcode.value));

        setProduct({
          name: apiProduct.name,
          description: apiProduct.description || "Not set",
          sku: apiProduct.sku || "Not set",
          barcode: productResult.activeBarcode?.value || "Not set",
          itemCode: itemCode?.value || "Not set",
          category: apiProduct.category?.name || "Uncategorized",
          created: formatDateTime(apiProduct.createdAt),
          updated: formatDateTime(apiProduct.updatedAt),
          cost: Number(apiProduct.cost || 0),
          price: Number(apiProduct.price || 0),
          stock,
          minimumStock: 10,
          icon: <Inventory2RoundedIcon />,
          movement: latestMovement
            ? {
                type: isOut ? "OUT" : "IN",
                quantity: `${isOut ? "-" : "+"}${Number(latestMovement.enteredQuantity || 0)}`,
                reason: latestMovement.reason || latestMovement.type,
                date: formatDate(latestMovement.occurredAt),
              }
            : { type: "IN", quantity: "0", reason: "No stock movements yet.", date: "—" },
        });
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || "Unable to load product details.");
      });

    return () => {
      active = false;
    };
  }, [api, productId]);

  if (error) return <ProductNotFound message={error} navigate={navigate} />;
  if (!product) {
    return <Box sx={{ minHeight: "70vh", display: "grid", placeItems: "center" }}><CircularProgress /></Box>;
  }

  const profit = product.price - product.cost;
  const profitPercent = product.cost ? (profit / product.cost) * 100 : 0;
  const stockHealth = Math.min(100, Math.round((product.stock / Math.max(product.minimumStock, 1)) * 100));

  if (!isMobile) {
    return <DesktopProductDetails product={product} productId={productId} profit={profit} profitPercent={profitPercent} stockHealth={stockHealth} navigate={navigate} />;
  }

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
          <IconButton aria-label="Delete product" disabled={deleting} onClick={removeProduct} sx={{ color: "common.white", ml: 1, p: 0.75 }}>
            <DeleteRoundedIcon sx={{ fontSize: 29 }} />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ px: 3, py: 3.25, display: "grid", gap: 3 }}>
        <Card sx={cardSx}>
          <CardContent sx={{ p: 3.5, "&:last-child": { pb: 3.5 } }}>
            <ProductImage product={product} />
            <Typography align="center" sx={{ fontSize: 36, fontWeight: 700, lineHeight: 1.15, mb: 4 }}>{product.name}</Typography>
            <Box sx={{ display: "grid", rowGap: 2.25 }}>
              <DetailRow label="Description" value={product.description} muted={product.description === "Not set"} />
              <DetailRow label="SKU" value={product.sku} muted={product.sku === "Not set"} />
              <DetailRow label="Barcode" value={product.barcode} muted={product.barcode === "Not set"} />
              <DetailRow label="Item Code" value={product.itemCode} muted={product.itemCode === "Not set"} />
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

        <MovementPanel product={product} navigate={navigate} />
      </Box>
    </Box>
  );
}

function DesktopProductDetails({ product, productId, profit, profitPercent, stockHealth, navigate }) {
  return <DesktopPage title={product.name} subtitle="Product details, pricing, and current stock." actionLabel="Edit Product" onAction={() => navigate(`/stock/add?edit=${productId}`)} actionIcon={<EditRoundedIcon />}><Box sx={{ display: "grid", gridTemplateColumns: "minmax(360px, 0.75fr) minmax(0, 1.25fr)", gap: 3 }}><DesktopPanel><Box sx={{ width: 260, height: 260, mx: "auto", display: "grid", placeItems: "center", bgcolor: "#f2f2f2", color: "#666", borderRadius: 3, "& .MuiSvgIcon-root": { fontSize: 110 } }}>{product.icon}</Box><Typography align="center" sx={{ fontSize: 28, fontWeight: 700, mt: 2.5 }}>{product.name}</Typography><Box sx={{ display: "grid", gap: 1.5, mt: 3 }}><DesktopDetail label="Description" value={product.description} muted={product.description === "Not set"} /><DesktopDetail label="SKU" value={product.sku} muted={product.sku === "Not set"} /><DesktopDetail label="Barcode" value={product.barcode} muted={product.barcode === "Not set"} /><DesktopDetail label="Item Code" value={product.itemCode} muted={product.itemCode === "Not set"} /><DesktopDetail label="Category" value={product.category} /><DesktopDetail label="Created" value={product.created} /><DesktopDetail label="Updated" value={product.updated} /></Box></DesktopPanel><Box sx={{ display: "grid", gap: 3, alignContent: "start" }}><Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2.25 }}><DesktopStat label="Cost Price" value={formatMoney(product.cost)} /><DesktopStat label="Selling Price" value={formatMoney(product.price)} color="primary.main" /></Box><DesktopPanel><Typography sx={{ fontSize: 19, fontWeight: 700, mb: 2 }}>Profitability</Typography><Box sx={{ p: 2.5, borderRadius: 2.5, bgcolor: "#f0f9f1", border: "1px solid", borderColor: "success.light", display: "grid", gap: 1.5 }}><DesktopDetail label="Profit Margin" value={formatMoney(profit)} color="success.main" /><DesktopDetail label="Profit %" value={`${profitPercent.toFixed(1)}%`} color="success.main" /></Box></DesktopPanel><DesktopPanel><Box sx={{ display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: 3, alignItems: "center" }}><Box sx={{ p: 3, borderRadius: 2.5, bgcolor: "#eaf3ff", textAlign: "center" }}><Typography color="text.secondary">Current Stock</Typography><Typography color="primary.main" sx={{ fontSize: 36, fontWeight: 700, mt: 1 }}>{product.stock} pcs</Typography></Box><Box><DesktopDetail label="Min Stock Alert" value={`${product.minimumStock} pcs`} /><Box sx={{ mt: 2.5 }}><DesktopDetail label="Stock Health" value={`${stockHealth}%`} color="success.main" /><LinearProgress variant="determinate" value={stockHealth} color="success" sx={{ mt: 1.25, height: 10, borderRadius: 99 }} /></Box></Box></Box></DesktopPanel><MovementPanel product={product} navigate={navigate} desktop /></Box></Box></DesktopPage>;
}

function MovementPanel({ product, navigate, desktop = false }) {
  const content = <Box sx={{ display: "grid", gridTemplateColumns: "auto minmax(0, 1fr) auto", columnGap: 1.75, alignItems: "start" }}><Box sx={{ border: 1.5, borderColor: product.movement.type === "IN" ? "success.main" : "error.main", color: product.movement.type === "IN" ? "success.main" : "error.main", borderRadius: 999, px: 1.4, py: 0.8, fontSize: 16, fontWeight: 700 }}>{product.movement.type}</Box><Box><Typography color={product.movement.type === "IN" ? "success.main" : "error.main"} sx={{ fontSize: desktop ? 16 : 21, fontWeight: 700, lineHeight: 1.15 }}>{product.movement.quantity}</Typography><Typography color="text.secondary" sx={{ mt: 1, fontSize: desktop ? 14 : 17 }}>{product.movement.reason}</Typography></Box><Typography color="text.secondary" sx={{ fontSize: desktop ? 14 : 15, whiteSpace: "nowrap" }}>{product.movement.date}</Typography></Box>;
  if (desktop) return <DesktopPanel><Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}><Typography sx={{ fontSize: 19, fontWeight: 700 }}>Recent Stock Movements</Typography><Typography color="primary.main" onClick={() => navigate("/stock/history")} sx={{ cursor: "pointer", fontWeight: 700 }}>View All</Typography></Box>{content}</DesktopPanel>;
  return <Card sx={cardSx}><CardContent sx={{ p: 3.5, "&:last-child": { pb: 3.5 } }}><Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}><Typography sx={{ minWidth: 0, fontSize: 20, fontWeight: 700, whiteSpace: "nowrap", "@media (min-width:400px)": { fontSize: 24 } }}>Recent Stock Movements</Typography><Typography color="primary.main" onClick={() => navigate("/stock/history")} sx={{ fontSize: 18, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>View All</Typography></Box>{content}</CardContent></Card>;
}

function DesktopDetail({ label, value, muted, color = "text.primary" }) { return <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}><Typography color="text.secondary">{label}</Typography><Typography color={muted ? "text.disabled" : color} fontWeight={600}>{value}</Typography></Box>; }

function ProductImage({ product }) { return <Box sx={{ display: "grid", placeItems: "center", width: "min(78vw, 320px)", height: "min(78vw, 320px)", mx: "auto", mb: 3.5, borderRadius: 3, bgcolor: "#f2f2f2", color: "#666", "& .MuiSvgIcon-root": { fontSize: 112 } }}>{product.icon}</Box>; }

function DetailRow({ label, value, muted = false, emphasis = false, valueColor = "text.primary" }) { return <Box sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 2, alignItems: "baseline" }}><Typography color="text.secondary" sx={{ fontSize: 18, lineHeight: 1.3 }}>{label}</Typography><Typography color={muted ? "text.disabled" : valueColor} sx={{ fontSize: emphasis ? 21 : 18, fontWeight: emphasis ? 700 : 600, textAlign: "right", lineHeight: 1.3 }}>{value}</Typography></Box>; }

function ProductNotFound({ message, navigate }) { return <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 3, textAlign: "center" }}><Box><Typography variant="h6" fontWeight={700}>Product not found</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>{message}</Typography><IconButton onClick={() => navigate("/stock")} sx={{ mt: 2 }}><ArrowBackRoundedIcon /></IconButton></Box></Box>; }

const cardSx = { borderRadius: 3, bgcolor: "background.paper", boxShadow: "0 4px 12px rgba(15,23,42,0.16)" };
