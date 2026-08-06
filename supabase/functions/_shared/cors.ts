export function corsHeaders(request: Request, appBaseUrl: string): HeadersInit | null {
  const allowedOrigin = new URL(appBaseUrl).origin
  const origin = request.headers.get('origin')
  if (origin && origin !== allowedOrigin) return null
  return {
    'Access-Control-Allow-Origin': origin ?? allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin'
  }
}
