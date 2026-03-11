// API Config
export const API = import.meta.env.VITE_API_URL || '';

export function getApiUrl(path: string): string {
  return API ? `${API}${path}` : path;
}
