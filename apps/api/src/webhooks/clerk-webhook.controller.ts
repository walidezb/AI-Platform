import {
  Controller,
  Post,
  Headers,
  RawBodyRequest,
  Req,
  HttpCode,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Webhook } from 'svix';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../auth/decorators/public.decorator';

type ClerkUserEvent = {
  type: 'user.created' | 'user.updated' | 'user.deleted';
  data: {
    id: string; // Clerk user ID
    email_addresses: Array<{ email_address: string; id: string }>;
    first_name: string | null;
    last_name: string | null;
    image_url: string | null;
    public_metadata: { role?: string; organizationId?: string };
    deleted?: boolean;
  };
};

@Controller('webhooks')
export class ClerkWebhookController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('clerk')
  @SkipThrottle()
  @HttpCode(200)
  async handleClerkWebhook(
    @Headers('svix-id') svixId: string,
    @Headers('svix-timestamp') svixTimestamp: string,
    @Headers('svix-signature') svixSignature: string,
    @Req() req: any,
  ) {
    const webhookSecret = this.config.get<string>('CLERK_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new ForbiddenException('Webhook secret not configured');
    }

    if (!req.rawBody) {
      throw new ForbiddenException('Raw body is required for signature verification');
    }

    const wh = new Webhook(webhookSecret);
    let event: ClerkUserEvent;

    try {
      event = wh.verify(req.rawBody.toString('utf8'), {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }) as ClerkUserEvent;
    } catch {
      throw new ForbiddenException('Invalid webhook signature');
    }

    const { type, data } = event;
    const primaryEmail = data.email_addresses?.[0]?.email_address;
    const fullName =
      [data.first_name, data.last_name].filter(Boolean).join(' ') ||
      primaryEmail;

    switch (type) {
      case 'user.created': {
        const existing = await this.prisma.user.findUnique({
          where: { clerkId: data.id },
        });

        if (!existing && primaryEmail) {
          const invited = await this.prisma.user.findUnique({
            where: { email: primaryEmail },
          });

          if (invited) {
            await this.prisma.user.update({
              where: { id: invited.id },
              data: {
                clerkId: data.id,
                avatarUrl: data.image_url ?? undefined,
                fullName: invited.fullName || fullName,
              },
            });
          }
        }
        break;
      }

      case 'user.updated': {
        await this.prisma.user.updateMany({
          where: { clerkId: data.id },
          data: {
            avatarUrl: data.image_url ?? undefined,
            fullName: fullName || undefined,
          },
        });
        break;
      }

      case 'user.deleted': {
        await this.prisma.user.updateMany({
          where: { clerkId: data.id },
          data: { deletedAt: new Date() },
        });
        break;
      }
    }

    return { received: true, type };
  }
}
