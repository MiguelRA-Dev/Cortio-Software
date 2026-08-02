import apiClient from './client'

export async function listProducts() {
  const { data } = await apiClient.get('/products')
  return data
}

export async function listLowStock() {
  const { data } = await apiClient.get('/products/low-stock')
  return data
}

export async function createProduct(payload) {
  const { data } = await apiClient.post('/products', payload)
  return data
}

export async function updateProduct(id, payload) {
  const { data } = await apiClient.patch(`/products/${id}`, payload)
  return data
}

export async function createMovement(productId, payload) {
  const { data } = await apiClient.post(`/products/${productId}/movements`, payload)
  return data
}
