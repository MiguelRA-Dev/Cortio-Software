import apiClient from './client'

export async function listMyReviews() {
  const { data } = await apiClient.get('/reviews/mine')
  return data
}

export async function createReview({ appointmentId, rating, comment }) {
  const { data } = await apiClient.post('/reviews', { appointmentId, rating, comment })
  return data
}
