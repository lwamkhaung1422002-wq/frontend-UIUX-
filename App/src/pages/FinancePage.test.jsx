import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

const responsive = vi.hoisted(() => ({ mobile: false }))
vi.mock('@mui/material', async (importOriginal) => ({ ...(await importOriginal()), useMediaQuery: () => responsive.mobile }))
vi.mock('../contexts/AuthContext.jsx', () => ({ useAuth: () => ({ user: { uid: 'synthetic-owner' } }) }))
vi.mock('../contexts/FeedbackContext.jsx', () => ({ useFeedback: () => ({ notify: vi.fn() }) }))
vi.mock('../contexts/DataContext.jsx', () => ({
  useData: () => ({
    data: {
      catalogSettings: { paymentMethods: [] }, suppliers: [], purchases: [], expenses: [], payments: [],
      orders: [{ id: 'credit-order', orderNumber: '00001', date: new Date().toISOString().slice(0, 10), total: 45000, balanceDue: 45000, paymentStatus: 'unpaid', fulfillmentStatus: 'completed', items: [{ productId: 'p1', quantity: 1, unitCost: 30000 }] }],
    },
  }),
}))

import FinancePage from './FinancePage.jsx'

describe('Finance dashboard', () => {
  it('renders finance metrics and customer-credit receiving action', () => {
    responsive.mobile = false
    const html = renderToStaticMarkup(<FinancePage refresh={vi.fn()} />)
    expect(html).toContain('45,000 Ks')
    expect(html).toContain('finance-summary-grid')
    expect(html).toContain('အမျိုးအစား / အမည် / ဘောက်ချာ')
    expect(html).toContain('လုပ်ဆောင်ချက်')
    expect(html).not.toContain('finance-due-card')
  })

  it('renders compact ledger on mobile', () => {
    responsive.mobile = true
    const html = renderToStaticMarkup(<FinancePage refresh={vi.fn()} />)
    expect(html).toContain('finance-ledger-mobile')
    expect(html).not.toContain('<table')
  })
})
