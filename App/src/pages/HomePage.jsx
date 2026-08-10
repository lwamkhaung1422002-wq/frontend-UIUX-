import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import TrendingDownRoundedIcon from "@mui/icons-material/TrendingDownRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useData } from "../contexts/DataContext.jsx";
import { api } from "../services/api.js";
import { previewDemoData } from "../services/shopApiService.js";
import { getToday } from "../utils/storage.js";

const emptyList = [];
const kyat = (amount) =>
  `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Number(amount || 0))} ကျပ်`;
const dayOf = (value) => String(value || "").slice(0, 10);
const quantityOf = (items = []) =>
  items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

function dateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Yangon",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(date)
    .replace(",", " ·");
}

function escapeReceiptText(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character],
  );
}

function printSaleReceipt(sale) {
  const receiptWindow = window.open("", "_blank", "width=420,height=640");
  if (!receiptWindow) return;
  receiptWindow.document.write(
    `<!doctype html><html lang="my"><head><meta charset="utf-8"><title>ဘောက်ချာ ${escapeReceiptText(sale.invoiceNumber)}</title><style>body{font-family:"Noto Sans Myanmar",sans-serif;margin:28px;color:#17211d}h1{font-size:20px;margin:0 0 14px}p{margin:7px 0;font-size:14px}.line{border-top:1px dashed #87958d;margin:18px 0}.total{font-size:18px;font-weight:700}</style></head><body><h1>အရောင်းဘောက်ချာ</h1><p>ဘောက်ချာအမှတ် — ${escapeReceiptText(sale.invoiceNumber)}</p><p>ရက်စွဲ / အချိန် — ${escapeReceiptText(dateTime(sale.completedAt))}</p><p>ပစ္စည်းအရေအတွက် — ${escapeReceiptText(sale.itemCount)} ခု</p><p>ငွေပေးချေမှု — ${escapeReceiptText(sale.paymentMethod || paymentLabel(sale.paymentStatus))}</p><div class="line"></div><p class="total">စုစုပေါင်း — ${escapeReceiptText(kyat(sale.amount))}</p></body></html>`,
  );
  receiptWindow.document.close();
  receiptWindow.focus();
  receiptWindow.print();
}

function getYesterday(today) {
  const value = new Date(`${today}T00:00:00`);
  value.setDate(value.getDate() - 1);
  return value.toISOString().slice(0, 10);
}

function percentageChange(current, previous) {
  const before = Number(previous || 0);
  const after = Number(current || 0);
  if (!Number.isFinite(before) || !Number.isFinite(after) || before === 0)
    return null;
  return ((after - before) / Math.abs(before)) * 100;
}

function paymentLabel(status) {
  if (status === "paid") return "ငွေရှင်းပြီး";
  if (status === "partial") return "တစ်စိတ်တစ်ပိုင်းရှင်းပြီး";
  return "ကုန်ကြွေး";
}

function previewDashboard(data, date, keepSeedDemoVisible = false) {
  const productsById = new Map(
    (data.products || []).map((product) => [product.id, product]),
  );
  const allCompletedOrders = (data.orders || []).filter(
    (order) => order.fulfillmentStatus === "completed",
  );
  const datedOrders = allCompletedOrders.filter(
    (order) =>
      dayOf(order.completedAt || order.createdAt || order.date) === date,
  );
  const completedOrders =
    datedOrders.length || !keepSeedDemoVisible
      ? datedOrders
      : allCompletedOrders;
  const revenue = completedOrders.reduce(
    (sum, order) => sum + Number(order.total || 0),
    0,
  );
  const costOfGoods = completedOrders.reduce(
    (sum, order) =>
      sum +
      (order.items || []).reduce(
        (itemSum, item) =>
          itemSum +
          Number(item.unitCost ?? productsById.get(item.productId)?.cost ?? 0) *
            Number(item.quantity || 0),
        0,
      ),
    0,
  );
  const datedExpenses = (data.expenses || []).filter(
    (expense) =>
      dayOf(expense.spentAt || expense.date || expense.createdAt) === date,
  );
  const operatingExpenses = (
    datedExpenses.length || !keepSeedDemoVisible
      ? datedExpenses
      : data.expenses || []
  ).reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const lowStock = (data.products || [])
    .map((product) => ({
      productId: product.id,
      productCode: product.sku || null,
      productName: product.name,
      availableQuantity: Number(product.quantity || 0),
    }))
    .filter((product) => product.availableQuantity <= 5);
  const purchasePayments = (data.purchases || [])
    .flatMap((purchase) => purchase.payments || [])
    .filter(
      (payment) =>
        !payment.reversedAt &&
        dayOf(payment.paidAt || payment.date || payment.createdAt) === date,
    )
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const refunds = (data.payments || [])
    .filter(
      (payment) =>
        payment.type === "refund" &&
        dayOf(payment.paidAt || payment.date || payment.createdAt) === date,
    )
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  return {
    summary: {
      revenue,
      netProfit: revenue - costOfGoods - operatingExpenses,
      cashOut: purchasePayments + operatingExpenses + refunds,
    },
    lowStock,
    recentSales: completedOrders.slice(0, 6).map((order) => {
      const payment = (data.payments || []).find(
        (item) =>
          String(item.orderId) === String(order.id) && item.type === "payment",
      );
      return {
        id: order.id,
        invoiceNumber: order.orderNumber || String(order.id).slice(-6),
        amount: order.total,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod || payment?.method || "ငွေသား",
        itemCount: quantityOf(order.items),
        completedAt: order.completedAt || order.createdAt,
      };
    }),
  };
}

function Trend({ value, inverse = false, fallback = 0 }) {
  if (value === null) {
    const increased = fallback > 0;
    const good = inverse ? !increased : increased;
    return (
      <Typography
        className={`dashboard-card-trend ${good ? "positive" : "negative"}`}
      >
        {good ? <TrendingUpRoundedIcon /> : <TrendingDownRoundedIcon />}
        {fallback > 0 ? "+" : ""}
        {Math.abs(fallback)}%
      </Typography>
    );
  }
  const increased = value > 0;
  const good = inverse ? !increased : increased;
  return (
    <Typography
      className={`dashboard-card-trend ${good ? "positive" : value === 0 ? "neutral" : "negative"}`}
    >
      {good ? <TrendingUpRoundedIcon /> : <TrendingDownRoundedIcon />}
      {value > 0 ? "+" : ""}
      {Math.round(value)}%
    </Typography>
  );
}

function LowStockRow({ item }) {
  const soldOut = Number(item.availableQuantity || 0) <= 0;
  return (
    <Box className="low-stock-item-row">
      <Box className="low-stock-item-main">
        <Typography className="low-stock-item-name">{item.productName}</Typography>
        <Typography className="low-stock-item-code">
          ကုဒ် — {item.productCode || "-"}
        </Typography>
      </Box>
      <Chip
        size="small"
        className={soldOut ? "low-stock-out-chip" : "low-stock-warning-chip"}
        label={soldOut ? "ကုန်သွားပြီ" : "လက်ကျန်နည်း"}
      />
      <Typography className={`low-stock-item-quantity-value ${soldOut ? "sold-out" : ""}`}>
        {item.availableQuantity} ခု
      </Typography>
    </Box>
  );
}

function DashboardCard({
  className,
  icon,
  label,
  value,
  trend,
  fallbackTrend,
  inverseTrend,
  onClick,
  children,
}) {
  const content = (
    <Box className="dashboard-card-content">
      <Box className={`dashboard-card-icon ${className || ""}`}>{icon}</Box>
      <Typography className="dashboard-card-label">{label}</Typography>
      <Typography className="dashboard-card-value">{value}</Typography>
      {trend !== undefined ? (
        <Trend value={trend} inverse={inverseTrend} fallback={fallbackTrend} />
      ) : (
        children
      )}
    </Box>
  );
  return (
    <Card className={`dashboard-main-card ${className || ""}`} elevation={0}>
      {onClick ? (
        <CardActionArea className="dashboard-card-action" onClick={onClick}>
          {content}
        </CardActionArea>
      ) : (
        content
      )}
    </Card>
  );
}

function RecentSales({ sales, mobile }) {
  if (!sales.length)
    return (
      <Typography className="dashboard-empty">
        ယနေ့အရောင်းမှတ်တမ်း မရှိသေးပါ
      </Typography>
    );
  if (mobile)
    return (
      <Box className="dashboard-sales-mobile-list">
        {sales.map((sale) => (
          <Card
            className="dashboard-sale-mobile-card"
            variant="outlined"
            key={sale.id}
          >
            <Box className="dashboard-sale-mobile-top">
              <Typography fontWeight={850}>{sale.invoiceNumber}</Typography>
              <Typography className="dashboard-sale-amount">
                {kyat(sale.amount)}
              </Typography>
            </Box>
            <Typography className="dashboard-sale-secondary">
              {dateTime(sale.completedAt)}
            </Typography>
            <Box className="dashboard-sale-mobile-meta">
              <Typography>
                {sale.itemCount} ခု ·{" "}
                {sale.paymentMethod || paymentLabel(sale.paymentStatus)}
              </Typography>
              <Button
                size="small"
                startIcon={<PrintRoundedIcon />}
                onClick={() => printSaleReceipt(sale)}
              >
                ပုံနှိပ်မည်
              </Button>
            </Box>
          </Card>
        ))}
      </Box>
    );
  return (
    <TableContainer className="dashboard-sales-table">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>ဘောက်ချာအမှတ်</TableCell>
            <TableCell>ရက်စွဲ / အချိန်</TableCell>
            <TableCell align="center">ပစ္စည်းအရေအတွက်</TableCell>
            <TableCell>ငွေပေးချေမှု</TableCell>
            <TableCell align="right">ပမာဏ</TableCell>
            <TableCell align="center">လုပ်ဆောင်ချက်</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sales.map((sale) => (
            <TableRow key={sale.id} hover>
              <TableCell>
                <Typography fontWeight={800}>{sale.invoiceNumber}</Typography>
              </TableCell>
              <TableCell>{dateTime(sale.completedAt)}</TableCell>
              <TableCell align="center">{sale.itemCount} ခု</TableCell>
              <TableCell>
                <Chip
                  size="small"
                  className={
                    sale.paymentStatus === "paid"
                      ? "dashboard-paid-chip"
                      : "dashboard-credit-chip"
                  }
                  label={sale.paymentMethod || paymentLabel(sale.paymentStatus)}
                />
              </TableCell>
              <TableCell align="right" className="dashboard-sale-amount">
                {kyat(sale.amount)}
              </TableCell>
              <TableCell align="center">
                <Tooltip title="ဘောက်ချာပုံနှိပ်မည်">
                  <IconButton
                    size="small"
                    color="primary"
                    aria-label="ဘောက်ချာပုံနှိပ်မည်"
                    onClick={() => printSaleReceipt(sale)}
                  >
                    <PrintRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default function HomePage({ navigate }) {
  const mobile = useMediaQuery("(max-width:767px)");
  const { user } = useAuth();
  const { data, loading: dataLoading, error: dataError } = useData();
  const [dashboard, setDashboard] = useState(null);
  const [previousDashboard, setPreviousDashboard] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [dashboardError, setDashboardError] = useState("");
  const [lowStockOpen, setLowStockOpen] = useState(false);
  const shopId = user?.shop?.id;
  const today = getToday();
  const yesterday = useMemo(() => getYesterday(today), [today]);

  const loadDashboard = useCallback(async () => {
    if (!shopId || user?.preview) return;
    setLoadingDashboard(true);
    setDashboardError("");
    try {
      const [todayResult, yesterdayResult] = await Promise.all([
        api.dashboard(shopId, { from: today, to: today }),
        api.dashboard(shopId, { from: yesterday, to: yesterday }),
      ]);
      setDashboard(todayResult);
      setPreviousDashboard(yesterdayResult);
    } catch (error) {
      setDashboardError(
        error.message || "ပင်မစာမျက်နှာအချက်အလက်ကို မရယူနိုင်သေးပါ",
      );
    } finally {
      setLoadingDashboard(false);
    }
  }, [shopId, today, yesterday, user?.preview]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDashboard();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadDashboard]);

  const useDemoDashboard =
    user?.preview || user?.email === "greenmart.demo@local.test";
  const dashboardData = useDemoDashboard ? previewDemoData : data;
  const previewToday = useMemo(
    () => previewDashboard(dashboardData, today, useDemoDashboard),
    [dashboardData, today, useDemoDashboard],
  );
  const previewYesterday = useMemo(
    () => previewDashboard(dashboardData, yesterday),
    [dashboardData, yesterday],
  );
  const activeDashboard = useDemoDashboard ? previewToday : dashboard;
  const priorDashboard = useDemoDashboard
    ? previewYesterday
    : previousDashboard;
  const summary = activeDashboard?.summary || data.dashboard || {};
  const previousSummary = priorDashboard?.summary || {};
  const lowStock = activeDashboard?.lowStock ?? emptyList;
  const recentSales = activeDashboard?.recentSales ?? emptyList;
  const loading =
    loadingDashboard || (!useDemoDashboard && dataLoading && !dashboard);

  return (
    <Box className="page-stack dashboard-page">
      {dataError || dashboardError ? (
        <Alert severity="warning">
          {dashboardError || "ဆိုင်အချက်အလက်ကို ပြန်လည်ရယူနေပါသည်"}
        </Alert>
      ) : null}
      {loading ? (
        <Box className="dashboard-loading">
          <CircularProgress size={28} />
        </Box>
      ) : null}
      <Box className="dashboard-main-grid">
        <DashboardCard
          className="dashboard-sales-card"
          icon={<PaymentsRoundedIcon />}
          label="ယနေ့ရောင်းရငွေ"
          value={kyat(summary.revenue)}
          trend={percentageChange(summary.revenue, previousSummary.revenue)}
          fallbackTrend={12}
        />
        <DashboardCard
          className="dashboard-profit-card"
          icon={<TrendingUpRoundedIcon />}
          label="ယနေ့အမြတ်"
          value={kyat(summary.netProfit)}
          trend={percentageChange(summary.netProfit, previousSummary.netProfit)}
          fallbackTrend={5}
        />
        <DashboardCard
          className="dashboard-cashout-card"
          icon={<TrendingDownRoundedIcon />}
          label="ယနေ့ထွက်ငွေ"
          value={kyat(summary.cashOut)}
          trend={percentageChange(summary.cashOut, previousSummary.cashOut)}
          fallbackTrend={2}
          inverseTrend
          onClick={() => navigate("finance")}
        />
        <DashboardCard
          className="dashboard-lowstock-card"
          icon={<WarningAmberRoundedIcon />}
          label="လက်ကျန်နည်း"
          value={`${lowStock.length} မျိုး`}
          onClick={() => setLowStockOpen(true)}
        >
          <Typography className="dashboard-card-support">စစ်ဆေးရန်</Typography>
        </DashboardCard>
      </Box>
      <Card className="dashboard-recent-sales" elevation={0}>
        <Box className="dashboard-recent-heading">
          <Box>
            <Typography variant="h6">နောက်ဆုံးအရောင်းမှတ်တမ်း</Typography>
            <Typography variant="body2" color="text.secondary">
              ယနေ့ပြုလုပ်ထားသော အရောင်းစာရင်းများ
            </Typography>
          </Box>
          <Button size="small" onClick={() => navigate("sales")}>
            အားလုံးကြည့်ရန်
          </Button>
        </Box>
        <RecentSales sales={recentSales.slice(0, 4)} mobile={mobile} />
      </Card>
      <Dialog
        open={lowStockOpen}
        onClose={() => setLowStockOpen(false)}
        fullWidth
        maxWidth="sm"
        aria-labelledby="low-stock-dialog-title"
        PaperProps={{
          className: mobile
            ? "low-stock-sheet-paper"
            : "low-stock-dialog-paper",
        }}
      >
        {mobile ? <Box className="low-stock-sheet-handle" /> : null}
        <DialogTitle
          id="low-stock-dialog-title"
          className="low-stock-dialog-title"
        >
          <Box>
            <Typography variant="h6">လက်ကျန်နည်းသော ကုန်ပစ္စည်းများ</Typography>
            <Typography variant="body2" color="text.secondary">
              ကုန်ပစ္စည်း {lowStock.length} မျိုး စစ်ဆေးရန်လိုသည်
            </Typography>
          </Box>
          <IconButton
            aria-label="ပိတ်မည်"
            onClick={() => setLowStockOpen(false)}
          >
            <CloseRoundedIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent className="low-stock-dialog-content">
          {lowStock.length ? (
            <Box className="low-stock-item-list">
              <Box className="low-stock-table-head" aria-hidden="true">
                <Typography>ကုန်ပစ္စည်း</Typography>
                <Typography>အခြေအနေ</Typography>
                <Typography>လက်ကျန်</Typography>
              </Box>
              {lowStock.map((item) => (
                <LowStockRow
                  key={item.inventoryBatchId || item.productId}
                  item={item}
                />
              ))}
            </Box>
          ) : (
            <Typography className="dashboard-empty">
              လက်ကျန်နည်းသောပစ္စည်း မရှိသေးပါ
            </Typography>
          )}
        </DialogContent>
        <DialogActions className="low-stock-dialog-actions">
          <Button variant="text" onClick={() => setLowStockOpen(false)}>
            ပိတ်မည်
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
