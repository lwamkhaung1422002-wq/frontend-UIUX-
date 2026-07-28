import {
  AppBar,
  Box,
  BottomNavigation,
  BottomNavigationAction,
  Button,
  Drawer,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Badge,
  Dialog,
  DialogContent,
  DialogTitle,
  TextField,
  Tooltip,
  SpeedDial,
  SpeedDialAction,
  Toolbar,
  Typography,
  useMediaQuery,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded'
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded'
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded'
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded'
import AddShoppingCartRoundedIcon from '@mui/icons-material/AddShoppingCartRounded'
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded'
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded'
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded'
import MoreHorizRoundedIcon from '@mui/icons-material/MoreHorizRounded'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded'
import MenuRoundedIcon from '@mui/icons-material/MenuRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded'
import StoreRoundedIcon from '@mui/icons-material/StoreRounded'
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded'
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded'
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded'
import ShoppingCartCheckoutRoundedIcon from '@mui/icons-material/ShoppingCartCheckoutRounded'
import { preloadRoute } from '../routes.js'

const drawerWidth = 248

const navItems = [
  { key: 'home', label: 'Overview', icon: <DashboardRoundedIcon /> },
  { key: 'order', label: 'Point of Sale', icon: <AddShoppingCartRoundedIcon /> },
  { key: 'sales', label: 'Sales', icon: <ReceiptLongRoundedIcon /> },
  { key: 'products', label: 'Products', icon: <CategoryRoundedIcon /> },
  { key: 'stock', label: 'Inventory', icon: <Inventory2RoundedIcon /> },
  { key: 'finance', label: 'Finance', icon: <AccountBalanceWalletRoundedIcon /> },
  { key: 'customers', label: 'Customers', icon: <PeopleAltRoundedIcon /> },
  { key: 'purchases', label: 'Purchases', icon: <ShoppingCartCheckoutRoundedIcon /> },
  { key: 'suppliers', label: 'Suppliers', icon: <LocalShippingRoundedIcon /> },
  { key: 'balance', label: 'Reports', icon: <TrendingUpRoundedIcon /> },
  { key: 'settings', label: 'Settings', icon: <SettingsRoundedIcon /> },
]

export default function AppLayout({
  page,
  onNavigate,
  onLogout,
  onGetStarted,
  preview = false,
  userEmail,
  shopName = 'Shop Owner',
  shops = [],
  shopId,
  onShopChange,
  data,
  children,
}) {
  const desktop = useMediaQuery('(min-width:1024px)')
  const current = navItems.find((item) => item.key === page) || navItems[0]
  const [moreAnchor, setMoreAnchor] = useState(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [notificationsAnchor, setNotificationsAnchor] = useState(null)
  const [shopAnchor, setShopAnchor] = useState(null)
  const notifications = useMemo(() => {
    const threshold = Number(data?.catalogSettings?.lowStockDefault ?? 5)
    const lowStock = (data?.stocks || []).filter((stock) => Number(stock.quantity || 0) - Number(stock.reservedQuantity || 0) <= threshold)
    const unpaid = (data?.orders || []).filter((order) => Number(order.balanceDue || 0) > 0)
    const pendingCod = unpaid.filter((order) => /cod/i.test(String(order.paymentMethod || order.source || '')))
    return [
      ...(lowStock.length ? [{ label: `${lowStock.length} low-stock item${lowStock.length === 1 ? '' : 's'}`, page: 'stock' }] : []),
      ...(unpaid.length ? [{ label: `${unpaid.length} order${unpaid.length === 1 ? '' : 's'} awaiting payment`, page: 'finance' }] : []),
      ...(pendingCod.length ? [{ label: `${pendingCod.length} pending COD settlement${pendingCod.length === 1 ? '' : 's'}`, page: 'finance' }] : []),
    ]
  }, [data])
  const searchResults = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return []
    const orders = (data?.orders || []).filter((order) =>
      [order.id, order.customer?.name, order.customer?.phone, order.paymentId]
        .some((value) => String(value || '').toLowerCase().includes(term)),
    ).slice(0, 5).map((order) => ({ label: `Order #${order.id}`, meta: order.customer?.name || 'Walk-in customer', page: 'sales' }))
    const products = (data?.products || []).filter((product) =>
      [product.name, product.sku, ...(product.variants || []).map((variant) => variant.sku)]
        .some((value) => String(value || '').toLowerCase().includes(term)),
    ).slice(0, 5).map((product) => ({ label: product.name, meta: product.sku || 'Product', page: 'stock' }))
    return [...orders, ...products].slice(0, 8)
  }, [data, search])
  useEffect(() => {
    const handleShortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCommandOpen(true)
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])
  const mobilePrimary = navItems.filter((item) =>
    ['home', 'sales', 'stock', 'order'].includes(item.key),
  )
  const mobileMoreKeys = ['products', 'customers', 'suppliers', 'purchases', 'finance', 'balance', 'settings']

  const nav = (
    <List component="nav" aria-label="Primary navigation" sx={{ px: 1.5 }}>
      {navItems.map((item) => (
        <ListItemButton
          key={item.key}
          selected={page === item.key}
          onClick={() => {
            onNavigate(item.key)
            setMobileOpen(false)
          }}
          onMouseEnter={() => preloadRoute(item.key)}
          onFocus={() => preloadRoute(item.key)}
          onTouchStart={() => preloadRoute(item.key)}
          sx={{
            borderRadius: 2,
            mb: 0.5,
            color: 'rgba(255,255,255,.72)',
            '& .MuiListItemIcon-root': { color: 'inherit' },
            '&.Mui-selected': {
              color: '#fff',
              bgcolor: 'rgba(16,185,129,.2)',
              boxShadow: 'inset 3px 0 #34d399',
            },
            '&.Mui-selected:hover, &:hover': { bgcolor: 'rgba(255,255,255,.09)' },
          }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
          <ListItemText primary={item.label} slotProps={{ primary: { fontWeight: 700 } }} />
        </ListItemButton>
      ))}
    </List>
  )

  return (
    <Box className="app-shell">
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
          ml: desktop ? `${drawerWidth}px` : 0,
          width: desktop ? `calc(100% - ${drawerWidth}px)` : '100%',
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 64, md: 72 }, gap: 1.5 }}>
          {!desktop ? (
            <IconButton aria-label="Open navigation" onClick={() => setMobileOpen(true)}>
              <MenuRoundedIcon />
            </IconButton>
          ) : null}
          {!preview && shops.length > 1 ? (
            <>
              <Button
                size="small"
                variant="outlined"
                startIcon={<StoreRoundedIcon />}
                aria-label={`Switch store. Current store: ${shopName}`}
                aria-haspopup="menu"
                onClick={(event) => setShopAnchor(event.currentTarget)}
                sx={{ minWidth: { xs: 42, sm: 150 }, maxWidth: 220, px: { xs: 1, sm: 1.5 } }}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'block' }, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {shopName}
                </Box>
              </Button>
              <Menu
                anchorEl={shopAnchor}
                open={Boolean(shopAnchor)}
                onClose={() => setShopAnchor(null)}
                MenuListProps={{ 'aria-label': 'Choose store' }}
              >
                {shops.map((entry) => (
                  <MenuItem
                    key={entry.id}
                    selected={entry.id === shopId}
                    onClick={() => {
                      onShopChange?.(entry.id)
                      setShopAnchor(null)
                      setMobileOpen(false)
                    }}
                  >
                    {entry.name}
                  </MenuItem>
                ))}
              </Menu>
            </>
          ) : null}
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="h6" noWrap sx={{ lineHeight: 1.2 }}>
              {current.label}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: { xs: 'none', sm: 'block' } }}>
              Manage your store operations
            </Typography>
          </Box>
          <TextField
            size="small"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && searchResults[0]) {
                onNavigate(searchResults[0].page)
                setSearchOpen(false)
              }
            }}
            placeholder="Search orders, products…"
            aria-label="Global search"
            sx={{ width: { sm: 220, lg: 300 }, display: { xs: 'none', sm: 'block' } }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> } }}
          />
          <Tooltip title="Notifications">
            <IconButton aria-label="Notifications" onClick={(event) => setNotificationsAnchor(event.currentTarget)}>
              <Badge badgeContent={notifications.length} color="error"><NotificationsNoneRoundedIcon /></Badge>
            </IconButton>
          </Tooltip>
          {!desktop ? (
            <Tooltip title="Search">
              <IconButton aria-label="Open global search" onClick={() => setCommandOpen(true)}>
                <SearchRoundedIcon />
              </IconButton>
            </Tooltip>
          ) : null}
          {!preview && userEmail ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ display: { xs: 'none', sm: 'block' }, mr: 1.5 }}
            >
              {userEmail}
            </Typography>
          ) : null}
          <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', md: 'block' }, mr: 1.5 }}>
            {current.label}
          </Typography>
          <Button
            size="small"
            variant={preview ? 'contained' : 'outlined'}
            startIcon={preview ? <RocketLaunchRoundedIcon /> : <AddShoppingCartRoundedIcon />}
            onClick={preview ? onGetStarted : () => onNavigate('order')}
            sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
          >
            {preview ? 'Get Started' : 'New Sale'}
          </Button>
        </Toolbar>
      </AppBar>

      {desktop ? (
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              border: 0,
              color: '#fff',
              background: 'linear-gradient(180deg, #064e3b, #063d31)',
            },
          }}
        >
          <Toolbar sx={{ minHeight: 72, gap: 1.25 }}>
            <Box sx={{ width: 38, height: 38, borderRadius: 2.5, display: 'grid', placeItems: 'center', bgcolor: '#10b981' }}>
              <StoreRoundedIcon />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight={850} noWrap>
                {shopName}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,.58)' }}>
                Store management
              </Typography>
            </Box>
          </Toolbar>
          {nav}
          <Box sx={{ mt: 'auto', p: 2, borderTop: '1px solid rgba(255,255,255,.1)' }}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,.55)' }}>Signed in as</Typography>
            <Typography variant="body2" noWrap sx={{ color: '#fff', mb: 1 }}>{userEmail || 'Preview user'}</Typography>
            <Button color="inherit" size="small" startIcon={<LogoutRoundedIcon />} onClick={preview ? onGetStarted : onLogout}>
              {preview ? 'Create account' : 'Log out'}
            </Button>
          </Box>
        </Drawer>
      ) : null}
      {!desktop ? (
        <Drawer
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          PaperProps={{ sx: { width: 'min(82vw, 288px)', color: '#fff', background: '#064e3b' } }}
        >
          <Toolbar sx={{ gap: 1.25 }}>
            <StoreRoundedIcon />
            <Typography fontWeight={850}>{shopName}</Typography>
          </Toolbar>
          {nav}
        </Drawer>
      ) : null}

      <Box
        component="main"
        className="app-main"
        sx={{
          ml: desktop ? `${drawerWidth}px` : 0,
          pt: '88px',
        }}
      >
        <Box className="content-wrap">{children}</Box>
      </Box>

      {!desktop ? (
        <BottomNavigation
          value={page}
          onChange={(_, nextPage) => onNavigate(nextPage)}
          showLabels
          sx={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1200,
            borderTop: '1px solid',
            borderColor: 'divider',
            '& .MuiBottomNavigationAction-root': {
              minWidth: 0,
              flex: 1,
              px: 0.5,
            },
          }}
        >
          {mobilePrimary.map((item) => (
            <BottomNavigationAction
              key={item.key}
              label={item.key === 'order' ? 'POS' : item.label}
              value={item.key}
              icon={item.icon}
              onMouseEnter={() => preloadRoute(item.key)}
              onFocus={() => preloadRoute(item.key)}
              onTouchStart={() => preloadRoute(item.key)}
            />
          ))}
          <BottomNavigationAction
            label="More"
            value={mobileMoreKeys.includes(page) ? page : 'more'}
            icon={<MoreHorizRoundedIcon />}
            onClick={(event) => setMoreAnchor(event.currentTarget)}
          />
        </BottomNavigation>
      ) : null}

      <Menu
        anchorEl={moreAnchor}
        open={Boolean(moreAnchor)}
        onClose={() => setMoreAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {navItems
          .filter((item) => mobileMoreKeys.includes(item.key))
          .map((item) => (
            <MenuItem
              key={item.key}
              onMouseEnter={() => preloadRoute(item.key)}
              onFocus={() => preloadRoute(item.key)}
              onTouchStart={() => preloadRoute(item.key)}
              onClick={() => {
                onNavigate(item.key)
                setMoreAnchor(null)
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              {item.label}
            </MenuItem>
          ))}
        <MenuItem
          onClick={() => {
            if (preview) onGetStarted()
            else onLogout()
            setMoreAnchor(null)
          }}
        >
          <ListItemIcon>
            {preview ? <RocketLaunchRoundedIcon /> : <LogoutRoundedIcon />}
          </ListItemIcon>
          {preview ? 'Get Started' : 'Logout'}
        </MenuItem>
      </Menu>
      <Menu
        anchorEl={notificationsAnchor}
        open={Boolean(notificationsAnchor)}
        onClose={() => setNotificationsAnchor(null)}
      >
        {notifications.length ? notifications.map((item) => (
          <MenuItem key={item.label} onClick={() => { onNavigate(item.page); setNotificationsAnchor(null) }}>
            {item.label}
          </MenuItem>
        )) : <MenuItem disabled>No new notifications</MenuItem>}
      </Menu>
      <Dialog open={searchOpen && Boolean(search.trim())} onClose={() => setSearchOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Search results</DialogTitle>
        <DialogContent sx={{ p: 1 }}>
          {searchResults.map((result) => (
            <ListItemButton key={`${result.page}-${result.label}`} onClick={() => { onNavigate(result.page); setSearchOpen(false); setSearch('') }} sx={{ borderRadius: 2 }}>
              <ListItemText primary={result.label} secondary={result.meta} />
            </ListItemButton>
          ))}
          {!searchResults.length ? <Typography color="text.secondary" sx={{ p: 2 }}>No orders or products found.</Typography> : null}
        </DialogContent>
      </Dialog>
      <Dialog open={commandOpen} onClose={() => setCommandOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Quick command <Typography component="span" variant="caption" color="text.secondary">Ctrl + K</Typography></DialogTitle>
        <DialogContent sx={{ p: 1 }}>
          {[
            ['New sale', 'order'],
            ['Add stock', 'stock'],
            ['Receive payment', 'finance'],
            ['Record expense', 'balance'],
            ['Open sales', 'sales'],
            ['Open settings', 'settings'],
          ].map(([label, target]) => (
            <ListItemButton key={label} onClick={() => { onNavigate(target); setCommandOpen(false) }} sx={{ borderRadius: 2 }}>
              <ListItemText primary={label} />
            </ListItemButton>
          ))}
        </DialogContent>
      </Dialog>

      <SpeedDial
        ariaLabel="Quick actions"
        icon={<AddRoundedIcon />}
        sx={{
          position: 'fixed',
          right: { xs: 16, md: 28 },
          bottom: { xs: 84, md: 28 },
          display: page === 'order' || (!desktop && ['home', 'settings'].includes(page)) ? 'none' : 'flex',
        }}
      >
        <SpeedDialAction
          icon={<AddShoppingCartRoundedIcon />}
          slotProps={{ tooltip: { title: 'New order' } }}
          onMouseEnter={() => preloadRoute('order')}
          onClick={() => onNavigate('order')}
        />
        <SpeedDialAction
          icon={<Inventory2RoundedIcon />}
          slotProps={{ tooltip: { title: 'Stock' } }}
          onMouseEnter={() => preloadRoute('stock')}
          onClick={() => onNavigate('stock')}
        />
        <SpeedDialAction
          icon={<AccountBalanceWalletRoundedIcon />}
          slotProps={{ tooltip: { title: 'Payments' } }}
          onMouseEnter={() => preloadRoute('finance')}
          onClick={() => onNavigate('finance')}
        />
      </SpeedDial>
    </Box>
  )
}
