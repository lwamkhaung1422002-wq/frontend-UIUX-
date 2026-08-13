import { useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { AppBar, Box, Button, IconButton, InputAdornment, MenuItem, Paper, TextField, Toolbar, Typography } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import WalletOutlinedIcon from "@mui/icons-material/WalletOutlined";

const suppliers = { "125978": { name: "Pahtama Group", outstanding: 374000 }, "111548": { name: "Unilever", outstanding: 16000 } };
const money = (amount) => `${new Intl.NumberFormat("en-US").format(amount)} ကျပ်`;
const inputSx = { mb: 2, "& .MuiOutlinedInput-root": { minHeight: 56, borderRadius: 1.5, bgcolor: "action.hover", "& fieldset": { border: 0 } }, "& .MuiInputBase-input": { fontSize: 16 }, "& .MuiInputLabel-root": { fontSize: 14, fontWeight: 500 }, "& input[type=number]": { MozAppearance: "textfield" }, "& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button": { WebkitAppearance: "none", margin: 0 } };

export default function RecordSupplierPaymentPage() {
  const navigate = useNavigate();
  const { supplierId } = useParams();
  const supplier = suppliers[supplierId] ?? suppliers["125978"];
  const [method, setMethod] = useState("cash");
  const [amount, setAmount] = useState("");
  const [cashName, setCashName] = useState("");
  const [cashPhone, setCashPhone] = useState("");
  const [signature, setSignature] = useState(false);
  const signatureRef = useRef(null);
  const [provider, setProvider] = useState("KBZPay");
  const [mobileName, setMobileName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState("");
  const numericAmount = Number(amount) || 0;
  const remaining = Math.max(0, supplier.outstanding - numericAmount);
  const dueRequired = numericAmount > 0 && numericAmount < supplier.outstanding;
  const valid = useMemo(() => numericAmount > 0 && numericAmount <= supplier.outstanding && (!dueRequired || dueDate) && (method === "cash" ? cashName && cashPhone && signature : mobileName && mobileNumber && transactionId), [cashName, cashPhone, dueDate, dueRequired, method, mobileName, mobileNumber, numericAmount, signature, supplier.outstanding, transactionId]);
  const save = () => { if (!valid) { setError(numericAmount > supplier.outstanding ? "Payment amount cannot exceed outstanding balance." : "Please complete the required payment details."); return; } navigate("/suppliers"); };
  const adornment = (icon) => <InputAdornment position="start" sx={{ color: "text.secondary" }}>{icon}</InputAdornment>;

  const startSignature = (event) => { const canvas = signatureRef.current; const rect = canvas.getBoundingClientRect(); const context = canvas.getContext("2d"); context.beginPath(); context.moveTo(event.clientX - rect.left, event.clientY - rect.top); canvas.setPointerCapture(event.pointerId); };
  const drawSignature = (event) => { const canvas = signatureRef.current; if (!canvas?.hasPointerCapture(event.pointerId)) return; const rect = canvas.getBoundingClientRect(); const context = canvas.getContext("2d"); context.lineWidth = 2; context.lineCap = "round"; context.strokeStyle = "#1f2937"; context.lineTo(event.clientX - rect.left, event.clientY - rect.top); context.stroke(); setSignature(true); };
  const clearSignature = () => { const canvas = signatureRef.current; canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height); setSignature(false); };
  return <Box sx={{ minHeight: "100vh", bgcolor: "background.default", fontFamily: "Inter, Roboto, Noto Sans Myanmar, sans-serif" }}>
    <AppBar position="sticky" elevation={0} sx={{ bgcolor: "primary.main" }}><Toolbar sx={{ minHeight: 64, display: "grid", gridTemplateColumns: "1fr auto 1fr" }}><IconButton aria-label="Back to suppliers" onClick={() => navigate("/suppliers")} sx={{ justifySelf: "start", color: "common.white" }}><ArrowBackRoundedIcon /></IconButton><Typography sx={{ fontSize: 20, fontWeight: 600 }}>Record Payment</Typography><Box /></Toolbar></AppBar>
    <Box sx={{ px: 2.5, py: 3, maxWidth: 520, mx: "auto" }}>
      <Paper elevation={1} sx={{ p: 2, mb: 3, borderRadius: 2 }}><Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}><Box sx={{ width: 48, height: 48, display: "grid", placeItems: "center", borderRadius: "50%", bgcolor: "#e8f6ee", color: "success.main" }}><WalletOutlinedIcon /></Box><Box><Typography color="text.secondary" sx={{ fontSize: 14 }}>{supplier.name} · Outstanding Balance</Typography><Typography sx={{ fontSize: 24, fontWeight: 700, mt: 0.25 }}>{money(supplier.outstanding)}</Typography></Box></Box></Paper>
      <TextField fullWidth select label="Payment Method *" value={method} onChange={(event) => setMethod(event.target.value)} slotProps={{ input: { startAdornment: adornment(<PaymentsOutlinedIcon />) } }} sx={inputSx}><MenuItem value="cash">Cash</MenuItem><MenuItem value="mobile">Mobile Payment</MenuItem></TextField>
      <TextField fullWidth label="Amount *" value={amount} onChange={(event) => { setAmount(event.target.value.replace(/[^0-9]/g, "")); setError(""); }} placeholder="Enter payment amount" inputMode="numeric" slotProps={{ input: { startAdornment: adornment(<PaymentsOutlinedIcon />), endAdornment: <InputAdornment position="end">ကျပ်</InputAdornment> } }} sx={inputSx} />
      <Typography color={error ? "error.main" : "text.secondary"} sx={{ mt: -1.25, mb: 2, fontSize: 13 }}>{error || `Outstanding after payment: ${money(remaining)}`}</Typography>
      {method === "cash" ? <><PaymentField label="Receiver Name *" placeholder="Enter receiver name" value={cashName} onChange={(event) => setCashName(event.target.value)} icon={<AccountCircleOutlinedIcon />} /><PaymentField label="Receiver Phone *" placeholder="Enter receiver phone" value={cashPhone} onChange={(event) => setCashPhone(event.target.value)} icon={<PhoneOutlinedIcon />} type="tel" /><Box sx={{ mb: 2 }}><Typography sx={{ mb: 0.75, fontSize: 14, fontWeight: 500 }}>Receiver Signature *</Typography><Box sx={{ position: "relative", height: 130, border: "1px dashed", borderColor: "primary.light", borderRadius: 1.5, bgcolor: "#fafcff", overflow: "hidden" }}><Box component="canvas" ref={signatureRef} width={440} height={130} aria-label="Receiver signature pad" onPointerDown={startSignature} onPointerMove={drawSignature} sx={{ width: "100%", height: "100%", touchAction: "none", cursor: "crosshair" }} /><Button size="small" onClick={clearSignature} sx={{ position: "absolute", right: 8, bottom: 6, textTransform: "none" }}>Clear signature</Button></Box></Box></> : <><TextField fullWidth select label="Mobile Payment *" value={provider} onChange={(event) => setProvider(event.target.value)} slotProps={{ input: { startAdornment: adornment(<PaymentsOutlinedIcon />) } }} sx={inputSx}><MenuItem value="KBZPay">KBZPay</MenuItem><MenuItem value="WavePay">WavePay</MenuItem></TextField><PaymentField label="Receiver Mobile Payment User Name *" placeholder="Enter user name" value={mobileName} onChange={(event) => setMobileName(event.target.value)} icon={<AccountCircleOutlinedIcon />} /><PaymentField label="Receiver Mobile Payment Number *" placeholder="Enter mobile payment number" value={mobileNumber} onChange={(event) => setMobileNumber(event.target.value)} icon={<PhoneOutlinedIcon />} /><PaymentField label="Transaction ID *" placeholder="Enter transaction ID" value={transactionId} onChange={(event) => setTransactionId(event.target.value)} icon={<ReceiptLongOutlinedIcon />} /></>}
      {dueRequired && <TextField fullWidth label="Due Date *" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} slotProps={{ inputLabel: { shrink: true }, input: { startAdornment: adornment(<CalendarTodayOutlinedIcon />) } }} sx={inputSx} />}
    </Box>
    <Paper elevation={5} sx={{ position: "sticky", bottom: 0, zIndex: 10, px: 2.5, py: 2, bgcolor: "background.paper", borderTop: "1px solid", borderColor: "divider" }}><Box sx={{ maxWidth: 472, mx: "auto" }}><Button fullWidth variant="contained" startIcon={<CheckRoundedIcon />} onClick={save} sx={{ minHeight: 56, borderRadius: 1.5, fontSize: 16, fontWeight: 600, textTransform: "none" }}>Add Payment</Button></Box></Paper>
  </Box>;
}

function PaymentField({ label, icon, ...props }) { return <TextField fullWidth label={label} slotProps={{ input: { startAdornment: <InputAdornment position="start" sx={{ color: "text.secondary" }}>{icon}</InputAdornment> } }} sx={inputSx} {...props} />; }
