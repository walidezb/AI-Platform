import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { BillingService } from '../billing.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import { NotificationsService } from '../../notifications/notifications.service';

describe('BillingService', () => {
  let service: BillingService;
  let prisma: any;
  let config: any;
  let email: any;
  let notifs: any;

  const mockOrg = {
    id: 'org-123',
    name: 'Acme Corp',
    stripeCustomerId: 'cus_123',
    stripeSubscriptionId: 'sub_123',
    users: [{ id: 'user-1', role: 'LEARNER' }],
  };

  beforeEach(async () => {
    prisma = {
      organization: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      aiUsageLog: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    config = {
      get: jest.fn((key: string) => {
        const map: Record<string, string> = {
          STRIPE_SECRET_KEY: 'sk_test_mock',
          STRIPE_WEBHOOK_SECRET: 'whsec_mock',
          STRIPE_AI_TOKEN_PRICE_ID: 'price_token_123',
          STRIPE_SEAT_PRICE_ID: 'price_seat_123',
          APP_URL: 'http://localhost:3000',
        };
        return map[key];
      }),
    };

    email = {
      sendPaymentFailedAlert: jest.fn().mockResolvedValue(undefined),
    };

    notifs = {
      create: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: config },
        { provide: EmailService, useValue: email },
        { provide: NotificationsService, useValue: notifs },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);

    // Mock internal stripe SDK calls
    (service as any).stripe = {
      customers: {
        retrieve: jest.fn().mockResolvedValue({ id: 'cus_123', email: 'test@acme.com' }),
        create: jest.fn().mockResolvedValue({ id: 'cus_new', email: 'test@acme.com' }),
      },
      subscriptions: {
        create: jest.fn().mockResolvedValue({
          id: 'sub_new',
          status: 'trialing',
          current_period_start: 1700000000,
          current_period_end: 1702500000,
          latest_invoice: {
            payment_intent: { client_secret: 'pi_secret_123' },
          },
        }),
        retrieve: jest.fn().mockResolvedValue({
          id: 'sub_123',
          items: {
            data: [
              { id: 'si_token', price: { id: 'price_token_123' } },
              { id: 'si_seat', price: { id: 'price_seat_123' } },
            ],
          },
        }),
        update: jest.fn().mockResolvedValue({ id: 'sub_123', cancel_at_period_end: true }),
      },
      subscriptionItems: {
        createUsageRecord: jest.fn().mockResolvedValue({ id: 'ur_123' }),
        update: jest.fn().mockResolvedValue({ id: 'si_seat', quantity: 5 }),
      },
      invoices: {
        list: jest.fn().mockResolvedValue({
          data: [
            {
              id: 'in_123',
              number: 'INV-001',
              status: 'paid',
              amount_due: 1000,
              amount_paid: 1000,
              currency: 'usd',
              period_start: 1700000000,
              period_end: 1702500000,
              invoice_pdf: 'http://pdf.com',
              hosted_invoice_url: 'http://hosted.com',
              created: 1700000000,
            },
          ],
        }),
      },
      billingPortal: {
        sessions: {
          create: jest.fn().mockResolvedValue({ url: 'http://portal.stripe.com' }),
        },
      },
      webhooks: {
        constructEvent: jest.fn(),
      },
    };
  });

  describe('createCustomer', () => {
    it('should return existing customer if stripeCustomerId already exists', async () => {
      prisma.organization.findUnique.mockResolvedValue(mockOrg);

      const result = await service.createCustomer('org-123', 'admin@acme.com', 'Acme Corp');

      expect(prisma.organization.findUnique).toHaveBeenCalledWith({
        where: { id: 'org-123' },
        select: { stripeCustomerId: true },
      });
      expect(result.id).toBe('cus_123');
    });

    it('should create new Stripe customer and update DB if customer does not exist', async () => {
      prisma.organization.findUnique.mockResolvedValue({ stripeCustomerId: null });
      prisma.organization.update.mockResolvedValue({ id: 'org-123' });

      const result = await service.createCustomer('org-123', 'admin@acme.com', 'Acme Corp');

      expect((service as any).stripe.customers.create).toHaveBeenCalledWith({
        email: 'admin@acme.com',
        name: 'Acme Corp',
        metadata: { organizationId: 'org-123' },
      });
      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-123' },
        data: { stripeCustomerId: 'cus_new' },
      });
      expect(result.id).toBe('cus_new');
    });
  });

  describe('createSubscription', () => {
    it('should throw NotFoundException if organization does not exist', async () => {
      prisma.organization.findUnique.mockResolvedValue(null);
      await expect(service.createSubscription('org-404')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if stripeCustomerId is missing', async () => {
      prisma.organization.findUnique.mockResolvedValue({ ...mockOrg, stripeCustomerId: null });
      await expect(service.createSubscription('org-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create subscription and update organization DB', async () => {
      prisma.organization.findUnique.mockResolvedValue(mockOrg);
      prisma.organization.update.mockResolvedValue(mockOrg);

      const res = await service.createSubscription('org-123', 'starter');

      expect(res.subscriptionId).toBe('sub_new');
      expect(res.clientSecret).toBe('pi_secret_123');
      expect(prisma.organization.update).toHaveBeenCalled();
    });
  });

  describe('reportUsage', () => {
    it('should return 0 if organization has no subscriptionId', async () => {
      prisma.organization.findUnique.mockResolvedValue({ stripeSubscriptionId: null });
      const reported = await service.reportUsage('org-123');
      expect(reported).toBe(0);
    });

    it('should report sum of unreported tokens to Stripe', async () => {
      prisma.organization.findUnique.mockResolvedValue(mockOrg);
      prisma.aiUsageLog.findMany.mockResolvedValue([
        { id: 'log-1', tokensUsed: 5000, tokensInput: 0, tokensOutput: 0 },
        { id: 'log-2', tokensUsed: 15000, tokensInput: 0, tokensOutput: 0 },
      ]);

      const reported = await service.reportUsage('org-123');

      expect(reported).toBe(20000);
      expect(
        (service as any).stripe.subscriptionItems.createUsageRecord,
      ).toHaveBeenCalledWith('si_token', {
        quantity: 20,
        timestamp: expect.any(Number),
        action: 'increment',
      });
      expect(prisma.aiUsageLog.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['log-1', 'log-2'] } },
        data: {
          reportedToStripe: true,
          reportedAt: expect.any(Date),
          stripeUsageRecordId: 'ur_123',
        },
      });
    });
  });

  describe('getInvoices', () => {
    it('should return formatted invoices from Stripe', async () => {
      prisma.organization.findUnique.mockResolvedValue(mockOrg);
      const invoices = await service.getInvoices('org-123');

      expect(invoices.length).toBe(1);
      expect(invoices[0].id).toBe('in_123');
      expect(invoices[0].amountDue).toBe(10); // $10.00
    });
  });

  describe('getPortalUrl', () => {
    it('should return portal url session', async () => {
      prisma.organization.findUnique.mockResolvedValue(mockOrg);
      const url = await service.getPortalUrl('org-123', 'http://localhost:3000/manage/billing');

      expect(url).toBe('http://portal.stripe.com');
    });
  });
});
