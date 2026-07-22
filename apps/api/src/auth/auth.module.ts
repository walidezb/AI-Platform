import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { ClerkGuard } from './clerk.guard';
import { RolesGuard } from './roles.guard';
import { ProgressModule } from '../progress/progress.module';

@Module({
  imports: [ProgressModule],
  controllers: [AuthController],
  providers: [ClerkGuard, RolesGuard],
  exports: [ClerkGuard, RolesGuard],
})
export class AuthModule {}
