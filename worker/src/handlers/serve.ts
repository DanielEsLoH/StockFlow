import { getCorsHeaders } from '../utils/cors';
import { errorResponse } from '../utils/response';

interface Env {
  IMAGES_BUCKET: R2Bucket;
}

export async function handleServe(request: Request, env: Env, key: string): Promise<Response> {
  const cors = getCorsHeaders(request);

  const object = await env.IMAGES_BUCKET.get(key);

  if (!object) {
    return errorResponse('Image not found', 404, cors);
  }

  const contentType = object.httpMetadata?.contentType || 'application/octet-stream';

  return new Response(object.body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      ...cors,
    },
  });
}
