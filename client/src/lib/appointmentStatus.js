export const STATUS_LABEL = {
  completed: 'Completada',
  confirmed: 'Confirmada',
  pending: 'Pendiente',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
}

export const STATUS_VARIANT = {
  completed: 'success',
  confirmed: 'neutral',
  pending: 'muted',
  cancelled: 'danger',
  no_show: 'danger',
}

// Staff (owner/barber) views only — tells apart a cancellation the customer made
// themselves from one staff made, so a barber isn't left wondering why a booking
// vanished. Customer-facing views should keep using STATUS_LABEL directly instead.
export function getStaffStatusLabel(appointment) {
  if (appointment.status === 'cancelled' && appointment.cancelledBy === 'customer') {
    return 'Cancelada por el cliente'
  }
  return STATUS_LABEL[appointment.status]
}
