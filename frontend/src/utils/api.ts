interface ApiEnv {
  VITE_API_URL?: string;
}

interface ApiFetchOptions {
  apiBase?: string;
}

type FetchLike = typeof fetch;

function trimBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

// API Config
// 请求后端服务器的域名地址 / Backend server domain address
// 禁止改动 / DO NOT MODIFY
export function getConfiguredApiBase(env: ApiEnv = import.meta.env): string {
  return trimBaseUrl(env.VITE_API_URL || '');
}

export const API = getConfiguredApiBase();

export function getApiUrl(path: string, options: ApiFetchOptions = {}): string {
  const apiBase = trimBaseUrl(options.apiBase ?? API);
  return apiBase ? `${apiBase}${path}` : path;
}

export async function apiFetch(
  path: string,
  init?: RequestInit,
  fetchImpl: FetchLike = fetch,
  options: ApiFetchOptions = {},
): Promise<Response> {
  return fetchImpl(getApiUrl(path, options), init);
}
