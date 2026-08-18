export type Lang = "en" | "ar";

const dict: Record<string, { en: string; ar: string }> = {
  "nav.browse": { en: "Browse", ar: "تصفح" },
  "nav.recordings": { en: "Recordings", ar: "تسجيلاتي" },
  "nav.assignments": { en: "Assignments", ar: "المهام" },
  "nav.admin": { en: "Admin", ar: "الإدارة" },
  "nav.logout": { en: "Log out", ar: "خروج" },
  "home.start": { en: "Start reciting", ar: "ابدأ التلاوة" },
  "home.finding": { en: "Finding a verse…", ar: "جارٍ البحث…" },
  "home.progress": { en: "Collection progress", ar: "تقدم الجمع" },
  "home.greeting": { en: "Assalamu Alaikum", ar: "السلام عليكم" },
  "home.sub": { en: "Your recitation helps build the Quran model.", ar: "تلاوتك تساعد في بناء نموذج القرآن." },
  "widget.leaderboard": { en: "Leaderboard", ar: "المتصدرون" },
  "widget.verse": { en: "Verse of the day", ar: "آية اليوم" },
  "widget.hadith": { en: "Hadith of the day", ar: "حديث اليوم" },
  "widget.prayer": { en: "Prayer times", ar: "مواقيت الصلاة" },
};

let current: Lang = (localStorage.getItem("tilawah_lang") as Lang) || "en";

export function t(key: string): string {
  return dict[key]?.[current] ?? dict[key]?.en ?? key;
}

export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang): void {
  current = lang;
  localStorage.setItem("tilawah_lang", lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
}

setLang(current);
