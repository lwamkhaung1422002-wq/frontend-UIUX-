import { useEffect, useMemo, useState } from "react";
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
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import CreditCardRoundedIcon from "@mui/icons-material/CreditCardRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import { DesktopPlaceholder } from "../../components/Desktop/DesktopUI";
import { useNavigate } from "react-router";

const supplierRecords = [
  { id: "125978", name: "Pahtama Group", amount: 374000, status: "Credit", dateLabel: "Due", date: "2026-05-20" },
  { id: "111548", name: "Unilever", amount: 16000, status: "Paid", dateLabel: "Paid", date: "2026-06-11" },
];
const money = (value) => `${new Intl.NumberFormat("en-US").format(value)} ကျပ်`;

export default function SuppliersPage() {
  const isMobile = useMediaQuery("(max-width:768px)");
  const navigate = useNavigate();
  const [status, setStatus] = useState("All");
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuRecord, setMenuRecord] = useState(null);

  useEffect(() => {
    const openFilter = () => setFilterOpen(true);
    window.addEventListener("suppliers-filter", openFilter);
    return () => window.removeEventListener("suppliers-filter", openFilter);
  }, []);

  const visibleRecords = useMemo(() => supplierRecords.filter((record) => {
    const query = search.trim().toLowerCase();
    return (status === "All" || record.status === status)
      && (!query || record.name.toLowerCase().includes(query) || record.id.includes(query))
      && (!from || record.date >= from)
      && (!to || record.date <= to);
  }), [from, search, status, to]);
  const total = visibleRecords.reduce((sum, record) => sum + record.amount, 0);
  const clearDateFilter = () => { setFrom(""); setTo(""); };
  const today = () => { const value = new Date().toISOString().slice(0, 10); setFrom(value); setTo(value); };

  if (!isMobile) return <DesktopPlaceholder title="Suppliers" description="Manage vendor contacts and purchasing relationships." primaryLabel="Add Supplier"><Box sx={{ display: "grid", placeItems: "center", minHeight: 310, textAlign: "center" }}><Box><Typography sx={{ fontSize: 20, fontWeight: 700 }}>No suppliers yet</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>Add a supplier to organize purchases and stock receipts.</Typography><Button variant="outlined" sx={{ mt: 2, textTransform: "none" }}>Add Supplier</Button></Box></Box></DesktopPlaceholder>;

  return <Box sx={{ minHeight: "100dvh", pb: "104px", bgcolor: "background.default", fontFamily: "Inter, Roboto, Noto Sans Myanmar, sans-serif" }}>
    <Box sx={{ height: 68, px: 1.5, bgcolor: "primary.main", color: "common.white", display: "grid", gridTemplateColumns: "48px minmax(0, 1fr) 48px", alignItems: "center", boxShadow: "0 2px 5px rgba(0,0,0,0.16)" }}><IconButton aria-label="Back to settings" onClick={() => navigate("/settings")} sx={{ width: 48, height: 48, color: "inherit" }}><ArrowBackRoundedIcon sx={{ fontSize: 31 }} /></IconButton><Typography align="center" sx={{ fontSize: 21, fontWeight: 600 }}>Suppliers</Typography><IconButton aria-label="Filter suppliers" onClick={() => setFilterOpen(true)} sx={{ width: 48, height: 48, color: "inherit" }}><FilterAltOutlinedIcon sx={{ fontSize: 29 }} /></IconButton></Box>
    <Box sx={{ px: 2.5, pt: 1.5 }}><TextField fullWidth value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search suppliers by name or invoice number" slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon color="action" /></InputAdornment> } }} sx={searchSx} />

    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 1, mt: 2.25 }}>
      <StatusButton label="All" active={status === "All"} onClick={() => setStatus("All")} />
      <StatusButton label="Credit" active={status === "Credit"} onClick={() => setStatus("Credit")} icon={<CreditCardRoundedIcon />} color="warning.main" />
      <StatusButton label="Paid" active={status === "Paid"} onClick={() => setStatus("Paid")} icon={<CheckCircleOutlineRoundedIcon />} color="success.main" />
      <StatusButton label="Cancel" active={status === "Cancel"} onClick={() => setStatus("Cancel")} icon={<CancelOutlinedIcon />} color="error.main" />
    </Box>

    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", mt: 3.25, mb: 2 }}><Typography sx={{ fontSize: 15, fontWeight: 500, lineHeight: 1.3 }}>{visibleRecords.length} Suppliers</Typography><Typography sx={{ fontSize: 20, fontWeight: 600, lineHeight: 1.2 }}>{money(total)}</Typography></Box>
    <Stack spacing={1.75}>{visibleRecords.map((record) => <SupplierCard key={record.id} record={record} onClick={() => navigate(`/suppliers/${record.id}`)} onMenu={(event) => { event.stopPropagation(); setMenuAnchor(event.currentTarget); setMenuRecord(record); }} />)}</Stack></Box>

    <Paper elevation={5} sx={{ position: "fixed", left: 0, right: 0, bottom: 0, px: 2.5, py: 2, bgcolor: "background.paper", borderTop: "1px solid", borderColor: "divider" }}>
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}><Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => navigate("/suppliers/add")} sx={footerButtonSx}>Add Supplier</Button><Button variant="outlined" startIcon={<HistoryRoundedIcon />} onClick={() => navigate("/suppliers/history")} sx={{ ...footerButtonSx, color: "primary.main", borderColor: "divider", bgcolor: "background.paper" }}>History</Button></Box>
    </Paper>

    <Dialog open={filterOpen} onClose={() => setFilterOpen(false)} fullWidth slotProps={{ paper: { sx: { m: 2.5, borderRadius: 2.5, maxWidth: 420 } } }}>
      <DialogContent sx={{ p: 2.5 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2.5 }}><Typography sx={{ fontSize: 20, fontWeight: 600 }}>Filter suppliers</Typography><IconButton aria-label="Close filters" onClick={() => setFilterOpen(false)}><CloseRoundedIcon /></IconButton></Box>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}><Button variant="outlined" onClick={clearDateFilter} sx={quickFilterSx}>All</Button><Button variant="outlined" onClick={today} startIcon={<CalendarTodayOutlinedIcon />} sx={quickFilterSx}>Today</Button></Box>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5, mt: 2 }}><TextField label="From" type="date" value={from} onChange={(event) => setFrom(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={dateSx} /><TextField label="To" type="date" value={to} onChange={(event) => setTo(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={dateSx} /></Box>
        <Button fullWidth variant="contained" onClick={() => setFilterOpen(false)} sx={{ mt: 2, minHeight: 54, borderRadius: 1.5, textTransform: "none", fontSize: 16, fontWeight: 600 }}>Apply filters</Button>
      </DialogContent>
    </Dialog>
    <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => { setMenuAnchor(null); setMenuRecord(null); }} transformOrigin={{ vertical: "top", horizontal: "right" }} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} slotProps={{ paper: { sx: { minWidth: 164, mt: 0.75, borderRadius: 1.5, boxShadow: "0 8px 22px rgba(15,23,42,0.24)", overflow: "hidden" } } }}>
      {menuRecord?.status !== "Paid" && <MenuItem onClick={() => { navigate(`/suppliers/${menuRecord?.id}/pay`); setMenuAnchor(null); setMenuRecord(null); }} sx={menuItemSx}><PaymentsOutlinedIcon sx={{ fontSize: 15, color: "success.main" }} />Pay</MenuItem>}
      <MenuItem onClick={() => { navigate(`/suppliers/add?edit=${menuRecord?.id}`); setMenuAnchor(null); setMenuRecord(null); }} sx={menuItemSx}><EditOutlinedIcon sx={{ fontSize: 15, color: "primary.main" }} />Edit</MenuItem>
      <MenuItem onClick={() => setMenuAnchor(null)} sx={{ ...menuItemSx, color: "error.main" }}><DeleteOutlineRoundedIcon sx={{ fontSize: 15, color: "error.main" }} />Delete</MenuItem>
    </Menu>
  </Box>;
}

function StatusButton({ label, active, onClick, icon, color }) {
  return <Button onClick={onClick} startIcon={icon} sx={{ minWidth: 0, minHeight: 54, px: 0.75, borderRadius: 1.5, border: "1px solid", borderColor: active ? "primary.main" : "divider", bgcolor: active ? "primary.main" : "background.paper", color: active ? "common.white" : (color ?? "text.primary"), fontSize: 13, fontWeight: 600, textTransform: "none", "& .MuiButton-startIcon": { mr: 0.5, "& .MuiSvgIcon-root": { fontSize: 18 } }, "&:hover": { bgcolor: active ? "primary.main" : "action.hover" } }}>{label}</Button>;
}

function SupplierCard({ record, onMenu, onClick }) {
  const paid = record.status === "Paid";
  const dateColor = paid ? "success.main" : "#ef6c00";
  return <Paper elevation={2} onClick={onClick} sx={{ p: 1.5, borderRadius: 1.5, display: "grid", gridTemplateColumns: "68px minmax(0, 1fr) auto", gridTemplateRows: "auto auto", columnGap: 1.5, rowGap: 1.25, alignItems: "center", cursor: "pointer", fontFamily: "Inter, Roboto, Noto Sans Myanmar, sans-serif" }}><Chip label={record.status} size="small" sx={{ gridColumn: 1, gridRow: 1, justifySelf: "start", height: 28, bgcolor: paid ? "#e3f5e6" : "#fff1e4", color: dateColor, fontSize: 13, fontWeight: 600, "& .MuiChip-label": { px: 1.1 }, borderRadius: 1 }} /><Typography sx={{ gridColumn: 1, gridRow: 2, fontSize: 14, fontWeight: 400, lineHeight: 1.3, color: "text.secondary" }}>{record.id}</Typography><Typography noWrap sx={{ gridColumn: 2, gridRow: 1, minWidth: 0, fontSize: 17, fontWeight: 600, lineHeight: 1.3, color: "text.primary" }}>{record.name}</Typography><Box sx={{ gridColumn: 2, gridRow: 2, display: "flex", minWidth: 0, alignItems: "center", gap: 0.65, color: dateColor }}><CalendarTodayOutlinedIcon sx={{ fontSize: 17, flexShrink: 0 }} /><Typography noWrap component="span" sx={{ fontSize: 13, fontWeight: 400, lineHeight: 1.3, color: "inherit" }}>{record.dateLabel}: <Box component="span" sx={{ color: "inherit", fontSize: 13, fontWeight: 500 }}>{record.date.split("-").reverse().join("/")}</Box></Typography></Box><Typography noWrap sx={{ gridColumn: 3, gridRow: 1, textAlign: "right", fontSize: 18, fontWeight: 600, lineHeight: 1.2, color: "text.primary", whiteSpace: "nowrap" }}>{money(record.amount)}</Typography><IconButton aria-label={`More actions for ${record.name}`} onClick={onMenu} size="small" sx={{ gridColumn: 3, gridRow: 2, justifySelf: "end", p: 0.25 }}><MoreVertRoundedIcon fontSize="small" /></IconButton></Paper>;
}

const searchSx = { "& .MuiOutlinedInput-root": { minHeight: 58, px: 1.5, borderRadius: 2, bgcolor: "action.hover", "& fieldset": { border: 0 } }, "& .MuiInputBase-input": { fontSize: 16 } };
const dateSx = { "& .MuiOutlinedInput-root": { borderRadius: 1.5, bgcolor: "action.hover", "& fieldset": { border: 0 } } };
const footerButtonSx = { minHeight: 54, borderRadius: 1.5, fontSize: 16, fontWeight: 600, textTransform: "none" };
const quickFilterSx = { minHeight: 52, borderRadius: 1.5, textTransform: "none", color: "text.primary", borderColor: "divider", fontSize: 16, fontWeight: 600 };
const menuItemSx = { minHeight: 44, gap: 1.25, px: 1.75, py: 0.75, fontSize: 15, fontWeight: 600, color: "text.primary" };
