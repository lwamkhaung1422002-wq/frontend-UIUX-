import { afterEach, describe, expect, it } from 'vitest'
import {
  defaultStoreFormatPreferences, formatDate, formatMoney, setStoreFormatPreferences,
} from './storage.js'

afterEach(() => setStoreFormatPreferences(defaultStoreFormatPreferences))

describe('store-aware formatting', () => {
  it.each([
    ['MMK', 'en-MM', /12,500\s?ကျပ်/],
    ['USD', 'en-US', /\$12,500\.00/],
    ['THB', 'th-TH', /฿12,500\.00/],
  ])('formats %s using the selected locale', (currencyCode, locale, expected) => {
    expect(formatMoney(12500, { currencyCode, locale })).toMatch(expected)
  })

  it.each([
    ['yyyy-MM-dd', '2026-07-28'],
    ['dd/MM/yyyy', '28/07/2026'],
    ['MM/dd/yyyy', '07/28/2026'],
  ])('formats dates as %s', (dateFormat, expected) => {
    expect(formatDate('2026-07-28T08:00:00.000Z', { dateFormat, timeZone: 'UTC' })).toBe(expected)
  })
})
