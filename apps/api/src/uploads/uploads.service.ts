import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuid } from 'uuid';

@Injectable()
export class UploadsService {
  private s3: S3Client;

  constructor(private config: ConfigService) {
    this.s3 = new S3Client({
      region: config.get<string>('AWS_REGION') || 'us-east-1',
      credentials: {
        accessKeyId: config.get<string>('AWS_ACCESS_KEY_ID') || 'mock',
        secretAccessKey: config.get<string>('AWS_SECRET_ACCESS_KEY') || 'mock',
      },
    });
  }

  /**
   * Generate a presigned PUT URL.
   * The browser uploads directly to S3 using this URL.
   * Expires in 5 minutes.
   */
  async getLogoPresignedUrl(
    organizationId: string,
    fileExtension: string, // e.g. "png", "jpg", "webp"
    contentType: string, // e.g. "image/png"
  ): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
    // Validate file type
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (!allowed.includes(contentType)) {
      throw new BadRequestException(
        'Only PNG, JPEG, WebP, and SVG files are allowed',
      );
    }

    const bucket = this.config.get<string>('AWS_S3_BUCKET') || 'org-logos-bucket';
    const prefix = this.config.get<string>('S3_LOGO_PREFIX') || 'org-logos/';
    const key = `${prefix}${organizationId}/${uuid()}.${fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3, command, {
      expiresIn: 300, // 5 minutes
    });

    const region = this.config.get<string>('AWS_REGION') || 'us-east-1';
    const publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

    return { uploadUrl, publicUrl, key };
  }
}
