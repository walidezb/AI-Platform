import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';

export interface InvoiceSummary {
  id: string;
  number: string;
  status: string;
  amountDue: number;
  amountPaid: number;
  currency: string;
  periodStart: Date;
  periodEnd: Date;
  pdfUrl: string | null;
  hostedUrl: string | null;
  createdAt: Date;
}

@Injectable()
export class BillingService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly email: EmailService,
    private readonly notifs: NotificationsService,
  ) {
    const apiKey =
      this.config.get<string>('STRIPE_SECRET_KEY') || 'sk_test_mock';
    this.stripe = new Stripe(apiKey, {
      apiVersion: '2024-06-20' as Stripe.LatestApiVersion,
    });
  }

  /* ─── Create Stripe customer ─── */
  async createCustomer(
    orgId: string,
    email: string,
    name: string,
  ): Promise<Stripe.Customer> {
    const existing = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { stripeCustomerId: true },
    });

    // Idempotent: return existing customer if already created
    if (existing?.stripeCustomerId) {
      return this.stripe.customers.retrieve(
        existing.stripeCustomerId,
      ) as Promise<Stripe.Customer>;
    }

    const customer = await this.stripe.customers.create({
      email,
      name,
      metadata: { organizationId: orgId },
    });

    await this.prisma.organization.update({
      where: { id: orgId },
      data: { stripeCustomerId: customer.id },
    });

    this.logger.log(
      `Stripe customer created: ${customer.id} for org ${orgId}`,
    );
    return customer;
  }

  /* ─── Create subscription ─── */
  async createSubscription(
    orgId: string,
    planTier: 'starter' | 'growth' | 'enterprise' = 'starter',
  ): Promise<{ subscriptionId: string; clientSecret: string | null }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        users: {
          where: {
            role: 'LEARNER',
          },
          select: { id: true },
        },
      },
    });
    if (!org) throw new NotFoundException('Organization not found');
    if (!org.stripeCustomerId) {
      throw new BadRequestException(
        'Stripe customer must be created before subscription',
      );
    }

    const activeSeats = org.users.length || 1;

    const subscription = await this.stripe.subscriptions.create({
      customer: org.stripeCustomerId,
      items: [
        {
          // Metered: AI token usage (reported hourly)
          price: this.config.get<string>('STRIPE_AI_TOKEN_PRICE_ID'),
        },
        {
          // Licensed: per active seat per month
          price: this.config.get<string>('STRIPE_SEAT_PRICE_ID'),
          quantity: activeSeats,
        },
      ],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
      trial_period_days: 14,
      metadata: { organizationId: orgId, planTier },
    });

    // Store subscription info
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const subAny = subscription as any;
    const invoice = subAny.latest_invoice;
    const pi = invoice?.payment_intent;

    await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
        planTier,
        currentPeriodStart: new Date(
          (subAny.current_period_start || Math.floor(Date.now() / 1000)) * 1000,
        ),
        currentPeriodEnd: new Date(
          (subAny.current_period_end || Math.floor(Date.now() / 1000)) * 1000,
        ),
      },
    });

    this.logger.log(
      `Subscription created: ${subscription.id} for org ${orgId}`,
    );

    return {
      subscriptionId: subscription.id,
      clientSecret: pi?.client_secret ?? null,
    };
  }

  /* ─── Report AI token usage to Stripe ─── */
  async reportUsage(orgId: string): Promise<number> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        stripeSubscriptionId: true,
        stripeCustomerId: true,
      },
    });
    if (!org?.stripeSubscriptionId) return 0;

    // Find unreported usage logs
    const unreported = await this.prisma.aiUsageLog.findMany({
      where: {
        organizationId: orgId,
        reportedToStripe: false,
      },
      select: {
        id: true,
        tokensUsed: true,
        tokensInput: true,
        tokensOutput: true,
        createdAt: true,
      },
    });

    if (unreported.length === 0) return 0;

    const totalTokens = unreported.reduce(
      (sum, log) =>
        sum + (log.tokensUsed || (log.tokensInput + log.tokensOutput) || 0),
      0,
    );

    if (totalTokens === 0) return 0;

    // Find the metered subscription item
    const subscription = await this.stripe.subscriptions.retrieve(
      org.stripeSubscriptionId,
      { expand: ['items'] },
    );

    const meteredItem = subscription.items.data.find(
      (item) =>
        item.price.id === this.config.get<string>('STRIPE_AI_TOKEN_PRICE_ID'),
    );
    if (!meteredItem) {
      this.logger.warn(
        `No metered item found for subscription ${org.stripeSubscriptionId}`,
      );
      return 0;
    }

    // Report usage to Stripe (in thousands of tokens)
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const usageRecord = await (this.stripe.subscriptionItems as any).createUsageRecord(
      meteredItem.id,
      {
        quantity: Math.ceil(totalTokens / 1000),
        timestamp: Math.floor(Date.now() / 1000),
        action: 'increment',
      },
    );

    // Mark logs as reported
    await this.prisma.aiUsageLog.updateMany({
      where: { id: { in: unreported.map((l) => l.id) } },
      data: {
        reportedToStripe: true,
        reportedAt: new Date(),
        stripeUsageRecordId: usageRecord.id,
      },
    });

    this.logger.log(
      `Reported ${totalTokens.toLocaleString()} tokens ` +
        `(${Math.ceil(totalTokens / 1000)} units) ` +
        `for org ${orgId}`,
    );
    return totalTokens;
  }

  /* ─── Run usage reporting for all orgs ─── */
  async reportAllOrgsUsage(): Promise<void> {
    const orgs = await this.prisma.organization.findMany({
      where: { stripeSubscriptionId: { not: null } },
      select: { id: true, stripeSubscriptionId: true },
    });

    for (const org of orgs) {
      try {
        const reported = await this.reportUsage(org.id);
        if (reported > 0) {
          this.logger.log(
            `Org ${org.id}: reported ${reported.toLocaleString()} tokens`,
          );
        }
      } catch (err) {
        this.logger.error(
          `Failed to report usage for org ${org.id}: ${err}`,
        );
      }
    }
  }

  /* ─── Update active seat count ─── */
  async updateSeatCount(orgId: string): Promise<void> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        users: {
          where: {
            role: 'LEARNER',
          },
        },
      },
    });
    if (!org?.stripeSubscriptionId) return;

    const activeSeats = Math.max(org.users.length, 1);

    const subscription = await this.stripe.subscriptions.retrieve(
      org.stripeSubscriptionId,
      { expand: ['items'] },
    );

    const seatItem = subscription.items.data.find(
      (item) => item.price.id === this.config.get<string>('STRIPE_SEAT_PRICE_ID'),
    );
    if (!seatItem) return;

    await this.stripe.subscriptionItems.update(seatItem.id, {
      quantity: activeSeats,
    });

    this.logger.log(
      `Updated seat count to ${activeSeats} for org ${orgId}`,
    );
  }

  /* ─── Get invoices ─── */
  async getInvoices(orgId: string): Promise<InvoiceSummary[]> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { stripeCustomerId: true },
    });
    if (!org?.stripeCustomerId) return [];

    const invoices = await this.stripe.invoices.list({
      customer: org.stripeCustomerId,
      limit: 12,
    });

    return invoices.data.map((inv) => ({
      id: inv.id,
      number: inv.number ?? inv.id,
      status: inv.status ?? 'unknown',
      amountDue: inv.amount_due / 100, // cents → dollars
      amountPaid: inv.amount_paid / 100,
      currency: inv.currency.toUpperCase(),
      periodStart: new Date(inv.period_start * 1000),
      periodEnd: new Date(inv.period_end * 1000),
      pdfUrl: inv.invoice_pdf ?? null,
      hostedUrl: inv.hosted_invoice_url ?? null,
      createdAt: new Date(inv.created * 1000),
    }));
  }

  /* ─── Get Stripe Customer Portal URL ─── */
  async getPortalUrl(orgId: string, returnUrl: string): Promise<string> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { stripeCustomerId: true },
    });
    if (!org?.stripeCustomerId) {
      throw new BadRequestException('No billing account found');
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: returnUrl,
    });
    return session.url;
  }

  /* ─── Cancel subscription ─── */
  async cancelSubscription(orgId: string): Promise<void> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { stripeSubscriptionId: true },
    });
    if (!org?.stripeSubscriptionId) return;

    await this.stripe.subscriptions.update(org.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    await this.prisma.organization.update({
      where: { id: orgId },
      data: { subscriptionStatus: 'canceled' },
    });
  }

  /* ─── Handle Stripe webhooks ─── */
  async handleWebhook(payload: Buffer, signature: string): Promise<void> {
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.config.get<string>('STRIPE_WEBHOOK_SECRET')!,
      );
    } catch (err) {
      this.logger.error(`Webhook signature verification failed: ${err}`);
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`Stripe webhook: ${event.type}`);

    switch (event.type) {
      case 'customer.subscription.updated': {
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        const sub = event.data.object as any;

        await this.prisma.organization
          .updateMany({
            where: { stripeSubscriptionId: sub.id },
            data: {
              subscriptionStatus: sub.status,
              currentPeriodStart: new Date((sub.current_period_start || Math.floor(Date.now() / 1000)) * 1000),
              currentPeriodEnd: new Date((sub.current_period_end || Math.floor(Date.now() / 1000)) * 1000),
            },
          })
          .catch(() => {});

        break;
      }

      case 'customer.subscription.deleted': {
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        const sub = event.data.object as any;
        await this.prisma.organization
          .updateMany({
            where: { stripeSubscriptionId: sub.id },
            data: { subscriptionStatus: 'canceled' },
          })
          .catch(() => {});
        break;
      }

      case 'invoice.payment_succeeded': {
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        const invoice = event.data.object as any;
        const subId = invoice.subscription as string;
        if (!subId) break;

        const org = await this.prisma.organization.findFirst({
          where: { stripeSubscriptionId: subId },
          include: {
            users: {
              where: { role: { in: ['ORG_ADMIN', 'MANAGER'] } },
              select: { id: true, email: true, fullName: true },
            },
          },
        });
        if (!org) break;

        await this.prisma.organization.update({
          where: { id: org.id },
          data: { subscriptionStatus: 'active' },
        });

        // Notify admins
        for (const admin of org.users) {
          await this.notifs.create({
            userId: admin.id,
            type: 'PAYMENT_SUCCESS',
            title: '✅ Payment successful',
            message: `Invoice for $${((invoice.amount_paid || 0) / 100).toFixed(2)} has been paid.`,
            data: { invoiceId: invoice.id },
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        const invoice = event.data.object as any;
        const subId = invoice.subscription as string;
        if (!subId) break;

        const org = await this.prisma.organization.findFirst({
          where: { stripeSubscriptionId: subId },
          include: {
            users: {
              where: { role: { in: ['ORG_ADMIN', 'MANAGER'] } },
              select: { id: true, email: true, fullName: true },
            },
          },
        });
        if (!org) break;

        await this.prisma.organization.update({
          where: { id: org.id },
          data: { subscriptionStatus: 'past_due' },
        });

        // Email + in-app alert to org admins
        for (const admin of org.users) {
          await this.notifs.create({
            userId: admin.id,
            type: 'PAYMENT_FAILED',
            title: '🚨 Payment failed',
            message: `Your payment of $${((invoice.amount_due || 0) / 100).toFixed(2)} failed. Please update your billing details.`,
            data: { invoiceId: invoice.id },
          });

          await this.email.sendPaymentFailedAlert({
            to: admin.email,
            adminName: admin.fullName,
            amountDue: (invoice.amount_due || 0) / 100,
            currency: (invoice.currency || 'usd').toUpperCase(),
            portalUrl: `${this.config.get<string>('APP_URL') || 'http://localhost:3000'}/manage/billing`,
          });
        }
        break;
      }

      case 'payment_intent.succeeded': {
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        const pi = event.data.object as any;
        if (pi.metadata?.type === 'TOKEN_TOP_UP') {
          const orgId = pi.metadata.organizationId;
          const tokenAmount = parseInt(pi.metadata.tokenAmount, 10);

          if (orgId && tokenAmount) {
            await this.confirmTokenTopUp(orgId, tokenAmount);

            // Notify admins
            const admins = await this.prisma.user.findMany({
              where: { organizationId: orgId, role: 'ORG_ADMIN' },
            });
            for (const admin of admins) {
              await this.notifs.create({
                userId: admin.id,
                type: 'BUDGET_TOPUP',
                title: '✅ Token top-up confirmed',
                message: `${tokenAmount.toLocaleString()} tokens added. AI features are restored.`,
              });
            }
          }
        }
        break;
      }

      default:
        this.logger.debug(`Unhandled webhook: ${event.type}`);
    }
  }

  /* ── One-time token top-up via Stripe ── */
  async purchaseTokenTopUp(
    orgId: string,
    tokenAmount: number,
  ): Promise<{ clientSecret: string; amount: number }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { stripeCustomerId: true, name: true },
    });
    if (!org?.stripeCustomerId) {
      throw new BadRequestException(
        'No billing account set up. Complete billing setup first.',
      );
    }

    if (tokenAmount < 100_000) {
      throw new BadRequestException('Minimum top-up is 100,000 tokens');
    }

    // Price: $0.01 per 1,000 tokens (same as metered rate)
    const pricePerThousand = 0.01;
    const amountUsd =
      Math.round((tokenAmount / 1000) * pricePerThousand * 100) / 100;
    const amountCents = Math.round(amountUsd * 100);

    const pi = await this.stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      customer: org.stripeCustomerId,
      description: `Token top-up: ${tokenAmount.toLocaleString()} tokens for ${org.name}`,
      metadata: {
        type: 'TOKEN_TOP_UP',
        organizationId: orgId,
        tokenAmount: String(tokenAmount),
      },
      automatic_payment_methods: { enabled: true },
    });

    this.logger.log(
      `Token top-up initiated: ${tokenAmount.toLocaleString()} tokens = $${amountUsd} for org ${orgId}`,
    );

    return { clientSecret: pi.client_secret!, amount: amountUsd };
  }

  /* ── Confirm top-up after payment (called by webhook) ── */
  async confirmTokenTopUp(
    orgId: string,
    tokenAmount: number,
  ): Promise<void> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { aiTokensBudget: true },
    });
    const currentBudget = Number(org?.aiTokensBudget ?? 1_000_000);
    const newBudget = currentBudget + tokenAmount;

    await this.prisma.organization.update({
      where: { id: orgId },
      data: { aiTokensBudget: BigInt(newBudget) },
    });

    this.logger.log(
      `Top-up confirmed: +${tokenAmount.toLocaleString()} tokens for org ${orgId}. New budget: ${newBudget.toLocaleString()}`,
    );
  }
}
