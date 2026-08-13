import { Box, Button, Typography, useMediaQuery } from "@mui/material";
import { useNavigate } from "react-router";
import { DesktopPlaceholder } from "../../components/Desktop/DesktopUI";

export default function NotePage() {
  const isMobile = useMediaQuery("(max-width:768px)");
  const navigate = useNavigate();
  if (isMobile) return <Typography variant="h3">Home Page</Typography>;
  return <DesktopPlaceholder title="Notes" description="Keep store reminders and operational notes in one place." primaryLabel="New Note" onPrimary={() => navigate("/note")}><Box sx={{ display: "grid", placeItems: "center", minHeight: 310, textAlign: "center" }}><Box><Typography sx={{ fontSize: 20, fontWeight: 700 }}>No notes yet</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>Create a note for inventory, suppliers, or your team.</Typography><Button variant="outlined" sx={{ mt: 2, textTransform: "none" }}>Create your first note</Button></Box></Box></DesktopPlaceholder>;
}
