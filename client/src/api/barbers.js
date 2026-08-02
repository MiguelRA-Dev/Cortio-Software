import apiClient from './client'

export async function listPublicBarbers(slug) {
  const { data } = await apiClient.get(`/barbers/public/${slug}`)
  return data
}

export async function listTeam() {
  const { data } = await apiClient.get('/barbers/me/team')
  return data
}

export async function createBarber(payload) {
  const { data } = await apiClient.post('/auth/register-barber', payload)
  return data
}

export async function updateBarber(id, payload) {
  const { data } = await apiClient.patch(`/barbers/${id}`, payload)
  return data
}

export async function uploadBarberAvatar(id, file) {
  const formData = new FormData()
  formData.append('avatar', file)
  const { data } = await apiClient.post(`/barbers/${id}/avatar`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}
