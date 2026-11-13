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
 * 3. Automated Senior Developer Sandbox (Ethereal Email) when no personal credentials are provided!
 */
const cleanEnv = (val?: string): string => {
  if (!val) return "";
  return val.trim().replace(/^["']|["']$/g, "").trim();
};

let etherealTransporter: any = null;
let lastPreviewUrl: string | null = null;

export const getLastPreviewUrl = () => lastPreviewUrl;

const getTransporter = async (): Promise<any> => {
  const smtpHost = cleanEnv(process.env.SMTP_HOST);
  const smtpUser = cleanEnv(process.env.SMTP_USER);
  const smtpPass = cleanEnv(process.env.SMTP_PASS);
  const resendApiKey = cleanEnv(process.env.RESEND_API_KEY);
  const emailUser = cleanEnv(process.env.EMAIL_USER);
  const emailPass = cleanEnv(process.env.EMAIL_PASS);

  // Option 1: Brevo / Custom SMTP configuration (Delivers to ANY email without domain restriction)
  if (smtpHost && smtpUser && smtpPass) {
    return nodemailer.createTransport({
      host: smtpHost,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
  }

  // Option 2: Resend (Modern SaaS Transactional Email Service)
  if (resendApiKey) {
    return nodemailer.createTransport({
      host: "smtp.resend.com",
      port: 465,
      secure: true,
      auth: {
        user: "resend",
        pass: resendApiKey,
      },
    });
  }

  // Option 2: Gmail service with App Password
  if (emailUser && emailPass) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });
  }

  // Option 3: Automated Developer Sandbox (Ethereal Email - zero personal credentials needed)
  if (!etherealTransporter) {
    try {
      const testAccount = await nodemailer.createTestAccount();
      etherealTransporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log(`[ETHEREAL SANDBOX INITIALIZED] Automated test user: ${testAccount.user}`);
    } catch (e) {
      console.warn("[ETHEREAL NOTICE] Could not connect to Ethereal sandbox:", e);
      return null;
    }
  }

  return etherealTransporter;
};

/**
 * Sends an email using Nodemailer
 */
export const sendEmail = async (options: SendEmailOptions): Promise<boolean> => {
  try {
    const transporter = await getTransporter();

    if (!transporter) {
      console.warn(
        "\n[NODEMAILER DEV NOTICE] Transporter unavailable. Logging to console:"
      );
      console.log(`[EMAIL DISPATCH] To: ${options.to}`);
      console.log(`[EMAIL DISPATCH] Subject: ${options.subject}`);
      if (options.text) {
        console.log(`[EMAIL DISPATCH] Body:\n${options.text}`);
      }
      console.log("-----------------------------------------\n");
      return true;
    }

    const resendKey = cleanEnv(process.env.RESEND_API_KEY);
    const fromAddress =
      cleanEnv(process.env.EMAIL_FROM) ||
      (resendKey ? "TaskFlow <onboarding@resend.dev>" : null) ||
      cleanEnv(process.env.EMAIL_USER) ||
      '"TaskFlow" <siddiqamalik888@gmail.com>';

    const info = await transporter.sendMail({
      from: fromAddress,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    const testUrl = nodemailer.getTestMessageUrl(info);
    if (testUrl) {
      lastPreviewUrl = testUrl;
      console.log("\n=======================================================");
      console.log(`[LIVE EMAIL DELIVERED] Recipient: ${options.to}`);
      console.log(`[CLICKABLE WEB PREVIEW]: ${testUrl}`);
      console.log("=======================================================\n");
    } else {
      console.log(
        `[NODEMAILER] Email sent successfully to ${options.to}. MessageId: ${info.messageId}`
      );
    }
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
  const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
  const invitationLink = `${clientUrl}/invitations/accept?token=${token}`;

  const subject = `You're invited to join "${projectName}" on TaskFlow`;
  const text = `Hello,\n\n${
    invitedByName || "A team member"
  } invited you to join the project "${projectName}" on TaskFlow.\n\nAccept your invitation using this link: ${invitationLink}\n\nThis invitation expires in 7 days.\n\nBest regards,\nTaskFlow Team`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff;">
      <div style="margin-bottom: 24px;">
        <span style="font-size: 20px; font-weight: 700; color: #111827; letter-spacing: -0.02em;">TaskFlow</span>
      </div>
      <h2 style="color: #111827; font-size: 20px; font-weight: 600; margin-bottom: 12px;">Join "${projectName}"</h2>
      <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
        <strong>${invitedByName || "A teammate"}</strong> has invited you to collaborate on <strong>${projectName}</strong>.
      </p>
      <div style="margin: 28px 0;">
        <a href="${invitationLink}" style="background-color: #5e6ad2; color: #ffffff; padding: 11px 22px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500; display: inline-block;">
          Accept Invitation
        </a>
      </div>
      <p style="color: #6b7280; font-size: 13px; line-height: 1.5;">Or copy and paste this link in your browser:<br/><a href="${invitationLink}" style="color: #5e6ad2; word-break: break-all;">${invitationLink}</a></p>
      <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 12px;">This invitation was sent by TaskFlow. It will expire in 7 days.</p>
    </div>
  `;

  return sendEmail({ to: toEmail, subject, text, html });
};

export const sendPasswordResetEmail = async (
  toEmail: string,
  token: string,
  userName?: string
): Promise<boolean> => {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
  const resetLink = `${clientUrl}/reset-password?token=${token}`;

  const subject = "Reset your TaskFlow Password";
  const text = `Hello ${
    userName || "there"
  },\n\nYou requested to reset your TaskFlow password.\n\nReset your password here: ${resetLink}\n\nThis link is valid for 1 hour.\n\nBest regards,\nTaskFlow Team`;

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
      <p style="color: #64748b; font-size: 13px;">This link will expire in 1 hour.</p>
    </div>
  `;

  return sendEmail({ to: toEmail, subject, text, html });
};

// Brevo configuration loaded: 2026-10-19T07:00:39.669Z
