import apiClient from './client'

export async function listPayroll(params = {}) {
  const { data } = await apiClient.get('/payroll', { params })
  return data
}

export async function getPayrollEntry(id) {
  const { data } = await apiClient.get(`/payroll/${id}`)
  return data
}

export async function previewPayroll(params) {
  const { data } = await apiClient.get('/payroll/preview', { params })
  return data
}

export async function createPayroll(payload) {
  const { data } = await apiClient.post('/payroll', payload)
  return data
}

export async function updatePayroll(id, payload) {
  const { data } = await apiClient.patch(`/payroll/${id}`, payload)
  return data
}

export async function deletePayroll(id) {
  const { data } = await apiClient.delete(`/payroll/${id}`)
  return data
}

export async function markPayrollPaid(id, paymentMethod) {
  const { data } = await apiClient.patch(`/payroll/${id}/pay`, { paymentMethod })
  return data
}
