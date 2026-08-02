import apiClient from './client'

export async function listCustomers() {
  const { data } = await apiClient.get('/customers')
  return data
}
