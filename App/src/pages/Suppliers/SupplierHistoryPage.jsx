import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  Divider,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import DrawOutlinedIcon from "@mui/icons-material/DrawOutlined";

const paymentRecords = [
  { id: "TRX-20260611-0001", supplier: "Unilever", invoice: "111548", amount: 16000, method: "KPay", kind: "mobile", isoDate: "2026-08-11", paymentDate: "11/06/2026", relativeTime: "about an hour ago", timestamp: "11/08/2026 11:20 PM" },
  { id: "PAY-20260520-0001", supplier: "Pahtama Group", invoice: "125978", amount: 100000, method: "Cash", kind: "cash", signature: "Ko Aung", isoDate: "2026-08-09", paymentDate: "20/05/2026", relativeTime: "2 days ago", timestamp: "11/08/2026 09:45 AM" },
  { id: "EXP-20260701-0001", supplier: "မီတာခ", amount: 250000, method: "Cash", kind: "expense", isoDate: "2026-08-04", paymentDate: "01/07/2026", dateLabel: "Expense Date", relativeTime: "1 week ago", timestamp: "01/07/2026 08:30 AM" },
];

const money = (value) => `${new Intl.NumberFormat("en-US").format(value)} ကျပ်`;

function DetailRow({ icon, label, value }) {
  return <Box sx={{ minHeight: 38, display: "grid", gridTemplateColumns: "34px minmax(0, 1fr) auto", gap: 1, alignItems: "center" }}><Box sx={{ color: "primary.main", display: "grid", placeItems: "center", "& .MuiSvgIcon-root": { fontSize: 22 } }}>{icon}</Box><Typography sx={{ color: "text.secondary", fontSize: 13.5, fontWeight: 400 }}>{label}</Typography><Typography noWrap sx={{ maxWidth: 185, color: "text.primary", fontSize: 13.5, fontWeight: 500, textAlign: "right" }}>{value}</Typography></Box>;
}

function PaymentCard({ record }) {
  const showSignature = Boolean(record.signature);
  return <Paper elevation={0} sx={{ overflow: "hidden", borderRadius: 1.75, border: "1px solid", borderColor: "#e4e8ed", boxShadow: "0 2px 8px rgba(24, 52, 82, 0.11)" }}>
    <Box sx={{ p: 2.25, pb: 1.875, display: "grid", gridTemplateColumns: "76px minmax(0, 1fr) auto", columnGap: 1.25, alignItems: "start" }}>
      <Chip label="Paid" variant="outlined" sx={{ mt: 0.1, height: 40, minWidth: 72, borderRadius: 1.25, color: "#168437", borderColor: "#36a55a", bgcolor: "#f6fff8", "& .MuiChip-label": { px: 1.4, fontSize: 14, fontWeight: 600 } }} />
      <Box sx={{ minWidth: 0, pt: 0.15 }}><Typography noWrap sx={{ fontSize: 17.5, lineHeight: 1.3, fontWeight: 600 }}>{record.supplier}</Typography>{record.invoice && <Typography sx={{ mt: 0.95, fontSize: 13.5, lineHeight: 1.2, color: "text.secondary", fontWeight: 400 }}>Invoice: {record.invoice}</Typography>}</Box>
      <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="flex-end" sx={{ whiteSpace: "nowrap" }}><Typography sx={{ color: record.method === "Cash" ? "#d87816" : "#238a3a", fontSize: 18, lineHeight: 1.28, fontWeight: 600 }}>{record.method}</Typography><Typography noWrap sx={{ fontSize: 18, lineHeight: 1.28, fontWeight: 600 }}>{money(record.amount)}</Typography></Stack>
    </Box>
    <Divider sx={{ mx: 2.25 }} />
    <Stack spacing={0.85} sx={{ px: 2.25, py: 1.75 }}>{record.kind === "mobile" && <DetailRow icon={<DescriptionOutlinedIcon />} label="Transaction ID" value={record.id} />}<DetailRow icon={<CalendarTodayOutlinedIcon />} label={record.dateLabel || "Payment Date"} value={record.paymentDate} /></Stack>
    {showSignature && <><Divider sx={{ mx: 2.25 }} /><Box sx={{ minHeight: 56, px: 2.25, display: "flex", alignItems: "center", gap: 1.4, color: "primary.main" }}><DrawOutlinedIcon sx={{ fontSize: 23 }} /><Typography sx={{ flex: 1, fontSize: 14, fontWeight: 500 }}>Receiver Signature</Typography><Typography sx={{ color: "text.primary", fontSize: 18, fontFamily: "cursive", fontStyle: "italic" }}>{record.signature}</Typography></Box></>}
    <Divider />
    <Box sx={{ minHeight: 58, px: 2.25, display: "flex", alignItems: "center", gap: 1.25, color: "text.secondary" }}><HistoryRoundedIcon sx={{ fontSize: 24, color: "primary.main" }} /><Typography sx={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 400 }}>{record.relativeTime}</Typography><Typography noWrap sx={{ fontSize: 12.5, fontWeight: 400 }}>{record.timestamp}</Typography></Box>
  </Paper>;
}

export default function SupplierHistoryPage() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState("all");
  const [paymentMethod, setPaymentMethod] = useState("All");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const visibleRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    const today = new Date().toISOString().slice(0, 10);
    return paymentRecords.filter((record) => (!query || [record.supplier, record.invoice, record.id].filter(Boolean).some((value) => value.toLowerCase().includes(query))) && (paymentMethod === "All" || record.method === paymentMethod) && (dateFilter !== "today" || record.isoDate === today) && (dateFilter !== "custom" || ((!from || record.isoDate >= from) && (!to || record.isoDate <= to))));
  }, [dateFilter, from, paymentMethod, search, to]);

  const applyFilter = () => setFilterOpen(false);
  const selectDateFilter = (value) => { setDateFilter(value); if (value !== "custom") { setFrom(""); setTo(""); } };

  return <Box sx={{ minHeight: "100dvh", pb: 3, bgcolor: "#f8fafc", fontFamily: "Inter, Roboto, 'Noto Sans Myanmar', sans-serif" }}>
    <Box sx={{ height: 68, px: 1.5, bgcolor: "primary.main", color: "common.white", display: "grid", gridTemplateColumns: "48px minmax(0, 1fr) 48px", alignItems: "center", boxShadow: "0 2px 5px rgba(0,0,0,0.16)" }}><IconButton aria-label="Back to payments" onClick={() => navigate(pathname.startsWith("/payment") ? "/payment" : "/suppliers")} sx={{ width: 48, height: 48, color: "inherit" }}><ArrowBackRoundedIcon sx={{ fontSize: 31 }} /></IconButton><Typography align="center" sx={{ fontSize: 21, fontWeight: 600, lineHeight: 1.2 }}>Payment History</Typography><IconButton aria-label="Filter payment history" onClick={() => setFilterOpen(true)} sx={{ width: 48, height: 48, color: "inherit" }}><FilterAltOutlinedIcon sx={{ fontSize: 29 }} /></IconButton></Box>
    <Box sx={{ px: 2.5, pt: 2.5 }}><TextField fullWidth value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search supplier, invoice or transaction ID" inputProps={{ "aria-label": "Search payment history" }} InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 27, color: "text.secondary" }} /></InputAdornment> }} sx={{ "& .MuiOutlinedInput-root": { height: 56, borderRadius: 1.5, bgcolor: "common.white", fontSize: 14.5, boxShadow: "0 2px 6px rgba(20,49,88,0.1)" }, "& fieldset": { borderColor: "#e1e5ea" } }} /><Stack spacing={2} sx={{ mt: 2 }}>{visibleRecords.map((record) => <PaymentCard key={record.id} record={record} />)}{!visibleRecords.length && <Typography align="center" sx={{ py: 6, color: "text.secondary" }}>No payment records found.</Typography>}</Stack></Box>
    <Dialog open={filterOpen} onClose={() => setFilterOpen(false)} fullWidth slotProps={{ paper: { sx: { m: 2.5, borderRadius: 2.5, maxWidth: 420 } } }}><DialogContent sx={{ p: 2.5 }}><Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2.5 }}><Typography sx={{ fontSize: 20, fontWeight: 600 }}>Filter payments</Typography><IconButton aria-label="Close filters" onClick={() => setFilterOpen(false)}><CloseRoundedIcon /></IconButton></Box><Typography sx={filterLabelSx}>Date</Typography><Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, mt: 1 }}><FilterButton label="All" active={dateFilter === "all"} onClick={() => selectDateFilter("all")} /><FilterButton label="Today" active={dateFilter === "today"} onClick={() => selectDateFilter("today")} /><FilterButton label="Custom" active={dateFilter === "custom"} onClick={() => selectDateFilter("custom")} /></Box>{dateFilter === "custom" && <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5, mt: 1.75 }}><TextField label="From" type="date" value={from} onChange={(event) => setFrom(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={dateInputSx} /><TextField label="To" type="date" value={to} onChange={(event) => setTo(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={dateInputSx} /></Box>}<Typography sx={{ ...filterLabelSx, mt: 2.5 }}>Payment Method</Typography><Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, mt: 1 }}>{["All", "Cash", "KPay", "WavePay"].map((method) => <FilterButton key={method} label={method} active={paymentMethod === method} onClick={() => setPaymentMethod(method)} />)}</Box><Button fullWidth variant="contained" onClick={applyFilter} sx={{ mt: 2.5, minHeight: 54, borderRadius: 1.5, fontSize: 16, fontWeight: 600, textTransform: "none" }}>Apply filters</Button></DialogContent></Dialog>
  </Box>;
}

function FilterButton({ label, active, onClick }) { return <Button variant={active ? "contained" : "outlined"} onClick={onClick} sx={{ minHeight: 48, borderRadius: 1.5, borderColor: active ? "primary.main" : "divider", color: active ? "common.white" : "text.primary", fontSize: 14, fontWeight: 600, textTransform: "none" }}>{label}</Button>; }

const filterLabelSx = { fontSize: 14, fontWeight: 600, color: "text.secondary" };
const dateInputSx = { "& .MuiOutlinedInput-root": { borderRadius: 1.5, bgcolor: "action.hover", "& fieldset": { border: 0 } } };
