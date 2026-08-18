import { useState } from "react";
import { AppBar, Badge, Box, IconButton, Menu, MenuItem, Stack, Toolbar, Typography, useMediaQuery } from "@mui/material";
import FilterListRoundedIcon from "@mui/icons-material/FilterListRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import AccountCircleRoundedIcon from "@mui/icons-material/AccountCircleRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import StoreRoundedIcon from "@mui/icons-material/StoreRounded";
import { useLocation, useNavigate } from "react-router";
import { useAppPreferences } from "../../context/AppPreferenceContext";

const pageTitles = {
  "/": "Home",
  "/sale": "Orders",
  "/sale/create": "Create Order",
  "/stock": "Inventory",
  "/note": "Note",
  "/sale-record": "Sale Records",
  "/payment": "Payment",
  "/report": "Report",
  "/price": "Price & Discount",
  "/suppliers": "Suppliers",
  "/settings": "Settings",
};

export default function Header() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width:768px)");
  const isDesktopStockDetails = pathname.startsWith("/stock/") && !["/stock/add", "/stock/history", "/stock/movement/add"].includes(pathname);
  const isDesktopStockHistory = pathname === "/stock/history";
  const mobileTitle = pathname === "/" ? "Dashboard" : pageTitles[pathname] ?? "POS System";
  const [sortAnchor, setSortAnchor] = useState(null);
  const { shop } = useAppPreferences();

  if (isMobile) {
    if (pathname.startsWith("/sale/") || pathname.startsWith("/stock/") || pathname === "/suppliers" || pathname.startsWith("/suppliers/") || pathname === "/payment" || pathname.startsWith("/payment/") || pathname === "/price" || pathname.startsWith("/price/") || pathname.startsWith("/settings/")) return null;
    const action = pathname === "/stock"
      ? { label: "Sort inventory", icon: <FilterListRoundedIcon />, event: "inventory-sort" }
      : pathname === "/sale"
      ? { label: "Filter orders", icon: <FilterListRoundedIcon />, event: "orders-filter" }
      : pathname === "/suppliers"
      ? { label: "Filter suppliers", icon: <FilterListRoundedIcon />, event: "suppliers-filter" }
      : pathname === "/"
        ? { label: "Refresh dashboard", icon: <RefreshRoundedIcon />, event: "dashboard-refresh" }
        : null;

    return (
      <AppBar position="sticky" elevation={0} sx={{ bgcolor: "#1976d2", borderBottom: 0 }}>
        <Toolbar sx={{ minHeight: 64, display: "grid", gridTemplateColumns: "1fr auto 1fr" }}>
          <Box sx={{ width: 36, height: 36, borderRadius: "50%", overflow: "hidden", bgcolor: "rgba(255,255,255,.18)", display: "grid", placeItems: "center" }}>{shop.logo ? <Box component="img" src={shop.logo} alt={`${shop.name} logo`} sx={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <StoreRoundedIcon sx={{ fontSize: 21 }} />}</Box>
          <Typography variant="h6" fontWeight={700}>{mobileTitle}</Typography>
          {action ? <IconButton aria-label={action.label} onClick={(event) => action.event === "inventory-sort" ? setSortAnchor(event.currentTarget) : window.dispatchEvent(new Event(action.event))} sx={{ justifySelf: "end", color: "common.white" }}>{action.icon}</IconButton> : <Box />}
        </Toolbar>
        <Menu anchorEl={sortAnchor} open={Boolean(sortAnchor)} onClose={() => setSortAnchor(null)} PaperProps={{ sx: { minWidth: 268, borderRadius: 1, mt: 1 } }}>
          {[ ["recent", "Recently Added"], ["name", "Name (A-Z)"], ["price", "Price (High to Low)"], ["stock", "Stock (Low to High)"] ].map(([value, label]) => <MenuItem key={value} onClick={() => { window.dispatchEvent(new CustomEvent("inventory-sort", { detail: value })); setSortAnchor(null); }} sx={{ minHeight: 60, fontSize: 17 }}>{label}</MenuItem>)}
        </Menu>
      </AppBar>
    );
  }

  return (
    <AppBar position="static" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: "divider" }}>
      <Toolbar sx={{ justifyContent: "space-between", minHeight: 72, px: { md: 4, lg: 5 } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {(isDesktopStockDetails || isDesktopStockHistory) && <IconButton aria-label="Back to inventory" onClick={() => navigate("/stock")} sx={{ ml: -1 }}><ArrowBackRoundedIcon /></IconButton>}
          <Typography variant="h6" fontWeight={700}>{pathname === "/" ? "Dashboard" : isDesktopStockDetails ? "Stock Details" : isDesktopStockHistory ? "Stock Movement" : pathname === "/report/sales" ? "Reports & Analytics / Sales Reports & Analytics" : pathname.startsWith("/report") ? "Reports & Analytics" : pageTitles[pathname] ?? "POS System"}</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <IconButton aria-label="Notifications"><Badge color="error" variant="dot"><NotificationsRoundedIcon /></Badge></IconButton>
          <IconButton aria-label="Account"><AccountCircleRoundedIcon /></IconButton>
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
