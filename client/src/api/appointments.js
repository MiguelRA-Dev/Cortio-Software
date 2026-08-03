import apiClient from './client'

export async function listMyAppointments(params = {}) {
  const { data } = await apiClient.get('/appointments/me', { params })
  return data
}

export async function updateAppointmentStatus(id, status) {
  const { data } = await apiClient.patch(`/appointments/${id}/status`, { status })
  return data
}

export async function rescheduleAppointment(id, startTime) {
  const { data } = await apiClient.patch(`/appointments/${id}/reschedule`, { startTime })
  return data
}

export async function getAvailability(slug, { barberId, serviceId, date }) {
  const { data } = await apiClient.get(`/appointments/availability/${slug}`, {
    params: { barberId, serviceId, date },
  })
  return data.slots
}

export async function createAppointment(payload) {
  const { data } = await apiClient.post('/appointments', payload)
  return data
}
