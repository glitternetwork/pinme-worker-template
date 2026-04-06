export interface Env {
  DB: any;
  API_KEY?: string;
  PROJECT_NAME?: string;
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

// ============ Auth API ============

type ApiEnvelope<T> = { code: number; msg: string; data: T };
type ApiErrorData = { error?: string };
type UserInfo = {
  uid: string;
  email: string;
  display_name: string;
  photo_url?: string;
  disabled: boolean;
  email_verified: boolean;
};

// POST /api/auth/register — 邮箱密码注册，代理到 Pinme auth API
async function handleAuthRegister(request: Request, env: Env): Promise<Response> {
  if (!env.API_KEY || !env.PROJECT_NAME) {
    return json({ error: 'Auth not configured' }, 500);
  }
  const body = await request.json() as { email?: string; password?: string; display_name?: string };
  if (!body.email || !body.password) {
    return json({ error: 'email and password are required' }, 400);
  }
  const baseUrl = env.BASE_URL ?? 'https://pinme.dev';
  const resp = await fetch(
    `${baseUrl}/api/v1/auth/create_user?project_name=${encodeURIComponent(env.PROJECT_NAME)}`,
    {
      method: 'POST',
      headers: { 'X-API-Key': env.API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
  const result = await resp.json() as ApiEnvelope<UserInfo | ApiErrorData>;
  if (!resp.ok || result.code !== 200) {
    return json({ error: (result.data as ApiErrorData)?.error ?? result.msg }, resp.status);
  }
  return json({ user: result.data as UserInfo });
}

// POST /api/auth/verify — 校验前端登录后的 id_token
async function handleAuthVerify(request: Request, env: Env): Promise<Response> {
  if (!env.API_KEY || !env.PROJECT_NAME) {
    return json({ error: 'Auth not configured' }, 500);
  }
  const body = await request.json() as { id_token?: string };
  if (!body.id_token) {
    return json({ error: 'id_token is required' }, 400);
  }
  const baseUrl = env.BASE_URL ?? 'https://pinme.dev';
  const resp = await fetch(
    `${baseUrl}/api/v1/auth/verify_token?project_name=${encodeURIComponent(env.PROJECT_NAME)}`,
    {
      method: 'POST',
      headers: { 'X-API-Key': env.API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token: body.id_token }),
    }
  );
  const result = await resp.json() as ApiEnvelope<{ uid: string; email?: string } | ApiErrorData>;
  if (!resp.ok || result.code !== 200) {
    const error = (result.data as ApiErrorData)?.error ?? result.msg;
    // 403 = 邮箱未验证
    return json({ error, email_not_verified: resp.status === 403 }, resp.status);
  }
  return json(result.data);
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
      if (pathname === '/api/auth/register' && method === 'POST') return handleAuthRegister(request, env);
      if (pathname === '/api/auth/verify' && method === 'POST') return handleAuthVerify(request, env);

      return json({ error: 'Not found' }, 404);
    } catch {
      return json({ error: 'Internal server error' }, 500);
    }
  },
};
