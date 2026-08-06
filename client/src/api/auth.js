import apiClient from './client'

export async function updateMe(payload) {
  const { data } = await apiClient.patch('/auth/me', payload)
  return data
}

export async function verifyEmail(token) {
  const { data } = await apiClient.post('/auth/verify-email', { token })
  return data
}

export async function resendVerification() {
  const { data } = await apiClient.post('/auth/resend-verification')
  return data
}

export async function forgotPassword(email) {
  const { data } = await apiClient.post('/auth/forgot-password', { email })
  return data
}
