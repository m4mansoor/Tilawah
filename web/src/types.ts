export interface QariProfile {
  id: number;
  email: string;
  name: string | null;
  role: string;
  qiraah: string;
  gender: string | null;
  age_range: string | null;
  tajweed_level: string | null;
  consent_ok: boolean;
  points: number;
  streak: number;
}

export interface Surah {
  number: number;
  name: string;
  english_name: string;
  ayah_count: number;
}

export interface Verse {
  surah: number;
  ayah: number;
  text: string;
  sample_count: number;
}

export interface Juz {
  number: number;
  start_surah: number;
  start_ayah: number;
  ayah_count: number;
}

export type Scope = "ayah" | "surah" | "juz";

export interface Selection {
  scope: Scope;
  surah: number | null;
  ayah: number | null;
  juz: number | null;
  text: string;
  label: string;
}

export interface WordError {
  index: number;
  word: string;
  expected: string | null;
  recognized: string | null;
  error_type: string;
  tajweed_rule: string | null;
}

export interface Recitation {
  id: number;
  user_id: number | null;
  surah: number | null;
  ayah: number | null;
  scope: string;
  juz: number | null;
  transcript: string;
  match_score: number | null;
  duration_s: number | null;
  status: string;
  review_note: string | null;
  summary: string | null;
  errors: WordError[];
  created_at: string | null;
}

export interface SurahCoverage {
  surah: number;
  name: string;
  approved: number;
  covered: number;
  total: number;
}

export interface Coverage {
  total_ayahs: number;
  approved_samples: number;
  covered_ayahs: number;
  complete_ayahs: number;
  target_per_ayah: number;
  by_surah: SurahCoverage[];
}

export interface LeaderboardEntry {
  name: string;
  points: number;
  streak: number;
}
