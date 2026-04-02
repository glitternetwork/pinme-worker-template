# Worker 服务接口文档

本文档仅保留 Worker 侧需要直接对接的公开调用说明。

当前接口：

- `POST /api/v4/send_email`
- `POST /api/v1/chat/completions`

## 1. 总览

该接口面向 Worker 或服务端内部调用，不走 JWT，而是使用项目级 API Key。

### 认证方式

- 请求头使用 `X-API-Key`
- `X-API-Key` 由 `pinme create` 返回
- `/api/v1/chat/completions` 额外要求 `project_name` query 参数
- `X-API-Key` 必须和 `project_name` 对应同一个项目

### 返回格式

成功时返回统一 JSON 包裹：

```json
{
  "code": 200,
  "msg": "ok",
  "data": {
    "ok": true
  }
}
```

## 2. POST /api/v4/send_email

### 接口说明

使用项目 API Key 发送邮件。

### 请求头

| Header | 必填 | 说明 |
| --- | --- | --- |
| `X-API-Key` | 是 | 项目 API Key |
| `Content-Type: application/json` | 建议 | 请求体为 JSON |

### 请求体

```json
{
  "to": "user@example.com",
  "subject": "Your verification code",
  "html": "<p>Your code is <strong>123456</strong></p>"
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `to` | string | 是 | 收件人邮箱 |
| `subject` | string | 是 | 邮件标题 |
| `html` | string | 是 | 邮件 HTML 内容 |

### 校验规则

- 请求体最大 1MB
- `to` 会做基础邮箱格式校验
- `subject` 不能为空
- `html` 不能为空

### 成功响应

HTTP `200 OK`

```json
{
  "code": 200,
  "msg": "ok",
  "data": {
    "ok": true
  }
}
```

### 错误响应

该接口错误会使用统一包裹格式返回。

| 场景 | HTTP 状态码 | `code` | `msg` | `data.error` |
| --- | --- | --- | --- | --- |
| 缺少 `X-API-Key` | 401 | 500 | `fail` | `X-API-Key header is required` |
| API Key 无效 | 401 | 500 | `fail` | `Invalid API key` |
| JSON 非法 | 400 | 400 | `invalid param` | `Invalid JSON` |
| 邮箱格式非法 | 400 | 400 | `invalid param` | `Invalid email address` |
| `subject` 为空 | 400 | 400 | `invalid param` | `Subject is required` |
| `html` 为空 | 400 | 400 | `invalid param` | `HTML content is required` |
| 发送失败 | 500 | 500 | `fail` | `Failed to send email` |

### TypeScript 示例

```ts
interface Env {
  API_KEY: string
  BASE_URL?: string
}

type SendEmailResponse = {
  code: number
  msg: string
  data?: {
    ok?: boolean
    error?: string
  }
}

async function sendEmail(env: Env) {
  const baseUrl = env.BASE_URL ?? "https://pinme.dev"

  const response = await fetch(`${baseUrl}/api/v4/send_email`, {
    method: "POST",
    headers: {
      "X-API-Key": env.API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: "user@example.com",
      subject: "Your verification code",
      html: "<p>Your code is <strong>123456</strong></p>",
    }),
  })

  const result = (await response.json()) as SendEmailResponse

  if (!response.ok) {
    throw new Error(result.data?.error ?? "send_email request failed")
  }

  return result
}
```

## 3. POST /api/v1/chat/completions

### 接口说明

该接口用于服务端代转发对话补全请求。

### 请求头

| Header | 必填 | 说明 |
| --- | --- | --- |
| `X-API-Key` | 是 | 项目 API Key |
| `Content-Type: application/json` | 建议 | 请求体为 JSON |

### Query 参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `project_name` | string | 是 | 项目名，必须与 `X-API-Key` 对应 |

### 请求体

请求体会按 JSON 方式转发，调用方应传入合法的对话补全请求。例如：

```json
{
  "model": "your-model-name",
  "messages": [
    {
      "role": "user",
      "content": "Say hello in one sentence."
    }
  ]
}
```

也支持流式请求：

```json
{
  "model": "your-model-name",
  "stream": true,
  "messages": [
    {
      "role": "user",
      "content": "Count from 1 to 5."
    }
  ]
}
```

### 成功响应

- 非流式请求：返回标准 JSON 响应
- 流式请求：返回 `text/event-stream`

### 错误响应

本地校验失败时，返回统一包裹格式。

| 场景 | HTTP 状态码 | `code` | `msg` | `data.error` |
| --- | --- | --- | --- | --- |
| 缺少 `X-API-Key` | 401 | 500 | `fail` | `X-API-Key header is required` |
| 缺少 `project_name` | 400 | 400 | `invalid param` | `project_name is required` |
| API Key 与项目名不匹配 | 401 | 500 | `fail` | `Invalid API key or project name` |
| 请求体超过 1MB 或读取失败 | 413 | 500 | `fail` | `Request body too large (max 1MB)` |

### TypeScript 示例

```ts
interface Env {
  API_KEY: string
  PROJECT_NAME: string
  BASE_URL?: string
}

async function createChatCompletion(
  env: Env
) {
  const baseUrl = env.BASE_URL ?? "https://pinme.dev"

  const response = await fetch(
    `${baseUrl}/api/v1/chat/completions?project_name=${encodeURIComponent(env.PROJECT_NAME)}`,
    {
      method: "POST",
      headers: {
        "X-API-Key": env.API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "your-model-name",
        messages: [
          {
            role: "user",
            content: "Say hello in one sentence.",
          },
        ],
      }),
    }
  )

  if (!response.ok) {
    throw new Error(await response.text())
  }

  return await response.json()
}
```

## 4. 调用方注意事项

- 所有请求都要带 `X-API-Key`
- `chat/completions` 需要额外传 `project_name`
- `send_email` 成功时返回统一包裹 JSON
- `chat/completions` 的成功响应可能是普通 JSON，也可能是流式响应
- 请求体建议控制在 1MB 以内
