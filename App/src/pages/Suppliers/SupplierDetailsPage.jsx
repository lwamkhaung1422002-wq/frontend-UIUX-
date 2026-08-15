import { useLocation, useNavigate, useParams } from "react-router";
import { AppBar, Box, Button, IconButton, Paper, Toolbar, Typography } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";

const suppliers = {
  "125978": { name: "Pahtama Group", phone: "09666655928", invoice: "125978", deliveryName: "Ko Aung", deliveryPhone: "09770011223", receiver: "Store Manager", receiveDate: "10/05/2026", amount: "374,000 ကျပ်", status: "Credit", due: "20/05/2026" },
  "111548": { name: "Unilever", phone: "09123456789", invoice: "111548", deliveryName: "Ko Min", deliveryPhone: "09987654321", receiver: "Store Manager", receiveDate: "11/06/2026", amount: "16,000 ကျပ်", status: "Paid", due: "11/06/2026", method: "KBZPay", settlement: { username: "Unilever Finance", account: "09 765 432 100", transactionId: "KBZ-0611-16000", paidDate: "11/06/2026" } },
};

export default function SupplierDetailsPage() {
  const { supplierId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const supplier = suppliers[supplierId] ?? suppliers["125978"];
  const dateLabel = supplier.status === "Paid" ? "Paid Date" : "Due Date";
  const backTo = location.state?.from || "/suppliers";
  return <Box sx={{ minHeight: "100vh", bgcolor: "background.default", fontFamily: "Inter, Roboto, Noto Sans Myanmar, sans-serif" }}><AppBar position="sticky" elevation={0} sx={{ bgcolor: "primary.main" }}><Toolbar sx={{ minHeight: 64, display: "grid", gridTemplateColumns: "1fr auto 1fr" }}><IconButton aria-label="Back to suppliers" onClick={() => navigate(backTo)} sx={{ color: "common.white", justifySelf: "start" }}><ArrowBackRoundedIcon /></IconButton><Typography sx={{ fontSize: 20, fontWeight: 600 }}>Supplier Details</Typography><Box /></Toolbar></AppBar><Box sx={{ p: 2.5, maxWidth: 520, mx: "auto" }}><Paper elevation={2} sx={{ p: 2, borderRadius: 2 }}><Detail icon={<StorefrontOutlinedIcon />} label="Supplier Name" value={supplier.name} /><Detail icon={<PhoneOutlinedIcon />} label="Phone" value={supplier.phone} /><Detail icon={<ReceiptLongOutlinedIcon />} label="Invoice Number" value={supplier.invoice} /><Detail icon={<LocalShippingOutlinedIcon />} label="Delivery Name" value={supplier.deliveryName} /><Detail icon={<PhoneOutlinedIcon />} label="Delivery Phone" value={supplier.deliveryPhone} /><Detail icon={<PersonOutlineRoundedIcon />} label="Receiver Name" value={supplier.receiver} /><Detail icon={<CalendarTodayOutlinedIcon />} label="Receive Date" value={supplier.receiveDate} /><Detail icon={<PaymentsOutlinedIcon />} label="Total Amount" value={supplier.amount} accent /><Detail icon={<CalendarTodayOutlinedIcon />} label={dateLabel} value={supplier.due} /></Paper>{supplier.status === "Paid" && supplier.settlement && <PaymentRecord settlement={supplier.settlement} method={supplier.method} />}{supplier.status !== "Paid" && <Button fullWidth variant="contained" startIcon={<PaymentsOutlinedIcon />} onClick={() => navigate(`/suppliers/${supplierId}/pay`, { state: { from: backTo } })} sx={{ mt: 2.5, minHeight: 56, borderRadius: 1.5, textTransform: "none", fontSize: 16, fontWeight: 600 }}>Add Payment</Button>}</Box></Box>;
}

function PaymentRecord({ settlement, method }) { const isCash = method === "Cash"; return <Paper elevation={2} sx={{ mt: 2, p: 2, borderRadius: 2 }}><Typography sx={{ mb: .5, fontSize: 17, fontWeight: 700 }}>Payment record</Typography><Detail icon={<CalendarTodayOutlinedIcon />} label="Paid Date" value={settlement.paidDate} /><Detail icon={<PaymentsOutlinedIcon />} label="Payment Method" value={method} />{isCash ? <><Detail icon={<PersonOutlineRoundedIcon />} label="Receiver Name" value={settlement.receiver} /><Detail icon={<ReceiptLongOutlinedIcon />} label="Receiver Signature" value={settlement.signature} /></> : <><Detail icon={<PersonOutlineRoundedIcon />} label="User Name" value={settlement.username} /><Detail icon={<PhoneOutlinedIcon />} label="Account Number" value={settlement.account} /><Detail icon={<ReceiptLongOutlinedIcon />} label="Transaction ID" value={settlement.transactionId} /></>}</Paper>; }

function Detail({ icon, label, value, accent = false }) { return <Box sx={{ display: "grid", gridTemplateColumns: "40px minmax(0, 1fr) auto", alignItems: "center", gap: 1.25, py: 1.75, borderBottom: "1px solid", borderColor: "divider", "&:last-child": { borderBottom: 0 } }}><Box sx={{ width: 36, height: 36, display: "grid", placeItems: "center", borderRadius: 1.25, bgcolor: "#eaf3ff", color: "primary.main" }}>{icon}</Box><Typography color="text.secondary" sx={{ fontSize: 14 }}>{label}</Typography><Typography sx={{ maxWidth: 190, color: accent ? "primary.main" : "text.primary", fontWeight: accent ? 700 : 600, textAlign: "right" }}>{value}</Typography></Box>; }
