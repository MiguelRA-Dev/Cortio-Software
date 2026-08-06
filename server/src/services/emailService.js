const ApiError = require('../utils/ApiError');

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new ApiError(500, `Falta la variable de entorno requerida: ${name}`);
  return value;
}

async function sendEmail({ to, subject, html }) {
  const apiKey = requireEnv('RESEND_API_KEY');
  const from = requireEnv('EMAIL_FROM');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from, to, subject, html })
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    // Don't let a flaky email provider break registration/login flows — log and move on.
    console.error('[emailService] Resend request failed:', res.status, body);
    return null;
  }

  return res.json();
}

async function sendVerificationEmail({ to, name, verifyUrl }) {
  return sendEmail({
    to,
    subject: 'Verifica tu correo en Cortio',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Hola ${name || ''},</h2>
        <p>Gracias por registrar tu barbería en Cortio. Confirma tu correo para verificar tu cuenta:</p>
        <p>
          <a href="${verifyUrl}" style="display:inline-block;background:#111;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;">
            Verificar mi correo
          </a>
        </p>
        <p>O copia y pega este link en tu navegador:</p>
        <p style="word-break: break-all;">${verifyUrl}</p>
        <p>Este link expira en 24 horas.</p>
      </div>
    `
  });
}

async function sendPasswordResetEmail({ to, name, resetUrl }) {
  return sendEmail({
    to,
    subject: 'Restablece tu contraseña en Cortio',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Hola ${name || ''},</h2>
        <p>Recibimos una solicitud para restablecer tu contraseña en Cortio. Si fuiste tú:</p>
        <p>
          <a href="${resetUrl}" style="display:inline-block;background:#111;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;">
            Restablecer contraseña
          </a>
        </p>
        <p>O copia y pega este link en tu navegador:</p>
        <p style="word-break: break-all;">${resetUrl}</p>
        <p>Este link expira en 1 hora. Si no fuiste tú, puedes ignorar este correo — tu contraseña seguirá siendo la misma.</p>
      </div>
    `
  });
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
