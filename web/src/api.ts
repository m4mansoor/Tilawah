import type {
  Assignment,
  Coverage,
  Juz,
  LeaderboardEntry,
  QariProfile,
  Recitation,
  Surah,
  Verse,
} from "./types";

// Same-origin by default (Caddy proxies /v1 to the API). For local `vite dev`,
// set VITE_API_URL=http://localhost:8010 via web/.env.development.
const API_URL: string = (import.meta as any).env?.VITE_API_URL ?? "";
const TOKEN_KEY = "tilawah_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body) headers["Content-Type"] = "application/json";
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return (await res.json()) as T;
}

export const api = {
  register: (email: string, password: string, name?: string) =>
    request<{ access_token: string }>("/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    }),
  login: (email: string, password: string) =>
    request<{ access_token: string }>("/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  getProfile: () => request<QariProfile>("/v1/qari/profile"),
  updateProfile: (body: Record<string, unknown>) =>
    request<QariProfile>("/v1/qari/profile", {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  surahs: () => request<Surah[]>("/v1/surahs"),
  surahAyahs: (n: number) => request<Verse[]>(`/v1/surahs/${n}`),
  juzList: () => request<Juz[]>("/v1/juz"),
  juzAyahs: (n: number) => request<Verse[]>(`/v1/juz/${n}`),
  nextVerse: () => request<Verse>("/v1/qari/next-verse"),
  submit: (
    scope: string,
    surah: number | null,
    ayah: number | null,
    juz: number | null,
    audio_base64: string,
  ) =>
    request<Recitation>("/v1/recitations", {
      method: "POST",
      body: JSON.stringify({ scope, surah, ayah, juz, audio_base64 }),
    }),
  mine: () => request<Recitation[]>("/v1/recitations/mine"),
  coverage: () => request<Coverage>("/v1/coverage"),
  leaderboard: () => request<LeaderboardEntry[]>("/v1/leaderboard"),
  myAssignments: () => request<Assignment[]>("/v1/assignments/mine"),
  createAssignment: (
    qari_email: string,
    scope: string,
    surah: number | null,
    ayah: number | null,
    juz: number | null,
  ) =>
    request<Assignment>("/v1/admin/assignments", {
      method: "POST",
      body: JSON.stringify({ qari_email, scope, surah, ayah, juz }),
    }),
  adminQueue: (status?: string) =>
    request<Recitation[]>(
      `/v1/admin/recitations${status ? `?status=${status}` : ""}`,
    ),
  review: (id: number, status: string, note?: string) =>
    request<Recitation>(`/v1/admin/recitations/${id}/review`, {
      method: "POST",
      body: JSON.stringify({ status, note }),
    }),
};

export async function fetchAdminAudio(id: number): Promise<string> {
  const res = await fetch(`${API_URL}/v1/admin/recitations/${id}/audio`, {
    headers: { Authorization: `Bearer ${getToken() ?? ""}` },
  });
  if (!res.ok) throw new Error("Could not load audio");
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
