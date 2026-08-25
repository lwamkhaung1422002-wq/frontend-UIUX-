import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { AppBar, Box, Button, IconButton, InputAdornment, Paper, TextField, Toolbar, Typography, useMediaQuery } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import { usePosApi } from "../../hooks/useApiResource";

const initialForm = { supplierName: "", contactPerson: "", phone: "", email: "", address: "", notes: "" };

export default function AddSupplierPage() {
  const isMobile = useMediaQuery("(max-width:768px)");
  const navigate = useNavigate();
  const api = usePosApi();
  const [searchParams] = useSearchParams();
  const supplierId = searchParams.get("edit");
  const isEditMode = Boolean(supplierId);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(isEditMode);
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!supplierId) return;
    let active = true;
    api.suppliers.list({ page: 1, pageSize: 100 }).then(({ suppliers = [] }) => {
      const supplier = suppliers.find((item) => item.id === supplierId);
      if (!supplier) throw new Error("Supplier not found.");
      if (active) setForm({ supplierName: supplier.name || "", contactPerson: supplier.contactPerson || "", phone: supplier.phone || "", email: supplier.email || "", address: supplier.address || "", notes: supplier.notes || "" });
    }).catch((error) => active && setSubmitError(error.message || "Unable to load supplier.")).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [api, supplierId]);
  const update = (name) => (event) => { setForm((current) => ({ ...current, [name]: event.target.value })); setErrors((current) => ({ ...current, [name]: false })); };
  const save = async () => {
    const nextErrors = { supplierName: !form.supplierName.trim(), email: Boolean(form.email && !/^\S+@\S+\.\S+$/.test(form.email)) };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;
    setSaving(true); setSubmitError("");
    try {
      const body = { name: form.supplierName.trim(), contactPerson: form.contactPerson.trim() || undefined, phone: form.phone.trim() || undefined, email: form.email.trim() || undefined, address: form.address.trim() || undefined, notes: form.notes.trim() || undefined };
      if (supplierId) await api.suppliers.update(supplierId, body); else await api.suppliers.create(body);
      navigate("/suppliers");
    } catch (error) { setSubmitError(error.message || "Unable to save supplier."); } finally { setSaving(false); }
  };

  return <Box sx={{ minHeight: "100vh", bgcolor: "background.default", fontFamily: "Inter, Roboto, Noto Sans Myanmar, sans-serif" }}>
    <AppBar position="sticky" elevation={0} sx={{ bgcolor: "primary.main" }}><Toolbar sx={{ minHeight: 64, display: "grid", gridTemplateColumns: "1fr auto 1fr" }}><IconButton aria-label="Back to suppliers" onClick={() => navigate("/suppliers")} sx={{ justifySelf: "start", color: "common.white" }}><ArrowBackRoundedIcon /></IconButton><Typography sx={{ fontSize: 20, fontWeight: 600 }}>{isEditMode ? "Edit Supplier" : "Add Supplier"}</Typography><Box /></Toolbar></AppBar>
    <Box sx={{ px: 2.5, py: 3, maxWidth: isMobile ? 520 : 760, mx: "auto" }}>
      <FormField label="Supplier Name *" placeholder="Enter supplier name" value={form.supplierName} onChange={update("supplierName")} error={errors.supplierName} icon={<StorefrontOutlinedIcon />} />
      <FormField label="Contact Person" placeholder="Enter contact person" value={form.contactPerson} onChange={update("contactPerson")} icon={<PersonOutlineRoundedIcon />} />
      <FormField label="Phone" placeholder="Enter phone number" value={form.phone} onChange={update("phone")} type="tel" icon={<PhoneOutlinedIcon />} />
      <FormField label="Email" placeholder="Enter email address" value={form.email} onChange={update("email")} error={errors.email} icon={<ReceiptLongOutlinedIcon />} />
      <FormField label="Address" placeholder="Enter address" value={form.address} onChange={update("address")} icon={<LocalShippingOutlinedIcon />} />
      <FormField containerSx={{ mb: 0 }} label="Notes" placeholder="Enter notes" value={form.notes} onChange={update("notes")} icon={<PaymentsOutlinedIcon />} multiline minRows={3} />
      {loading && <Typography color="text.secondary">Loading supplier…</Typography>}{submitError && <Typography color="error" sx={{ mt: 1 }}>{submitError}</Typography>}
    </Box>
    <Paper elevation={5} sx={{ position: "sticky", bottom: 0, zIndex: 10, px: 2.5, py: 2, borderTop: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}><Box sx={{ maxWidth: 472, mx: "auto", display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 1.5 }}><Button variant="outlined" onClick={() => navigate("/suppliers")} sx={{ minHeight: 56, borderRadius: 1.5, fontSize: 16, fontWeight: 600, textTransform: "none", borderColor: "divider", color: "text.secondary" }}>Cancel</Button><Button variant="contained" startIcon={<CheckRoundedIcon />} onClick={save} disabled={loading || saving} sx={{ minHeight: 56, borderRadius: 1.5, fontSize: 16, fontWeight: 600, textTransform: "none" }}>{saving ? "Saving…" : isEditMode ? "Save Supplier" : "Add Supplier"}</Button></Box></Paper>
  </Box>;
}

function FormField({ label, icon, error, type, containerSx, ...props }) {
  const isDate = type === "date";
  return <Box sx={{ mb: 2, ...containerSx }}><Typography sx={{ mb: 0.75, fontSize: 14, fontWeight: 500 }}>{label}</Typography><TextField fullWidth error={Boolean(error)} type={type} slotProps={{ inputLabel: isDate ? { shrink: true } : undefined, input: { startAdornment: <InputAdornment position="start" sx={{ color: "text.secondary" }}>{icon}</InputAdornment> } }} sx={{ "& .MuiOutlinedInput-root": { minHeight: 56, borderRadius: 1.5, bgcolor: "action.hover", "& fieldset": { border: 0 } }, "& .MuiInputBase-input": { fontSize: 16 }, "& input[type=number]": { MozAppearance: "textfield" }, "& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button": { WebkitAppearance: "none", margin: 0 } }} {...props} /></Box>;
}
