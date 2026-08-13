import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Fab,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import CreditCardRoundedIcon from "@mui/icons-material/CreditCardRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import FilterAltRoundedIcon from "@mui/icons-material/FilterAltRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import { demoOrders } from "../../data/dashboardData";
import { DesktopPage, DesktopPanel, DesktopSearch, DesktopStat } from "../../components/Desktop/DesktopUI";

const initialFilters = {
  range: "all",
  from: "",
  to: "",
  orderStatus: "all",
  paymentStatus: "all",
};

const formatKyat = (amount) =>
  `${new Intl.NumberFormat("en-US").format(amount)} ကျပ်`;

function matchesDateRange(orderDate, range, latestOrderDate) {
  if (range === "all" || range === "custom") return true;
  return range === "today" ? orderDate === latestOrderDate : true;
}

function FilterChoiceButton({ active, children, onClick }) {
  return (
    <Button
      variant="outlined"
      onClick={onClick}
      sx={{
        minHeight: 42,
        borderRadius: 2,
        borderColor: active ? "#1976d2" : "#d8dee9",
        bgcolor: active ? "#eaf3ff" : "#fff",
        color: active ? "#1976d2" : "text.primary",
        fontWeight: 400,
        fontSize: 12,
        "&:hover": {
          borderColor: "#1976d2",
          bgcolor: active ? "#eaf3ff" : "#f8fbff",
        },
      }}
    >
      {children}
    </Button>
  );
}

function FilterSection({ icon, title, children }) {
  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.2 }}>
        {icon}
        <Typography color="text.primary" fontWeight={400}>{title}</Typography>
      </Stack>
      {children}
    </Box>
  );
}

export default function SalePage() {
  const isMobile = useMediaQuery("(max-width:768px)");
  const navigate = useNavigate();
  const [orders, setOrders] = useState(demoOrders);
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState(initialFilters);
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuOrder, setMenuOrder] = useState(null);

  useEffect(() => {
    const openFilters = () => {
      setDraftFilters(filters);
      setFilterOpen(true);
    };
    window.addEventListener("orders-filter", openFilters);
    return () => window.removeEventListener("orders-filter", openFilters);
  }, [filters]);

  const filteredOrders = useMemo(() => {
    const latestOrderDate = orders.reduce(
      (latest, order) => (order.date > latest ? order.date : latest),
      "",
    );

    return orders.filter((order) => {
      const matchesSearch = order.id
        .toLowerCase()
        .includes(search.trim().toLowerCase());
      const matchesOrderStatus =
        filters.orderStatus === "all" ||
        order.status.toLowerCase() === filters.orderStatus;
      const matchesPaymentStatus =
        filters.paymentStatus === "all" ||
        order.paymentStatus.toLowerCase() === filters.paymentStatus;
      const matchesFrom = !filters.from || order.date >= filters.from;
      const matchesTo = !filters.to || order.date <= filters.to;
      const matchesRange = matchesDateRange(
        order.date,
        filters.range,
        latestOrderDate,
      );
      return (
        matchesSearch &&
        matchesOrderStatus &&
        matchesPaymentStatus &&
        matchesFrom &&
        matchesTo &&
        matchesRange
      );
    });
  }, [filters, orders, search]);

  const totalAmount = filteredOrders.reduce((total, order) => total + order.amount, 0);

  const updateDraft = (field, value) =>
    setDraftFilters((current) => ({ ...current, [field]: value }));

  const applyFilters = () => {
    setFilters(draftFilters);
    setFilterOpen(false);
  };

  const clearFilters = () => {
    setDraftFilters(initialFilters);
    setFilters(initialFilters);
  };

  const removeOrder = () => {
    setOrders((currentOrders) =>
      currentOrders.filter((order) => order.id !== menuOrder?.id),
    );
    setMenuAnchor(null);
    setMenuOrder(null);
  };

  if (!isMobile) return <DesktopOrdersPage orders={filteredOrders} search={search} setSearch={setSearch} totalAmount={totalAmount} navigate={navigate} clearFilters={() => setFilters(initialFilters)} />;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f8fafc", px: 3, py: 3 }}>
      <TextField
        fullWidth
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search by order number"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchRoundedIcon />
            </InputAdornment>
          ),
        }}
        sx={{
          "& .MuiOutlinedInput-root": {
            bgcolor: "#fff",
            borderRadius: 2.5,
            "& fieldset": { borderColor: "#1976d2", borderWidth: 2 },
          },
        }}
      />

      <Box sx={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between", mt: 3, mb: 2 }}>
        <Typography color="#878787" fontSize={14} fontWeight={700}>
          {filteredOrders.length} {filteredOrders.length === 1 ? "order" : "orders"}
        </Typography>
        <Typography color="#1976d2" fontSize={14} fontWeight={700} sx={{ textAlign: "right" }}>
          {formatKyat(totalAmount)}
        </Typography>
      </Box>

      <Stack spacing={1.5}>
        {filteredOrders.map((order) => (
          <Card
            key={order.id}
            sx={{ borderRadius: 2.5, boxShadow: "0 3px 9px rgba(15, 23, 42, 0.16)" }}
          >
            <CardContent sx={{ position: "relative", px: 2, py: 1.5, "&:last-child": { pb: 1.5 } }}>
              <Stack spacing={1.1}>
                <Box sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", alignItems: "center", columnGap: 1.5, width: "100%" }}>
                  <Typography noWrap fontWeight={800} sx={{ minWidth: 0 }}>
                    {order.id}
                  </Typography>
                  <Typography noWrap fontWeight={800} sx={{ color: "#1976d2" }}>
                    {formatKyat(order.amount)}
                  </Typography>
                </Box>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ pr: 4 }}>
                  <Chip
                    label="Done"
                    size="small"
                    sx={{
                      height: 25,
                      bgcolor: "#e8f6ec",
                      color: "#38924e",
                      fontSize: 13,
                      fontWeight: 600,
                      "& .MuiChip-label": { px: 1.1 },
                    }}
                  />
                  <Chip
                    label="Paid"
                    size="small"
                    icon={<CreditCardRoundedIcon />}
                    variant="outlined"
                    sx={{
                      height: 25,
                      borderColor: "#38924e",
                      bgcolor: "#e8f6ec",
                      color: "#38924e",
                      fontSize: 13,
                      fontWeight: 500,
                      "& .MuiChip-icon": { color: "#38924e", fontSize: 16 },
                      "& .MuiChip-label": { px: 1 },
                    }}
                  />
                  <IconButton
                    aria-label={`Order actions for ${order.id}`}
                    size="small"
                    sx={{ position: "absolute", right: 10, bottom: 10 }}
                    onClick={(event) => {
                      setMenuAnchor(event.currentTarget);
                      setMenuOrder(order);
                    }}
                  >
                    <MoreVertRoundedIcon />
                  </IconButton>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>

      <Fab
        aria-label="Create order"
        color="primary"
        onClick={() => navigate("/sale/create")}
        sx={{ position: "fixed", right: 26, bottom: 96, bgcolor: "#ff5a36", "&:hover": { bgcolor: "#e94c2b" } }}
      >
        <AddRoundedIcon />
      </Fab>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={() => setMenuAnchor(null)}>
          <VisibilityRoundedIcon sx={{ mr: 1.5 }} />View Details
        </MenuItem>
        <MenuItem onClick={removeOrder} sx={{ color: "error.main" }}>
          <DeleteOutlineRoundedIcon sx={{ mr: 1.5 }} />Delete
        </MenuItem>
      </Menu>

      <Dialog
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: 3, m: 2, overflow: "hidden" } }}
      >
        <DialogTitle sx={{ px: 2.5, pt: 2.5, pb: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1.25}>
            <Box sx={{ display: "grid", placeItems: "center", width: 42, height: 42, borderRadius: "50%", bgcolor: "#eaf3ff", color: "#1976d2" }}>
              <FilterAltRoundedIcon />
            </Box>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" color="text.primary" fontWeight={400}>Filter Orders</Typography>
              <Typography variant="body2" color="text.secondary">Date, order, and payment status.</Typography>
            </Box>
            <IconButton aria-label="Close filters" onClick={() => setFilterOpen(false)}>
              <CloseRoundedIcon />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ px: 2.5, py: 2 }}>
          <Stack spacing={2.5}>
            <FilterSection icon={<CalendarMonthRoundedIcon sx={{ color: "#1976d2" }} />} title="Date">
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1 }}>
                {["all", "today", "custom"].map((value) => (
                  <FilterChoiceButton key={value} active={draftFilters.range === value} onClick={() => updateDraft("range", value)}>
                    {value}
                  </FilterChoiceButton>
                ))}
              </Box>
              {draftFilters.range === "custom" && (
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <TextField fullWidth label="From" type="date" size="small" value={draftFilters.from} onChange={(event) => updateDraft("from", event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
                  <TextField fullWidth label="To" type="date" size="small" value={draftFilters.to} onChange={(event) => updateDraft("to", event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
                </Stack>
              )}
            </FilterSection>

            <FilterSection icon={<ReceiptLongRoundedIcon sx={{ color: "#1976d2" }} />} title="Order Status">
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1 }}>
                {["all", "done", "cancelled"].map((value) => (
                  <FilterChoiceButton key={value} active={draftFilters.orderStatus === value} onClick={() => updateDraft("orderStatus", value)}>
                    {value}
                  </FilterChoiceButton>
                ))}
              </Box>
            </FilterSection>

            <FilterSection icon={<CreditCardRoundedIcon sx={{ color: "#1976d2" }} />} title="Payment Status">
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1 }}>
                {["all", "unpaid", "partial", "paid"].map((value) => (
                  <FilterChoiceButton key={value} active={draftFilters.paymentStatus === value} onClick={() => updateDraft("paymentStatus", value)}>
                    {value}
                  </FilterChoiceButton>
                ))}
              </Box>
            </FilterSection>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 2.5, py: 2.25, gap: 1, borderTop: "1px solid #e5e7eb" }}>
          <Button fullWidth onClick={clearFilters} sx={{ minHeight: 44, borderRadius: 2, color: "#1976d2", fontWeight: 400 }}>
            Clear
          </Button>
          <Button fullWidth variant="contained" onClick={applyFilters} startIcon={<CheckRoundedIcon />} sx={{ minHeight: 44, borderRadius: 2, bgcolor: "#1976d2", color: "#fff", fontWeight: 400, "&:hover": { bgcolor: "#1565c0" } }}>
            Apply
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function DesktopOrdersPage({ orders, search, setSearch, totalAmount, navigate, clearFilters }) {
  return <DesktopPage title="Orders" subtitle="Review sales, payments, and order status." actionLabel="Create Order" onAction={() => navigate("/sale/create")}><Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2.25, mb: 3 }}><DesktopStat label="Orders" value={orders.length} helper="Visible transactions" /><DesktopStat label="Collected" value={formatKyat(totalAmount)} color="success.main" helper="Paid order value" /><DesktopStat label="Payment Status" value="Paid" color="primary.main" helper="All current orders" /></Box><DesktopPanel><Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, mb: 3 }}><DesktopSearch value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by order number" /><Button variant="outlined" onClick={clearFilters} sx={{ minHeight: 44, textTransform: "none" }}>Clear filters</Button></Box><Box sx={{ display: "grid", gridTemplateColumns: "1.5fr 0.9fr 0.8fr 0.75fr auto", alignItems: "center", px: 2, pb: 1.25 }}><TableHeader>ORDER</TableHeader><TableHeader>DATE</TableHeader><TableHeader>STATUS</TableHeader><TableHeader>PAYMENT</TableHeader><TableHeader align="right">AMOUNT</TableHeader></Box><Divider /><Box>{orders.map((order) => <Box key={order.id} sx={{ display: "grid", gridTemplateColumns: "1.5fr 0.9fr 0.8fr 0.75fr auto", alignItems: "center", px: 2, py: 2, borderBottom: "1px solid", borderColor: "divider" }}><Typography fontWeight={700}>{order.id}</Typography><Typography color="text.secondary">{order.date}</Typography><Chip label="Done" size="small" color="success" sx={{ justifySelf: "start" }} /><Chip label={order.paymentStatus} size="small" variant="outlined" color="success" sx={{ justifySelf: "start" }} /><Typography color="primary.main" sx={{ fontWeight: 700, textAlign: "right" }}>{formatKyat(order.amount)}</Typography></Box>)}</Box></DesktopPanel></DesktopPage>;
}

function TableHeader({ children, align }) { return <Typography color="text.secondary" sx={{ fontSize: 12, fontWeight: 700, textAlign: align }}>{children}</Typography>; }
