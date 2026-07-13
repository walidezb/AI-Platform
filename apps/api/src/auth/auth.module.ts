import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { ClerkGuard } from './clerk.guard';
import { RolesGuard } from './roles.guard';

@Module({
  controllers: [AuthController],
  providers: [ClerkGuard, RolesGuard],
  exports: [ClerkGuard, RolesGuard],
})
export class AuthModule {}
