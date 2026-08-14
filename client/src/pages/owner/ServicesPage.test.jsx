import { describe, it, expect } from 'vitest'
import { gridColumnsFor } from './ServicesPage'

// Locks in the exact rule the user asked for over several rounds this session: 8 items
// become 4 columns, 6 become 3 — not one column per item, not a single long column.
describe('gridColumnsFor', () => {
  it('returns 1 for 0 or 1 items', () => {
    expect(gridColumnsFor(0)).toBe(1)
    expect(gridColumnsFor(1)).toBe(1)
  })

  it('8 items become 4 columns', () => {
    expect(gridColumnsFor(8)).toBe(4)
  })

  it('6 items become 3 columns', () => {
    expect(gridColumnsFor(6)).toBe(3)
  })

  it('2-3 items become 2 columns (the floor, never fewer than 2 once above 1 item)', () => {
    expect(gridColumnsFor(2)).toBe(2)
    expect(gridColumnsFor(3)).toBe(2)
  })

  it('never exceeds the given max, even with many items', () => {
    expect(gridColumnsFor(20, 4)).toBe(4)
  })

  it('respects a smaller max (e.g. the inner service grid capped at 2)', () => {
    expect(gridColumnsFor(8, 2)).toBe(2)
  })
})
