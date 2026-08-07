import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const responsive = vi.hoisted(() => ({ mobile: false }))

vi.mock('@mui/material', async (importOriginal) => {
  const original = await importOriginal()
  return { ...original, useMediaQuery: () => responsive.mobile }
})

vi.mock('../contexts/DataContext.jsx', () => ({
  useData: () => ({
    data: {
      orders: [
        {
          id: 'order-00001', orderNumber: '00001', date: '2026-06-22', createdAt: '2026-06-22T12:30:00.000Z', total: 50000,
          fulfillmentStatus: 'completed', paymentStatus: 'paid', balanceDue: 0,
          items: [
            { id: 'item-1', productId: 'jasmine', type: 'Jasmine', quantity: 2, unitPrice: 25000, lineTotal: 50000 },
            { id: 'item-2', productId: 'nivea', type: 'Nivea', quantity: 1, unitPrice: 5000, lineTotal: 5000 },
          ],
        },
        {
          id: 'order-00002', orderNumber: '00002', date: '2026-06-23', createdAt: '2026-06-23T09:30:00.000Z', total: 10000,
          fulfillmentStatus: 'completed', paymentStatus: 'unpaid', balanceDue: 10000,
          items: [{ id: 'item-3', productId: 'jasmine', type: 'Jasmine', quantity: 1, unitPrice: 10000, lineTotal: 10000 }],
        },
        {
          id: 'order-cancelled', orderNumber: '00003', date: '2026-06-23', total: 20000,
          fulfillmentStatus: 'cancelled', paymentStatus: 'unpaid', balanceDue: 20000,
          items: [{ id: 'item-4', productId: 'cancelled', type: 'Cancelled', quantity: 1 }],
        },
      ],
    },
  }),
}))

vi.mock('../utils/storage.js', () => ({
  getToday: () => '2026-06-23',
  formatKs: (value) => `${Number(value || 0).toLocaleString('en-US')} Ks`,
}))

import SalesPage from './SalesPage.jsx'

describe('Sales history responsive rendering', () => {
  beforeEach(() => { responsive.mobile = false })

  it('renders a desktop ledger and excludes customer details and cancelled orders', () => {
    const html = renderToStaticMarkup(<SalesPage />)

    expect(html).toContain('sales-desktop-table')
    expect(html).toContain('<table')
    expect(html).toContain('ပစ္စည်းအမျိုးအစား')
    expect(html).toContain('ရောင်းပြီး item')
    expect(html).toContain('(00002)')
    expect(html).toContain('sales-sequence')
    expect(html).not.toContain('Cancelled')
    expect(html).not.toContain('ဝယ်သူ')
  })

  it('renders compact mobile rows instead of a table', () => {
    responsive.mobile = true
    const html = renderToStaticMarkup(<SalesPage />)

    expect(html).toContain('sales-mobile-entry')
    expect(html).not.toContain('<table')
    expect(html).toContain('အကြွေးဘောက်ချာ')
    expect(html).toContain('အရောင်းမှတ်တမ်းထုတ်ရန်')
  })
})
