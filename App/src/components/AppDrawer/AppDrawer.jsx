import { useLocation, useNavigate } from "react-router";
import {
  Avatar,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
} from "@mui/material";
import {
  AccountBalanceWalletRounded as PaymentIcon,
  AnalyticsRounded as ReportIcon,
  DashboardRounded as HomeIcon,
  DescriptionRounded as NoteIcon,
  Inventory2Rounded as InventoryIcon,
  LocalOfferRounded as PriceIcon,
  LogoutRounded as LogoutIcon,
  ReceiptLongRounded as SaleRecordIcon,
  SettingsRounded as SettingsRoundedIcon,
  ShoppingCartRounded as SaleIcon,
  ShoppingCartSharp as SuppliersIcon,
  StorefrontRounded as StoreIcon,
} from "@mui/icons-material";

const menuItems = [
  { label: "Home", path: "/", icon: <HomeIcon /> },
  { label: "Orders", path: "/sale", icon: <SaleIcon /> },
  { label: "Inventory", path: "/stock", icon: <InventoryIcon /> },
  {
    label: "SaleRecords",
    path: "/sale-record",
    icon: <SaleRecordIcon />,
  },
  {
    label: "Suppliers",
    path: "/suppliers",
    icon: <SuppliersIcon />,
  },
  {
    label: "Price & Discount",
    path: "/price",
    icon: <PriceIcon />,
  },

  {
    label: "Payment",
    path: "/payment",
    icon: <PaymentIcon />,
  },
  { label: "Report", path: "/report", icon: <ReportIcon /> },

  { label: "Note", path: "/note", icon: <NoteIcon /> },

  { label: "Settings", path: "/settings", icon: <SettingsRoundedIcon /> },
];

export default function AppDrawer() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width:768px)");

  if (isMobile) return null;

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 260,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: 260,
          boxSizing: "border-box",
          bgcolor: "background.paper",
          color: "text.primary",
          borderRight: 1,
          borderColor: "divider",
        },
      }}
    >
      <Toolbar sx={{ minHeight: 72, px: 2.5, gap: 1.5 }}>
        <Avatar sx={{ bgcolor: "primary.main" }}>
          <StoreIcon />
        </Avatar>
        <Typography fontWeight={700} sx={{ fontSize: 18 }}>Belle Store</Typography>
      </Toolbar>
      <List sx={{ px: 1.5, py: 2, flexGrow: 1 }}>
        {menuItems.map((item) => (
          <ListItemButton
            key={item.path}
            selected={pathname === item.path}
            onClick={() => navigate(item.path)}
            sx={{
              mb: 0.5,
              borderRadius: 1.5,
              color: "text.secondary",
              "&.Mui-selected": {
                bgcolor: "#eaf3ff",
                color: "primary.main",
                "&:hover": { bgcolor: "#eaf3ff" },
              },
              "&:hover": { bgcolor: "action.hover" },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: "inherit" }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={item.label}
              slotProps={{ primary: { sx: { fontSize: 14, fontWeight: 600 } } }}
            />
          </ListItemButton>
        ))}
      </List>
      <Divider sx={{ borderColor: "rgba(255,255,255,0.2)" }} />
      <List sx={{ px: 1, py: 1.5 }}>
        <ListItemButton
          sx={{ borderRadius: 1.5, color: "text.secondary", mb: 1, "&:hover": { bgcolor: "action.hover" } }}
        >
          <ListItemIcon sx={{ minWidth: 40, color: "inherit" }}>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText
            primary="Logout"
            slotProps={{ primary: { sx: { fontSize: 14, fontWeight: 600 } } }}
          />
        </ListItemButton>
      </List>
    </Drawer>
  );
}
