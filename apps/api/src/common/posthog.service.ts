import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PostHog } from 'posthog-node';

@Injectable()
export class PostHogService implements OnModuleDestroy {
  private readonly client: PostHog | null;

  constructor(private readonly config: ConfigService) {
    const key = config.get<string>('POSTHOG_API_KEY');
    this.client = key
      ? new PostHog(key, {
          host: config.get('POSTHOG_HOST', 'https://app.posthog.com'),
          flushAt: 20,
          flushInterval: 10_000,
        })
      : null;
  }

  capture(event: {
    distinctId: string;
    event: string;
    properties: Record<string, unknown>;
  }): void {
    if (!this.client) return;
    this.client.capture(event);
  }

  async onModuleDestroy() {
    await this.client?.shutdown();
  }
}
