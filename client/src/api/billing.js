import apiClient from './client'

export async function getBillingStatus() {
  const { data } = await apiClient.get('/billing/status')
  return data
}

export async function startCheckout() {
  const { data } = await apiClient.post('/billing/checkout')
  return data
}

export async function claimSubscription() {
  const { data } = await apiClient.post('/billing/claim')
  return data
}
