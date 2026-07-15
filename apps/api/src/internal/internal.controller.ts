import { Controller, Post, Param, Body } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { SkipThrottle } from '@nestjs/throttler';

@SkipThrottle()
@Controller('internal')
export class InternalController {
  @Public()
  @Post('assessments/:id/complete')
  async completeAssessment(@Param('id') id: string, @Body() body: any) {
    return { success: true, message: `Assessment ${id} completed`, data: body };
  }

  @Public()
  @Post('paths/create')
  async createPath(@Body() body: any) {
    return { success: true, message: 'Path generated', data: body };
  }

  @Public()
  @Post('usage/log')
  async logUsage(@Body() body: any) {
    return { success: true, message: 'Usage logged', data: body };
  }
}
