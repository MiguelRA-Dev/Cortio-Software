import apiClient from './client'

export async function getSummary(params = {}) {
  const { data } = await apiClient.get('/reports/summary', { params })
  return data
}

export async function getByBarber(params = {}) {
  const { data } = await apiClient.get('/reports/by-barber', { params })
  return data
}

export async function getByService(params = {}) {
  const { data } = await apiClient.get('/reports/by-service', { params })
  return data
}

export async function getCancellations(params = {}) {
  const { data } = await apiClient.get('/reports/cancellations', { params })
  return data
}

export async function getRatings(params = {}) {
  const { data } = await apiClient.get('/reports/ratings', { params })
  return data
}

export async function getRecentReviews(params = {}) {
  const { data } = await apiClient.get('/reports/recent-reviews', { params })
  return data
}
