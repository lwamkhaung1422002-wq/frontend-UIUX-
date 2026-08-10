import {
  AppBar,
  Avatar,
  Badge,
  Box,
  BottomNavigation,
  BottomNavigationAction,
  Button,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
  useMediaQuery,
} from '@mui/material'
import { useState } from 'react'
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded'
import AddShoppingCartRoundedIcon from '@mui/icons-material/AddShoppingCartRounded'
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded'
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded'
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded'
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded'
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded'
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded'
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded'
import MenuRoundedIcon from '@mui/icons-material/MenuRounded'
import MoreHorizRoundedIcon from '@mui/icons-material/MoreHorizRounded'
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded'
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded'
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded'
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded'
import StoreRoundedIcon from '@mui/icons-material/StoreRounded'
import StickyNote2RoundedIcon from '@mui/icons-material/StickyNote2Rounded'
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded'
import { preloadRoute } from '../app/routes.js'
import { AppHeaderActionsContext } from '../contexts/AppHeaderActionsContext.jsx'

const drawerWidth = 256

const navItems = [
  { key: 'home', label: 'ပင်မ', icon: <DashboardRoundedIcon /> },
  { key: 'order', label: 'အရောင်း', icon: <AddShoppingCartRoundedIcon /> },
  { key: 'products', label: 'ကုန်ပစ္စည်း', icon: <CategoryRoundedIcon /> },
  { key: 'suppliers', label: 'အဝယ်စာရင်းနဲ့မှတ်စု', icon: <StickyNote2RoundedIcon /> },
  { key: 'sales', label: 'အရောင်းမှတ်တမ်း', icon: <ReceiptLongRoundedIcon /> },
  { key: 'finance', label: 'ငွေစာရင်း', icon: <AccountBalanceWalletRoundedIcon /> },
  { key: 'balance', label: 'အစီရင်ခံစာ', icon: <TrendingUpRoundedIcon /> },
  { key: 'pricing', label: 'စျေးနှုန်းနှင့် ပရိုမိုးရှင်း', icon: <LocalOfferRoundedIcon /> },
  { key: 'purchases', label: 'ကုန်ပစ္စည်းအဝယ်စာရင်း', icon: <LocalShippingRoundedIcon /> },
]

const navGroupByKey = {
  home: 'ရောင်းချမှု', order: 'ရောင်းချမှု', sales: 'ရောင်းချမှု',
  products: 'ကုန်ပစ္စည်း', suppliers: 'ကုန်ပစ္စည်း', purchases: 'ကုန်ပစ္စည်း', pricing: 'ကုန်ပစ္စည်း',
  finance: 'ငွေကြေး', balance: 'ငွေကြေး',
}

export default function AppLayout({
  page,
  onNavigate,
  onLogout,
  onGetStarted,
  preview = false,
  userEmail,
  shopName = 'ကျွန်ုပ်၏ဆိုင်',
  shops = [],
  shopId,
  onShopChange,
  colorMode = 'light',
  onToggleColorMode,
  children,
}) {
  const desktop = useMediaQuery('(min-width:1024px)')
  const current = navItems.find((item) => item.key === page) || navItems[0]
  const headerTitle = page === 'products'
    ? 'ကုန်ပစ္စည်းစီမံခန့်ခွဲမှု'
    : page === 'suppliers'
      ? 'ပစ္စည်းသွင်းသူ စီမံခန့်ခွဲမှု'
      : page === 'purchases'
        ? 'အဝယ်စာရင်း စီမံခန့်ခွဲမှု'
      : (page === 'home' ? 'အရောင်းဒိုင်ခွက်' : current.label)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [shopAnchor, setShopAnchor] = useState(null)
  const [headerActions, setHeaderActions] = useState(null)
  const navigate = (nextPage) => {
    onNavigate(nextPage)
    setMobileOpen(false)
  }

  const navList = (items, compact = false) => {
    let lastGroup = ''
    return (
      <List component="nav" className={desktop ? 'prototype-side-nav' : 'prototype-drawer-nav'} sx={{ px: compact ? 0 : 0.25, py: compact ? 0 : 0.5 }}>
        {items.map((item) => {
          const group = navGroupByKey[item.key]
          const showTitle = group && group !== lastGroup
          lastGroup = group
          return <Box key={item.key}>
            {showTitle ? <Typography className="prototype-nav-title">{group}</Typography> : null}
            <ListItemButton
              selected={page === item.key}
              onClick={() => navigate(item.key)}
              onMouseEnter={() => preloadRoute(item.key)}
              onFocus={() => preloadRoute(item.key)}
              className="prototype-nav-link"
              sx={{
                mb: 0.25,
                borderRadius: 2.75,
                color: desktop ? 'rgba(223,249,237,.92)' : 'text.primary',
                '& .MuiListItemIcon-root': { color: 'inherit', minWidth: 38 },
                '&.Mui-selected': { color: desktop ? '#fff' : '#047857', bgcolor: desktop ? 'rgba(255,255,255,.18)' : '#dcfce7', boxShadow: desktop ? 'inset 3px 0 #6ee7b7' : 'none' },
                '&.Mui-selected:hover, &:hover': { bgcolor: desktop ? 'rgba(255,255,255,.10)' : '#f0fdf4' },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} slotProps={{ primary: { fontWeight: 750 } }} />
            </ListItemButton>
          </Box>
        })}
      </List>
    )
  }

  const accountArea = (
    <Box className="drawer-account-area">
      {!preview && userEmail ? <Typography variant="body2" fontWeight={800} noWrap>{userEmail}</Typography> : null}
      {preview ? (
        <Button fullWidth variant="contained" startIcon={<RocketLaunchRoundedIcon />} onClick={onGetStarted}>
          အကောင့်ဝင်ရောက်ပါ
        </Button>
      ) : (
        <Button fullWidth color="inherit" variant={desktop ? 'text' : 'outlined'} startIcon={<LogoutRoundedIcon />} onClick={onLogout}>
          အကောင့်ထွက်ပါ
        </Button>
      )}
    </Box>
  )

  const settingsItem = (
    <ListItemButton
      selected={page === 'settings'}
      onClick={() => navigate('settings')}
      sx={{
        mx: 1.25,
        mb: 1,
        borderRadius: 2.5,
        color: desktop ? 'rgba(255,255,255,.78)' : 'text.primary',
        '& .MuiListItemIcon-root': { color: 'inherit', minWidth: 38 },
        '&.Mui-selected': { color: desktop ? '#fff' : '#047857', bgcolor: desktop ? 'rgba(167,243,208,.18)' : '#dcfce7' },
      }}
    >
      <ListItemIcon><SettingsRoundedIcon /></ListItemIcon>
      <ListItemText primary="ဆက်တင်" slotProps={{ primary: { fontWeight: 750 } }} />
    </ListItemButton>
  )

  const colorModeItem = (
    <ListItemButton
      onClick={onToggleColorMode}
      sx={{
        mx: 1.25,
        mb: 0.5,
        borderRadius: 2.5,
        color: desktop ? 'rgba(255,255,255,.9)' : 'text.primary',
        '& .MuiListItemIcon-root': { color: 'inherit', minWidth: 38 },
        '&:hover': { bgcolor: desktop ? 'rgba(255,255,255,.09)' : 'action.hover' },
      }}
    >
      <ListItemIcon>{colorMode === 'dark' ? <LightModeRoundedIcon /> : <DarkModeRoundedIcon />}</ListItemIcon>
      <ListItemText primary={colorMode === 'dark' ? 'အလင်းရောင်ပုံစံ' : 'အမှောင်ရောင်ပုံစံ'} slotProps={{ primary: { fontWeight: 750 } }} />
    </ListItemButton>
  )

  return (
    <AppHeaderActionsContext.Provider value={setHeaderActions}>
    <Box className="app-shell">
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        className="mobile-first-appbar"
        sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
          ml: desktop ? `${drawerWidth}px` : 0,
          width: desktop ? `calc(100% - ${drawerWidth}px)` : '100%',
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 64, md: 72 }, gap: 1 }}>
          {!desktop ? <IconButton aria-label="မီနူးဖွင့်ရန်" onClick={() => setMobileOpen(true)} edge="start">
            <MenuRoundedIcon />
          </IconButton> : null}
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="h6" noWrap sx={{ lineHeight: 1.2, fontWeight: 850 }}>
              {headerTitle}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: { xs: 'none', sm: 'block' } }}>
              {desktop ? shopName : 'ဆိုင်လုပ်ငန်းစီမံခန့်ခွဲမှု'}
            </Typography>
          </Box>
          {!preview && shops.length > 1 ? (
            <>
              <Button size="small" variant="outlined" startIcon={<StoreRoundedIcon />} onClick={(event) => setShopAnchor(event.currentTarget)} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
                ဆိုင်ရွေးရန်
              </Button>
              <Menu anchorEl={shopAnchor} open={Boolean(shopAnchor)} onClose={() => setShopAnchor(null)}>
                {shops.map((entry) => <MenuItem key={entry.id} selected={entry.id === shopId} onClick={() => { onShopChange?.(entry.id); setShopAnchor(null) }}>{entry.name}</MenuItem>)}
              </Menu>
            </>
          ) : null}
          {headerActions ? <Box className="app-header-actions">{headerActions}</Box> : null}
          <IconButton className="app-notification-button" aria-label="အသိပေးချက်များ">
            <Badge color="error" variant="dot"><NotificationsRoundedIcon /></Badge>
          </IconButton>
          <IconButton className="app-color-mode-toggle" aria-label={colorMode === 'dark' ? 'အလင်းရောင်ပုံစံသို့ ပြောင်းရန်' : 'အမှောင်ရောင်ပုံစံသို့ ပြောင်းရန်'} onClick={onToggleColorMode}>
            {colorMode === 'dark' ? <LightModeRoundedIcon /> : <DarkModeRoundedIcon />}
          </IconButton>
          <Avatar className="app-user-avatar" aria-label="အသုံးပြုသူ">{shopName.slice(0, 1)}</Avatar>
        </Toolbar>
      </AppBar>

      {desktop ? (
        <Drawer
          variant="permanent"
          sx={{ width: drawerWidth, flexShrink: 0, '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box', border: 0, color: '#fff', background: 'linear-gradient(180deg, #075b40, #064534)' } }}
        >
          <Toolbar sx={{ minHeight: 72, gap: 1.25, px: 2 }}>
            <Box sx={{ width: 38, height: 38, borderRadius: 2.5, display: 'grid', placeItems: 'center', bgcolor: '#34d399' }}><StoreRoundedIcon /></Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight={850} noWrap>{shopName}</Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,.62)' }}>POS စနစ်</Typography>
            </Box>
          </Toolbar>
          {navList(navItems)}
          <Box sx={{ mt: 'auto', borderTop: '1px solid rgba(255,255,255,.12)', pt: 1 }}>
            {settingsItem}
            {colorModeItem}
            {accountArea}
          </Box>
        </Drawer>
      ) : (
        <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)} PaperProps={{ sx: { width: 'min(84vw, 310px)', bgcolor: colorMode === 'dark' ? '#17222d' : '#fff' } }}>
          <Toolbar sx={{ minHeight: 72, px: 2, gap: 1.25 }}>
            <Box sx={{ width: 38, height: 38, borderRadius: 2.5, display: 'grid', placeItems: 'center', bgcolor: '#dcfce7', color: '#047857' }}><StoreRoundedIcon /></Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography fontWeight={850} noWrap>{shopName}</Typography>
            </Box>
          </Toolbar>
          {navList(navItems, true)}
          <Box sx={{ mt: 'auto', borderTop: '1px solid', borderColor: 'divider', pt: 1 }}>
            {settingsItem}
            {colorModeItem}
            {accountArea}
          </Box>
        </Drawer>
      )}

      <Box component="main" className="app-main" sx={{ ml: desktop ? `${drawerWidth}px` : 0, pt: { xs: '80px', md: '88px' } }}>
        <Box className="content-wrap">{children}</Box>
      </Box>
      {!desktop ? <BottomNavigation
        value={['home', 'order', 'products'].includes(page) ? page : false}
        showLabels
        className="mobile-bottom-navigation"
        aria-label="အဓိက စာမျက်နှာများ"
      >
        <BottomNavigationAction value="home" label="ပင်မ" icon={<DashboardRoundedIcon />} onClick={() => navigate('home')} />
        <BottomNavigationAction value="order" label="အရောင်း" icon={<AddShoppingCartRoundedIcon />} onClick={() => navigate('order')} />
        <BottomNavigationAction value="products" label="စာရင်း" icon={<CategoryRoundedIcon />} onClick={() => navigate('products')} />
        <BottomNavigationAction value="more" label="ပိုမို" icon={<MoreHorizRoundedIcon />} onClick={() => setMobileOpen(true)} />
      </BottomNavigation> : null}
    </Box>
    </AppHeaderActionsContext.Provider>
  )
}
