import { Module } from '@nestjs/common';
import { TestSeedController } from './test-seed.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TestSeedController],
})
export class TestSeedModule {}
