import nodemailer from 'nodemailer';

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

export async function sendAccountSetupEmail({
  email,
  name,
  temporaryPassword,
  setupUrl,
}: {
  email: string;
  name: string;
  temporaryPassword: string;
  setupUrl: string;
}) {
  const host = process.env.SMTP_HOST;
  const from = process.env.SMTP_FROM;
  if (!host || !from) {
    throw new Error('SMTP_NOT_CONFIGURED');
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
    ...(process.env.SMTP_USER && process.env.SMTP_PASSWORD
      ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } }
      : {}),
  });

  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(setupUrl);
  await transporter.sendMail({
    from,
    to: email,
    subject: 'Votre compte Org’atelier',
    text: `Bonjour ${name},\n\nVotre compte Org’atelier est prêt.\n\nMot de passe temporaire : ${temporaryPassword}\n\nChoisissez votre mot de passe permanent dans les prochaines 24 heures : ${setupUrl}\n\nSi vous n’attendiez pas ce message, ignorez-le.`,
    html: `<p>Bonjour ${safeName},</p><p>Votre compte Org’atelier est prêt.</p><p><strong>Mot de passe temporaire :</strong> ${escapeHtml(temporaryPassword)}</p><p>Choisissez votre mot de passe permanent dans les prochaines 24 heures :</p><p><a href="${safeUrl}">Définir mon mot de passe</a></p><p>Si vous n’attendiez pas ce message, ignorez-le.</p>`,
  });
}