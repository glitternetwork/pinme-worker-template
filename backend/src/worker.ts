export interface Env {
  DB: any;
  API_KEY?: string;
  BASE_URL?: string;
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

interface RecordItem {
  id: number;
  content: string;
  created_at: string;
}

const records: RecordItem[] = [];
let recordId = 0;

function getSource(env: Env): 'd1' | 'memory' {
  return env.DB ? 'd1' : 'memory';
}

async function readContent(request: Request): Promise<string> {
  const body = await request.json() as { content?: string };
  return (body.content ?? '').trim().slice(0, 500);
}

function parseRecordId(pathname: string): number | null {
  const match = pathname.match(/^\/api\/records\/(\d+)$/);
  if (!match) return null;

  const id = Number(match[1]);
  return Number.isInteger(id) ? id : null;
}

async function handleListRecords(env: Env): Promise<Response> {
  if (env.DB) {
    const { results } = await env.DB
      .prepare('SELECT * FROM records ORDER BY created_at DESC LIMIT 20')
      .all();
    return json({ data: results, source: getSource(env) });
  }

  return json({
    data: records.slice(-20).reverse(),
    source: getSource(env),
  });
}

async function handleCreateRecord(request: Request, env: Env): Promise<Response> {
  const content = await readContent(request);
  if (!content) return json({ error: 'content is required' }, 400);

  if (env.DB) {
    const result = await env.DB
      .prepare('INSERT INTO records (content) VALUES (?) RETURNING *')
      .bind(content)
      .first();
    return json({ data: result, source: getSource(env) }, 201);
  }

  const newRecord = {
    id: ++recordId,
    content,
    created_at: new Date().toISOString(),
  };
  records.push(newRecord);
  return json({ data: newRecord, source: getSource(env) }, 201);
}

async function handleUpdateRecord(request: Request, env: Env, id: number): Promise<Response> {
  const content = await readContent(request);
  if (!content) return json({ error: 'content is required' }, 400);

  if (env.DB) {
    const result = await env.DB
      .prepare('UPDATE records SET content = ? WHERE id = ? RETURNING *')
      .bind(content, id)
      .first();

    if (!result) {
      return json({ error: 'record not found' }, 404);
    }

    return json({ data: result, source: getSource(env) });
  }

  const record = records.find((item) => item.id === id);
  if (!record) {
    return json({ error: 'record not found' }, 404);
  }

  record.content = content;
  return json({ data: record, source: getSource(env) });
}

async function handleDeleteRecord(env: Env, id: number): Promise<Response> {
  if (env.DB) {
    const result = await env.DB
      .prepare('DELETE FROM records WHERE id = ? RETURNING id')
      .bind(id)
      .first();

    if (!result) {
      return json({ error: 'record not found' }, 404);
    }

    return json({ success: true, id, source: getSource(env) });
  }

  const index = records.findIndex((item) => item.id === id);
  if (index === -1) {
    return json({ error: 'record not found' }, 404);
  }

  records.splice(index, 1);
  return json({ success: true, id, source: getSource(env) });
}

// ============ Send Email API ============

async function handleSendEmail(request: Request, env: Env): Promise<Response> {
  const apiKey = env.API_KEY;
  const baseUrl = env.BASE_URL ?? 'https://pinme.dev';
  if (!apiKey) {
    return json({ error: 'API_KEY not configured' }, 500);
  }
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
    const response = await fetch(`${baseUrl}/api/v4/send_email`, {
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
    return json(result, response.ok ? 200 : response.status);
  } catch {
    return json({ error: 'Failed to send email' }, 500);
  }
}

// ============ Main Entry ============

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    const method = request.method;
    const recordId = parseRecordId(pathname);

    if (method === 'OPTIONS') {
      return handleOptions();
    }

    try {
      if (pathname === '/api/records' && method === 'GET') return handleListRecords(env);
      if (pathname === '/api/records' && method === 'POST') return handleCreateRecord(request, env);
      if (recordId !== null && method === 'PUT') return handleUpdateRecord(request, env, recordId);
      if (recordId !== null && method === 'DELETE') return handleDeleteRecord(env, recordId);
      if (pathname === '/api/send-email' && method === 'POST') return handleSendEmail(request, env);

      return json({ error: 'Not found' }, 404);
    } catch {
      return json({ error: 'Internal server error' }, 500);
    }
  },
};
