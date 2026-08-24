import { useState } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import LocalPrintshopOutlinedIcon from "@mui/icons-material/LocalPrintshopOutlined";

function printSheet(items) {
  const markup = items.map((item) => `<section><div>INTERNAL BARCODE</div><img src="${item.url}" alt="${item.value}"><strong>${item.value}</strong></section>`).join("");
  const popup = window.open("", "_blank", "noopener,noreferrer,width=720,height=900");
  if (!popup) throw new Error("The print window was blocked. Allow pop-ups and try again.");
  popup.document.write(`<!doctype html><html><head><title>Internal barcode labels</title><style>@page{size:50mm 30mm;margin:0}html,body{margin:0;padding:0}section{box-sizing:border-box;width:50mm;height:30mm;padding:2mm;font:700 9pt Arial;text-align:center;overflow:hidden;page-break-after:always}img{display:block;width:46mm;height:17mm;margin:.5mm auto}strong{display:block;font-size:9pt;letter-spacing:1.2px}@media screen{body{padding:16px;background:#eee}section{background:#fff;box-shadow:0 1px 4px #999;margin-bottom:12px}}</style></head><body>${markup}<script>window.onload=()=>window.print();window.onafterprint=()=>window.close();</script></body></html>`);
  popup.document.close(); window.setTimeout(() => items.forEach((item) => URL.revokeObjectURL(item.url)), 60_000);
}

export default function BarcodeBatchDialog({ open, onClose, api }) {
  const [count, setCount] = useState("1"); const [barcodes, setBarcodes] = useState([]); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const generate = async () => { setBusy(true); setError(""); try { const result = await api.pricing.createReservations({ count: Number(count) }); setBarcodes(result.barcodes); } catch (requestError) { setError(requestError.message || "Unable to generate barcodes."); } finally { setBusy(false); } };
  const print = async () => { setBusy(true); setError(""); try { const items = await Promise.all(barcodes.map(async (barcode) => ({ value: barcode.value, url: URL.createObjectURL(new Blob([await api.pricing.reservationLabel(barcode.id)], { type: "image/svg+xml" })) }))); printSheet(items); } catch (requestError) { setError(requestError.message || "Unable to print barcodes."); } finally { setBusy(false); } };
  return <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="xs"><DialogTitle>Generate & Print Barcodes</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}><Typography variant="body2" color="text.secondary">Generate local 13-digit Code128 labels. They can be assigned to products later.</Typography>{error && <Alert severity="error">{error}</Alert>}<TextField label="Number of labels" type="number" value={count} onChange={(event) => setCount(event.target.value)} inputProps={{ min: 1, max: 100 }} fullWidth />{barcodes.length > 0 && <Alert severity="success">Generated: {barcodes.map((barcode) => barcode.value).join(", ")}</Alert>}<Button variant="contained" onClick={generate} disabled={busy || Number(count) < 1 || Number(count) > 100}>Generate</Button><Button variant="outlined" startIcon={<LocalPrintshopOutlinedIcon />} onClick={print} disabled={busy || !barcodes.length}>Print labels</Button></Stack></DialogContent><DialogActions><Button onClick={onClose} disabled={busy}>Close</Button></DialogActions></Dialog>;
}
