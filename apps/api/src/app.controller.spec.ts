import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { QueueService } from './queues/queue.service';
import { QUEUE_NAMES } from './queues/queue.constants';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: getQueueToken(QUEUE_NAMES.ASSESSMENT),
          useValue: { client: { ping: jest.fn().mockResolvedValue('PONG') } },
        },
        {
          provide: QueueService,
          useValue: {},
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
