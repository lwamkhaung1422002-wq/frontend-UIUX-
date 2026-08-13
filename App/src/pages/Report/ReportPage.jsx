import { Box, Typography, useMediaQuery } from "@mui/material";
import { DesktopPlaceholder, DesktopStat } from "../../components/Desktop/DesktopUI";

export default function ReportPage() {
  const isMobile = useMediaQuery("(max-width:768px)");
  if (isMobile) return <Typography variant="h3">Home Page</Typography>;
  return <DesktopPlaceholder title="Reports & Analytics" description="Sales performance and inventory insights for your store." primaryLabel="Export Report"><Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}><DesktopStat label="Today's Sales" value="114,500 ကျပ်" color="success.main" /><DesktopStat label="Today's Expense" value="0 ကျပ်" color="warning.main" /><DesktopStat label="Net Profit" value="114,500 ကျပ်" color="primary.main" /></Box><Box sx={{ mt: 3, height: 190, borderRadius: 2, bgcolor: "#f6f9fd", display: "grid", placeItems: "center" }}><Typography color="text.secondary">Sales chart will appear here</Typography></Box></DesktopPlaceholder>;
}
