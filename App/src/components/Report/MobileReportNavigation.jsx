import { Box, Button } from "@mui/material";
import { useLocation, useNavigate } from "react-router";

export default function MobileReportNavigation() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isSales = pathname === "/report/sales";

  return <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: .5, p: .5, borderBottom: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
    <Button variant={isSales ? "contained" : "text"} onClick={() => navigate("/report/sales")} sx={{ minHeight: 36, borderRadius: 1, textTransform: "none", fontSize: 11, fontWeight: 800 }}>Sales Reports</Button>
    <Button variant={!isSales ? "contained" : "text"} onClick={() => navigate("/report/products")} sx={{ minHeight: 36, borderRadius: 1, textTransform: "none", fontSize: 11, fontWeight: 800 }}>Product Reports</Button>
  </Box>;
}
