import { IsString, MinLength, MaxLength } from 'class-validator';
import { Sanitize } from '../../common/sanitize.decorator';

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  @Sanitize()
  message: string;
}
