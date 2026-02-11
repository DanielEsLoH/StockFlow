export function jsonResponse(
  data: unknown,
  status: number,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

export function errorResponse(
  message: string,
  status: number,
  corsHeaders: Record<string, string>,
): Response {
  return jsonResponse({ error: message }, status, corsHeaders);
}
