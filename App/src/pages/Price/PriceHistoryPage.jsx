import { useState } from "react";
import { useNavigate } from "react-router";
import { AppBar, Box, Chip, IconButton, Paper, Stack, Toolbar, Typography } from "@mui/material";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import LocalOfferRoundedIcon from "@mui/icons-material/LocalOfferRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";

const records = [
  { type: "Price", name: "Nivea Roll On", oldPrice: 6000, newPrice: 6500, date: "11/08/2026", time: "11:20 PM", reason: "Market price increased" },
  { type: "Promotion", name: "Jasmine Perfume", promotionName: "Anniversary", action: "Promotion set: 10% off", period: "01/08/2026 — 31/08/2026", date: "10/08/2026", time: "03:15 PM" },
  { type: "Promotion", name: "Coca-Cola 330ml", promotionName: "Anniversary", action: "Promotion edited:", emphasis: "15% off", date: "09/08/2026", time: "09:45 AM" },
];
const money = (value) => `${new Intl.NumberFormat("en-US").format(value)} ကျပ်`;

export default function PriceHistoryPage() {
  const navigate = useNavigate();
  const [filter] = useState("All");
  return <Box sx={{ minHeight: "100dvh", bgcolor: "#f8fafc", fontFamily: "Inter, Roboto, 'Noto Sans Myanmar', sans-serif" }}>
    <AppBar position="sticky" elevation={0} sx={{ bgcolor: "primary.main" }}><Toolbar sx={{ minHeight: 64, display: "grid", gridTemplateColumns: "1fr auto 1fr" }}><IconButton aria-label="Back to price and promotion" onClick={() => navigate("/price")} sx={{ justifySelf: "start", color: "common.white" }}><ArrowBackRoundedIcon /></IconButton><Typography fontWeight={700}>Price History</Typography><Box /></Toolbar></AppBar>
    <Box sx={{ p: { xs: 2, sm: 2.5 }, maxWidth: 720, mx: "auto" }}><Typography color="text.secondary" sx={{ mb: 2, fontSize: 14 }}>{filter} price and promotion activity</Typography><Stack spacing={1.75}>{records.map((record) => <HistoryCard key={record.name} record={record} />)}</Stack></Box>
  </Box>;
}

function HistoryCard({ record }) {
  const promotion = record.type === "Promotion";
  return <Paper elevation={1} sx={{ p: { xs: 1.75, sm: 2.25 }, borderRadius: 2.25, boxShadow: "0 2px 9px rgba(15,23,42,0.11)" }}>
    <Chip label={record.type} size="small" sx={{ height: 30, mb: 1.25, borderRadius: 1.1, bgcolor: promotion ? "#168437" : "#2459d6", color: "common.white", fontSize: 13, fontWeight: 700 }} />
    <Box sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1.45fr) 1px minmax(104px, 0.78fr)", columnGap: { xs: 1.5, sm: 2.5 }, alignItems: "stretch" }}>
      <Box sx={{ minWidth: 0 }}><Typography noWrap sx={{ fontSize: { xs: 17, sm: 19 }, fontWeight: 700 }}>{record.name}</Typography>{promotion ? <PromotionDetail record={record} /> : <PriceDetail record={record} />}</Box>
      <Box sx={{ bgcolor: "#e4e7ec" }} />
      <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 1.15, minWidth: 0 }}><Meta icon={<CalendarTodayOutlinedIcon />} text={record.date} /> <Meta icon={<AccessTimeRoundedIcon />} text={record.time} />{promotion && record.promotionName && <Meta icon={<LocalOfferRoundedIcon />} text={`Name: ${record.promotionName}`} compact />} {record.reason && <Meta icon={<ChatBubbleOutlineRoundedIcon />} text={`Reason: ${record.reason}`} compact />}</Box>
    </Box>
  </Paper>;
}

function PriceDetail({ record }) { return <Box sx={{ mt: 2 }}><Typography color="text.secondary" sx={{ fontSize: { xs: 14, sm: 16 } }}>Selling price changed</Typography><Box sx={{ display: "flex", alignItems: "center", gap: { xs: 0.45, sm: 1.5 }, mt: 1.5, whiteSpace: "nowrap" }}><Typography sx={{ fontSize: { xs: 16, sm: 20 }, fontWeight: 700 }}>{money(record.oldPrice)}</Typography><TrendingUpRoundedIcon sx={{ color: "#168437", fontSize: { xs: 24, sm: 34 } }} /><Typography sx={{ fontSize: { xs: 16, sm: 20 }, fontWeight: 700 }}>{money(record.newPrice)}</Typography></Box></Box>; }
function PromotionDetail({ record }) { return <Paper elevation={0} sx={{ mt: 1.5, p: { xs: 1.1, sm: 1.4 }, borderRadius: 1.5, bgcolor: "#f0f8f2", display: "flex", gap: 1, alignItems: "flex-start" }}><LocalOfferRoundedIcon sx={{ mt: 0.2, color: "#168437", fontSize: 22, flexShrink: 0 }} /><Box><Typography sx={{ fontSize: { xs: 14, sm: 16 }, lineHeight: 1.35 }}>{record.action}</Typography>{record.emphasis && <Typography sx={{ mt: 0.2, color: "#168437", fontSize: { xs: 15, sm: 17 }, fontWeight: 700 }}>{record.emphasis}</Typography>}{record.period && <Typography sx={{ mt: 0.3, fontSize: { xs: 13, sm: 15 }, lineHeight: 1.35 }}>{record.period}</Typography>}</Box></Paper>; }
function Meta({ icon, text, compact }) { return <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, minWidth: 0, color: "#2459d6" }}><Box sx={{ pt: 0.1, display: "flex" }}>{icon}</Box><Typography sx={{ minWidth: 0, color: "text.primary", fontSize: compact ? { xs: 12, sm: 14 } : { xs: 13, sm: 16 }, lineHeight: 1.35, overflowWrap: "anywhere" }}>{text}</Typography></Box>; }
