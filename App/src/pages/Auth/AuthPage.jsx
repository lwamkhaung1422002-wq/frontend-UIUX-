import { useState } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Link,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import { useAuth } from "../../context/AuthContext";

const fieldSx = { "& .MuiOutlinedInput-root": { borderRadius: 1.5, minHeight: 52 } };

export default function AuthPage({ mode }) {
  const isRegister = mode === "register";
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, continueAsGuest } = useAuth();
  const [form, setForm] = useState({ name: "", shopName: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (isRegister) await register(form);
      else await login({ email: form.email, password: form.password });
      navigate(location.state?.from?.pathname || "/", { replace: true });
    } catch (requestError) {
      setError(requestError.message || "Unable to sign in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", px: 2, py: 3, bgcolor: "background.default" }}>
      <Container maxWidth="xs" disableGutters>
        <Stack spacing={2.5} alignItems="center" sx={{ mb: 3 }}>
          <Box sx={{ width: 56, height: 56, display: "grid", placeItems: "center", borderRadius: 2.5, bgcolor: "primary.main", color: "common.white" }}><StorefrontRoundedIcon sx={{ fontSize: 30 }} /></Box>
          <Box textAlign="center"><Typography variant="h4" fontWeight={800}>General POS</Typography><Typography color="text.secondary" sx={{ mt: .5 }}>{isRegister ? "Create your store account" : "Sign in to manage your store"}</Typography></Box>
        </Stack>
        <Card elevation={0} sx={{ borderRadius: 2.5, border: "1px solid", borderColor: "divider" }}>
          <CardContent sx={{ p: { xs: 2.5, sm: 3.5 }, "&:last-child": { pb: { xs: 2.5, sm: 3.5 } } }}>
            <Stack component="form" onSubmit={submit} spacing={2}>
              {error && <Alert severity="error">{error}</Alert>}
              {isRegister && <><TextField required label="Your name" value={form.name} onChange={update("name")} sx={fieldSx} /><TextField required label="Shop name" value={form.shopName} onChange={update("shopName")} sx={fieldSx} /></>}
              <TextField required type="email" autoComplete="email" label="Email" value={form.email} onChange={update("email")} sx={fieldSx} />
              <TextField required type="password" autoComplete={isRegister ? "new-password" : "current-password"} inputProps={{ minLength: isRegister ? 8 : undefined }} label="Password" value={form.password} onChange={update("password")} helperText={isRegister ? "At least 8 characters" : undefined} sx={fieldSx} />
              <Button type="submit" variant="contained" disabled={submitting} sx={{ minHeight: 52, borderRadius: 1.5, fontWeight: 700, textTransform: "none" }}>{submitting ? "Please wait…" : isRegister ? "Create account" : "Sign in"}</Button>
              {!isRegister && <Button variant="outlined" onClick={() => { continueAsGuest(); navigate("/", { replace: true }); }} sx={{ minHeight: 48, borderRadius: 1.5, fontWeight: 700, textTransform: "none" }}>Continue as guest</Button>}
              <Typography variant="body2" textAlign="center" color="text.secondary">{isRegister ? "Already have an account?" : "New to General POS?"} <Link component={RouterLink} to={isRegister ? "/login" : "/register"} underline="hover" fontWeight={700}>{isRegister ? "Sign in" : "Create an account"}</Link></Typography>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
