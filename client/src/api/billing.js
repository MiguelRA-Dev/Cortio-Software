import apiClient from './client'

export async function getBillingStatus() {
  const { data } = await apiClient.get('/billing/status')
  return data
}

export async function attachPaymentMethod(cardToken) {
  const { data } = await apiClient.post('/billing/payment-method', { cardToken })
  return data
}
