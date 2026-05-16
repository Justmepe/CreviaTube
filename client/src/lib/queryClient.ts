import { QueryClient, QueryFunction } from "@tanstack/react-query";

// HttpError carries a clean user-facing message plus the raw HTTP
// status so call sites can branch on status without parsing strings.
// We attach status as a property rather than subclassing Error
// because Error subclassing in transpiled TS sometimes drops the
// prototype chain — properties on a plain Error survive every
// minifier we've tried.
export interface HttpError extends Error {
  status: number;
}

// Parse the response body once and pull a human-readable message
// out of it. Server endpoints conventionally return
// { message: "..." } or { error: "..." }; this normalises both.
async function extractErrorMessage(res: Response): Promise<string> {
  // Clone so callers can still inspect the response body if they
  // want to. Body streams can only be consumed once.
  const cloned = res.clone();
  try {
    const body: any = await cloned.json();
    if (typeof body?.message === "string" && body.message.length > 0) return body.message;
    if (typeof body?.error === "string" && body.error.length > 0) return body.error;
  } catch {
    // Body isn't JSON; fall through.
  }
  try {
    const text = await res.text();
    if (text) return text;
  } catch {
    // Already-consumed body; ignore.
  }
  return res.statusText || `HTTP ${res.status}`;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const message = await extractErrorMessage(res);
    const err = new Error(message) as HttpError;
    err.status = res.status;
    throw err;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn = <T>(options: {
  on401: UnauthorizedBehavior;
}): QueryFunction<T> => {
  return async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (options.on401 === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
