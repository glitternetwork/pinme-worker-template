# AGENTS.md

## 说明

这是一个 Pinme 全栈项目模板：

- `frontend/`：前端，Vite + React + TypeScript
- `backend/`：后端，Cloudflare Worker
- `db/`：D1 数据库迁移

请优先保持模板结构清晰，不做无关重构。

## 主要目录

- `package.json`：根目录脚本
- `pinme.toml`：项目配置
- `frontend/src/`：前端代码
- `backend/src/worker.ts`：后端入口
- `backend/wrangler.toml`：Worker 配置
- `db/001_init.sql`：初始化数据库结构

## 改动原则

- 前端需求优先改 `frontend/src/`
- 后端需求优先改 `backend/src/worker.ts`
- 涉及配置时，同时检查 `pinme.toml` 和 `backend/wrangler.toml`
- 不随意修改 `backend/metadata.json` 这类平台相关文件
- 保持改动最小，避免把模板改得过重

## 常用命令

- 安装依赖：`npm install`
- 启动后端：`npm run dev`
- 启动前端：`npm run dev:frontend`
- 构建后端：`npm run build:worker`
- 构建前端：`npm run build:frontend`
- 整体构建：`npm run build`

## 平台 API 调用约定

参考文档：`docs/worker_service_api.md`

- Worker 调用平台内部服务时，使用项目级 `X-API-Key`，不走 JWT
- `X-API-Key` 通常由 `pinme create` 返回
- 发邮件接口：`POST /api/v4/send_email`
- 对话补全接口：`POST /api/v1/chat/completions?project_name=<项目名>`
- 调用 `chat/completions` 时，`project_name` 必须和 `X-API-Key` 对应同一个项目
- `send_email` 返回平台统一 JSON 包裹
- `chat/completions` 可能返回普通 JSON，也可能返回流式响应
- 文档示例默认从 Worker 环境变量读取 `API_KEY`、`PROJECT_NAME`，并可选读取 `BASE_URL`
- 新增这类平台调用时，优先复用现有请求方式，至少带上：
  - `X-API-Key`
  - `Content-Type: application/json`

## 提交前检查

- 只改和任务相关的文件
- 至少运行对应的构建命令再结束
- 如果改了数据库相关逻辑，顺手检查 `db/001_init.sql` 是否一致
