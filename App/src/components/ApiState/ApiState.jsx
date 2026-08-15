import { Alert, Box, Button, CircularProgress, Typography } from "@mui/material";

export function LoadingState({ minHeight = 180 }) {
  return <Box sx={{ minHeight, display: "grid", placeItems: "center" }}><CircularProgress size={30} /></Box>;
}

export function ErrorState({ error, onRetry, minHeight = 180 }) {
  return <Box sx={{ minHeight, display: "grid", placeItems: "center", px: 2 }}><Alert severity="error" action={onRetry ? <Button color="inherit" size="small" onClick={onRetry}>Retry</Button> : null}>{error?.message || "Unable to load data."}</Alert></Box>;
}

export function EmptyState({ title, description, action, minHeight = 180 }) {
  return <Box sx={{ minHeight, display: "grid", placeItems: "center", textAlign: "center", px: 2 }}><Box><Typography fontWeight={700}>{title}</Typography>{description && <Typography color="text.secondary" sx={{ mt: .5, fontSize: 14 }}>{description}</Typography>}{action && <Box sx={{ mt: 1.5 }}>{action}</Box>}</Box></Box>;
}
