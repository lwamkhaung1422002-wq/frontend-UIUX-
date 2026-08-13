import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  Stack,
  Typography,
  useMediaQuery,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import AddBusinessRoundedIcon from "@mui/icons-material/AddBusinessRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import RocketLaunchRoundedIcon from "@mui/icons-material/RocketLaunchRounded";
import ShoppingCartCheckoutRoundedIcon from "@mui/icons-material/ShoppingCartCheckoutRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import { useNavigate } from "react-router";
import { demoOrders, getDashboardSummary } from "../../data/dashboardData";

const setupStorageKey = "pos:dashboard-setup-dismissed";
const formatKyat = (amount) =>
  `${new Intl.NumberFormat("en-US").format(amount)} ကျပ်`;

function MetricCard({ label, value, color, borderColor }) {
  return (
    <Card
      variant="outlined"
      sx={{
        bgcolor: "#fff",
        borderColor,
        borderWidth: 2,
        borderRadius: 2.5,
        minHeight: 142,
        boxShadow: "0 3px 8px rgba(15, 23, 42, 0.11)",
      }}
    >
      <CardContent
        sx={{
          height: "100%",
          minHeight: 142,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          textAlign: "left",
          pl: 3,
          pr: 2,
          py: 2,
          "&:last-child": { pb: 2 },
        }}
      >
        <Stack spacing={1.5} alignItems="flex-start">
          <Typography
            sx={{
              color,
              fontSize: { xs: 23, sm: 28 },
              lineHeight: 1.1,
              fontWeight: 800,
            }}
          >
            {value}
          </Typography>
          <Typography sx={{ color: "#5f6368", fontSize: 14 }}>
            {label}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function HomePage() {
  const isMobile = useMediaQuery("(max-width:768px)");
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const [showSetup, setShowSetup] = useState(
    () => localStorage.getItem(setupStorageKey) !== "true",
  );
  const summary = getDashboardSummary();

  useEffect(() => {
    const refreshDashboard = () => setRefreshKey((value) => value + 1);
    window.addEventListener("dashboard-refresh", refreshDashboard);
    return () =>
      window.removeEventListener("dashboard-refresh", refreshDashboard);
  }, []);

  const dismissSetup = () => {
    localStorage.setItem(setupStorageKey, "true");
    setShowSetup(false);
  };

  if (!isMobile) {
    return <DesktopDashboard summary={summary} orders={demoOrders} navigate={navigate} />;
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#f8fafc",
        color: "#101828",
        px: 3,
        py: 3,
      }}
    >
      <Typography sx={{ color: "#7a7f87", fontSize: 16 }}>
        Good Evening
      </Typography>
      <Typography variant="h5" fontWeight={800} sx={{ mt: 0.25 }}>
        LI
      </Typography>

      {showSetup && (
        <Card
          variant="outlined"
          sx={{
            position: "relative",
            mt: 3,
            bgcolor: "#f3f8ff",
            borderColor: "#c6dcec",
            borderRadius: 3,
            boxShadow: "0 3px 8px rgba(15, 23, 42, 0.18)",
          }}
        >
          <IconButton
            aria-label="Dismiss setup"
            onClick={dismissSetup}
            size="small"
            sx={{ position: "absolute", right: 8, top: 8, color: "#708090" }}
          >
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
          <CardContent sx={{ p: 3, "&:last-child": { pb: 3 } }}>
            <Stack direction="row" spacing={1.25} alignItems="left">
              <RocketLaunchRoundedIcon
                sx={{ color: "#1976d2", fontSize: 34 }}
              />
              <Typography
                sx={{ color: "#1976d2", fontSize: 23, fontWeight: 800 }}
              >
                Get Started
              </Typography>
            </Stack>
            <Typography
              sx={{
                mt: 1.25,
                color: "#384452",
                fontSize: 16,
                lineHeight: 1.55,
              }}
            >
              Set up your shop by adding products to your inventory
            </Typography>
            <Stack spacing={1.5} sx={{ mt: 2.5, alignItems: "flex-start" }}>
              <Button
                variant="outlined"
                startIcon={<AddBusinessRoundedIcon />}
                onClick={() => navigate("/stock")}
                sx={{
                  borderColor: "#b7d0e5",
                  color: "#1976d2",
                  borderRadius: 6,
                  px: 2.5,
                  py: 1,
                  fontSize: 16,
                }}
              >
                Add Category
              </Button>
              <Button
                variant="outlined"
                startIcon={<AddRoundedIcon />}
                onClick={() => navigate("/stock")}
                sx={{
                  borderColor: "#b7d0e5",
                  color: "#1976d2",
                  borderRadius: 6,
                  px: 2.5,
                  py: 1,
                  fontSize: 16,
                }}
              >
                Add Product
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      <Box
        key={refreshKey}
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 2,
          mt: 3,
        }}
      >
        <MetricCard
          label="Today's Sales"
          value={formatKyat(summary.todaySales)}
          color="#43a35a"
          borderColor="#c9e8d1"
        />
        <MetricCard
          label="Today's Expense"
          value={formatKyat(summary.todayExpense)}
          color="#e69b22"
          borderColor="#f4ddb4"
        />
        <MetricCard
          label="Low Stock Items"
          value={summary.lowStockItems}
          color="#e65353"
          borderColor="#f3c9c9"
        />
        <MetricCard
          label="Today's Profit"
          value={formatKyat(summary.todayProfit)}
          color="#1f86d6"
          borderColor="#c4e0f2"
        />
      </Box>

      <Typography variant="h6" fontWeight={800} sx={{ mt: 3.25, mb: 2 }}>
        Quick Actions
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 2,
        }}
      >
        <Button
          onClick={() => navigate("/sale/create")}
          sx={{
            minHeight: 138,
            flexDirection: "column",
            gap: 1.2,
            border: 1,
            borderColor: "#a9cbe3",
            bgcolor: "#e9f4fd",
            color: "#1976d2",
            borderRadius: 2.5,
            fontSize: 15,
            fontWeight: 700,
          }}
        >
          <ShoppingCartCheckoutRoundedIcon sx={{ fontSize: 42 }} />
          Create Order
        </Button>
        <Button
          onClick={() => navigate("/stock")}
          sx={{
            minHeight: 138,
            flexDirection: "column",
            gap: 1.2,
            border: 1,
            borderColor: "#f0c1b6",
            bgcolor: "#fff0ea",
            color: "#f25c3b",
            borderRadius: 2.5,
            fontSize: 15,
            fontWeight: 700,
          }}
        >
          <AddRoundedIcon sx={{ fontSize: 42 }} />
          Add Product
        </Button>
      </Box>

      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mt: 4, mb: 2 }}
      >
        <Typography variant="h6" fontWeight={800}>
          Recent Orders
        </Typography>
        <Button
          onClick={() => navigate("/sale-record")}
          sx={{
            ml: "auto",
            color: "#1976d2",
            textTransform: "none",
            fontSize: 16,
            fontWeight: 700,
            minWidth: 0,
          }}
        >
          View All
        </Button>
      </Stack>
      <Stack spacing={1.25}>
        {demoOrders.map((order) => (
          <Card
            key={order.id}
            sx={{
              bgcolor: "#fff",
              borderRadius: 2.5,
              boxShadow: "0 3px 8px rgba(15, 23, 42, 0.16)",
            }}
          >
            <CardContent sx={{ px: 2, py: 1, "&:last-child": { pb: 1 } }}>
              <Stack direction="row" alignItems="center" spacing={1.25}>
                <CheckCircleRoundedIcon
                  sx={{ color: "#43a35a", fontSize: 36, flexShrink: 0 }}
                />
                <Typography
                  noWrap
                  fontWeight={700}
                  sx={{ minWidth: 0, flexGrow: 1 }}
                >
                  {order.id}
                </Typography>
                <Typography noWrap fontWeight={800}>
                  {formatKyat(order.amount)}
                </Typography>
                <Chip
                  label="Done"
                  size="small"
                  sx={{
                    bgcolor: "#e8f6ec",
                    color: "#38924e",
                    fontWeight: 700,
                    height: 26,
                  }}
                />
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Box>
  );
}

function DesktopDashboard({ summary, orders, navigate }) {
  const metrics = [
    { label: "Today's Sales", value: formatKyat(summary.todaySales), icon: <TrendingUpRoundedIcon />, tone: "primary.main", soft: "#eaf3ff" },
    { label: "Today's Expense", value: formatKyat(summary.todayExpense), icon: <AccountBalanceWalletRoundedIcon />, tone: "warning.main", soft: "#fff5e5" },
    { label: "Low Stock Items", value: summary.lowStockItems, icon: <Inventory2RoundedIcon />, tone: "error.main", soft: "#fff0ef" },
    { label: "Today's Profit", value: formatKyat(summary.todayProfit), icon: <ReceiptLongRoundedIcon />, tone: "success.main", soft: "#eaf8ed" },
  ];

  return (
    <Box sx={{ maxWidth: 1440, mx: "auto", py: 1 }}>
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 4 }}>
        <Box>
          <Typography color="text.secondary" sx={{ fontSize: 15, mb: 0.75 }}>Overview</Typography>
          <Typography color="text.primary" sx={{ fontSize: 30, fontWeight: 700 }}>Good evening, LI</Typography>
          <Typography color="text.secondary" sx={{ fontSize: 15, mt: 0.75 }}>Here is what is happening in your store today.</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => navigate("/sale/create")} sx={{ minHeight: 44, px: 2.25, borderRadius: 2, textTransform: "none", fontWeight: 700 }}>Create Order</Button>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 2.25, mb: 3.25 }}>
        {metrics.map((metric) => <DesktopMetricCard key={metric.label} {...metric} />)}
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1.65fr) minmax(300px, 0.85fr)", gap: 3 }}>
        <Card sx={desktopCardSx}>
          <CardContent sx={{ p: 3, "&:last-child": { pb: 3 } }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2.5 }}>
              <Box><Typography sx={{ fontSize: 20, fontWeight: 700 }}>Recent Orders</Typography><Typography color="text.secondary" sx={{ fontSize: 14, mt: 0.5 }}>Latest completed sales</Typography></Box>
              <Button endIcon={<ArrowForwardRoundedIcon />} onClick={() => navigate("/sale")} sx={{ color: "primary.main", textTransform: "none", fontWeight: 700 }}>View all</Button>
            </Box>
            <Box sx={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 0.85fr", px: 1.5, pb: 1.25 }}>
              <Typography color="text.secondary" sx={{ fontSize: 13, fontWeight: 700 }}>ORDER</Typography>
              <Typography color="text.secondary" sx={{ fontSize: 13, fontWeight: 700 }}>STATUS</Typography>
              <Typography color="text.secondary" sx={{ fontSize: 13, fontWeight: 700, textAlign: "right" }}>AMOUNT</Typography>
            </Box>
            <Divider />
            {orders.map((order) => <Box key={order.id} sx={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 0.85fr", alignItems: "center", px: 1.5, py: 2 }}>
              <Typography sx={{ fontSize: 15, fontWeight: 700 }}>{order.id}</Typography>
              <Chip label="Done" size="small" sx={{ justifySelf: "start", bgcolor: "#e8f6ec", color: "success.main", fontWeight: 700, height: 26 }} />
              <Typography sx={{ fontSize: 15, fontWeight: 700, textAlign: "right" }}>{formatKyat(order.amount)}</Typography>
            </Box>)}
          </CardContent>
        </Card>

        <Box sx={{ display: "grid", gap: 3, alignContent: "start" }}>
          <Card sx={desktopCardSx}>
            <CardContent sx={{ p: 3, "&:last-child": { pb: 3 } }}>
              <Typography sx={{ fontSize: 20, fontWeight: 700, mb: 2.25 }}>Quick Actions</Typography>
              <Box sx={{ display: "grid", gap: 1.25 }}>
                <DesktopAction icon={<ShoppingCartCheckoutRoundedIcon />} title="Create Order" description="Start a new sale" onClick={() => navigate("/sale/create")} />
                <DesktopAction icon={<AddRoundedIcon />} title="Add Product" description="Add inventory to your store" onClick={() => navigate("/stock/add")} />
                <DesktopAction icon={<Inventory2RoundedIcon />} title="View Inventory" description="Manage products and stock" onClick={() => navigate("/stock")} />
              </Box>
            </CardContent>
          </Card>
          <Card sx={{ ...desktopCardSx, bgcolor: "#f1f7ff", border: "1px solid #d5e6fb" }}>
            <CardContent sx={{ p: 3, "&:last-child": { pb: 3 } }}>
              <Typography color="primary.main" sx={{ fontSize: 15, fontWeight: 700 }}>INVENTORY SNAPSHOT</Typography>
              <Typography sx={{ fontSize: 28, fontWeight: 700, mt: 1 }}>{summary.totalProducts} Products</Typography>
              <Typography color="text.secondary" sx={{ fontSize: 15, mt: 0.75 }}>Your stock levels are up to date.</Typography>
              <Button onClick={() => navigate("/stock")} sx={{ mt: 1.5, px: 0, color: "primary.main", textTransform: "none", fontWeight: 700 }}>Open Inventory</Button>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
}

function DesktopMetricCard({ label, value, icon, tone, soft }) {
  return (
    <Card sx={{ ...desktopCardSx, minHeight: 148 }}>
      <CardContent sx={{ p: 2.75, "&:last-child": { pb: 2.75 } }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Box><Typography color="text.secondary" sx={{ fontSize: 14, fontWeight: 600 }}>{label}</Typography><Typography sx={{ mt: 1.75, fontSize: 25, lineHeight: 1.1, fontWeight: 700 }}>{value}</Typography></Box>
          <Box sx={{ width: 42, height: 42, display: "grid", placeItems: "center", borderRadius: 2, bgcolor: soft, color: tone }}>{icon}</Box>
        </Box>
      </CardContent>
    </Card>
  );
}

function DesktopAction({ icon, title, description, onClick }) {
  return <Button onClick={onClick} sx={{ width: "100%", minHeight: 68, px: 1.5, display: "grid", gridTemplateColumns: "42px minmax(0, 1fr) auto", alignItems: "center", textAlign: "left", color: "text.primary", textTransform: "none", borderRadius: 2, "&:hover": { bgcolor: "action.hover" } }}><Box sx={{ width: 38, height: 38, display: "grid", placeItems: "center", color: "primary.main", bgcolor: "#eaf3ff", borderRadius: 1.5 }}>{icon}</Box><Box><Typography sx={{ fontSize: 15, fontWeight: 700 }}>{title}</Typography><Typography color="text.secondary" sx={{ fontSize: 13, mt: 0.25 }}>{description}</Typography></Box><ArrowForwardRoundedIcon sx={{ color: "text.secondary", fontSize: 20 }} /></Button>;
}

const desktopCardSx = { borderRadius: 3, bgcolor: "background.paper", boxShadow: "0 3px 12px rgba(15,23,42,0.07)", border: "1px solid", borderColor: "divider" };
