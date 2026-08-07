import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddShoppingCartRoundedIcon from "@mui/icons-material/AddShoppingCartRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import PaidRoundedIcon from "@mui/icons-material/PaidRounded";
import ProductionQuantityLimitsRoundedIcon from "@mui/icons-material/ProductionQuantityLimitsRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useData } from "../contexts/DataContext.jsx";
import { api } from "../services/api.js";
import { formatKs, getToday } from "../utils/storage.js";

const kyat = (amount) => `${formatKs(Number(amount || 0))} ကျပ်`;
const emptyList = [];

function dateLabel(value) {
  if (!value) return "ယနေ့";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function paymentLabel(status) {
  if (status === "paid") return "ငွေရှင်းပြီး";
  if (status === "partial") return "တစ်စိတ်တစ်ပိုင်းရှင်းပြီး";
  return "ကုန်ကြွေး";
}

export default function HomePage({ navigate }) {
  const { user } = useAuth();
  const { data, loading: dataLoading, error: dataError } = useData();
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [dashboard, setDashboard] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [dashboardError, setDashboardError] = useState("");

  const shopId = user?.shop?.id;
  const loadDashboard = useCallback(async () => {
    if (!shopId || user?.preview) return;
    setLoadingDashboard(true);
    setDashboardError("");
    try {
      const result = await api.dashboard(shopId, {
        from: selectedDate,
        to: selectedDate,
      });
      setDashboard(result);
    } catch (error) {
      setDashboardError(error.message || "Dashboard data ကို မရယူနိုင်သေးပါ။");
    } finally {
      setLoadingDashboard(false);
    }
  }, [selectedDate, shopId, user?.preview]);

  useEffect(() => {
    const timer = window.setTimeout(loadDashboard, 0);
    return () => window.clearTimeout(timer);
  }, [loadDashboard]);

  const summary = dashboard?.summary || data.dashboard || {};
  const lowStock = dashboard?.lowStock ?? emptyList;
  const recentSales = dashboard?.recentSales ?? emptyList;
  const upcomingPayables = dashboard?.upcomingPayables ?? emptyList;
  const loading = loadingDashboard || (dataLoading && !dashboard);

  const attentionItems = useMemo(
    () => [
      ...lowStock.slice(0, 3).map((item) => ({
        id: `stock-${item.inventoryBatchId || item.productId}`,
        kind: "stock",
        title: item.productName,
        detail: `လက်ကျန် ${item.availableQuantity} ခု`,
        action: "ကုန်ပစ္စည်းကြည့်မည်",
        page: "products",
        urgent: Number(item.availableQuantity) <= 0,
      })),
      ...upcomingPayables.slice(0, 3).map((item) => ({
        id: `payable-${item.id}`,
        kind: "payable",
        title: item.supplierName,
        detail: `${kyat(item.amount)} · ပေးရန် ${item.dueDate ? dateLabel(String(item.dueDate).slice(0, 10)) : "ရက်မသတ်မှတ်ရသေးပါ"}`,
        action: "အဝယ်စာရင်းကြည့်မည်",
        page: "purchases",
        urgent: false,
      })),
    ],
    [lowStock, upcomingPayables],
  );

  return (
    <Box className="page-stack dashboard-page">
      <Box className="dashboard-topbar">
        <Box>
          <Typography className="dashboard-greeting">ပင်မ</Typography>
          <Typography className="dashboard-store-name">
            {user?.shop?.name || "ကျွန်ုပ်၏ဆိုင်"}
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          <TextField
            className="dashboard-date-picker"
            type="date"
            aria-label="ကြည့်မည့်ရက်"
            value={selectedDate}
            onChange={(event) =>
              setSelectedDate(event.target.value || getToday())
            }
            slotProps={{ inputLabel: { shrink: true } }}
            size="small"
          />
        </Stack>
      </Box>

      {dataError || dashboardError ? (
        <Alert severity="warning">
          {dashboardError || "ဆိုင်ဒေတာကို ပြန်လည်ရယူနေပါသည်။"}
        </Alert>
      ) : null}

      <Card className="dashboard-hero" elevation={0}>
        <Box>
          <Typography className="dashboard-hero-label">
            {selectedDate === getToday()
              ? "ယနေ့ရောင်းအား"
              : `${dateLabel(selectedDate)} ရောင်းအား`}
          </Typography>
          <Typography className="dashboard-hero-value">
            {kyat(summary.revenue)}
          </Typography>
          <Typography className="dashboard-hero-caption">
            အရောင်းပြီးစီးမှု {summary.salesCount || 0} ခု
          </Typography>
        </Box>
        <Button
          variant="contained"
          className="dashboard-sale-action"
          startIcon={<AddShoppingCartRoundedIcon />}
          onClick={() => navigate("order")}
        >
          အရောင်းပြုလုပ်မည်
        </Button>
      </Card>

      {loading ? (
        <Box className="dashboard-loading">
          <CircularProgress size={28} />
        </Box>
      ) : null}

      <Box className="dashboard-metric-grid">
        <DashboardMetric
          icon={<TrendingUpRoundedIcon />}
          label="ယနေ့အမြတ်"
          value={kyat(summary.netProfit)}
          tone="green"
        />
        <DashboardMetric
          icon={<AccountBalanceWalletRoundedIcon />}
          label="ငွေလက်ကျန်"
          value={kyat(summary.cashBalance)}
          tone="mint"
        />
        <DashboardMetric
          icon={<Inventory2RoundedIcon />}
          label="ကုန်ပစ္စည်းလက်ကျန်"
          value={`${summary.stockUnits || 0} ခု`}
          subvalue={`အမျိုးအစား ${summary.categoriesCount || 0} မျိုး`}
          tone="mint"
        />
        <DashboardMetric
          icon={<ProductionQuantityLimitsRoundedIcon />}
          label="stock နည်း/ပြတ်"
          value={`${lowStock.length} မျိုး`}
          tone={lowStock.length ? "amber" : "mint"}
        />
        <DashboardMetric
          icon={<PaidRoundedIcon />}
          label="ယနေ့အသုံးစရိတ်"
          value={kyat(summary.operatingExpenses)}
          tone="amber"
          wide
        />
      </Box>

      <DashboardSection
        title="အာရုံစိုက်ရန်"
        icon={<WarningAmberRoundedIcon />}
      >
        {attentionItems.length ? (
          attentionItems.map((item) => (
            <Box className="dashboard-attention-row" key={item.id}>
              <Box
                className={`dashboard-attention-icon ${item.urgent ? "is-urgent" : ""}`}
              >
                {item.kind === "stock" ? (
                  <Inventory2RoundedIcon />
                ) : (
                  <LocalShippingRoundedIcon />
                )}
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography fontWeight={800} noWrap>
                  {item.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.detail}
                </Typography>
              </Box>
              <Button size="small" onClick={() => navigate(item.page)}>
                {item.action}
              </Button>
            </Box>
          ))
        ) : (
          <DashboardEmpty message="ယနေ့အတွက် အရေးကြီးသောသတိပေးချက် မရှိသေးပါ။" />
        )}
      </DashboardSection>

      <DashboardSection
        title="ယနေ့နောက်ဆုံးအရောင်းများ"
        icon={<ReceiptLongRoundedIcon />}
        action={
          <Button size="small" onClick={() => navigate("sales")}>
            အားလုံးကြည့်မည်
          </Button>
        }
      >
        {recentSales.length ? (
          recentSales.map((sale) => (
            <Box className="dashboard-sale-row" key={sale.id}>
              <Box className="dashboard-sale-icon">
                <ReceiptLongRoundedIcon />
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography fontWeight={800} noWrap>
                  {sale.invoiceNumber}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {sale.customerName}
                </Typography>
              </Box>
              <Stack spacing={0.25} sx={{ alignItems: 'flex-end' }}>
                <Typography fontWeight={900}>{kyat(sale.amount)}</Typography>
                <Chip
                  size="small"
                  label={paymentLabel(sale.paymentStatus)}
                  color={sale.paymentStatus === "paid" ? "success" : "warning"}
                />
              </Stack>
            </Box>
          ))
        ) : (
          <DashboardEmpty message="ရွေးထားသောရက်တွင် အရောင်းပြီးစီးမှု မရှိသေးပါ။" />
        )}
      </DashboardSection>
    </Box>
  );
}

function DashboardMetric({ icon, label, value, subvalue, tone, wide = false }) {
  return (
    <Card
      className={`dashboard-metric dashboard-metric-${tone} ${wide ? "dashboard-metric-wide" : ""}`}
      elevation={0}
    >
      <Box className="dashboard-metric-icon">{icon}</Box>
      <Typography className="dashboard-metric-label">{label}</Typography>
      <Typography className="dashboard-metric-value">{value}</Typography>
      {subvalue ? (
        <Typography className="dashboard-metric-subvalue">
          {subvalue}
        </Typography>
      ) : null}
    </Card>
  );
}

function DashboardSection({ title, icon, action, children }) {
  return (
    <Card className="dashboard-section" elevation={0}>
      <Box className="dashboard-section-heading">
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Box className="dashboard-section-icon">{icon}</Box>
          <Typography variant="h6">{title}</Typography>
        </Stack>
        {action}
      </Box>
      <Box className="dashboard-section-body">{children}</Box>
    </Card>
  );
}

function DashboardEmpty({ message }) {
  return <Typography className="dashboard-empty">{message}</Typography>;
}
