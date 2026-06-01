var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/worker.ts
var CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key"
};
function json(data, status = 200) {
  return Response.json(data, { status, headers: CORS_HEADERS });
}
__name(json, "json");
function handleOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
__name(handleOptions, "handleOptions");
var records = [];
var recordId = 0;
function getSource(env) {
  return env.DB ? "d1" : "memory";
}
__name(getSource, "getSource");
async function readContent(request) {
  const body = await request.json();
  return (body.content ?? "").trim().slice(0, 500);
}
__name(readContent, "readContent");
function parseRecordId(pathname) {
  const match = pathname.match(/^\/api\/records\/(\d+)$/);
  if (!match)
    return null;
  const id = Number(match[1]);
  return Number.isInteger(id) ? id : null;
}
__name(parseRecordId, "parseRecordId");
async function handleListRecords(env) {
  if (env.DB) {
    const { results } = await env.DB.prepare("SELECT * FROM records ORDER BY created_at DESC LIMIT 20").all();
    return json({ data: results, source: getSource(env) });
  }
  return json({
    data: records.slice(-20).reverse(),
    source: getSource(env)
  });
}
__name(handleListRecords, "handleListRecords");
async function handleCreateRecord(request, env) {
  const content = await readContent(request);
  if (!content)
    return json({ error: "content is required" }, 400);
  if (env.DB) {
    const result = await env.DB.prepare("INSERT INTO records (content) VALUES (?) RETURNING *").bind(content).first();
    return json({ data: result, source: getSource(env) }, 201);
  }
  const newRecord = {
    id: ++recordId,
    content,
    created_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  records.push(newRecord);
  return json({ data: newRecord, source: getSource(env) }, 201);
}
__name(handleCreateRecord, "handleCreateRecord");
async function handleUpdateRecord(request, env, id) {
  const content = await readContent(request);
  if (!content)
    return json({ error: "content is required" }, 400);
  if (env.DB) {
    const result = await env.DB.prepare("UPDATE records SET content = ? WHERE id = ? RETURNING *").bind(content, id).first();
    if (!result) {
      return json({ error: "record not found" }, 404);
    }
    return json({ data: result, source: getSource(env) });
  }
  const record = records.find((item) => item.id === id);
  if (!record) {
    return json({ error: "record not found" }, 404);
  }
  record.content = content;
  return json({ data: record, source: getSource(env) });
}
__name(handleUpdateRecord, "handleUpdateRecord");
async function handleDeleteRecord(env, id) {
  if (env.DB) {
    const result = await env.DB.prepare("DELETE FROM records WHERE id = ? RETURNING id").bind(id).first();
    if (!result) {
      return json({ error: "record not found" }, 404);
    }
    return json({ success: true, id, source: getSource(env) });
  }
  const index = records.findIndex((item) => item.id === id);
  if (index === -1) {
    return json({ error: "record not found" }, 404);
  }
  records.splice(index, 1);
  return json({ success: true, id, source: getSource(env) });
}
__name(handleDeleteRecord, "handleDeleteRecord");
async function handleAuthRegister(request, env) {
  if (!env.API_KEY || !env.PROJECT_NAME) {
    return json({ error: "Auth not configured" }, 500);
  }
  const body = await request.json();
  if (!body.email || !body.password) {
    return json({ error: "email and password are required" }, 400);
  }
  const baseUrl = env.BASE_URL ?? "https://pinme.cloud";
  const resp = await fetch(
    `${baseUrl}/api/v1/auth/create_user?project_name=${encodeURIComponent(env.PROJECT_NAME)}`,
    {
      method: "POST",
      headers: { "X-API-Key": env.API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }
  );
  const result = await resp.json();
  if (!resp.ok || result.code !== 200) {
    return json({ error: result.data?.error ?? result.msg }, resp.status);
  }
  return json({ user: result.data });
}
__name(handleAuthRegister, "handleAuthRegister");
async function handleAuthVerify(request, env) {
  if (!env.API_KEY || !env.PROJECT_NAME) {
    return json({ error: "Auth not configured" }, 500);
  }
  const body = await request.json();
  if (!body.id_token) {
    return json({ error: "id_token is required" }, 400);
  }
  const baseUrl = env.BASE_URL ?? "https://pinme.cloud";
  const resp = await fetch(
    `${baseUrl}/api/v1/auth/verify_token?project_name=${encodeURIComponent(env.PROJECT_NAME)}`,
    {
      method: "POST",
      headers: { "X-API-Key": env.API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ id_token: body.id_token })
    }
  );
  const result = await resp.json();
  if (!resp.ok || result.code !== 200) {
    const error = result.data?.error ?? result.msg;
    return json({ error, email_not_verified: resp.status === 403 }, resp.status);
  }
  return json(result.data);
}
__name(handleAuthVerify, "handleAuthVerify");
async function handleSendEmail(request, env) {
  const apiKey = env.API_KEY;
  const baseUrl = env.BASE_URL ?? "https://pinme.cloud";
  if (!apiKey) {
    return json({ error: "API_KEY not configured" }, 500);
  }
  try {
    const body = await request.json();
    if (!body.to) {
      return json({ error: "Email address is required" }, 400);
    }
    if (!body.subject) {
      return json({ error: "Subject is required" }, 400);
    }
    if (!body.html) {
      return json({ error: "HTML content is required" }, 400);
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.to)) {
      return json({ error: "Invalid email address" }, 400);
    }
    const response = await fetch(`${baseUrl}/api/v4/send_email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey
      },
      body: JSON.stringify({
        to: body.to,
        subject: body.subject,
        html: body.html
      })
    });
    const result = await response.json();
    return json(result, response.ok ? 200 : response.status);
  } catch {
    return json({ error: "Failed to send email" }, 500);
  }
}
__name(handleSendEmail, "handleSendEmail");
var worker_default = {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    const method = request.method;
    const recordId2 = parseRecordId(pathname);
    if (method === "OPTIONS") {
      return handleOptions();
    }
    try {
      if (pathname === "/api/records" && method === "GET")
        return handleListRecords(env);
      if (pathname === "/api/records" && method === "POST")
        return handleCreateRecord(request, env);
      if (recordId2 !== null && method === "PUT")
        return handleUpdateRecord(request, env, recordId2);
      if (recordId2 !== null && method === "DELETE")
        return handleDeleteRecord(env, recordId2);
      if (pathname === "/api/send-email" && method === "POST")
        return handleSendEmail(request, env);
      if (pathname === "/api/auth/register" && method === "POST")
        return handleAuthRegister(request, env);
      if (pathname === "/api/auth/verify" && method === "POST")
        return handleAuthVerify(request, env);
      return json({ error: "Not found" }, 404);
    } catch {
      return json({ error: "Internal server error" }, 500);
    }
  }
};
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map
