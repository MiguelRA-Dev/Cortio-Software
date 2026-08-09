import apiClient from './client'

export async function listMyTimeBlocks() {
  const { data } = await apiClient.get('/time-blocks/me')
  return data
}

export async function createTimeBlock(payload) {
  const { data } = await apiClient.post('/time-blocks', payload)
  return data
}

export async function deleteTimeBlock(id) {
  const { data } = await apiClient.delete(`/time-blocks/${id}`)
  return data
}
