import { Box, Button, Card, CardContent, Divider, IconButton, Stack, Typography, useMediaQuery } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import ShareRoundedIcon from "@mui/icons-material/ShareRounded";
import { useNavigate, useParams } from "react-router";
import { useTheme } from "@mui/material/styles";
import { demoOrders } from "../../data/dashboardData";

const formatKyat = (amount) => `${new Intl.NumberFormat("en-US").format(amount)} ကျပ်`;

export default function OrderDetailsPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width:768px)");
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const colors = isDark
    ? { page: "#101010", card: "#1e1e1e", text: "#fff", muted: "#a7a7a7", divider: "rgba(255,255,255,.55)", doneBg: "#153c27", doneBorder: "#317c4a", doneText: "#7be29f" }
    : { page: theme.palette.background.default, card: theme.palette.background.paper, text: theme.palette.text.primary, muted: theme.palette.text.secondary, divider: theme.palette.divider, doneBg: "#e8f6ec", doneBorder: "#b8e3c4", doneText: "#278a45" };
  const cardSx = { bgcolor: colors.card, color: colors.text, borderRadius: 3, border: "1px solid", borderColor: colors.divider, boxShadow: "0 5px 16px rgba(0,0,0,.12)" };
  const order = demoOrders.find((item) => item.id === orderId) ?? demoOrders[0];
  const subtotal = order.amount;
  const discount = 0;
  const tax = 0;
  const itemName = order.quantity > 1 ? "Store items" : "Store item";

  const printOrder = () => window.print();
  const shareOrder = async () => {
    const text = `${order.id} · ${formatKyat(order.amount)}`;
    if (navigator.share) await navigator.share({ title: "Order receipt", text });
    else await navigator.clipboard?.writeText(text);
  };
  const deleteOrder = () => navigate("/sale");

  return <Box sx={{ minHeight: isMobile ? "100vh" : "calc(100vh - 120px)", bgcolor: colors.page, color: colors.text, py: isMobile ? 0 : 3, px: isMobile ? 0 : 3 }}>
    <Box sx={{ maxWidth: isMobile ? "none" : 880, mx: "auto" }}>
      <Box sx={{ minHeight: isMobile ? 64 : 72, px: isMobile ? 1.5 : 0, mx: isMobile ? 2.5 : 0, mt: isMobile ? 1.25 : 0, borderRadius: isMobile ? 2.5 : 0, display: "grid", gridTemplateColumns: "42px minmax(0,1fr) 42px", alignItems: "center", bgcolor: isMobile ? "primary.main" : "transparent", color: isMobile ? "common.white" : colors.text }}>
        <IconButton aria-label="Back to orders" onClick={() => navigate("/sale")} sx={{ color: isMobile ? "common.white" : colors.text, justifySelf: "start" }}><ArrowBackRoundedIcon sx={{ fontSize: 31 }} /></IconButton>
        <Typography noWrap sx={{ textAlign: "center", fontSize: isMobile ? 20 : 24, fontWeight: 700 }}>{order.id}</Typography>
        <Box />
      </Box>
      <Box sx={{ px: isMobile ? 2.5 : 0, pt: isMobile ? 1.5 : 0, pb: 4 }}>
        <Card sx={cardSx}><CardContent sx={{ p: isMobile ? 2.5 : 3, "&:last-child": { pb: isMobile ? 2.5 : 3 } }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2 }}><Typography sx={{ fontSize: isMobile ? 24 : 25, fontWeight: 700 }}>Order Details</Typography><Box sx={{ display: "flex", alignItems: "center", gap: 0.75, px: 1.25, py: 0.7, borderRadius: 99, bgcolor: colors.doneBg, color: colors.doneText, border: "1px solid", borderColor: colors.doneBorder }}><CheckCircleRoundedIcon sx={{ fontSize: 18 }} /><Typography sx={{ fontWeight: 700 }}>Done</Typography></Box></Box>
          <Divider sx={{ my: 2.25, borderColor: colors.divider }} />
          <Stack spacing={1.25}><DetailRow label="Order Number" value={order.id} /><DetailRow label="Order Date" value={`${order.date} ${order.time}`} /><DetailRow label="Payment Status" value={order.paymentStatus} tone={order.paymentStatus === "Paid" ? "#278a45" : "#d14343"} /><DetailRow label="Total Amount" value={formatKyat(order.amount)} tone="#1976d2" /></Stack>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5, mt: 3 }}><Button variant="contained" startIcon={<PrintRoundedIcon />} onClick={printOrder} sx={detailPrimaryButtonSx}>Print</Button><Button variant="contained" startIcon={<ShareRoundedIcon />} onClick={shareOrder} sx={detailPrimaryButtonSx}>Share Receipt</Button></Box>
          <Button fullWidth startIcon={<DeleteOutlineRoundedIcon />} onClick={deleteOrder} color="error" sx={{ mt: 2.25, minHeight: 46, textTransform: "none", fontSize: 16, fontWeight: 700 }}>Delete Order</Button>
        </CardContent></Card>
        <Typography sx={{ fontSize: isMobile ? 21 : 22, fontWeight: 700, mt: 2, mb: 1 }}>Order Items ({order.quantity})</Typography>
        <Card sx={cardSx}><CardContent sx={{ p: 2.25, "&:last-child": { pb: 2.25 } }}><Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2 }}><Box><Typography sx={{ fontSize: 18, fontWeight: 700 }}>{itemName}</Typography><Typography sx={{ color: colors.muted, mt: 0.6 }}>{formatKyat(subtotal)} × {order.quantity}</Typography></Box><Typography sx={{ fontSize: 20, fontWeight: 800 }}>{formatKyat(subtotal)}</Typography></Box></CardContent></Card>
        <Card sx={{ ...cardSx, mt: 2 }}><CardContent sx={{ p: isMobile ? 2.5 : 3, "&:last-child": { pb: isMobile ? 2.5 : 3 } }}><Typography sx={{ fontSize: isMobile ? 24 : 25, fontWeight: 700 }}>Order Summary</Typography><Divider sx={{ my: 2.25, borderColor: colors.divider }} /><Stack spacing={1.25}><DetailRow label="Subtotal" value={formatKyat(subtotal)} /><DetailRow label="Discount" value={`- ${formatKyat(discount)}`} tone="#d14343" /><DetailRow label="Tax" value={`+ ${formatKyat(tax)}`} /></Stack><Divider sx={{ my: 2.25, borderColor: colors.divider }} /><DetailRow label="Total" value={formatKyat(order.amount)} tone="#1976d2" strong /></CardContent></Card>
      </Box>
    </Box>
  </Box>;
}

function DetailRow({ label, value, tone = "inherit", strong = false }) { return <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, alignItems: "center" }}><Typography sx={{ fontSize: strong ? 22 : 17, fontWeight: strong ? 700 : 400 }}>{label}</Typography><Typography sx={{ color: tone, fontSize: strong ? 23 : 17, fontWeight: strong ? 800 : 600, textAlign: "right" }}>{value}</Typography></Box>; }

const detailPrimaryButtonSx = { minHeight: 58, borderRadius: 1.75, bgcolor: "#5b9af2", color: "#fff", textTransform: "none", fontSize: 16, fontWeight: 700, "&:hover": { bgcolor: "#4385e2" } };
