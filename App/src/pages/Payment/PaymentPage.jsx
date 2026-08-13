import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import CreditCardOutlinedIcon from "@mui/icons-material/CreditCardOutlined";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { DesktopPlaceholder } from "../../components/Desktop/DesktopUI";

const payments = [
  { id: "125978", supplierId: "125978", name: "Pahtama Group", amount: 374000, status: "Unpaid", method: "Pending", dateLabel: "Due", date: "2026-05-20", isoDate: "2026-05-20" },
  { id: "111548", supplierId: "111548", name: "Unilever", amount: 16000, status: "Paid", method: "KBZPay", dateLabel: "Paid", date: "2026-06-11", isoDate: "2026-06-11" },
];

const money = (value) => `${new Intl.NumberFormat("en-US").format(value)} ကျပ်`;

export default function PaymentPage() {
  const isMobile = useMediaQuery("(max-width:768px)");
  const navigate = useNavigate();
  const [status, setStatus] = useState("All");
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState("all");
  const [method, setMethod] = useState("All");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuPayment, setMenuPayment] = useState(null);

  const visiblePayments = useMemo(() => {
    const query = search.trim().toLowerCase();
    const today = new Date().toISOString().slice(0, 10);
    return payments.filter((payment) =>
      (status === "All" || payment.status === status)
      && (!query || payment.name.toLowerCase().includes(query) || payment.id.includes(query))
      && (method === "All" || payment.method === method)
      && (dateFilter !== "today" || payment.isoDate === today)
      && (dateFilter !== "custom" || ((!from || payment.isoDate >= from) && (!to || payment.isoDate <= to))),
    );
  }, [dateFilter, from, method, search, status, to]);

  const total = visiblePayments.reduce((sum, payment) => sum + payment.amount, 0);
  const selectDateFilter = (value) => {
    setDateFilter(value);
    if (value !== "custom") { setFrom(""); setTo(""); }
  };
  const closeMenu = () => { setMenuAnchor(null); setMenuPayment(null); };

  if (!isMobile) {
    return <DesktopPlaceholder title="Payments" description="Review supplier payments, outstanding balances, and payment history.">
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}>
        <PaymentStat label="All payments" value={payments.length} />
        <PaymentStat label="Paid" value={money(payments.filter((payment) => payment.status === "Paid").reduce((sum, payment) => sum + payment.amount, 0))} />
        <PaymentStat label="Outstanding" value={money(payments.filter((payment) => payment.status === "Unpaid").reduce((sum, payment) => sum + payment.amount, 0))} />
      </Box>
    </DesktopPlaceholder>;
  }

  return <Box sx={{ minHeight: "100dvh", pb: "104px", bgcolor: "#fff", fontFamily: "Inter, Roboto, 'Noto Sans Myanmar', sans-serif" }}>
    <Box sx={topBarSx}>
      <IconButton aria-label="Back to settings" onClick={() => navigate("/settings")} sx={topIconSx}><ArrowBackRoundedIcon sx={{ fontSize: 32 }} /></IconButton>
      <Typography align="center" sx={{ fontSize: 22, fontWeight: 700 }}>Payment</Typography>
      <IconButton aria-label="Filter payments" onClick={() => setFilterOpen(true)} sx={topIconSx}><FilterAltOutlinedIcon sx={{ fontSize: 30 }} /></IconButton>
    </Box>

    <Box sx={{ px: 2.5, pt: 2 }}>
      <TextField fullWidth value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search payments by name or invoice number" inputProps={{ "aria-label": "Search payments" }} slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ color: "text.secondary", fontSize: 29 }} /></InputAdornment> } }} sx={searchSx} />
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 1.25, mt: 1.5 }}>
        <StatusButton label="All" active={status === "All"} onClick={() => setStatus("All")} />
        <StatusButton label="Paid" active={status === "Paid"} onClick={() => setStatus("Paid")} icon={<CheckCircleOutlineRoundedIcon />} color="success.main" />
        <StatusButton label="Unpaid" active={status === "Unpaid"} onClick={() => setStatus("Unpaid")} icon={<CreditCardOutlinedIcon />} color="#ef6c00" />
      </Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2.25, mb: 1.75 }}>
        <Typography sx={{ fontSize: 16, fontWeight: 500 }}>{visiblePayments.length} Payments</Typography>
        <Typography sx={{ fontSize: 16, fontWeight: 700 }}>{money(total)}</Typography>
      </Box>
      <Stack spacing={1.75}>
        {visiblePayments.map((payment) => <PaymentCard key={payment.id} payment={payment} onClick={() => navigate(`/suppliers/${payment.supplierId}`)} onMenu={(event) => { event.stopPropagation(); setMenuAnchor(event.currentTarget); setMenuPayment(payment); }} />)}
        {!visiblePayments.length && <Typography align="center" color="text.secondary" sx={{ py: 6 }}>No payments found.</Typography>}
      </Stack>
    </Box>

    <Paper elevation={5} sx={{ position: "fixed", left: 0, right: 0, bottom: 0, px: 2.5, py: 2, bgcolor: "background.paper", borderTop: "1px solid", borderColor: "divider", zIndex: 10 }}>
      <Box sx={{ display: "grid", gridTemplateColumns: "1.65fr 0.9fr", gap: 1.5 }}>
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => navigate("/suppliers/125978/pay")} sx={footerPrimarySx}>Add Payment</Button>
        <Button variant="outlined" startIcon={<HistoryRoundedIcon />} onClick={() => navigate("/payment/history")} sx={footerSecondarySx}>History</Button>
      </Box>
    </Paper>

    <Dialog open={filterOpen} onClose={() => setFilterOpen(false)} fullWidth slotProps={{ paper: { sx: { m: 2.5, borderRadius: 2.5, maxWidth: 420 } } }}>
      <DialogContent sx={{ p: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2.5 }}><Typography sx={{ fontSize: 20, fontWeight: 600 }}>Filter payments</Typography><IconButton aria-label="Close filters" onClick={() => setFilterOpen(false)}><CloseRoundedIcon /></IconButton></Box>
        <Typography sx={filterLabelSx}>Date</Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, mt: 1 }}><FilterButton label="All" active={dateFilter === "all"} onClick={() => selectDateFilter("all")} /><FilterButton label="Today" active={dateFilter === "today"} onClick={() => selectDateFilter("today")} /><FilterButton label="Custom" active={dateFilter === "custom"} onClick={() => selectDateFilter("custom")} /></Box>
        {dateFilter === "custom" && <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5, mt: 1.75 }}><TextField label="From" type="date" value={from} onChange={(event) => setFrom(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={dateInputSx} /><TextField label="To" type="date" value={to} onChange={(event) => setTo(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={dateInputSx} /></Box>}
        <Typography sx={{ ...filterLabelSx, mt: 2.5 }}>Payment Method</Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, mt: 1 }}>{["All", "Cash", "KBZPay", "WavePay"].map((value) => <FilterButton key={value} label={value} active={method === value} onClick={() => setMethod(value)} />)}</Box>
        <Button fullWidth variant="contained" onClick={() => setFilterOpen(false)} sx={{ mt: 2.5, minHeight: 54, borderRadius: 1.5, fontSize: 16, fontWeight: 600, textTransform: "none" }}>Apply filters</Button>
      </DialogContent>
    </Dialog>

    <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu} transformOrigin={{ vertical: "top", horizontal: "right" }} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} slotProps={{ paper: { sx: { minWidth: 164, mt: 0.75, borderRadius: 1.5, boxShadow: "0 8px 22px rgba(15,23,42,0.24)", overflow: "hidden" } } }}>
      {menuPayment?.status === "Unpaid" && <MenuItem onClick={() => { navigate(`/suppliers/${menuPayment.supplierId}/pay`); closeMenu(); }} sx={menuItemSx}><PaymentsOutlinedIcon sx={{ fontSize: 15, color: "success.main" }} />Pay</MenuItem>}
      <MenuItem onClick={() => { navigate(`/suppliers/add?edit=${menuPayment?.supplierId}`); closeMenu(); }} sx={menuItemSx}><EditOutlinedIcon sx={{ fontSize: 15, color: "primary.main" }} />Edit</MenuItem>
      <MenuItem onClick={closeMenu} sx={{ ...menuItemSx, color: "error.main" }}><DeleteOutlineRoundedIcon sx={{ fontSize: 15, color: "error.main" }} />Delete</MenuItem>
    </Menu>
  </Box>;
}

function PaymentStat({ label, value }) { return <Box sx={{ p: 2.5, border: "1px solid", borderColor: "divider", borderRadius: 2 }}><Typography color="text.secondary">{label}</Typography><Typography sx={{ mt: 1, fontSize: 21, fontWeight: 700 }}>{value}</Typography></Box>; }

function StatusButton({ label, active, onClick, icon, color }) { return <Button onClick={onClick} startIcon={icon} sx={{ minWidth: 0, minHeight: 54, px: 0.5, borderRadius: 1.25, border: "1px solid", borderColor: active ? "primary.main" : "#dfe3e8", bgcolor: active ? "primary.main" : "background.paper", color: active ? "common.white" : (color ?? "text.primary"), fontSize: 15, fontWeight: 700, textTransform: "none", "& .MuiButton-startIcon": { mr: 0.65, "& .MuiSvgIcon-root": { fontSize: 22 } } }}>{label}</Button>; }

function PaymentCard({ payment, onClick, onMenu }) {
  const paid = payment.status === "Paid";
  const tone = paid ? "#168437" : "#ef6c00";
  return <Paper elevation={2} onClick={onClick} sx={{ p: 1.5, borderRadius: 1.5, display: "grid", gridTemplateColumns: "68px minmax(0, 1fr) auto", gridTemplateRows: "auto auto", columnGap: 1.5, rowGap: 1.25, alignItems: "center", cursor: "pointer", fontFamily: "Inter, Roboto, Noto Sans Myanmar, sans-serif" }}>
    <Chip label={payment.status} size="small" sx={{ gridColumn: 1, gridRow: 1, justifySelf: "start", height: 28, bgcolor: paid ? "#e3f5e6" : "#fff1e4", color: tone, fontSize: 13, fontWeight: 600, "& .MuiChip-label": { px: 1.1 }, borderRadius: 1 }} />
    <Typography noWrap sx={{ gridColumn: 2, gridRow: 1, minWidth: 0, fontSize: 17, fontWeight: 600, lineHeight: 1.3, color: "text.primary" }}>{payment.name}</Typography>
    <Stack direction="row" spacing={0.65} alignItems="baseline" sx={{ gridColumn: 3, gridRow: 1, justifySelf: "end", whiteSpace: "nowrap" }}>{paid && <Typography sx={{ color: tone, fontSize: 18, fontWeight: 600, lineHeight: 1.2 }}>{payment.method}</Typography>}<Typography noWrap sx={{ textAlign: "right", fontSize: 18, fontWeight: 600, lineHeight: 1.2, color: "text.primary", whiteSpace: "nowrap" }}>{money(payment.amount)}</Typography></Stack>
    <Typography sx={{ gridColumn: 1, gridRow: 2, fontSize: 14, fontWeight: 400, lineHeight: 1.3, color: "text.secondary" }}>{payment.id}</Typography>
    <Box sx={{ gridColumn: 2, gridRow: 2, display: "flex", minWidth: 0, alignItems: "center", gap: 0.65, color: tone }}><CalendarTodayOutlinedIcon sx={{ fontSize: 17, flexShrink: 0 }} /><Typography noWrap component="span" sx={{ fontSize: 13, fontWeight: 400, lineHeight: 1.3, color: "inherit" }}>{payment.dateLabel}: <Box component="span" sx={{ color: "inherit", fontSize: 13, fontWeight: 500 }}>{payment.date.split("-").reverse().join("/")}</Box></Typography></Box>
    <IconButton aria-label={`More actions for ${payment.name}`} onClick={onMenu} size="small" sx={{ gridColumn: 3, gridRow: 2, justifySelf: "end", p: 0.25 }}><MoreVertRoundedIcon /></IconButton>
  </Paper>;
}

function FilterButton({ label, active, onClick }) { return <Button variant={active ? "contained" : "outlined"} onClick={onClick} sx={{ minHeight: 48, borderRadius: 1.5, borderColor: active ? "primary.main" : "divider", color: active ? "common.white" : "text.primary", fontSize: 14, fontWeight: 600, textTransform: "none" }}>{label}</Button>; }

const topBarSx = { height: 68, px: 1.5, bgcolor: "primary.main", color: "common.white", display: "grid", gridTemplateColumns: "48px minmax(0, 1fr) 48px", alignItems: "center", boxShadow: "0 2px 5px rgba(0,0,0,0.16)" };
const topIconSx = { width: 48, height: 48, color: "inherit" };
const searchSx = { "& .MuiOutlinedInput-root": { minHeight: 56, px: 1.5, borderRadius: 1.5, bgcolor: "#f7f8fa", fontSize: 16, "& fieldset": { borderColor: "#e3e6ea" } } };
const footerPrimarySx = { minHeight: 58, borderRadius: 1.5, fontSize: 17, fontWeight: 700, textTransform: "none" };
const footerSecondarySx = { minHeight: 58, borderRadius: 1.5, borderColor: "divider", color: "primary.main", fontSize: 17, fontWeight: 700, textTransform: "none" };
const filterLabelSx = { fontSize: 14, fontWeight: 600, color: "text.secondary" };
const dateInputSx = { "& .MuiOutlinedInput-root": { borderRadius: 1.5, bgcolor: "action.hover", "& fieldset": { border: 0 } } };
const menuItemSx = { minHeight: 44, gap: 1.25, px: 1.75, py: 0.75, fontSize: 15, fontWeight: 600, color: "text.primary" };
