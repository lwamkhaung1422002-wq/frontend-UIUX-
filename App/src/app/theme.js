import { createTheme } from '@mui/material'

// One place for the application visual language. Keep UI labels in Myanmar in
// the feature components; this file deliberately contains no display copy.
export function createAppTheme(mode) {
  const isDark = mode === 'dark'

  return createTheme({
    palette: {
      mode,
      primary: { main: '#047857', dark: '#065f46', light: '#d1fae5', contrastText: '#ffffff' },
      success: { main: '#16a34a' },
      warning: { main: '#d97706' },
      error: { main: '#dc2626' },
      background: { default: isDark ? '#0f1720' : '#f8faf9', paper: isDark ? '#17222d' : '#ffffff' },
      text: { primary: isDark ? '#edf6f1' : '#17211d', secondary: isDark ? '#aebdb5' : '#66736d' },
      divider: isDark ? '#31433a' : '#e2e8e5',
    },
    shape: { borderRadius: 10 },
    typography: {
      fontFamily: '"Noto Sans Myanmar", Inter, Roboto, Arial, sans-serif',
      h5: { fontWeight: 750, letterSpacing: '-0.025em' },
      h6: { fontWeight: 700, letterSpacing: 0 },
      button: { fontWeight: 700, textTransform: 'none', letterSpacing: 0 },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 8, minHeight: 42, boxShadow: 'none' },
          contained: { boxShadow: '0 4px 10px rgba(5, 150, 105, 0.16)', '&:hover': { boxShadow: '0 7px 16px rgba(5, 150, 105, 0.22)' } },
        },
      },
      MuiCard: { styleOverrides: { root: { borderRadius: 12 } } },
      MuiPaper: { styleOverrides: { root: { borderRadius: 12, backgroundImage: 'none' } } },
      MuiTextField: { defaultProps: { variant: 'outlined' } },
      MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 8, backgroundColor: isDark ? '#17222d' : '#fff' } } },
      MuiIconButton: { styleOverrides: { root: { minWidth: 40, minHeight: 40 } } },
      MuiTableHead: { styleOverrides: { root: { backgroundColor: '#f3f7f5' } } },
    },
  })
}
