import { Resend } from 'resend';

/**
 * EmailService - thin wrapper around Resend.
 *
 * In development (no RESEND_API_KEY), logs OTP codes to console so you can
 * test the flow without sending real email.
 */
export class EmailService {
  private resend: Resend | null;
  private fromAddress: string;

  constructor(apiKey: string | undefined, fromAddress: string) {
    this.resend = apiKey ? new Resend(apiKey) : null;
    this.fromAddress = fromAddress;
  }

  async sendOtp(email: string, code: string): Promise<void> {
    const subject = 'Your OutcomeBazaar login code';
    const text = `Your login code is ${code}. It expires in 10 minutes.\n\nIf you didn't request this, ignore this email.`;
    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #6d28d9;">Your OutcomeBazaar login code</h2>
        <p style="font-size: 16px;">Enter this code to sign in:</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 6px; background: #f5f3ff; padding: 16px; text-align: center; border-radius: 8px;">${code}</p>
        <p style="font-size: 14px; color: #6b7280;">This code expires in 10 minutes. If you didn't request it, ignore this email.</p>
      </div>
    `;

    if (!this.resend) {
      console.log(`[EmailService] (dev) OTP for ${email}: ${code}`);
      return;
    }

    const { error } = await this.resend.emails.send({
      from: this.fromAddress,
      to: email,
      subject,
      text,
      html,
    });

    if (error) {
      throw new Error(`Resend failed: ${error.message}`);
    }
  }
}
