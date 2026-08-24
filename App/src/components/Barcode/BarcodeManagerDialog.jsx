import { useState } from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import LocalPrintshopOutlinedIcon from "@mui/icons-material/LocalPrintshopOutlined";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SwapHorizRoundedIcon from "@mui/icons-material/SwapHorizRounded";
import BarcodeScannerDialog from "../BarcodeScanner/BarcodeScannerDialog";

const internalCode = /^[A-Z]{2}[0-9]{4}$/;

function printLabel(productName, barcodeValue, svg) {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  const popup = window.open("", "_blank", "noopener,noreferrer,width=480,height=640");
  if (!popup) {
    URL.revokeObjectURL(url);
    throw new Error("The print window was blocked. Allow pop-ups and try again.");
  }
  popup.document.write(`<!doctype html><html><head><title>Barcode label</title><style>@page{size:50mm 30mm;margin:0}html,body{width:50mm;height:30mm;margin:0;padding:0}.label{box-sizing:border-box;width:50mm;height:30mm;padding:2mm;font-family:Arial,sans-serif;text-align:center;overflow:hidden}.name{font-weight:800;text-transform:uppercase;font-size:9pt;line-height:11pt;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.barcode{display:block;width:46mm;height:15mm;margin:1mm auto 0}.code{font-weight:700;font-size:9pt;letter-spacing:1.2px;margin-top:.5mm}@media screen{body{background:#eee;padding:16px}.label{background:#fff;box-shadow:0 1px 4px #999}}</style></head><body><main class="label"><div class="name"></div><img class="barcode" alt="${barcodeValue}" src="${url}"><div class="code"></div></main><script>document.querySelector('.name').textContent=${JSON.stringify(productName || "Internal Barcode")};document.querySelector('.code').textContent=${JSON.stringify(barcodeValue)};window.onload=()=>{window.print();};window.onafterprint=()=>window.close();</script></body></html>`);
  popup.document.close();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export default function BarcodeManagerDialog({ open, onClose, api, productName, barcode, onDraft, onChanged, onNotice, standalone = false }) {
  const isPersisted = Boolean(barcode?.id);
  const isShortCode = internalCode.test(barcode?.value || "");
  const [candidate, setCandidate] = useState("");
  const [candidateReservation, setCandidateReservation] = useState(null);
  const [previewSvg, setPreviewSvg] = useState("");
  const [createType, setCreateType] = useState("barcode");
  const [replacement, setReplacement] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [error, setError] = useState("");

  const generateCandidate = async () => {
    setBusy(true); setError("");
    try {
      const result = await api.pricing.createReservations({ count: 1 });
      const reservation = result.barcodes[0]; setCandidate(reservation.value); setCandidateReservation(reservation); setPreviewSvg(await api.pricing.reservationLabel(reservation.id));
    } catch (requestError) { setError(requestError.message || "Unable to generate a barcode."); }
    finally { setBusy(false); }
  };
  const generateShortCode = async () => {
    setBusy(true); setError("");
    try { const result = await api.pricing.generateShortCode(); setCandidate(result.value); onDraft?.({ type: "shortCode", value: result.value }); }
    catch (requestError) { setError(requestError.message || "Unable to generate a short code."); }
    finally { setBusy(false); }
  };
  const printDraft = async () => {
    if (!candidate) return; setBusy(true); setError("");
    try { if (!candidateReservation) throw new Error("Generate a barcode first."); printLabel("Internal Barcode", candidate, previewSvg || await api.pricing.reservationLabel(candidateReservation.id)); }
    catch (requestError) { setError(requestError.message || "Barcode printing failed."); }
    finally { setBusy(false); }
  };

  const withReason = (confirmation, action) => async () => {
    if (reason.trim().length < 3) { setError("Enter a short reason for this change."); return; }
    if (!window.confirm(confirmation)) return;
    setBusy(true); setError("");
    try { await action(); setReason(""); }
    catch (requestError) { setError(requestError.message || "Barcode action failed."); }
    finally { setBusy(false); }
  };

  const print = async () => {
    setBusy(true); setError("");
    try { printLabel(productName, barcode.value, await api.pricing.barcodeLabel(barcode.id)); }
    catch (requestError) { onNotice?.({ severity: "warning", text: "Product saved successfully. Barcode printing failed." }); setError(requestError.message || "Barcode printing failed."); }
    finally { setBusy(false); }
  };

  const regenerate = withReason("Regenerate this barcode? The current barcode will be retired.", async () => {
    const result = await api.pricing.regenerateBarcode(barcode.id, { expectedVersion: barcode.version, reason: reason.trim() });
    onChanged?.(result.barcode); onNotice?.({ severity: "success", text: "Barcode regenerated successfully." });
  });
  const replace = withReason("Replace this barcode? The current barcode will be retired.", async () => {
    const value = replacement.trim().toUpperCase();
    if (!value) throw new Error("Scan or enter a replacement barcode.");
    const kind = internalCode.test(value) ? "INTERNAL" : "MANUFACTURER";
    const symbology = kind === "INTERNAL" ? "CODE128" : /^\d{13}$/.test(value) ? "EAN13" : /^\d{12}$/.test(value) ? "UPCA" : /^\d{8}$/.test(value) ? "EAN8" : "CODE128";
    const result = await api.pricing.replaceBarcode(barcode.id, { newValue: value, kind, symbology, expectedVersion: barcode.version, reason: reason.trim() });
    onChanged?.(result.barcode); onNotice?.({ severity: "success", text: "Barcode replaced successfully." });
  });
  const remove = withReason("Remove this barcode? It will be retired and cannot be used again.", async () => {
    await api.pricing.retireBarcode(barcode.id, { expectedVersion: barcode.version, reason: reason.trim() });
    onChanged?.(null); onNotice?.({ severity: "success", text: "Barcode removed. Its history was retained." }); onClose();
  });

  return <>
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>{isPersisted ? "Manage Barcode" : standalone ? "Generate Barcode" : "Create Barcode"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {!isPersisted ? <>
            {!standalone && <ToggleButtonGroup exclusive value={createType} onChange={(_, value) => { if (value) { setCreateType(value); setCandidate(""); setError(""); } }} fullWidth size="small"><ToggleButton value="barcode">1D Barcode</ToggleButton><ToggleButton value="shortCode">Item Code</ToggleButton></ToggleButtonGroup>}
            {(standalone || createType === "barcode") ? <>{previewSvg ? <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.5, p: 1, textAlign: "center" }} dangerouslySetInnerHTML={{ __html: previewSvg }} /> : <Box sx={{ minHeight: 132, display: "grid", placeItems: "center", border: "1px dashed", borderColor: "divider", borderRadius: 1.5, color: "text.secondary" }}>Generate to preview label</Box>}{candidate && <Typography align="center" fontWeight={800} letterSpacing={1.5}>{candidate}</Typography>}<Stack direction="row" spacing={1}><Button variant="outlined" startIcon={<RefreshRoundedIcon />} onClick={generateCandidate} disabled={busy}>Generate</Button><Button variant="outlined" startIcon={<LocalPrintshopOutlinedIcon />} onClick={printDraft} disabled={busy || !candidate}>Print</Button><Button variant="contained" onClick={() => { if (candidateReservation) { if (!standalone) onDraft?.(candidateReservation); onClose(); } }} disabled={!candidateReservation || busy}>{standalone ? "Done" : "Use"}</Button></Stack></> : <><TextField label="Item Code" value={candidate} InputProps={{ readOnly: true }} fullWidth /><Stack direction="row" spacing={1}><Button variant="outlined" startIcon={<RefreshRoundedIcon />} onClick={generateShortCode} disabled={busy}>Generate</Button><Button variant="contained" onClick={() => { if (candidate) { onDraft?.({ type: "shortCode", value: candidate }); onClose(); } }} disabled={!candidate || busy}>Use</Button></Stack></>}
          </> : <>
            <Box><Typography variant="overline" color="text.secondary">Active barcode</Typography><Typography sx={{ fontSize: 26, fontWeight: 800, letterSpacing: 2 }}>{barcode.value}</Typography><Typography variant="body2" color="text.secondary">{barcode.symbology} · {barcode.status}</Typography></Box>
            {!isShortCode && <Button variant="outlined" startIcon={<LocalPrintshopOutlinedIcon />} onClick={print} disabled={busy}>Print</Button>}
            <Divider />
            <TextField label="Replacement barcode" value={replacement} onChange={(event) => setReplacement(event.target.value)} fullWidth InputProps={{ endAdornment: <Button size="small" onClick={() => setScannerOpen(true)}>Scan</Button> }} />
            <TextField label="Reason (required for lifecycle changes)" value={reason} onChange={(event) => setReason(event.target.value)} fullWidth />
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button variant="contained" startIcon={<RefreshRoundedIcon />} onClick={regenerate} disabled={busy || barcode.kind !== "INTERNAL"}>Regenerate</Button>
              <Button variant="outlined" startIcon={<SwapHorizRoundedIcon />} onClick={replace} disabled={busy || !replacement.trim()}>Replace</Button>
              <Button color="error" variant="outlined" startIcon={<DeleteOutlineRoundedIcon />} onClick={remove} disabled={busy}>Remove</Button>
            </Stack>
          </>}
        </Stack>
      </DialogContent>
      <DialogActions><Button onClick={onClose} disabled={busy}>Close</Button></DialogActions>
    </Dialog>
    <BarcodeScannerDialog open={scannerOpen} onClose={() => setScannerOpen(false)} onDetected={(value) => { setReplacement(value); setScannerOpen(false); }} />
  </>;
}
