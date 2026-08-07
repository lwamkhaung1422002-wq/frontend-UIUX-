import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material'

export default function BarcodeScannerDialog({ open, onClose, onScan }) {
  const videoRef = useRef(null)
  const controlsRef = useRef(null)
  const [manual, setManual] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return undefined
    let cancelled = false
    const start = async () => {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        if (cancelled || !videoRef.current) return
        const reader = new BrowserMultiFormatReader()
        controlsRef.current = await reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
          if (!result) return
          controlsRef.current?.stop()
          onScan(result.getText())
        })
      } catch (nextError) {
        if (!cancelled) setError(nextError.message || 'Camera scanner is unavailable. Enter the barcode below.')
      }
    }
    void start()
    return () => {
      cancelled = true
      controlsRef.current?.stop()
      controlsRef.current = null
    }
  }, [onScan, open])

  const submit = () => {
    const value = manual.trim()
    if (!value) return
    onScan(value)
    setManual('')
  }

  return <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
    <DialogTitle>Scan barcode</DialogTitle>
    <DialogContent>
      <Stack spacing={2} sx={{ pt: 1 }}>
        {error ? <Alert severity="info">{error}</Alert> : null}
        <video ref={videoRef} aria-label="Barcode camera preview" muted playsInline style={{ width: '100%', minHeight: 180, borderRadius: 12, background: '#111' }} />
        <TextField
          autoFocus
          label="Scanner or manual barcode"
          value={manual}
          onChange={(event) => setManual(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); submit() } }}
          helperText="USB/Bluetooth keyboard-wedge scanners can scan directly into this field."
        />
      </Stack>
    </DialogContent>
    <DialogActions><Button onClick={onClose}>Cancel</Button><Button variant="contained" disabled={!manual.trim()} onClick={submit}>Use barcode</Button></DialogActions>
  </Dialog>
}
