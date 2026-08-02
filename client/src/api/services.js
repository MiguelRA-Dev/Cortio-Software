import apiClient from './client'

export async function listPublicServices(slug) {
  const { data } = await apiClient.get(`/services/public/${slug}`)
  return data
}

export async function listServices() {
  const { data } = await apiClient.get('/services/me')
  return data
}

export async function createService(payload) {
  const { data } = await apiClient.post('/services', payload)
  return data
}

export async function updateService(id, payload) {
  const { data } = await apiClient.patch(`/services/${id}`, payload)
  return data
}
