import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CloudflareStorageService {
  private readonly logger = new Logger(CloudflareStorageService.name);
  private readonly workerUrl: string;
  private readonly authSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.workerUrl = this.configService.getOrThrow<string>('CF_WORKER_URL');
    this.authSecret = this.configService.getOrThrow<string>('CF_AUTH_SECRET');

    this.logger.log(
      `Cloudflare Workers storage initialized: ${this.workerUrl}`,
    );
  }

  async upload(
    key: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    const blob = new Blob([new Uint8Array(buffer)], { type: contentType });
    const formData = new FormData();
    formData.append('file', blob, key.split('/').pop() || 'file');

    const response = await fetch(`${this.workerUrl}/api/images/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.authSecret}`,
        'X-Storage-Key': key,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Upload failed for key ${key}: ${error}`);
      throw new InternalServerErrorException(
        `Failed to upload image: ${response.status}`,
      );
    }

    const data = (await response.json()) as { url: string; key: string };

    this.logger.log(`Uploaded: ${key}`);
    return data.url;
  }

  async delete(key: string): Promise<void> {
    const response = await fetch(
      `${this.workerUrl}/api/images/${key}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${this.authSecret}`,
        },
      },
    );

    if (response.status === 404) {
      this.logger.warn(`Image not found for deletion: ${key}`);
      return;
    }

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Delete failed for key ${key}: ${error}`);
      throw new InternalServerErrorException(
        `Failed to delete image: ${response.status}`,
      );
    }

    this.logger.log(`Deleted: ${key}`);
  }

  getPublicUrl(key: string): string {
    return `${this.workerUrl}/api/images/${key}`;
  }

  extractKeyFromUrl(url: string): string | null {
    const prefix = `${this.workerUrl}/api/images/`;
    if (!url.startsWith(prefix)) {
      return null;
    }
    return url.slice(prefix.length);
  }
}
