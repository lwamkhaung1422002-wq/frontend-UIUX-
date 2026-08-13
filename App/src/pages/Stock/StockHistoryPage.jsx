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
  Fab,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Toolbar,
  Typography,
  useMediaQuery,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import QrCodeScannerRoundedIcon from "@mui/icons-material/QrCodeScannerRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import WaterDropRoundedIcon from "@mui/icons-material/WaterDropRounded";
import { DesktopPage, DesktopPanel, DesktopSearch, DesktopStat } from "../../components/Desktop/DesktopUI";

const records = [
  { id: 1, product: "Water", type: "IN", qty: "+100 pcs", amount: "500 ကျပ်", reason: "Initial Stock", time: "about an hour ago", date: "11/08/2026 11:20 PM", icon: <WaterDropRoundedIcon /> },
  { id: 2, product: "Air X", type: "OUT", qty: "-1 pcs", amount: "1,000 ကျပ်", reason: "Sale - Order #ORD-20260811-0003", time: "2 hours ago", date: "11/08/2026 10:19 PM", icon: <Inventory2RoundedIcon /> },
  { id: 3, product: "Air X", type: "OUT", qty: "-1 pcs", amount: "1,000 ကျပ်", reason: "Sale - Order #ORD-20260811-0001", time: "4 hours ago", date: "11/08/2026 08:58 PM", icon: <Inventory2RoundedIcon /> },
];

export default function StockHistoryPage() {
  const isMobile = useMediaQuery("(max-width:768px)");
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const visibleRecords = useMemo(
    () => records.filter((record) => filter === "all" || record.type.toLowerCase() === filter),
    [filter],
  );

  if (!isMobile) return <DesktopStockHistory records={visibleRecords} filter={filter} setFilter={setFilter} navigate={navigate} />;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pb: 3 }}>
      <AppBar position="sticky" elevation={0} sx={{ bgcolor: "primary.main" }}>
        <Toolbar sx={{ minHeight: 64, display: "grid", gridTemplateColumns: "1fr auto 1fr" }}>
          <IconButton aria-label="Back to inventory" onClick={() => navigate("/stock")} sx={{ justifySelf: "start", color: "common.white" }}><ArrowBackRoundedIcon /></IconButton>
          <Typography variant="h6" fontWeight={700}>Stock History</Typography>
          <Box />
        </Toolbar>
      </AppBar>

      <Box sx={{ px: 3, pt: 2.5 }}>
        <TextField
          fullWidth
          placeholder="Search by product name or barcode"
          slotProps={{
            input: {
              startAdornment: <InputAdornment position="start"><SearchRoundedIcon /></InputAdornment>,
              endAdornment: <InputAdornment position="end"><IconButton aria-label="Scan barcode" edge="end"><QrCodeScannerRoundedIcon /></IconButton></InputAdornment>,
            },
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              minHeight: 64,
              px: 1.25,
              bgcolor: "#f5f5f5",
              borderRadius: 2,
              fontSize: 16,
              "& fieldset": { border: 0 },
            },
          }}
        />

        <Box sx={{ display: "flex", justifyContent: "center", gap: 1.25, mt: 3.25, mb: 3 }}>
          <Button variant="contained" onClick={() => setFilter("all")} startIcon={<CheckRoundedIcon />} sx={filter === "all" ? selectedFilterSx : filterSx}>All</Button>
          <Button variant="outlined" onClick={() => setFilter("in")} sx={filter === "in" ? selectedFilterSx : filterSx}>Stock IN</Button>
          <Button variant="outlined" onClick={() => setFilter("out")} sx={filter === "out" ? selectedFilterSx : filterSx}>Stock OUT</Button>
        </Box>

        <Stack spacing={2}>
          {visibleRecords.map((record) => <HistoryCard key={record.id} record={record} />)}
        </Stack>
      </Box>

      <Fab aria-label="Add stock movement" onClick={() => navigate("/stock/movement/add")} sx={{ position: "fixed", right: 26, bottom: 26, width: 64, height: 64, bgcolor: "#ff5a36", color: "common.white", boxShadow: "0 4px 12px rgba(15,23,42,0.28)", "&:hover": { bgcolor: "#e94c2b" } }}><AddRoundedIcon sx={{ fontSize: 32 }} /></Fab>
    </Box>
  );
}

function DesktopStockHistory({ records: visibleRecords, filter, setFilter, navigate }) {
  const stockIn = visibleRecords.filter((record) => record.type === "IN").length;
  const stockOut = visibleRecords.filter((record) => record.type === "OUT").length;
  return <DesktopPage title="Stock History" subtitle="Track all inventory movements and adjustments." actionLabel="Add Stock" onAction={() => navigate("/stock/movement/add")}><Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2.25, mb: 3 }}><DesktopStat label="All Movements" value={visibleRecords.length} helper="Current filter result" /><DesktopStat label="Stock IN" value={stockIn} color="success.main" helper="Inbound movements" /><DesktopStat label="Stock OUT" value={stockOut} color="error.main" helper="Outbound movements" /></Box><DesktopPanel><Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}><DesktopSearch placeholder="Search product name or barcode" /><Box sx={{ display: "flex", gap: 1 }}><Button variant={filter === "all" ? "contained" : "outlined"} onClick={() => setFilter("all")} sx={{ textTransform: "none" }}>All</Button><Button variant={filter === "in" ? "contained" : "outlined"} onClick={() => setFilter("in")} color="success" sx={{ textTransform: "none" }}>Stock IN</Button><Button variant={filter === "out" ? "contained" : "outlined"} onClick={() => setFilter("out")} color="error" sx={{ textTransform: "none" }}>Stock OUT</Button></Box></Box><Box sx={{ display: "grid", gridTemplateColumns: "1fr 0.6fr 0.8fr 1.4fr 0.9fr", px: 2, pb: 1.25 }}><DesktopHeader>PRODUCT</DesktopHeader><DesktopHeader>TYPE</DesktopHeader><DesktopHeader>QUANTITY</DesktopHeader><DesktopHeader>REFERENCE</DesktopHeader><DesktopHeader align="right">DATE</DesktopHeader></Box><Divider />{visibleRecords.map((record) => <Box key={record.id} sx={{ display: "grid", gridTemplateColumns: "1fr 0.6fr 0.8fr 1.4fr 0.9fr", alignItems: "center", px: 2, py: 2, borderBottom: "1px solid", borderColor: "divider" }}><Typography fontWeight={700}>{record.product}</Typography><Chip label={record.type} size="small" color={record.type === "IN" ? "success" : "error"} variant="outlined" sx={{ justifySelf: "start" }} /><Typography color={record.type === "IN" ? "success.main" : "error.main"} fontWeight={700}>{record.qty}</Typography><Typography color="text.secondary">{record.reason}</Typography><Typography color="text.secondary" textAlign="right">{record.date}</Typography></Box>)}</DesktopPanel></DesktopPage>;
}

function DesktopHeader({ children, align }) { return <Typography color="text.secondary" sx={{ fontSize: 12, fontWeight: 700, textAlign: align }}>{children}</Typography>; }

function HistoryCard({ record }) {
  const isIn = record.type === "IN";
  const statusColor = isIn ? "success.main" : "error.main";

  return (
    <Card sx={{ borderRadius: 3, bgcolor: "background.paper", boxShadow: "0 4px 12px rgba(15,23,42,0.14)" }}>
      <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "84px minmax(0, 1fr) auto", columnGap: 1.75, alignItems: "start" }}>
          <Box sx={{ display: "grid", placeItems: "center", width: 84, height: 106, borderRadius: 2.5, color: isIn ? "#38a5dd" : "#5b5b5b", bgcolor: isIn ? "#e8f6fb" : "transparent", "& .MuiSvgIcon-root": { fontSize: 42 } }}>
            {record.icon}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography color="text.primary" sx={{ fontSize: 22, fontWeight: 700, lineHeight: 1.25 }}>{record.product}</Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 3.25, mt: 2.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, color: statusColor }}>
                {isIn ? <ArrowDownwardRoundedIcon sx={{ fontSize: 24 }} /> : <ArrowUpwardRoundedIcon sx={{ fontSize: 24 }} />}
                <Typography color={statusColor} sx={{ fontSize: 19, fontWeight: 700 }}>{record.qty}</Typography>
              </Box>
              <Typography color="text.primary" sx={{ fontSize: 19, fontWeight: 500, whiteSpace: "nowrap" }}>{record.amount}</Typography>
            </Box>
            <Typography color="text.secondary" sx={{ mt: 3, fontSize: 18, lineHeight: 1.35 }}>{record.reason}</Typography>
          </Box>
          <Chip label={record.type} variant="outlined" sx={{ mt: 0.25, height: 42, borderRadius: 999, borderColor: statusColor, color: statusColor, bgcolor: "background.paper", fontWeight: 700, "& .MuiChip-label": { px: 1.5, fontSize: 16 } }} />
        </Box>

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1.5, mt: 3.5, color: "text.secondary" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0 }}><HistoryRoundedIcon sx={{ fontSize: 21 }} /><Typography noWrap sx={{ fontSize: 15 }}>{record.time}</Typography></Box>
          <Typography noWrap sx={{ textAlign: "right", fontSize: 15 }}>{record.date}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

const filterSx = { minHeight: 56, borderRadius: 1.75, borderColor: "text.primary", color: "text.primary", bgcolor: "background.paper", fontSize: 15, fontWeight: 600, px: 2, textTransform: "none" };
const selectedFilterSx = { ...filterSx, borderColor: "#ff5a36", bgcolor: "#ff5a36", color: "common.white", "&:hover": { bgcolor: "#e94c2b", borderColor: "#e94c2b" } };
