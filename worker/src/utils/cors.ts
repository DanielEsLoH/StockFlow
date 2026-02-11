const ALLOWED_ORIGINS = [
  'https://stockflow.com.co',
  'https://www.stockflow.com.co',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost',
];

export function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Storage-Key',
    'Access-Control-Max-Age': '86400',
  };
}

export function handlePreflight(request: Request): Response {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}
