import nodemailer from "nodemailer";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Configure Nodemailer Transporter
 * Supports:
 * 1. Custom SMTP server (Mailtrap, Brevo, SendGrid, Hostinger, etc.) via SMTP_*
 * 2. Gmail App Password via EMAIL_USER & EMAIL_PASS
 */
const getTransporter = () => {
  // Option 1: Custom SMTP configuration
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Option 2: Gmail service with App Password
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  return null;
};

/**
 * Sends an email using Nodemailer
 * If SMTP credentials are not yet supplied in .env, falls back to logging cleanly in development.
 */
export const sendEmail = async (options: SendEmailOptions): Promise<boolean> => {
  try {
    const transporter = getTransporter();

    if (!transporter) {
      console.warn(
        "\n[NODEMAILER NOTICE] Email credentials (EMAIL_USER/EMAIL_PASS or SMTP_*) are not configured in .env."
      );
      console.log(`[EMAIL DISPATCH] To: ${options.to}`);
      console.log(`[EMAIL DISPATCH] Subject: ${options.subject}`);
      if (options.text) {
        console.log(`[EMAIL DISPATCH] Body:\n${options.text}`);
      }
      console.log("-----------------------------------------\n");
      return true;
    }

    const fromAddress =
      process.env.EMAIL_FROM ||
      process.env.EMAIL_USER ||
      process.env.SMTP_USER ||
      '"TaskFlow" <no-reply@taskflow.com>';

    const info = await transporter.sendMail({
      from: fromAddress,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    console.log(
      `[NODEMAILER] Email sent successfully to ${options.to}. MessageId: ${info.messageId}`
    );
    return true;
  } catch (error) {
    console.error("[NODEMAILER ERROR] Failed to send email:", error);
    return false;
  }
};

export const sendInvitationEmail = async (
  toEmail: string,
  projectName: string,
  token: string,
  invitedByName?: string
): Promise<boolean> => {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const invitationLink = `${clientUrl}/invitations/accept?token=${token}`;

  const subject = `You're invited to join "${projectName}" on TaskFlow`;
  const text = `Hello,\n\n${
    invitedByName || "A team member"
  } invited you to join the project "${projectName}" on TaskFlow.\n\nAccept your invitation using this link: ${invitationLink}\n\nThis invitation expires in 7 days.\n\nBest regards,\nTaskFlow Team`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #2563eb;">Project Invitation</h2>
      <p>Hello,</p>
      <p><strong>${
        invitedByName || "A teammate"
      }</strong> has invited you to collaborate on <strong>${projectName}</strong> on TaskFlow.</p>
      <div style="margin: 25px 0;">
        <a href="${invitationLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          Accept Invitation
        </a>
      </div>
      <p style="color: #64748b; font-size: 14px;">Or copy and paste this link in your browser:<br/><a href="${invitationLink}">${invitationLink}</a></p>
      <p style="color: #64748b; font-size: 13px;">This invitation link will expire in 7 days.</p>
    </div>
  `;

  return sendEmail({ to: toEmail, subject, text, html });
};

export const sendPasswordResetEmail = async (
  toEmail: string,
  token: string,
  userName?: string
): Promise<boolean> => {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const resetLink = `${clientUrl}/reset-password?token=${token}`;

  const subject = "Reset your TaskFlow Password";
  const text = `Hello ${
    userName || "there"
  },\n\nYou requested to reset your TaskFlow password.\n\nReset your password here: ${resetLink}\n\nThis link is valid for 1 hour. If you did not request this, please ignore this email.\n\nBest regards,\nTaskFlow Team`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #2563eb;">Password Reset Request</h2>
      <p>Hello ${userName || ""},</p>
      <p>We received a request to reset your password for your TaskFlow account.</p>
      <div style="margin: 25px 0;">
        <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          Reset Password
        </a>
      </div>
      <p style="color: #64748b; font-size: 14px;">Or copy and paste this link in your browser:<br/><a href="${resetLink}">${resetLink}</a></p>
      <p style="color: #64748b; font-size: 13px;">This link will expire in 1 hour. If you did not request a password reset, you can safely ignore this email.</p>
    </div>
  `;

  return sendEmail({ to: toEmail, subject, text, html });
};
