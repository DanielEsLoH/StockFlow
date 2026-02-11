export function validateAuth(request: Request, authSecret: string): boolean {
  const header = request.headers.get('Authorization');
  if (!header) return false;

  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token === authSecret;
}
