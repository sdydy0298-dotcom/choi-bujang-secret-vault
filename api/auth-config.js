const JSON_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
};

export default function handler(request, response) {
  for (const [name, value] of Object.entries(JSON_HEADERS)) response.setHeader(name, value);

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const url = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    return response.status(503).json({ error: 'AUTH_CONFIG_NOT_CONFIGURED' });
  }

  return response.status(200).json({ url, publishableKey });
}
