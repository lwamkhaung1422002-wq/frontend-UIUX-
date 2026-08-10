import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

const responsive = vi.hoisted(() => ({ mobile: false }))
vi.mock('@mui/material', async (importOriginal) => ({ ...(await importOriginal()), useMediaQuery: () => responsive.mobile }))
vi.mock('../contexts/AuthContext.jsx', () => ({ useAuth: () => ({ user: { preview: true, email: 'greenmart.demo@local.test' } }) }))
vi.mock('../contexts/DataContext.jsx', () => ({ useData: () => ({ data: {}, loading: false, error: '' }) }))

import HomePage from './HomePage.jsx'

describe('Dashboard home page', () => {
  it('renders the desktop sales table with Myanmar kyat formatting', () => {
    responsive.mobile = false
    const html = renderToStaticMarkup(<HomePage navigate={vi.fn()} />)
    expect(html).toContain('dashboard-sales-table')
    expect(html).toContain('အားလုံးကြည့်ရန်')
    expect(html).toContain('ကျပ်')
    expect(html).not.toContain(' Ks ကျပ်')
  })

  it('renders sale cards instead of a table on mobile', () => {
    responsive.mobile = true
    const html = renderToStaticMarkup(<HomePage navigate={vi.fn()} />)
    expect(html).toContain('dashboard-sales-mobile-list')
    expect(html).not.toContain('<table')
  })
})
