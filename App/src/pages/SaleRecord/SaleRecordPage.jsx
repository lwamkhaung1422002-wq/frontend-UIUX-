import { Box, Chip, Typography, useMediaQuery } from "@mui/material";
import { DesktopPlaceholder } from "../../components/Desktop/DesktopUI";
import { demoOrders } from "../../data/dashboardData";

export default function SaleRecordPage() {
  const isMobile = useMediaQuery("(max-width:768px)");
  if (isMobile) return <Typography variant="h3">Home Page</Typography>;
  return <DesktopPlaceholder title="Sale Records" description="Review completed store transactions and payments." primaryLabel="Export Records"><Box sx={{ display: "grid", gap: 0 }}>{demoOrders.map((order) => <Box key={order.id} sx={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr auto", alignItems: "center", gap: 2, py: 1.75, borderBottom: "1px solid", borderColor: "divider" }}><Typography fontWeight={700}>{order.id}</Typography><Typography color="text.secondary">{order.date}</Typography><Chip label={order.paymentStatus} color="success" size="small" sx={{ justifySelf: "start" }} /><Typography fontWeight={700}>{new Intl.NumberFormat("en-US").format(order.amount)} ကျပ်</Typography></Box>)}</Box></DesktopPlaceholder>;
}
