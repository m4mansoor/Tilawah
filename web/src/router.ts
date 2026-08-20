// Path-based routing helpers (History API).
//
// The app is a single-page app; each internal "view" gets a real URL path so
// that navigation, deep-linking, and refresh all behave like a standard site.
// nginx is configured with `try_files $uri $uri/ /index.html`, so the SPA is
// served for every path and this file is what turns a path back into a view.

export interface Route {
  view: string;
  surah?: number;
}

const PATHS: Record<string, string> = {
  landing: "/",
  login: "/login",
  register: "/register",
  forgot: "/forgot",
  onboarding: "/onboarding",
  home: "/home",
  browse: "/browse",
  recite: "/recite",
  recordings: "/recordings",
  assignments: "/assignments",
  leaderboard: "/leaderboard",
  profile: "/profile",
  learn: "/learn",
  learnBrowse: "/learn/browse",
  practice: "/practice",
  progress: "/progress",
  review: "/review",
  donate: "/donate",
  privacy: "/privacy",
  terms: "/terms",
  challenge: "/challenge",
  share: "/share",
  about: "/about",
};

/** Views that are reachable without an authenticated session. */
export const PUBLIC_VIEWS: string[] = [
  "landing", "login", "register", "forgot", "about", "privacy", "terms",
  "donate", "challenge", "share", "browse", "surah",
];

/** Map a view name (+ optional surah number) to its URL path. */
export function pathForView(view: string, surah?: number | null): string {
  if (view === "surah") return `/surah/${surah ?? 1}`;
  return PATHS[view] ?? "/";
}

/** Parse a URL path back into a view (+ optional surah number). */
export function pathToView(pathname: string): Route {
  const p = (pathname || "/").replace(/\/+$/, "") || "/";
  if (p === "/") return { view: "landing" };
  const m = p.match(/^\/surah\/(\d+)$/);
  if (m) return { view: "surah", surah: Number(m[1]) };
  for (const key of Object.keys(PATHS)) {
    if (PATHS[key] === p) return { view: key };
  }
  return { view: "landing" };
}
