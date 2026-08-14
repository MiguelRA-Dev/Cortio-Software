import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import BillingPage from './BillingPage'
import { formatCOP } from '../../lib/format'

vi.mock('../../api/billing', () => ({
  getBillingStatus: vi.fn(),
  startCheckout: vi.fn(),
  cancelSubscription: vi.fn(),
  resumeSubscription: vi.fn(),
}))

import { getBillingStatus } from '../../api/billing'

function renderWithClient(ui) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

// Covers the Mensual/Anual toggle added this session — clicking "Anual" must switch the
// displayed price from priceCOP to priceAnnualCOP, not just change a visual selection.
// The price sits in the same <p> as a " / mes" / " / año" suffix span, so we check the
// rendered page's text directly instead of matching a single element's exact text.
describe('BillingPage annual toggle', () => {
  beforeEach(() => {
    getBillingStatus.mockResolvedValue({
      subscriptionStatus: 'trialing',
      trialDaysLeft: 20,
      currentPeriodEnd: null,
      blocked: false,
      priceCOP: 64900,
      priceAnnualCOP: 649000,
      cardBrand: null,
      cancelAtPeriodEnd: false,
    })
  })

  it('shows the monthly price by default', async () => {
    const { container } = renderWithClient(<BillingPage />)

    await waitFor(() => expect(container.textContent).toContain(formatCOP(64900)))
  })

  it('switches to the annual price when the Anual toggle is clicked', async () => {
    const { container } = renderWithClient(<BillingPage />)
    await waitFor(() => expect(container.textContent).toContain(formatCOP(64900)))

    await userEvent.click(screen.getByRole('button', { name: /anual/i }))

    // Note: "$ 64.900" can legitimately still appear elsewhere on the page (the account
    // status card always shows "Precio mensual: ..." regardless of the toggle) — the
    // toggle itself only controls the price inside the "Activar suscripción" card.
    await waitFor(() => expect(container.textContent).toContain(formatCOP(649000)))
    expect(container.textContent).toContain('/ año')
  })
})
