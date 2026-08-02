import apiClient from './client'

export async function listExpenses(params = {}) {
  const { data } = await apiClient.get('/expenses', { params })
  return data
}

export async function createExpense(payload) {
  const { data } = await apiClient.post('/expenses', payload)
  return data
}

export async function updateExpense(id, payload) {
  const { data } = await apiClient.patch(`/expenses/${id}`, payload)
  return data
}

export async function deleteExpense(id) {
  const { data } = await apiClient.delete(`/expenses/${id}`)
  return data
}
