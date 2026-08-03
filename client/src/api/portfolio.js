import apiClient from './client'

export async function listMyPortfolio() {
  const { data } = await apiClient.get('/portfolio/mine')
  return data
}

export async function listBarberPortfolio(barberId) {
  const { data } = await apiClient.get(`/portfolio/barber/${barberId}`)
  return data
}

export async function listPublicPortfolio(slug, barberId) {
  const { data } = await apiClient.get(`/portfolio/public/${slug}`, { params: barberId ? { barberId } : {} })
  return data
}

export async function createPortfolioPhoto({ file, description, serviceId }) {
  const formData = new FormData()
  formData.append('photo', file)
  if (description) formData.append('description', description)
  if (serviceId) formData.append('serviceId', serviceId)
  const { data } = await apiClient.post('/portfolio', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function deletePortfolioPhoto(id) {
  const { data } = await apiClient.delete(`/portfolio/${id}`)
  return data
}
