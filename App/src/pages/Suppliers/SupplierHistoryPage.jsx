import { useEffect, useMemo, useState } from "react";
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
import { usePurchasesQuery } from "../../hooks/usePosQueries";
import { usePosApi } from "../../hooks/useApiResource";

const legacyPaymentRecords = [
  {
    id: "TRX-20260611-0001",
    supplier: "Unilever",
    invoice: "111548",
    amount: 16000,
    method: "KPay",
    kind: "mobile",
    isoDate: "2026-08-11",
    paymentDate: "11/06/2026",
    relativeTime: "about an hour ago",
    timestamp: "11/08/2026 11:20 PM",
  },
  {
    id: "PAY-20260520-0001",
    supplier: "Pahtama Group",
    invoice: "125978",
    amount: 100000,
    method: "Cash",
    kind: "cash",
    signature: "Ko Aung",
    isoDate: "2026-08-09",
    paymentDate: "20/05/2026",
    relativeTime: "2 days ago",
    timestamp: "11/08/2026 09:45 AM",
  },
  {
    id: "EXP-20260701-0001",
    supplier: "မီတာခ",
    amount: 250000,
    method: "Cash",
    kind: "expense",
    isoDate: "2026-08-04",
    paymentDate: "01/07/2026",
    dateLabel: "Expense Date",
    relativeTime: "1 week ago",
    timestamp: "01/07/2026 08:30 AM",
  },
];

const money = (value) => `${new Intl.NumberFormat("en-US").format(value)} ကျပ်`;

const relativePaymentTime = (value) => {
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 1000),
  );
  if (seconds < 45) return "just now";
  if (seconds < 90) return "about a minute ago";
  if (seconds < 45 * 60) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 90 * 60) return "about an hour ago";
  if (seconds < 22 * 60 * 60) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 36 * 60 * 60) return "1 day ago";
  return `${Math.floor(seconds / 86400)} days ago`;
};

function DetailRow({ icon, label, value }) {
  return (
    <Box
      sx={{
        minHeight: 38,
        display: "grid",
        gridTemplateColumns: "34px minmax(0, 1fr) auto",
        gap: 1,
        alignItems: "center",
      }}
    >
      <Box
        sx={{
          color: "primary.main",
          display: "grid",
          placeItems: "center",
          "& .MuiSvgIcon-root": { fontSize: 22 },
        }}
      >
        {icon}
      </Box>
      <Typography
        sx={{ color: "text.secondary", fontSize: 13.5, fontWeight: 400 }}
      >
        {label}
      </Typography>
      <Typography
        noWrap
        sx={{
          maxWidth: 185,
          color: "text.primary",
          fontSize: 13.5,
          fontWeight: 500,
          textAlign: "right",
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

function PaymentCard({ record }) {
  const showSignature = Boolean(record.signature || record.signatureDataUrl);
  return (
    <Paper
      elevation={0}
      sx={{
        overflow: "hidden",
        borderRadius: 1.75,
        border: "1px solid",
        borderColor: "#e4e8ed",
        boxShadow: "0 2px 8px rgba(24, 52, 82, 0.11)",
      }}
    >
      <Box
        sx={{
          p: 2.25,
          pb: 1.875,
          display: "grid",
          gridTemplateColumns: "76px minmax(0, 1fr) auto",
          columnGap: 1.25,
          alignItems: "start",
        }}
      >
        <Chip
          label="Paid"
          variant="outlined"
          sx={{
            mt: 0.1,
            height: 40,
            minWidth: 72,
            borderRadius: 1.25,
            color: "#168437",
            borderColor: "#36a55a",
            bgcolor: "#f6fff8",
            "& .MuiChip-label": { px: 1.4, fontSize: 14, fontWeight: 600 },
          }}
        />
        <Box sx={{ minWidth: 0, pt: 0.15 }}>
          <Typography
            noWrap
            sx={{ fontSize: 17.5, lineHeight: 1.3, fontWeight: 600 }}
          >
            {record.supplier}
          </Typography>
          {record.invoice && (
            <Typography
              sx={{
                mt: 0.95,
                fontSize: 13.5,
                lineHeight: 1.2,
                color: "text.secondary",
                fontWeight: 400,
              }}
            >
              Invoice: {record.invoice}
            </Typography>
          )}
        </Box>
        <Stack
          direction="row"
          spacing={0.75}
          alignItems="center"
          justifyContent="flex-end"
          sx={{ whiteSpace: "nowrap" }}
        >
          <Typography
            sx={{
              color: record.method === "Cash" ? "#d87816" : "#238a3a",
              fontSize: 18,
              lineHeight: 1.28,
              fontWeight: 600,
            }}
          >
            {record.method}
          </Typography>
          <Typography
            noWrap
            sx={{ fontSize: 18, lineHeight: 1.28, fontWeight: 600 }}
          >
            {money(record.amount)}
          </Typography>
        </Stack>
      </Box>
      <Divider sx={{ mx: 2.25 }} />
      <Stack spacing={0.85} sx={{ px: 2.25, py: 1.75 }}>
        {record.kind === "mobile" && (
          <DetailRow
            icon={<DescriptionOutlinedIcon />}
            label="Transaction ID"
            value={record.transactionId || record.id}
          />
        )}
        <DetailRow
          icon={<CalendarTodayOutlinedIcon />}
          label="Payment Date"
          value={record.paymentDate}
        />
      </Stack>
      {showSignature && (
        <>
          <Divider sx={{ mx: 2.25 }} />
          <Box
            sx={{
              px: 2.25,
              py: 1.25,
              display: "flex",
              alignItems: "center",
              gap: 1.4,
              color: "primary.main",
            }}
          >
            <DrawOutlinedIcon sx={{ fontSize: 23 }} />
            <Typography sx={{ flex: 1, fontSize: 14, fontWeight: 500 }}>
              Receiver Signature
            </Typography>
            {record.signatureDataUrl ? (
              <Box
                component="img"
                src={record.signatureDataUrl}
                alt="Receiver signature"
                sx={{
                  width: 130,
                  height: 48,
                  objectFit: "contain",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  bgcolor: "#fafcff",
                }}
              />
            ) : (
              <Typography
                sx={{
                  color: "text.primary",
                  fontSize: 18,
                  fontFamily: "cursive",
                  fontStyle: "italic",
                }}
              >
                {record.signature}
              </Typography>
            )}
          </Box>
        </>
      )}
      <Divider />
      <Box
        sx={{
          minHeight: 58,
          px: 2.25,
          display: "flex",
          alignItems: "center",
          gap: 1.25,
          color: "text.secondary",
        }}
      >
        <HistoryRoundedIcon sx={{ fontSize: 24, color: "primary.main" }} />
        <Typography
          sx={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 400 }}
        >
          {record.relativeTime}
        </Typography>
        <Typography noWrap sx={{ fontSize: 12.5, fontWeight: 400 }}>
          {record.timestamp}
        </Typography>
      </Box>
    </Paper>
  );
}

export default function SupplierHistoryPage() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState("all");
  const [paymentMethod, setPaymentMethod] = useState("All");
  const [configuredMethods, setConfiguredMethods] = useState(["Cash"]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [paymentPageRecords, setPaymentPageRecords] = useState([]);
  const [canonicalRecords, setCanonicalRecords] = useState([]);
  const { data } = usePurchasesQuery({ page: 1, pageSize: 100 });
  const api = usePosApi();
  useEffect(() => { let active = true; api.payments.history().then(({ records = [] }) => { if (active) setCanonicalRecords(records.map((record) => { const paidAt = new Date(record.occurredAt); const method = record.method || "Cash"; return { id: record.apiId || record.id, transactionId: record.id, supplier: record.name || "Supplier", invoice: record.id || "", amount: Number(record.amount || 0), method, kind: method.toLowerCase() === "cash" ? "cash" : "mobile", paidAtMs: paidAt.getTime(), isoDate: paidAt.toISOString().slice(0, 10), paymentDate: paidAt.toLocaleDateString(), relativeTime: relativePaymentTime(paidAt), timestamp: paidAt.toLocaleString(), sourceKind: record.kind, status: record.status }; })); }).catch(() => { if (active) setCanonicalRecords([]); }); return () => { active = false; }; }, [api]);
  useEffect(() => { let active = true; api.shop.getSettings().then(({ settings }) => { if (active) setConfiguredMethods((settings.paymentMethods || []).filter((item) => item.active !== false).map((item) => item.name)); }).catch(() => {}).finally(() => {}); return () => { active = false; }; }, [api]);
  useEffect(() => {
    if (!pathname.startsWith("/payment")) return undefined;
    let active = true;
    Promise.all([api.orders.list({ pageSize: 100 }), api.expenses.list()]).then(([ordersResult, expensesResult]) => {
      if (!active) return;
      const sales = (ordersResult.orders || [])
        .flatMap((order) => (order.payments || [])
          .filter((payment) => Number(payment.amount || 0) > 0 && (payment.scope === "credit-settlement" || ["unpaid", "partial"].includes(String(order.paymentStatus || "unpaid").toLowerCase())))
          .map((payment) => ({ payment, name: "Sale", invoice: order.orderNumber || order.id })));
      const expenses = (expensesResult.expenses || []).map((expense) => ({ payment: { id: expense.id, amount: expense.amount, method: expense.method, paidAt: expense.spentAt || expense.createdAt }, name: expense.category === "income" ? "Income" : "Expense", invoice: expense.title || "" }));
      setPaymentPageRecords([...sales, ...expenses].map(({ payment, name, invoice }) => {
        const paidAt = new Date(payment.paidAt || payment.createdAt);
        return { id: payment.id, transactionId: payment.transactionId || payment.id, supplier: name, invoice, amount: Number(payment.amount || 0), method: payment.method || "Cash", kind: payment.method === "Cash" ? "cash" : "mobile", paidAtMs: paidAt.getTime(), isoDate: paidAt.toISOString().slice(0, 10), paymentDate: paidAt.toLocaleDateString(), relativeTime: relativePaymentTime(paidAt), timestamp: paidAt.toLocaleString() };
      }).sort((left, right) => right.paidAtMs - left.paidAtMs));
    }).catch(() => { if (active) setPaymentPageRecords([]); });
    return () => { active = false; };
  }, [api, pathname]);
  const supplierPaymentRecords = useMemo(
    () =>
      (data?.purchases || [])
        .flatMap((purchase) =>
          (purchase.payments || [])
            .filter((payment) => !payment.reversedAt)
            .map((payment) => {
              const paidAt = new Date(payment.paidAt || payment.createdAt);
              const method = payment.method || "Cash";
              return {
                id: payment.id,
                transactionId: payment.reference || payment.id,
                supplier: purchase.supplier?.name || "Supplier",
                invoice:
                  purchase.purchaseNumber ||
                  purchase.supplierInvoiceNumber ||
                  "",
                amount: Number(payment.amount || 0),
                method,
                kind: method === "Cash" ? "cash" : "mobile",
                signatureDataUrl: payment.signatureDataUrl,
                paidAtMs: paidAt.getTime(),
                isoDate: paidAt.toISOString().slice(0, 10),
                paymentDate: paidAt.toLocaleDateString(),
                relativeTime: relativePaymentTime(paidAt),
                timestamp: paidAt.toLocaleString(),
              };
            }),
        )
        .sort((left, right) => right.paidAtMs - left.paidAtMs),
    [data],
  );
  const paymentRecords = canonicalRecords;

  const visibleRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    const today = new Date().toISOString().slice(0, 10);
    return paymentRecords.filter(
      (record) =>
        (!query ||
          [record.supplier, record.invoice, record.id]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(query))) &&
        (paymentMethod === "All" || record.method === paymentMethod) &&
        (dateFilter !== "today" || record.isoDate === today) &&
        (dateFilter !== "custom" ||
          ((!from || record.isoDate >= from) && (!to || record.isoDate <= to))),
    );
  }, [dateFilter, from, paymentMethod, paymentRecords, search, to]);

  const applyFilter = () => setFilterOpen(false);
  const selectDateFilter = (value) => {
    setDateFilter(value);
    if (value !== "custom") {
      setFrom("");
      setTo("");
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        pb: 3,
        bgcolor: "#f8fafc",
        fontFamily: "Inter, Roboto, 'Noto Sans Myanmar', sans-serif",
      }}
    >
      <Box
        sx={{
          height: 68,
          px: 1.5,
          bgcolor: "primary.main",
          color: "common.white",
          display: "grid",
          gridTemplateColumns: "48px minmax(0, 1fr) 48px",
          alignItems: "center",
          boxShadow: "0 2px 5px rgba(0,0,0,0.16)",
        }}
      >
        <IconButton
          aria-label="Back to payments"
          onClick={() =>
            navigate(
              pathname.startsWith("/payment") ? "/payment" : "/suppliers",
            )
          }
          sx={{ width: 48, height: 48, color: "inherit" }}
        >
          <ArrowBackRoundedIcon sx={{ fontSize: 31 }} />
        </IconButton>
        <Typography
          align="center"
          sx={{ fontSize: 21, fontWeight: 600, lineHeight: 1.2 }}
        >
          Payment History
        </Typography>
        <IconButton
          aria-label="Filter payment history"
          onClick={() => setFilterOpen(true)}
          sx={{ width: 48, height: 48, color: "inherit" }}
        >
          <FilterAltOutlinedIcon sx={{ fontSize: 29 }} />
        </IconButton>
      </Box>
      <Box sx={{ px: 2.5, pt: 2.5 }}>
        <TextField
          fullWidth
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search supplier, invoice or transaction ID"
          inputProps={{ "aria-label": "Search payment history" }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon
                  sx={{ fontSize: 27, color: "text.secondary" }}
                />
              </InputAdornment>
            ),
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              height: 56,
              borderRadius: 1.5,
              bgcolor: "common.white",
              fontSize: 14.5,
              boxShadow: "0 2px 6px rgba(20,49,88,0.1)",
            },
            "& fieldset": { borderColor: "#e1e5ea" },
          }}
        />
        <Stack spacing={2} sx={{ mt: 2 }}>
          {visibleRecords.map((record) => (
            <PaymentCard key={record.id} record={record} />
          ))}
          {!visibleRecords.length && (
            <Typography align="center" sx={{ py: 6, color: "text.secondary" }}>
              No payment records found.
            </Typography>
          )}
        </Stack>
      </Box>
      <Dialog
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        fullWidth
        slotProps={{
          paper: { sx: { m: 2.5, borderRadius: 2.5, maxWidth: 420 } },
        }}
      >
        <DialogContent sx={{ p: 2.5 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 2.5,
            }}
          >
            <Typography sx={{ fontSize: 20, fontWeight: 600 }}>
              Filter payments
            </Typography>
            <IconButton
              aria-label="Close filters"
              onClick={() => setFilterOpen(false)}
            >
              <CloseRoundedIcon />
            </IconButton>
          </Box>
          <Typography sx={filterLabelSx}>Date</Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 1,
              mt: 1,
            }}
          >
            <FilterButton
              label="All"
              active={dateFilter === "all"}
              onClick={() => selectDateFilter("all")}
            />
            <FilterButton
              label="Today"
              active={dateFilter === "today"}
              onClick={() => selectDateFilter("today")}
            />
            <FilterButton
              label="Custom"
              active={dateFilter === "custom"}
              onClick={() => selectDateFilter("custom")}
            />
          </Box>
          {dateFilter === "custom" && (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 1.5,
                mt: 1.75,
              }}
            >
              <TextField
                label="From"
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                sx={dateInputSx}
              />
              <TextField
                label="To"
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                sx={dateInputSx}
              />
            </Box>
          )}
          <Typography sx={{ ...filterLabelSx, mt: 2.5 }}>
            Payment Method
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 1,
              mt: 1,
            }}
          >
            {["All", ...configuredMethods].map((method) => (
              <FilterButton
                key={method}
                label={method}
                active={paymentMethod === method}
                onClick={() => setPaymentMethod(method)}
              />
            ))}
          </Box>
          <Button
            fullWidth
            variant="contained"
            onClick={applyFilter}
            sx={{
              mt: 2.5,
              minHeight: 54,
              borderRadius: 1.5,
              fontSize: 16,
              fontWeight: 600,
              textTransform: "none",
            }}
          >
            Apply filters
          </Button>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
void legacyPaymentRecords;

function FilterButton({ label, active, onClick }) {
  return (
    <Button
      variant={active ? "contained" : "outlined"}
      onClick={onClick}
      sx={{
        minHeight: 48,
        borderRadius: 1.5,
        borderColor: active ? "primary.main" : "divider",
        color: active ? "common.white" : "text.primary",
        fontSize: 14,
        fontWeight: 600,
        textTransform: "none",
      }}
    >
      {label}
    </Button>
  );
}

const filterLabelSx = {
  fontSize: 14,
  fontWeight: 600,
  color: "text.secondary",
};
const dateInputSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 1.5,
    bgcolor: "action.hover",
    "& fieldset": { border: 0 },
  },
};
