import apiClient from './client'

export async function listPayroll(params = {}) {
  const { data } = await apiClient.get('/payroll', { params })
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

export async function markPayrollPaid(id) {
  const { data } = await apiClient.patch(`/payroll/${id}/pay`)
  return data
}
