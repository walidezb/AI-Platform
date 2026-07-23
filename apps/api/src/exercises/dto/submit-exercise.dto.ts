import { IsString, MinLength, MaxLength } from 'class-validator';
import { Sanitize } from '../../common/sanitize.decorator';

export class SubmitExerciseDto {
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  @Sanitize()
  submissionText: string;
}
