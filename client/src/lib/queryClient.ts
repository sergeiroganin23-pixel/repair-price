import { QueryClient } from "@tanstack/react-query";
// Token is read directly from localStorage

// Port rewriting for deployment (injected by deploy_website)
const PORT_PROXY = typeof __PORT_5000__ !== "undefined" ? __PORT_5000__ : "";

export const API_BASE = PORT_PROXY;

export async function apiRequest(
  method: string,
  path: string,
  body?: unknown
): Promise<Response> {
  const token = localStorage.getItem("auth_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      queryFn: async ({ queryKey }) => {
        const path = Array.isArray(queryKey) ? queryKey[0] as string : queryKey as string;
        const res = await apiRequest("GET", path);
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: res.statusText }));
          throw new Error(err.error || "Ошибка запроса");
        }
        return res.json();
      },
    },
  },
});

// Declare global for TS
declare const __PORT_5000__: string;
