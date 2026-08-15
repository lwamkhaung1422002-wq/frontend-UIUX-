import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { AppBar, Box, Button, IconButton, InputAdornment, Paper, TextField, Toolbar, Typography } from "@mui/material";
import AddAPhotoRoundedIcon from "@mui/icons-material/AddAPhotoRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import { useAppPreferences } from "../../context/AppPreferenceContext";

export default function ShopDetailsPage() {
  const navigate = useNavigate(); const fileRef = useRef(null); const { shop, setShop } = useAppPreferences(); const [form, setForm] = useState(shop);
  const change = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const chooseLogo = (event) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => setForm((current) => ({ ...current, logo: String(reader.result) })); reader.readAsDataURL(file); };
  const save = () => { setShop({ ...form, name: form.name.trim() || "POS System" }); navigate("/settings"); };
  return <Box sx={{ minHeight: "100dvh", pb: 12, bgcolor: "#f8fafc", fontFamily: "Inter, Roboto, 'Noto Sans Myanmar', sans-serif" }}>
    <AppBar position="sticky" elevation={0} sx={{ bgcolor: "primary.main" }}><Toolbar sx={{ minHeight: 70, display: "grid", gridTemplateColumns: "48px minmax(0,1fr) 48px" }}><IconButton aria-label="Back to settings" onClick={() => navigate("/settings")} sx={{ color: "common.white" }}><ArrowBackRoundedIcon sx={{ fontSize: 32 }} /></IconButton><Typography align="center" sx={{ fontSize: 22, fontWeight: 700 }}>Edit Shop Details</Typography><Box /></Toolbar></AppBar>
    <Box sx={{ px: { xs: 3.25, sm: 4 }, pt: 3.5, maxWidth: 640, mx: "auto" }}>
      <Box sx={{ display: "grid", justifyItems: "center", mb: 4 }}><Box role="button" tabIndex={0} onClick={() => fileRef.current?.click()} onKeyDown={(event) => event.key === "Enter" && fileRef.current?.click()} sx={{ width: 144, height: 144, borderRadius: "50%", overflow: "hidden", border: "2px solid", borderColor: "#b8b8b8", bgcolor: "#ededed", display: "grid", placeItems: "center", cursor: "pointer", color: "#737373" }}>{form.logo ? <Box component="img" src={form.logo} alt="Shop logo preview" sx={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <AddAPhotoRoundedIcon sx={{ fontSize: 57 }} />}</Box><Button startIcon={<AddAPhotoRoundedIcon />} onClick={() => fileRef.current?.click()} sx={{ mt: 1.5, color: "primary.main", fontSize: 17, fontWeight: 600, textTransform: "none" }}>{form.logo ? "Change Shop Logo" : "Add Shop Logo"}</Button><input ref={fileRef} type="file" accept="image/*" hidden onChange={chooseLogo} /></Box>
      <Typography sx={labelSx}>Shop Name</Typography><TextField fullWidth value={form.name} onChange={change("name")} placeholder="Enter shop name" slotProps={{ input: { startAdornment: <InputAdornment position="start"><StorefrontRoundedIcon /></InputAdornment> } }} sx={inputSx} />
      <Typography sx={{ ...labelSx, mt: 3 }}>Address</Typography><TextField fullWidth value={form.address} onChange={change("address")} placeholder="Enter shop address" multiline minRows={3} slotProps={{ input: { startAdornment: <InputAdornment position="start"><LocationOnRoundedIcon /></InputAdornment> } }} sx={addressSx} />
    </Box>
    <Paper elevation={5} sx={{ position: "fixed", bottom: 0, left: 0, right: 0, p: 2.5, bgcolor: "background.paper" }}><Button fullWidth variant="contained" startIcon={<CheckRoundedIcon />} onClick={save} sx={{ minHeight: 58, borderRadius: 1.5, fontSize: 17, fontWeight: 700, textTransform: "none" }}>Update Shop</Button></Paper>
  </Box>;
}
const labelSx = { mb: 1.25, fontSize: 18, fontWeight: 700 };
const inputSx = { "& .MuiOutlinedInput-root": { minHeight: 74, borderRadius: 1.75, bgcolor: "background.paper", fontSize: 18, "& .MuiInputAdornment-root": { mr: 2, color: "text.primary" } } };
const addressSx = { "& .MuiOutlinedInput-root": { alignItems: "flex-start", minHeight: 144, borderRadius: 1.75, bgcolor: "background.paper", fontSize: 18, pt: 2, "& .MuiInputAdornment-root": { mt: .2, mr: 2, color: "text.primary" } } };
