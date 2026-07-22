import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMailModule from '@sendgrid/mail';
const sgMail = (sgMailModule as any).default || sgMailModule;

export interface StalledLearnerEmailItem {
  fullName: string;
  department: string | null;
  daysSinceActive: number | null;
  completionPct: number;
  pathTitle: string;
}

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

  /* ── Manager digest: stalled employees ── */
  async sendStalledManagerAlert(params: {
    to: string;
    managerName: string;
    stalled: StalledLearnerEmailItem[];
    dashboardUrl: string;
  }): Promise<void> {
    const { to, managerName, stalled, dashboardUrl } = params;
    const fromEmail =
      this.config.get<string>('SENDGRID_FROM_EMAIL') || 'no-reply@ezlearn.ai';
    const appUrl = this.config.get<string>('APP_URL') || 'http://localhost:3000';

    const rows = stalled
      .map(
        (s) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #1e293b;
                 font-size:14px;color:#e2e8f0">
        ${s.fullName}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #1e293b;
                 font-size:14px;color:#94a3b8">
        ${s.department ?? '—'}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #1e293b;
                 font-size:14px;color:#f59e0b;text-align:center">
        ${s.daysSinceActive !== null ? `${s.daysSinceActive}d` : 'Never'}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #1e293b;
                 font-size:14px;color:#94a3b8;text-align:center">
        ${Math.round(s.completionPct)}%
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #1e293b;
                 font-size:13px;color:#94a3b8">
        ${s.pathTitle}
      </td>
    </tr>
  `,
      )
      .join('');

    const html = `
      <div style="font-family:'Inter',sans-serif;max-width:600px;
                  margin:0 auto;background:#0f0f1a;color:#e2e8f0;
                  border-radius:12px;overflow:hidden">

        <!-- Header -->
        <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);
                    padding:28px 32px">
          <div style="font-size:22px;font-weight:700;color:white">
            ⚠️ Stalled Learners Alert
          </div>
          <div style="font-size:14px;color:rgba(255,255,255,0.8);margin-top:6px">
            ${stalled.length} employee${stalled.length > 1 ? 's have' : ' has'} been inactive
          </div>
        </div>

        <!-- Body -->
        <div style="padding:28px 32px">
          <p style="margin:0 0 20px;font-size:15px;color:#94a3b8">
            Hi ${managerName},
          </p>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6">
            The following employees haven't made learning progress recently.
            A quick check-in can make a big difference! 💪
          </p>

          <!-- Table -->
          <table style="width:100%;border-collapse:collapse;
                        background:#1a1a2e;border-radius:8px;
                        overflow:hidden">
            <thead>
              <tr style="background:#0f172a">
                <th style="padding:10px 12px;text-align:left;
                           font-size:11px;color:#6b7280;
                           text-transform:uppercase;letter-spacing:0.05em">
                  Employee
                </th>
                <th style="padding:10px 12px;text-align:left;
                           font-size:11px;color:#6b7280;
                           text-transform:uppercase;letter-spacing:0.05em">
                  Dept
                </th>
                <th style="padding:10px 12px;text-align:center;
                           font-size:11px;color:#6b7280;
                           text-transform:uppercase;letter-spacing:0.05em">
                  Days Inactive
                </th>
                <th style="padding:10px 12px;text-align:center;
                           font-size:11px;color:#6b7280;
                           text-transform:uppercase;letter-spacing:0.05em">
                  Progress
                </th>
                <th style="padding:10px 12px;text-align:left;
                           font-size:11px;color:#6b7280;
                           text-transform:uppercase;letter-spacing:0.05em">
                  Path
                </th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>

          <!-- CTA -->
          <div style="text-align:center;margin-top:28px">
            <a href="${dashboardUrl}"
               style="display:inline-block;padding:14px 32px;
                      background:linear-gradient(135deg,#6366f1,#8b5cf6);
                      color:white;text-decoration:none;border-radius:8px;
                      font-weight:600;font-size:15px">
              View Team Dashboard →
            </a>
          </div>

          <p style="margin-top:24px;font-size:12px;color:#475569;
                    text-align:center">
            Nudge emails have also been sent to these employees automatically.
            To adjust alert settings, visit your
            <a href="${appUrl}/manage/settings"
               style="color:#6366f1">
              org settings
            </a>.
          </p>
        </div>
      </div>
    `;

    try {
      await sgMail.send({
        to,
        from: { email: fromEmail, name: 'EZ LEARN' },
        subject: `⚠️ ${stalled.length} learner${stalled.length > 1 ? 's' : ''} inactive — action needed`,
        html,
      });
      this.logger.log(`Stalled manager alert email sent to ${to}`);
    } catch (err) {
      this.logger.error(`Failed to send stalled manager alert email to ${to}`, err);
    }
  }

  /* ── Individual employee nudge ── */
  async sendLearnerNudge(params: {
    to: string;
    employeeName: string;
    pathTitle: string;
    completionPct: number;
    resumeUrl: string;
    triggeredBy: 'SCHEDULED' | 'MANUAL';
  }): Promise<void> {
    const {
      to,
      employeeName,
      pathTitle,
      completionPct,
      resumeUrl,
      triggeredBy,
    } = params;

    const firstName = employeeName.split(' ')[0];
    const barWidth = Math.round(completionPct);
    const fromEmail =
      this.config.get<string>('SENDGRID_FROM_EMAIL') || 'no-reply@ezlearn.ai';

    const html = `
      <div style="font-family:'Inter',sans-serif;max-width:520px;
                  margin:0 auto;background:#0f0f1a;color:#e2e8f0;
                  border-radius:12px;overflow:hidden">

        <!-- Header -->
        <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);
                    padding:32px;text-align:center">
          <div style="font-size:48px">👋</div>
          <div style="font-size:22px;font-weight:700;color:white;
                      margin-top:12px">
            We miss you, ${firstName}!
          </div>
        </div>

        <!-- Body -->
        <div style="padding:32px">
          <p style="font-size:15px;line-height:1.7;color:#94a3b8;
                    margin:0 0 20px">
            Your learning journey is waiting for you. You've made great
            progress — don't let it go to waste! 🚀
          </p>

          <!-- Progress card -->
          <div style="background:#1a1a2e;border-radius:10px;
                      padding:20px;margin-bottom:24px">
            <div style="font-size:13px;color:#6b7280;margin-bottom:4px">
              Your current path
            </div>
            <div style="font-size:16px;font-weight:600;margin-bottom:14px">
              ${pathTitle}
            </div>

            <!-- Progress bar -->
            <div style="display:flex;align-items:center;gap:12px">
              <div style="flex:1;height:8px;background:#0f172a;
                          border-radius:4px;overflow:hidden">
                <div style="height:100%;width:${barWidth}%;
                            background:linear-gradient(90deg,#6366f1,#8b5cf6);
                            border-radius:4px">
                </div>
              </div>
              <div style="font-size:14px;font-weight:700;
                          color:#6366f1;min-width:36px;text-align:right">
                ${barWidth}%
              </div>
            </div>
            <div style="font-size:12px;color:#475569;margin-top:6px">
              ${
                barWidth < 25
                  ? "You're just getting started — the first milestone is the hardest!"
                  : barWidth < 50
                  ? "You're making great progress — keep the momentum going!"
                  : barWidth < 75
                  ? "You're more than halfway there — the finish line is in sight!"
                  : "You're almost done — one final push!"
              }
            </div>
          </div>

          <!-- CTA -->
          <div style="text-align:center">
            <a href="${resumeUrl}"
               style="display:inline-block;padding:16px 40px;
                      background:linear-gradient(135deg,#6366f1,#8b5cf6);
                      color:white;text-decoration:none;border-radius:10px;
                      font-weight:700;font-size:16px">
              Continue Learning →
            </a>
          </div>

          <!-- Motivational tip -->
          <div style="margin-top:28px;padding:16px;background:#1e293b;
                      border-radius:8px;border-left:3px solid #6366f1">
            <div style="font-size:12px;color:#6366f1;font-weight:600;
                        margin-bottom:4px">
              💡 TIP
            </div>
            <div style="font-size:13px;color:#94a3b8;line-height:1.5">
              Even 15 minutes a day adds up fast. Try one module right now
              and build that streak! 🔥
            </div>
          </div>

          <p style="margin-top:20px;font-size:11px;color:#334155;
                    text-align:center">
            This reminder was sent by your organization's learning platform.
            ${
              triggeredBy === 'MANUAL'
                ? 'Your manager sent this nudge.'
                : 'Automated daily check-in.'
            }
          </p>
        </div>
      </div>
    `;

    try {
      await sgMail.send({
        to,
        from: { email: fromEmail, name: 'EZ LEARN' },
        subject: `Hey ${firstName}, your learning journey is waiting! 👋`,
        html,
      });
      this.logger.log(`Nudge email sent to ${to}`);
    } catch (err) {
      this.logger.error(`Failed to send nudge email to ${to}`, err);
    }
  }
}
