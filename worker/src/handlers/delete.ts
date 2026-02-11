import { getCorsHeaders } from '../utils/cors';
import { validateAuth } from '../utils/auth';
import { errorResponse } from '../utils/response';

interface Env {
  IMAGES_BUCKET: R2Bucket;
  AUTH_SECRET: string;
}

export async function handleDelete(request: Request, env: Env, key: string): Promise<Response> {
  const cors = getCorsHeaders(request);

  if (!validateAuth(request, env.AUTH_SECRET)) {
    return errorResponse('Unauthorized', 401, cors);
  }

  await env.IMAGES_BUCKET.delete(key);

  return new Response(null, {
    status: 204,
    headers: cors,
  });
}
