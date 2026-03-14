// ============ Type Definitions ============
import meta from "../metadata.json"
export interface Env {
  DB: any;
  API_KEY?: string;
}

// ============ Utility Functions ============

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
};

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: CORS_HEADERS });
}

function handleOptions(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

// In-memory storage (use during development, switch to D1 in production)
const messages: { id: number; content: string; created_at: string }[] = [];
let messageId = 0;

// ============ Route Handlers ============

async function handleHello(env: Env): Promise<Response> {
    // If D1 database exists, use database
  if (env.DB) {
    const { results } = await env.DB
      .prepare('SELECT * FROM messages ORDER BY created_at DESC LIMIT 10')
      .all();
    return json({ message: 'Hello from Worker!', data: results, source: 'd1' });
  }
    // Otherwise use in-memory storage
  return json({ 
    message: 'Hello from Worker!', 
    data: messages.slice(-10).reverse(),
    source: 'memory' 
  });
}

async function handleAddMessage(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as { message?: string };
  const message = (body.message ?? '').trim().slice(0, 500);
  if (!message) return json({ error: 'message is required' }, 400);

    // If D1 database exists, use database
  if (env.DB) {
    const result = await env.DB
      .prepare('INSERT INTO messages (content) VALUES (?) RETURNING *')
      .bind(message)
      .first();
    return json(result, 201);
  }

    // Otherwise use in-memory storage
  const newMessage = {
    id: ++messageId,
    content: message,
    created_at: new Date().toISOString(),
  };
  messages.push(newMessage);
  return json(newMessage, 201);
}

// ============ Demo API ============

async function handleGetRootDomain(): Promise<Response> {
  try {
    const response = await fetch('https://pinme.dev/api/v4/root_domain', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    return json(data);
  } catch (error) {
    return json({ error: 'Failed to fetch root domain' }, 500);
  }
}

// ============ Send Email API ============

async function handleSendEmail(request: Request): Promise<Response> {
  const apiKey = meta.api_key;
  if (!apiKey) {
    return json({ error: 'API_KEY not configured' }, 500);
  }
  console.log(apiKey,"api-key");
  try {
    const body = await request.json() as {
      to?: string;
      subject?: string;
      html?: string;
    };

    // Validate required fields
    if (!body.to) {
      return json({ error: 'Email address is required' }, 400);
    }
    if (!body.subject) {
      return json({ error: 'Subject is required' }, 400);
    }
    if (!body.html) {
      return json({ error: 'HTML content is required' }, 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.to)) {
      return json({ error: 'Invalid email address' }, 400);
    }

    // Call Pinme send_email API
    const response = await fetch('https://pinme.dev/api/v4/send_email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        to: body.to,
        subject: body.subject,
        html: body.html,
      }),
    });

    const result = await response.json();
    return json(result);
  } catch (error) {
    return json({ error: 'Failed to send email' }, 500);
  }
}

// ============ Main Entry ============

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    const method = request.method;

        // Handle CORS preflight request
    if (method === 'OPTIONS') {
      return handleOptions();
    }

    try {
      if (pathname === '/api/hello' && method === 'GET') return handleHello(env);
      if (pathname === '/api/messages' && method === 'POST') return handleAddMessage(request, env);
      if (pathname === '/api/root-domain' && method === 'GET') return handleGetRootDomain();
      if (pathname === '/api/send-email' && method === 'POST') return handleSendEmail(request);

      return json({ error: 'Not found' }, 404);
    } catch {
      return json({ error: 'Internal server error' }, 500);
    }
  },
};
