const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: string;
  agentId?: string;
}

export interface ApiError {
  error?: {
    code?: string;
    message?: string;
    hint?: string;
    rule?: string;
    details?: unknown;
  };
  message?: string;
}

async function apiFetch<T>(
  path: string,
  userId: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-User-Id": userId,
      ...(options.headers ?? {}),
    },
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = body as ApiError;
    const message = err.error?.message ?? err.message ?? "Request failed";
    const hint = err.error?.hint;
    throw new Error(hint ? `${message} — ${hint}` : message);
  }
  return body as T;
}

export const api = {
  listUsers: async (userId: string) => {
    try {
      return await apiFetch<{ data: ApiUser[] }>("/users", userId);
    } catch {
      const res = await fetch(`${API_URL}/bootstrap/users`);
      const body = await res.json();
      return body as { data: ApiUser[] };
    }
  },

  createUser: (payload: { name: string; email: string; role: string }) =>
    fetch(`${API_URL}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(async (res) => {
      const body = await res.json();
      if (!res.ok) {
        const hint = body.error?.hint;
        const message = body.error?.message ?? "Failed to create user";
        throw new Error(hint ? `${message} — ${hint}` : message);
      }
      return body.data as ApiUser & { hint?: string };
    }),

  listApplications: (userId: string) =>
    apiFetch<{ data: unknown[] }>("/applications", userId),

  getApplication: (userId: string, id: string) =>
    apiFetch<{ data: Record<string, unknown> }>(`/applications/${id}`, userId),

  createApplication: (
    userId: string,
    payload: {
      student: { name: string; email: string; nationality: string };
      course: { name: string; university: string; intake: string };
    },
  ) =>
    apiFetch<{ data: Record<string, unknown>; message: string }>(
      "/applications",
      userId,
      { method: "POST", body: JSON.stringify(payload) },
    ),

  transition: (userId: string, id: string, targetStage: string) =>
    apiFetch<{
      data: Record<string, unknown>;
      message: string;
      noOp?: boolean;
    }>(`/applications/${id}/transition`, userId, {
      method: "POST",
      body: JSON.stringify({ targetStage }),
    }),

  action: (userId: string, id: string, action: string, payload?: object) =>
    apiFetch<{ data: Record<string, unknown>; message: string }>(
      `/applications/${id}/actions/${action}`,
      userId,
      { method: "POST", body: JSON.stringify(payload ?? {}) },
    ),

  addNote: (userId: string, id: string, text: string, isReviewNote = false) =>
    apiFetch<{ data: Record<string, unknown>; message: string }>(
      `/applications/${id}/notes`,
      userId,
      { method: "POST", body: JSON.stringify({ text, isReviewNote }) },
    ),

  uploadDocument: async (
    userId: string,
    id: string,
    type: string,
    file: File,
  ) => {
    const form = new FormData();
    form.append("type", type);
    form.append("file", file);
    const res = await fetch(`${API_URL}/applications/${id}/documents`, {
      method: "POST",
      headers: { "X-User-Id": userId },
      body: form,
    });
    const body = await res.json();
    if (!res.ok) {
      const hint = body.error?.hint;
      throw new Error(
        hint
          ? `${body.error.message} — ${hint}`
          : (body.error?.message ?? "Upload failed"),
      );
    }
    return body as {
      data: Record<string, unknown>;
      message: string;
      hint?: string;
    };
  },

  refreshAi: (userId: string, id: string) =>
    apiFetch<{ data: Record<string, unknown>; message: string }>(
      `/applications/${id}/ai-assessment/refresh`,
      userId,
      { method: "POST", body: JSON.stringify({ force: true }) },
    ),
};
