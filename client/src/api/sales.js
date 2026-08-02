import apiClient from './client'

export async function listSales(params = {}) {
  const { data } = await apiClient.get('/sales', { params })
  return data
}

export async function createSale(payload) {
  const { data } = await apiClient.post('/sales', payload)
  return data
}
