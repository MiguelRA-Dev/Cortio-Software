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
