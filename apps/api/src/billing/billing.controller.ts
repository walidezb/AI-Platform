import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Headers,
  Req,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { BillingService } from './billing.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '@prisma/client';
import { ClerkGuard } from '../auth/clerk.guard';
import { RolesGuard } from '../auth/roles.guard';

@Controller('billing')
export class BillingController {
  constructor(
    private readonly service: BillingService,
    private readonly config: ConfigService,
  ) {}

  /* Create customer + subscription */
  @Post('setup')
  @UseGuards(ClerkGuard, RolesGuard)
  @Roles('ORG_ADMIN')
  async setup(
    @CurrentUser() user: User,
    @Body() body: { planTier?: 'starter' | 'growth' | 'enterprise' },
  ) {
    // 1. Ensure customer exists
    await this.service.createCustomer(
      user.organizationId,
      user.email,
      user.fullName,
    );
    // 2. Create subscription
    const result = await this.service.createSubscription(
      user.organizationId,
      body.planTier ?? 'starter',
    );
    return { success: true, data: result };
  }

  /* List invoices */
  @Get('invoices')
  @UseGuards(ClerkGuard, RolesGuard)
  @Roles('ORG_ADMIN')
  async getInvoices(@CurrentUser() user: User) {
    const data = await this.service.getInvoices(user.organizationId);
    return { success: true, data };
  }

  /* Stripe Customer Portal redirect */
  @Get('portal')
  @UseGuards(ClerkGuard, RolesGuard)
  @Roles('ORG_ADMIN')
  async getPortal(@CurrentUser() user: User) {
    const returnUrl = `${this.config.get<string>('APP_URL') || 'http://localhost:3000'}/manage/billing`;
    const url = await this.service.getPortalUrl(
      user.organizationId,
      returnUrl,
    );
    return { success: true, data: { url } };
  }

  /* Cancel subscription */
  @Delete('subscription')
  @UseGuards(ClerkGuard, RolesGuard)
  @Roles('ORG_ADMIN')
  async cancel(@CurrentUser() user: User) {
    await this.service.cancelSubscription(user.organizationId);
    return { success: true, message: 'Subscription will cancel at period end' };
  }

  /* One-time token top-up */
  @Post('increase-budget')
  @UseGuards(ClerkGuard, RolesGuard)
  @Roles('ORG_ADMIN')
  async increaseBudget(
    @CurrentUser() user: User,
    @Body() body: { tokenAmount: number },
  ) {
    const data = await this.service.purchaseTokenTopUp(
      user.organizationId,
      body.tokenAmount,
    );
    return { success: true, data };
  }

  /* Stripe webhook — NO AUTH, raw body, verify signature */
  @Post('webhook')
  @HttpCode(200)
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  async webhook(@Headers('stripe-signature') sig: string, @Req() req: any) {
    const rawBody = req.rawBody || req.body;
    await this.service.handleWebhook(rawBody, sig);
    return { received: true };
  }
}
