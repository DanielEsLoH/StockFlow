import { ApiProperty } from '@nestjs/swagger';

/**
 * Upload response entity for single file upload
 */
export class UploadResponseEntity {
  @ApiProperty({
    description: 'URL path to the uploaded file',
    example: '/uploads/products/product-1234567890-987654321.jpg',
  })
  url: string;
}

/**
 * Upload response entity for multiple file uploads
 */
export class MultiUploadResponseEntity {
  @ApiProperty({
    description: 'Array of URL paths to the uploaded files',
    example: [
      '/uploads/products/product-1.jpg',
      '/uploads/products/product-2.jpg',
    ],
  })
  urls: string[];
}
