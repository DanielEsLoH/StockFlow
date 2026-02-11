import { getCorsHeaders } from '../utils/cors';
import { validateAuth } from '../utils/auth';
import { jsonResponse, errorResponse } from '../utils/response';

interface Env {
  IMAGES_BUCKET: R2Bucket;
  AUTH_SECRET: string;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function handleUpload(request: Request, env: Env): Promise<Response> {
  const cors = getCorsHeaders(request);

  if (!validateAuth(request, env.AUTH_SECRET)) {
    return errorResponse('Unauthorized', 401, cors);
  }

  const contentType = request.headers.get('Content-Type') || '';
  if (!contentType.includes('multipart/form-data')) {
    return errorResponse('Content-Type must be multipart/form-data', 400, cors);
  }

  const formData = await request.formData();
  const file = formData.get('file');

  if (!file || !(file instanceof File)) {
    return errorResponse('No file provided', 400, cors);
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return errorResponse(
      `Invalid file type: ${file.type}. Allowed: ${ALLOWED_TYPES.join(', ')}`,
      400,
      cors,
    );
  }

  if (file.size > MAX_SIZE) {
    return errorResponse(
      `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Max: 5MB`,
      400,
      cors,
    );
  }

  // Use the storage key from the header (set by NestJS backend)
  // Format: products/{tenantId}/{filename} or avatars/{tenantId}/{userId}/{filename}
  const storageKey = request.headers.get('X-Storage-Key');
  if (!storageKey) {
    return errorResponse('X-Storage-Key header is required', 400, cors);
  }

  const buffer = await file.arrayBuffer();

  await env.IMAGES_BUCKET.put(storageKey, buffer, {
    httpMetadata: { contentType: file.type },
    customMetadata: {
      size: String(file.size),
      originalName: file.name,
      uploadedAt: new Date().toISOString(),
    },
  });

  const url = new URL(request.url);
  const publicUrl = `${url.origin}/api/images/${storageKey}`;

  return jsonResponse({ url: publicUrl, key: storageKey }, 201, cors);
}
