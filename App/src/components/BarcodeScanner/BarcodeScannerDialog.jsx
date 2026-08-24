import { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import FlashlightOnRoundedIcon from "@mui/icons-material/FlashlightOnRounded";
import CameraswitchRoundedIcon from "@mui/icons-material/CameraswitchRounded";
import { createCameraBarcodeScanner, normalizeBarcode } from "../../lib/barcodeScanner";

export default function BarcodeScannerDialog({ open, onClose, onDetected }) {
  const videoRef = useRef(null);
  const scannerRef = useRef(null);
  const [error, setError] = useState("");
  const [manual, setManual] = useState("");
  const [frontCamera, setFrontCamera] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!open || !videoRef.current) return undefined;
    const scanner = createCameraBarcodeScanner();
    scannerRef.current = scanner;
    setError("");
    setStarting(true);
    scanner.start(videoRef.current, (value) => {
      scanner.stop();
      onDetected(value);
    }, { facingMode: { ideal: frontCamera ? "user" : "environment" } })
      .catch((cameraError) => setError(cameraError.name === "NotAllowedError" ? "Camera permission was denied. Enter the barcode manually or allow camera access." : cameraError.message || "Unable to start the camera."))
      .finally(() => setStarting(false));
    return () => { scanner.stop(); };
  }, [open, frontCamera, onDetected]);

  const submitManual = () => {
    const value = normalizeBarcode(manual);
    if (!value) return;
    scannerRef.current?.stop();
    onDetected(value);
  };

  return <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
    <DialogTitle>Scan barcode</DialogTitle>
    <DialogContent>
      <Stack spacing={2}>
        <Box sx={{ position: "relative", overflow: "hidden", borderRadius: 2, bgcolor: "common.black", minHeight: 220 }}>
          <video ref={videoRef} muted playsInline style={{ display: "block", width: "100%", minHeight: 220, objectFit: "cover" }} />
          <Box sx={{ position: "absolute", left: "10%", right: "10%", top: "40%", height: 72, border: "2px solid", borderColor: "primary.light", borderRadius: 1, pointerEvents: "none" }} />
          {starting && <Typography sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "common.white" }}>Starting camera…</Typography>}
        </Box>
        {error && <Alert severity="warning">{error}</Alert>}
        <Stack direction="row" spacing={1}>
          <Button startIcon={<CameraswitchRoundedIcon />} onClick={() => setFrontCamera((value) => !value)}>Switch camera</Button>
          <Button startIcon={<FlashlightOnRoundedIcon />} onClick={() => scannerRef.current?.toggleTorch().catch((torchError) => setError(torchError.message))}>Torch</Button>
        </Stack>
        <TextField label="Enter barcode manually" value={manual} onChange={(event) => setManual(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") submitManual(); }} autoComplete="off" fullWidth />
      </Stack>
    </DialogContent>
    <DialogActions><Button onClick={onClose}>Cancel</Button><Button variant="contained" onClick={submitManual} disabled={!manual.trim()}>Use barcode</Button></DialogActions>
  </Dialog>;
}
