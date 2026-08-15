const GRAPH_API_VERSION = 'v21.0';

// Colombian phones may be stored as a 10-digit local number ("3134167377") or already
// with the country code — WhatsApp's API needs the full digits, no symbols/spaces.
function toWhatsAppNumber(phone) {
  if (!phone) return null;
  const digits = phone.replace(/[^0-9]/g, '');
  if (!digits) return null;
  if (digits.length === 10) return `57${digits}`;
  return digits;
}

function textParam(value) {
  return { type: 'text', text: String(value) };
}

const BOGOTA_DATE_FORMAT = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  day: 'numeric',
  month: 'long'
});
const BOGOTA_TIME_FORMAT = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true
});

function formatBogota(date) {
  return { date: BOGOTA_DATE_FORMAT.format(date), time: BOGOTA_TIME_FORMAT.format(date) };
}

// EXPLICIT COST GATE: every WhatsApp send costs real money (Meta bills per business-
// initiated message), and a free 30-day trial signup could otherwise generate unlimited
// appointments/reminders at Cortio's expense with zero revenue behind them. Notifications
// only ever fire for a barbershop with subscriptionStatus === 'active' — i.e. a period
// that's actually been paid for. Trialing, past_due, and canceled shops never trigger a
// send, no matter how many appointments they create. This is the single choke point for
// that rule — every notifyAppointmentX function below funnels through it.
const PAID_STATUS = 'active';
function isPaidSubscription(subscriptionStatus) {
  return subscriptionStatus === PAID_STATUS;
}

// Never throws — a missing/invalid phone, an unapproved template, or a Meta API outage
// should log and move on, not break the appointment flow that triggered it (same
// reasoning as emailService's sendEmail).
// Templates were created as "Spanish (COL)" in WhatsApp Manager (es_CO), not generic
// "es" — the language code sent here must match the approved template exactly or the
// send is rejected as if the template didn't exist.
async function sendTemplateMessage({ to, template, languageCode = 'es_CO', components = [] }) {
  const toNumber = toWhatsAppNumber(to);
  if (!toNumber) {
    console.error(`[whatsappService] Número inválido o ausente, no se envió la plantilla "${template}"`);
    return null;
  }

  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    console.error('[whatsappService] Faltan WHATSAPP_ACCESS_TOKEN o WHATSAPP_PHONE_NUMBER_ID');
    return null;
  }

  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: toNumber,
        type: 'template',
        template: { name: template, language: { code: languageCode }, components }
      })
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      console.error('[whatsappService] Meta API request failed:', res.status, JSON.stringify(body));
      return null;
    }

    return res.json();
  } catch (err) {
    console.error('[whatsappService] Unexpected failure sending template:', err.message);
    return null;
  }
}

async function notifyAppointmentCreated({ barber, customer, service, startTime, subscriptionStatus }) {
  if (!isPaidSubscription(subscriptionStatus)) return null;
  const { date, time } = formatBogota(startTime);
  return sendTemplateMessage({
    to: barber.phone,
    template: 'cita_nueva',
    components: [
      { type: 'body', parameters: [textParam(customer.name), textParam(service.name), textParam(date), textParam(time)] }
    ]
  });
}

async function notifyAppointmentCancelled({ barber, customer, service, startTime, subscriptionStatus }) {
  if (!isPaidSubscription(subscriptionStatus)) return null;
  const { date, time } = formatBogota(startTime);
  return sendTemplateMessage({
    to: barber.phone,
    template: 'cita_cancelada',
    components: [
      { type: 'body', parameters: [textParam(customer.name), textParam(service.name), textParam(date), textParam(time)] }
    ]
  });
}

async function notifyAppointmentRescheduled({ barber, customer, service, startTime, subscriptionStatus }) {
  if (!isPaidSubscription(subscriptionStatus)) return null;
  const { date, time } = formatBogota(startTime);
  return sendTemplateMessage({
    to: barber.phone,
    template: 'cita_reprogramada',
    components: [
      { type: 'body', parameters: [textParam(customer.name), textParam(service.name), textParam(date), textParam(time)] }
    ]
  });
}

async function notifyAppointmentReminder({ barber, customer, service, startTime, subscriptionStatus }) {
  if (!isPaidSubscription(subscriptionStatus)) return null;
  const { time } = formatBogota(startTime);
  return sendTemplateMessage({
    to: barber.phone,
    template: 'recordatorio_cita',
    components: [{ type: 'body', parameters: [textParam(customer.name), textParam(service.name), textParam(time)] }]
  });
}

module.exports = {
  sendTemplateMessage,
  notifyAppointmentCreated,
  notifyAppointmentCancelled,
  notifyAppointmentRescheduled,
  notifyAppointmentReminder
};
