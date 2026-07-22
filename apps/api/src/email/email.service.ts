import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMailModule from '@sendgrid/mail';
const sgMail = (sgMailModule as any).default || sgMailModule;

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>('SENDGRID_API_KEY');
    if (apiKey) {
      sgMail.setApiKey(apiKey);
    } else {
      this.logger.warn(
        'SENDGRID_API_KEY is not configured. Email sending will fail.',
      );
    }
  }

  async sendInviteEmail(params: {
    to: string;
    employeeName: string;
    managerName: string;
    orgName: string;
    inviteLink: string;
    jobTitle?: string;
  }) {
    const { to, employeeName, managerName, orgName, inviteLink, jobTitle } =
      params;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>You've been invited to EZ LEARN</title>
    </head>
    <body style="margin:0;padding:0;background:#0a0a14;font-family:Inter,sans-serif;">
      <div style="max-width:600px;margin:40px auto;padding:0 20px;">

        <!-- Header -->
        <div style="text-align:center;margin-bottom:32px;">
          <div style="display:inline-flex;align-items:center;gap:8px;">
            <div style="width:36px;height:36px;background:linear-gradient(135deg,#4A90D9,#34C9B0);
                        border-radius:8px;display:flex;align-items:center;justify-content:center;">
              <span style="color:white;font-size:18px;">≈</span>
            </div>
            <span style="color:white;font-size:20px;font-weight:700;">
              EZ <span style="color:#4A90D9;">LEARN</span>
            </span>
          </div>
        </div>

        <!-- Main card -->
        <div style="background:#0f1220;border:1px solid #1e2a3d;border-radius:16px;
                    padding:40px;margin-bottom:24px;">
          <h1 style="color:#dce3f0;font-size:26px;font-weight:700;margin:0 0 8px;">
            You're invited! 🎉
          </h1>
          <p style="color:#7a8499;font-size:15px;margin:0 0 24px;line-height:1.6;">
            Hi <strong style="color:#dce3f0;">${employeeName}</strong>,<br><br>
            <strong style="color:#dce3f0;">${managerName}</strong> from
            <strong style="color:#dce3f0;">${orgName}</strong> has invited you
            to begin your personalized AI-powered learning journey on EZ LEARN.
          </p>

          ${
            jobTitle
              ? `
          <div style="background:#171e30;border-radius:8px;padding:12px 16px;
                      margin-bottom:24px;border-left:3px solid #4A90D9;">
            <p style="color:#7a8499;font-size:12px;margin:0 0 2px;
                       text-transform:uppercase;letter-spacing:0.05em;">Your Role</p>
            <p style="color:#dce3f0;font-size:15px;font-weight:500;margin:0;">${jobTitle}</p>
          </div>`
              : ''
          }

          <!-- What to expect -->
          <p style="color:#7a8499;font-size:13px;font-weight:600;
                     text-transform:uppercase;letter-spacing:0.05em;margin:0 0 12px;">
            What to expect
          </p>
          <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:32px;">
            ${[
              [
                '🤖',
                'AI Skills Assessment',
                'A 10-minute chat to understand your current skills',
              ],
              [
                '🗺️',
                'Personalized Learning Path',
                'A custom curriculum built just for your role',
              ],
              [
                '📈',
                'Track Your Progress',
                'Learn at your pace with milestone-based goals',
              ],
            ]
              .map(
                ([icon, title, desc]) => `
            <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px;">
              <span style="font-size:20px;margin-top:2px;line-height:1;">${icon}</span>
              <div>
                <p style="color:#dce3f0;font-size:14px;font-weight:600;margin:0;">${title}</p>
                <p style="color:#7a8499;font-size:13px;margin:0;line-height:1.4;">${desc}</p>
              </div>
            </div>`,
              )
              .join('')}
          </div>

          <!-- CTA Button -->
          <div style="text-align:center;">
            <a href="${inviteLink}"
               style="display:inline-block;background:linear-gradient(135deg,#4A90D9,#2C5F9E);
                      color:white;font-size:16px;font-weight:600;padding:14px 32px;
                      border-radius:10px;text-decoration:none;letter-spacing:0.01em;">
              Begin My Learning Journey →
            </a>
            <p style="color:#7a8499;font-size:12px;margin:16px 0 0;">
              This link expires in 14 days
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align:center;">
          <p style="color:#4a5568;font-size:12px;margin:0;">
            Sent by EZ LEARN on behalf of ${orgName}<br>
            If you didn't expect this email, you can safely ignore it.
          </p>
        </div>
      </div>
    </body>
    </html>`;

    const fromEmail =
      this.config.get<string>('SENDGRID_FROM_EMAIL') || 'no-reply@ezlearn.ai';

    try {
      await sgMail.send({
        to,
        from: {
          email: fromEmail,
          name: 'EZ LEARN',
        },
        subject: `${managerName} invited you to start learning at ${orgName} 🎓`,
        html,
        text: `You've been invited by ${managerName} to join ${orgName} on EZ LEARN.
               Click here to begin: ${inviteLink}`,
      });
      this.logger.log(`Invite email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send invite email to ${to}`, error);
      throw new Error('Failed to send invitation email');
    }
  }

  async sendPathReadyEmail(params: {
    to: string;
    name: string;
    pathTitle: string;
    pathUrl: string;
    milestonesCount: number;
    estimatedHours: number;
  }) {
    // Placeholder — full implementation in Phase 3 Step 3.6
    this.logger.log(`Path ready email queued for ${params.to}`);
  }

  async sendBudgetWarningEmail(params: {
    to: string;
    name: string;
    percentUsed: number;
    usedUsd: number;
    budgetUsd: number;
    remainingUsd: number;
  }) {
    const { to, name, percentUsed, usedUsd, budgetUsd, remainingUsd } = params;
    const appUrl = this.config.get<string>('APP_URL') || 'http://localhost:3000';
    const fromEmail =
      this.config.get<string>('SENDGRID_FROM_EMAIL') || 'no-reply@ezlearn.ai';

    const html = `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
        <h2 style="color:#f59e0b">⚠️ AI Budget Warning</h2>
        <p>Hi ${name},</p>
        <p>Your organization has used
          <strong>${percentUsed.toFixed(0)}%</strong>
          of its monthly AI token budget.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr>
            <td style="padding:8px;color:#6b7280">Used</td>
            <td style="padding:8px;font-weight:bold">
              $${usedUsd.toFixed(2)}
            </td>
          </tr>
          <tr style="background:#f9fafb">
            <td style="padding:8px;color:#6b7280">Budget</td>
            <td style="padding:8px;font-weight:bold">
              $${budgetUsd.toFixed(2)}
            </td>
          </tr>
          <tr>
            <td style="padding:8px;color:#6b7280">Remaining</td>
            <td style="padding:8px;font-weight:bold;color:#10b981">
              $${remainingUsd.toFixed(2)}
            </td>
          </tr>
        </table>
        <p>To avoid service interruption, please
          <a href="${appUrl}/manage/settings"
             style="color:#6366f1">
            increase your budget
          </a>
          before reaching 100%.
        </p>
        <p style="color:#6b7280;font-size:12px">
          AI features will be paused when the budget is fully consumed.
        </p>
      </div>
    `;

    try {
      await sgMail.send({
        to,
        from: { email: fromEmail, name: 'EZ LEARN' },
        subject: `⚠️ AI Usage Alert: ${percentUsed.toFixed(0)}% of budget used`,
        html,
      });
      this.logger.log(`Budget warning email sent to ${to}`);
    } catch (err) {
      this.logger.error(`Failed to send budget warning email to ${to}`, err);
    }
  }

  async sendBudgetExceededEmail(params: {
    to: string;
    name: string;
    usedUsd: number;
    budgetUsd: number;
  }) {
    const appUrl = this.config.get<string>('APP_URL') || 'http://localhost:3000';
    const fromEmail =
      this.config.get<string>('SENDGRID_FROM_EMAIL') || 'no-reply@ezlearn.ai';

    const html = `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
        <h2 style="color:#ef4444">🚫 AI Budget Exceeded</h2>
        <p>Hi ${params.name},</p>
        <p>Your organization's monthly AI budget of
          <strong>$${params.budgetUsd.toFixed(2)}</strong>
          has been exceeded ($${params.usedUsd.toFixed(2)} used).</p>
        <p><strong>AI features are now paused</strong> until you
          increase your budget or the billing cycle resets.</p>
        <a href="${appUrl}/manage/settings"
           style="display:inline-block;padding:12px 24px;
                  background:#6366f1;color:white;border-radius:8px;
                  text-decoration:none;font-weight:bold;margin:16px 0">
          Increase Budget →
        </a>
      </div>
    `;

    try {
      await sgMail.send({
        to: params.to,
        from: { email: fromEmail, name: 'EZ LEARN' },
        subject: '🚫 AI features paused — budget exceeded',
        html,
      });
      this.logger.log(`Budget exceeded email sent to ${params.to}`);
    } catch (err) {
      this.logger.error(`Failed to send budget exceeded email to ${params.to}`, err);
    }
  }
}
