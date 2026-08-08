import apiClient from './client'

export async function getBillingStatus() {
  const { data } = await apiClient.get('/billing/status')
  return data
}

export async function startCheckout() {
  const { data } = await apiClient.post('/billing/checkout')
  return data
}

export async function cancelSubscription() {
  const { data } = await apiClient.post('/billing/cancel')
  return data
}

export async function resumeSubscription() {
  const { data } = await apiClient.post('/billing/resume')
  return data
}
