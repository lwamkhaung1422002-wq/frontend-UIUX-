import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Toolbar,
  Typography,
  useMediaQuery,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CreditCardRoundedIcon from "@mui/icons-material/CreditCardRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";
import QrCodeScannerRoundedIcon from "@mui/icons-material/QrCodeScannerRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import SellOutlinedIcon from "@mui/icons-material/SellOutlined";
import WaterDropRoundedIcon from "@mui/icons-material/WaterDropRounded";
import { DesktopPage, DesktopPanel } from "../../components/Desktop/DesktopUI";

const taxRate = 0.05;

const initialItems = [
  {
    id: "water",
    name: "Water",
    price: 1000,
    stock: 100,
    quantity: 5,
    promotion: { type: "discount", value: 500 },
    icon: <WaterDropRoundedIcon />,
    color: "#38a5dd",
  },
  {
    id: "air-x",
    name: "Air X",
    price: 1200,
    stock: 98,
    quantity: 2,
    promotion: { type: "free", text: "2 pcs free" },
    icon: <Inventory2RoundedIcon />,
    color: "#1976d2",
  },
];

const formatMoney = (amount) => `${new Intl.NumberFormat("en-US").format(amount)} ကျပ်`;

function ProductCard({ item, onQuantityChange }) {
  const lineTotal = item.price * item.quantity;
  const promotionText = item.promotion.type === "discount"
    ? `Discount  ${formatMoney(item.promotion.value)}`
    : item.promotion.text;

  return (
    <Card sx={{ minHeight: 148, borderRadius: 2.5, boxShadow: "0 2px 8px rgba(15,23,42,0.14)" }}>
      <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Stack direction="row" spacing={1.5}>
          <Box sx={{ display: "grid", placeItems: "center", width: 78, height: 104, borderRadius: 2, bgcolor: "#edf7fc", color: item.color, flexShrink: 0 }}>
            {item.icon}
          </Box>
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", columnGap: 1, alignItems: "start" }}>
              <Box>
                <Typography fontWeight={700}>{item.name}</Typography>
                <Typography sx={{ mt: 0.25 }}>{formatMoney(item.price)}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>Stock: {item.stock} pcs</Typography>
              </Box>
              <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                <Box sx={{ display: "grid", gridTemplateColumns: "44px 40px 44px", height: 46, border: "1px solid #1976d2", borderRadius: 1.5, overflow: "hidden" }}>
                  <IconButton size="small" aria-label={`Reduce ${item.name} quantity`} onClick={() => onQuantityChange(item.id, -1)} sx={{ borderRadius: 0, color: "#1976d2", borderRight: "1px solid #1976d2" }}><RemoveRoundedIcon /></IconButton>
                  <Typography sx={{ display: "grid", placeItems: "center", fontWeight: 600 }}>{item.quantity}</Typography>
                  <IconButton size="small" aria-label={`Increase ${item.name} quantity`} onClick={() => onQuantityChange(item.id, 1)} sx={{ borderRadius: 0, color: "#1976d2", borderLeft: "1px solid #1976d2" }}><AddRoundedIcon /></IconButton>
                </Box>
                <Typography fontWeight={700} sx={{ mt: 0.8 }}>{formatMoney(lineTotal)}</Typography>
              </Box>
            </Box>
            <Stack direction="row" spacing={0.8} alignItems="center" sx={{ minHeight: 38, mt: 1.1, px: 1, py: 0.65, borderRadius: 1.5, bgcolor: "#f0faf2", color: "#278a45" }}>
              {item.promotion.type === "discount" ? <SellOutlinedIcon fontSize="small" /> : <Inventory2RoundedIcon fontSize="small" />}
              <Typography variant="body2" fontWeight={500}>{promotionText}</Typography>
            </Stack>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function CreateOrderPage() {
  const isMobile = useMediaQuery("(max-width:768px)");
  const navigate = useNavigate();
  const [items, setItems] = useState(initialItems);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [otherAnchor, setOtherAnchor] = useState(null);
  const [otherPayment, setOtherPayment] = useState("unpaid");
  const [amountReceived, setAmountReceived] = useState("10000");
  const [transactionId, setTransactionId] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [note, setNote] = useState("");
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");

  const totals = useMemo(() => {
    const quantity = items.reduce((total, item) => total + item.quantity, 0);
    const itemsTotal = items.reduce((total, item) => total + item.price * item.quantity, 0);
    const discount = items.reduce((total, item) => total + (item.promotion.type === "discount" ? item.promotion.value : 0), 0);
    const tax = Math.round((itemsTotal - discount) * taxRate);
    return { quantity, itemsTotal, discount, tax, total: itemsTotal - discount + tax };
  }, [items]);

  const cashAmount = Number(amountReceived.replace(/,/g, "")) || 0;
  const isWallet = paymentMethod === "kbzpay" || paymentMethod === "wavepay";
  const isPartial = paymentMethod === "other" && otherPayment === "partial";
  const showsAmountReceived = paymentMethod === "cash" || isPartial;

  const changeQuantity = (id, change) => {
    setItems((current) => current.map((item) => item.id === id
      ? { ...item, quantity: Math.max(1, Math.min(item.stock, item.quantity + change)) }
      : item));
  };

  const selectOtherPayment = (value) => {
    setPaymentMethod("other");
    setOtherPayment(value);
    setOtherAnchor(null);
  };

  const addProductFromPicker = (id) => {
    changeQuantity(id, 1);
    setProductPickerOpen(false);
  };

  if (!isMobile) return <DesktopCreateOrder items={items} totals={totals} changeQuantity={changeQuantity} paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod} amountReceived={amountReceived} setAmountReceived={setAmountReceived} buyerName={buyerName} setBuyerName={setBuyerName} note={note} setNote={setNote} navigate={navigate} />;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f8fafc", pb: 3 }}>
      <AppBar position="sticky" elevation={0} sx={{ bgcolor: "#1976d2" }}>
        <Toolbar sx={{ minHeight: 64, display: "grid", gridTemplateColumns: "1fr auto 1fr" }}>
          <IconButton aria-label="Back to orders" onClick={() => navigate("/sale")} sx={{ justifySelf: "start", color: "#fff" }}><ArrowBackRoundedIcon /></IconButton>
          <Typography variant="h6" fontWeight={700}>Create Order</Typography>
          <IconButton aria-label="Scan barcode" sx={{ justifySelf: "end", color: "#fff" }}><QrCodeScannerRoundedIcon /></IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ px: 2, py: 2 }}>
        <Button fullWidth startIcon={<AddRoundedIcon />} onClick={() => setProductPickerOpen(true)} sx={{ minHeight: 58, bgcolor: "#fff", borderRadius: 2.5, color: "#1976d2", boxShadow: "0 2px 7px rgba(15,23,42,0.14)", fontWeight: 600, fontSize: 16, textTransform: "none" }}>
          Add Product
        </Button>

        <Stack spacing={1.5} sx={{ mt: 2 }}>
          {items.map((item) => <ProductCard key={item.id} item={item} onQuantityChange={changeQuantity} />)}
        </Stack>

        <Card sx={{ mt: 2, borderRadius: 2.5, boxShadow: "0 2px 8px rgba(15,23,42,0.14)" }}>
          <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
            <Stack spacing={1.1}>
              <SummaryRow label="Total quantity" value={`${totals.quantity} pcs`} />
              <SummaryRow label="Total" value={formatMoney(totals.itemsTotal)} />
              <SummaryRow label="Discount" value={formatMoney(totals.discount)} valueColor="#278a45" />
              <SummaryRow label={`Tax (${taxRate * 100}%)`} value={formatMoney(totals.tax)} />
              <Box sx={{ borderTop: "1px solid #cbd5e1", pt: 1.25, mt: 0.4 }}>
                <SummaryRow label="Total" value={formatMoney(totals.total)} strong valueColor="#1976d2" />
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ mt: 2, borderRadius: 2.5, boxShadow: "0 2px 8px rgba(15,23,42,0.14)" }}>
          <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
            <Typography fontWeight={700}>Payment Method</Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 0.8, mt: 1.25 }}>
              <PaymentButton label="Cash" icon={<CreditCardRoundedIcon />} active={paymentMethod === "cash"} onClick={() => setPaymentMethod("cash")} />
              <PaymentButton label="KBZPay" active={paymentMethod === "kbzpay"} onClick={() => setPaymentMethod("kbzpay")} />
              <PaymentButton label="WavePay" active={paymentMethod === "wavepay"} onClick={() => setPaymentMethod("wavepay")} />
              <PaymentButton label="Other" icon={<MoreHorizRoundedIcon />} active={paymentMethod === "other"} onClick={(event) => setOtherAnchor(event.currentTarget)} />
            </Box>

            <Menu anchorEl={otherAnchor} open={Boolean(otherAnchor)} onClose={() => setOtherAnchor(null)}>
              <MenuItem selected={otherPayment === "unpaid"} onClick={() => selectOtherPayment("unpaid")}>Unpaid</MenuItem>
              <MenuItem selected={otherPayment === "partial"} onClick={() => selectOtherPayment("partial")}>Partial</MenuItem>
            </Menu>

            {paymentMethod === "other" && <Chip label={otherPayment === "partial" ? "Partial payment" : "Unpaid"} size="small" sx={{ mt: 1.25, borderRadius: 1, bgcolor: "#fff7ed", color: "#c2410c", fontWeight: 500 }} />}

            {paymentMethod === "other" && otherPayment === "unpaid" && <>
              <Typography variant="body2" sx={{ mt: 1.75, mb: 0.7 }}>Buyer name</Typography>
              <TextField fullWidth required value={buyerName} onChange={(event) => setBuyerName(event.target.value)} placeholder="Enter buyer name" />
            </>}

            {showsAmountReceived && <>
              <Typography variant="body2" sx={{ mt: 1.75, mb: 0.7 }}>Amount received</Typography>
              <TextField fullWidth value={amountReceived} onChange={(event) => setAmountReceived(event.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" InputProps={{ endAdornment: <InputAdornment position="end">ကျပ်</InputAdornment> }} />
            </>}

            {paymentMethod === "cash" && <>
              <Typography variant="body2" sx={{ mt: 1.5, mb: 0.7 }}>Change</Typography>
              <TextField fullWidth value={formatMoney(Math.max(0, cashAmount - totals.total))} InputProps={{ readOnly: true }} sx={{ "& .MuiOutlinedInput-root": { bgcolor: "#f1f5f9" } }} />
            </>}

            {isPartial && <>
              <Typography variant="body2" sx={{ mt: 1.5, mb: 0.7 }}>Remaining balance</Typography>
              <TextField fullWidth value={formatMoney(Math.max(0, totals.total - cashAmount))} InputProps={{ readOnly: true }} sx={{ "& .MuiOutlinedInput-root": { bgcolor: "#f1f5f9" } }} />
            </>}

            {isWallet && <>
              <Typography variant="body2" sx={{ mt: 1.75, mb: 0.7 }}>Transaction ID</Typography>
              <TextField fullWidth required value={transactionId} onChange={(event) => setTransactionId(event.target.value)} placeholder="Enter transaction ID" />
            </>}
          </CardContent>
        </Card>

        <Card sx={{ mt: 2, borderRadius: 2.5, boxShadow: "0 2px 8px rgba(15,23,42,0.14)" }}>
          <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
            <TextField fullWidth label="Note (optional)" placeholder="Add a note..." value={note} onChange={(event) => setNote(event.target.value)} multiline minRows={2} />
          </CardContent>
        </Card>

        <Button fullWidth variant="contained" startIcon={<CheckRoundedIcon />} sx={{ mt: 2, minHeight: 54, borderRadius: 2, bgcolor: "#1976d2", fontSize: 17, fontWeight: 600, textTransform: "none", "&:hover": { bgcolor: "#1565c0" } }}>
          Create Order
        </Button>
      </Box>

      <Drawer
        anchor="bottom"
        open={productPickerOpen}
        onClose={() => setProductPickerOpen(false)}
        slotProps={{
          paper: {
            sx: {
              left: 0,
              right: 0,
              width: "100%",
              height: "78vh",
              maxHeight: "78vh",
              borderTopLeftRadius: "24px",
              borderTopRightRadius: "24px",
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              overflow: "hidden",
              bgcolor: "background.paper",
            },
          },
        }}
        sx={{
          "& .MuiDrawer-paper": {
            left: 0,
            right: 0,
            width: "100%",
            height: "78vh",
            maxHeight: "78vh",
            borderTopLeftRadius: "24px",
            borderTopRightRadius: "24px",
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            overflow: "hidden",
            bgcolor: "background.paper",
          },
          "& .MuiBackdrop-root": { bgcolor: "rgba(15, 23, 42, 0.62)" },
        }}
      >
        <Box sx={{ width: "100%", pt: 3.75 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", px: 3 }}>
            <Typography sx={{ color: "#111827", fontSize: 29, fontWeight: 700, lineHeight: 1.15 }}>Add Products</Typography>
            <IconButton aria-label="Scan product barcode" sx={{ p: 0.5, color: "#111827" }}><QrCodeScannerRoundedIcon sx={{ fontSize: 30 }} /></IconButton>
          </Box>

          <TextField
          fullWidth
          value={productSearch}
          onChange={(event) => setProductSearch(event.target.value)}
          placeholder="Search products..."
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchRoundedIcon /></InputAdornment>,
          }}
          sx={{
            mt: 4.25,
            mx: 3,
            width: "calc(100% - 48px)",
            "& .MuiOutlinedInput-root": {
              minHeight: 56,
              borderRadius: 2.25,
              bgcolor: "#f5f5f5",
              fontSize: 18,
              px: 1.5,
              "& fieldset": { border: 0 },
            },
            "& .MuiInputAdornment-root": { mr: 1.5 },
            "& .MuiSvgIcon-root": { fontSize: 31, color: "#0f172a" },
          }}
          />

          {items
            .filter((item) => item.name.toLowerCase().includes(productSearch.trim().toLowerCase()))
            .map((item) => (
          <Box key={item.id} sx={{ px: 3 }}>
          <Stack direction="row" alignItems="center" spacing={2.25} sx={{ mt: 3.25, minHeight: 76 }}>
            <Box sx={{ display: "grid", placeItems: "center", width: 64, height: 64, color: item.color, flexShrink: 0 }}>
              {item.icon}
            </Box>
            <Box sx={{ flexGrow: 1 }}>
              <Typography sx={{ color: "#111827", fontSize: 20, fontWeight: 500, lineHeight: 1.2 }}>{item.name}</Typography>
              <Typography sx={{ mt: 0.75, color: "#111827", fontSize: 17 }}>{formatMoney(item.price)} · Stock: {item.stock}</Typography>
            </Box>
            <IconButton aria-label={`Add ${item.name}`} onClick={() => addProductFromPicker(item.id)} sx={{ width: 42, height: 42, flexShrink: 0, bgcolor: "#1976d2", color: "#fff", "&:hover": { bgcolor: "#1565c0" } }}>
              <AddRoundedIcon sx={{ fontSize: 27 }} />
            </IconButton>
          </Stack>
          </Box>
        ))}
        </Box>
      </Drawer>
    </Box>
  );
}

function DesktopCreateOrder({ items, totals, changeQuantity, paymentMethod, setPaymentMethod, amountReceived, setAmountReceived, buyerName, setBuyerName, note, setNote, navigate }) {
  const received = Number(amountReceived.replace(/,/g, "")) || 0;
  const change = Math.max(0, received - totals.total);
  return <DesktopPage title="Create Order" subtitle="Add products and complete the checkout." actionLabel="Complete Order" onAction={() => navigate("/sale")} actionIcon={<CheckRoundedIcon />}><Box sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(360px, 0.65fr)", gap: 3 }}><DesktopPanel><Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2.5 }}><Typography sx={{ fontSize: 19, fontWeight: 700 }}>Order Items</Typography><Button startIcon={<AddRoundedIcon />} variant="outlined" sx={{ textTransform: "none" }}>Add Product</Button></Box><Stack spacing={1.5}>{items.map((item) => <ProductCard key={item.id} item={item} onQuantityChange={changeQuantity} />)}</Stack></DesktopPanel><Box sx={{ display: "grid", gap: 3, alignContent: "start" }}><DesktopPanel><Typography sx={{ fontSize: 19, fontWeight: 700, mb: 2 }}>Order Summary</Typography><Stack spacing={1.25}><DesktopTotal label="Total quantity" value={`${totals.quantity} pcs`} /><DesktopTotal label="Total" value={formatMoney(totals.itemsTotal)} /><DesktopTotal label="Discount" value={`-${formatMoney(totals.discount)}`} color="success.main" /><DesktopTotal label="Tax (5%)" value={formatMoney(totals.tax)} /><Divider /><DesktopTotal label="Grand Total" value={formatMoney(totals.total)} color="primary.main" strong /></Stack></DesktopPanel><DesktopPanel><Typography sx={{ fontSize: 19, fontWeight: 700, mb: 2 }}>Payment Method</Typography><Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, mb: 2.5 }}>{[["cash", "Cash"], ["kbzpay", "KBZPay"], ["wavepay", "WavePay"]].map(([value, label]) => <Button key={value} variant={paymentMethod === value ? "contained" : "outlined"} onClick={() => setPaymentMethod(value)} sx={{ minHeight: 42, textTransform: "none" }}>{label}</Button>)}</Box>{paymentMethod === "cash" && <><Typography color="text.secondary" sx={{ fontSize: 14, mb: 0.75 }}>Amount received</Typography><TextField fullWidth value={amountReceived} onChange={(event) => setAmountReceived(event.target.value)} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} /><Box sx={{ mt: 2 }}><DesktopTotal label="Change" value={formatMoney(change)} color="success.main" strong /></Box></>}<TextField fullWidth value={buyerName} onChange={(event) => setBuyerName(event.target.value)} placeholder="Buyer name (for unpaid orders)" sx={{ mt: 2, "& .MuiOutlinedInput-root": { borderRadius: 2 } }} /><TextField fullWidth value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add a note..." multiline minRows={3} sx={{ mt: 1.5, "& .MuiOutlinedInput-root": { borderRadius: 2 } }} /></DesktopPanel></Box></Box></DesktopPage>;
}

function DesktopTotal({ label, value, color = "text.primary", strong = false }) { return <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><Typography sx={{ fontWeight: strong ? 700 : 400 }}>{label}</Typography><Typography color={color} sx={{ fontSize: strong ? 20 : 16, fontWeight: strong ? 700 : 600 }}>{value}</Typography></Box>; }

function SummaryRow({ label, value, strong = false, valueColor = "text.primary" }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", alignItems: "center", columnGap: 2, width: "100%" }}>
      <Typography fontWeight={strong ? 700 : 400}>{label}</Typography>
      <Typography color={valueColor} fontWeight={strong ? 700 : 500} sx={{ textAlign: "right" }}>{value}</Typography>
    </Box>
  );
}

function PaymentButton({ label, icon, active, onClick }) {
  return (
    <Button onClick={onClick} variant="outlined" sx={{ minWidth: 0, minHeight: 52, borderRadius: 1.5, borderColor: active ? "#1976d2" : "#d1d5db", bgcolor: active ? "#eaf3ff" : "#fff", color: active ? "#1976d2" : "#475569", textTransform: "none", fontSize: 11, px: 0.4, "&:hover": { borderColor: "#1976d2", bgcolor: "#f8fbff" } }}>
      <Stack direction="column" alignItems="center" spacing={0.15}>
        {icon}
        <span>{label}</span>
      </Stack>
    </Button>
  );
}
