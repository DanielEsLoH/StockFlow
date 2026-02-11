import { handleUpload } from './handlers/upload';
import { handleServe } from './handlers/serve';
import { handleDelete } from './handlers/delete';
import { handlePreflight, getCorsHeaders } from './utils/cors';
import { errorResponse } from './utils/response';

interface Env {
  IMAGES_BUCKET: R2Bucket;
  AUTH_SECRET: string;
}

const API_PREFIX = '/api/images';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return handlePreflight(request);
    }

    // POST /api/images/upload
    if (method === 'POST' && pathname === `${API_PREFIX}/upload`) {
      return handleUpload(request, env);
    }

    // Routes with key parameter: /api/images/{key...}
    if (pathname.startsWith(`${API_PREFIX}/`) && pathname !== `${API_PREFIX}/upload`) {
      const key = pathname.slice(API_PREFIX.length + 1);

      if (!key) {
        return errorResponse('Image key is required', 400, getCorsHeaders(request));
      }

      if (method === 'GET') {
        return handleServe(request, env, key);
      }

      if (method === 'DELETE') {
        return handleDelete(request, env, key);
      }
    }

    return errorResponse('Not found', 404, getCorsHeaders(request));
  },
} satisfies ExportedHandler<Env>;
