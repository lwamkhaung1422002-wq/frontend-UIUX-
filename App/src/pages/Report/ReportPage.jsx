import { Box, Typography, useMediaQuery } from "@mui/material";
import { DesktopPlaceholder, DesktopStat } from "../../components/Desktop/DesktopUI";
import { Button } from "@mui/material";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import { useNavigate } from "react-router";
import { DesktopPanel } from "../../components/Desktop/DesktopUI";

export default function ReportPage() {
  const isMobile = useMediaQuery("(max-width:768px)");
  const navigate = useNavigate();
  if (!isMobile) return <Box sx={{ maxWidth: 1440, mx: "auto", py: 1 }}><Typography sx={{ fontSize: 30, fontWeight: 700 }}>Reports &amp; Analytics</Typography><Typography color="text.secondary" sx={{ mt: .75, fontSize: 15 }}>Review sales performance and product inventory insights.</Typography><Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 2.5, mt: 3 }}><ReportChoice icon={<AssessmentRoundedIcon />} title="Sales Reports & Analytics" description="Review sales, payments, order activity, and store performance." onClick={() => navigate("/report/sales")} /><ReportChoice icon={<Inventory2RoundedIcon />} title="Product Reports & Analytics" description="Monitor product sales, slow-moving inventory, low stock, and out-of-stock items." onClick={() => navigate("/report/products")} /></Box></Box>;
  if (isMobile) return <Typography variant="h3">Home Page</Typography>;
  return <DesktopPlaceholder title="Reports & Analytics" description="Sales performance and inventory insights for your store." primaryLabel="Export Report"><Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}><DesktopStat label="Today's Sales" value="114,500 ကျပ်" color="success.main" /><DesktopStat label="Today's Expense" value="0 ကျပ်" color="warning.main" /><DesktopStat label="Net Profit" value="114,500 ကျပ်" color="primary.main" /></Box><Box sx={{ mt: 3, height: 190, borderRadius: 2, bgcolor: "#f6f9fd", display: "grid", placeItems: "center" }}><Typography color="text.secondary">Sales chart will appear here</Typography></Box></DesktopPlaceholder>;
}

function ReportChoice({ icon, title, description, onClick }) {
  return <DesktopPanel sx={{ minHeight: 210, cursor: "pointer", transition: "box-shadow .18s ease, transform .18s ease", "&:hover": { boxShadow: "0 9px 22px rgba(15,23,42,.13)", transform: "translateY(-2px)" } }}><Box sx={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "flex-start" }}><Box sx={{ width: 50, height: 50, borderRadius: 2, display: "grid", placeItems: "center", bgcolor: "#eaf3ff", color: "primary.main", "& .MuiSvgIcon-root": { fontSize: 28 } }}>{icon}</Box><Typography sx={{ mt: 2, fontSize: 20, fontWeight: 750 }}>{title}</Typography><Typography color="text.secondary" sx={{ mt: .75, lineHeight: 1.6 }}>{description}</Typography><Button onClick={onClick} endIcon={<ArrowForwardRoundedIcon />} sx={{ mt: "auto", pt: 2, px: 0, textTransform: "none", fontWeight: 700 }}>Open report</Button></Box></DesktopPanel>;
}
