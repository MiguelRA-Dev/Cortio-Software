import apiClient from './client'

export async function getPublicBarbershop(slug) {
  const { data } = await apiClient.get(`/barbershops/${slug}`)
  return data
}

export async function getMyBarbershop() {
  const { data } = await apiClient.get('/barbershops/me')
  return data
}

export async function updateMyBarbershop(payload) {
  const { data } = await apiClient.patch('/barbershops/me', payload)
  return data
}
