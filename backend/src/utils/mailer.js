const nodemailer = require("nodemailer");
const env = require("../config/env");
const logger = require("../config/logger");

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

function wrapHtml(title, body) {
  return `<!doctype html>
<html>
  <body style="font-family: Inter, Arial, sans-serif; color: #111827; line-height: 1.5;">
    <h1 style="font-size: 20px;">${title}</h1>
    ${body}
    <p style="color:#6b7280;font-size:12px;">If you did not request this, you can ignore this email.</p>
  </body>
</html>`;
}

async function sendMail({ to, subject, text, html }) {
  try {
    const info = await getTransporter().sendMail({
      from: env.SMTP_FROM,
      to,
      subject,
      text,
      html,
    });
    logger.info({ to, subject, messageId: info.messageId }, "Email sent");
    return info;
  } catch (error) {
    logger.error({ err: error, to, subject }, "Failed to send email");
    throw error;
  }
}

async function sendVerificationEmail({ to, name, token }) {
  const url = `${env.APP_URL}/verify-email?token=${encodeURIComponent(token)}`;
  return sendMail({
    to,
    subject: "Verify your email",
    text: `Hi ${name},\n\nVerify your email: ${url}\n`,
    html: wrapHtml("Verify your email", `<p>Hi ${name},</p><p><a href="${url}">Verify email address</a></p>`),
  });
}

async function sendPasswordResetEmail({ to, name, token }) {
  const url = `${env.APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
  return sendMail({
    to,
    subject: "Reset your password",
    text: `Hi ${name},\n\nReset your password: ${url}\nThis link expires soon.\n`,
    html: wrapHtml("Reset your password", `<p>Hi ${name},</p><p><a href="${url}">Reset password</a></p>`),
  });
}

module.exports = {
  sendMail,
  sendVerificationEmail,
  sendPasswordResetEmail,
};
