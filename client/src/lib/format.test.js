import { describe, it, expect } from 'vitest'
import { formatCOP } from './format'

describe('formatCOP', () => {
  it('formats a whole COP amount with thousands separators', () => {
    expect(formatCOP(25000)).toBe('$ 25.000')
  })

  it('formats zero', () => {
    expect(formatCOP(0)).toBe('$ 0')
  })

  it('never shows decimals, even for a fractional input', () => {
    expect(formatCOP(1500.5)).not.toContain(',')
  })
})
