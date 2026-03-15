// API Config
// 请求后端服务器的域名地址 / Backend server domain address
// 禁止改动 / DO NOT MODIFY
export const API = import.meta.env.VITE_API_URL || '';

export function getApiUrl(path: string): string {
  return API ? `${API}${path}` : path;
}
