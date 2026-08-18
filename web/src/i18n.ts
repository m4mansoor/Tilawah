export type Lang = "en" | "ar";

const dict: Record<string, { en: string; ar: string }> = {
  "nav.browse": { en: "Browse", ar: "تصفح" },
  "nav.recordings": { en: "Recordings", ar: "تسجيلاتي" },
  "nav.assignments": { en: "Assignments", ar: "المهام" },
  "nav.admin": { en: "Admin", ar: "الإدارة" },
  "nav.logout": { en: "Log out", ar: "خروج" },
  "app.loading": { en: "Preparing Tilawah…", ar: "جارٍ تجهيز تلاوة…" },
  "home.start": { en: "Start reciting", ar: "ابدأ التلاوة" },
  "home.finding": { en: "Finding a verse…", ar: "جارٍ البحث…" },
  "home.progress": { en: "Collection progress", ar: "تقدم الجمع" },
  "home.greeting": { en: "Assalamu Alaikum", ar: "السلام عليكم" },
  "home.sub": { en: "Your recitation helps build the Quran model.", ar: "تلاوتك تساعد في بناء نموذج القرآن." },
  "stat.approved": { en: "Approved", ar: "مقبول" },
  "stat.covered": { en: "Verses covered", ar: "الآيات المغطاة" },
  "stat.complete": { en: "Fully collected", ar: "مكتمل التجميع" },
  "stat.target": { en: "Target / verse", ar: "الهدف / آية" },
  "footer.tagline": { en: "Tilawah · Recite for the Ummah", ar: "تلاوة · تلاوة لأمة الإسلام" },
  "auth.tagline": { en: "Recite for the Ummah. Help build the Quran model.", ar: "تلاوة لأمة الإسلام. ساعد في بناء نموذج القرآن." },
  "auth.name": { en: "Name", ar: "الاسم" },
  "auth.email": { en: "Email", ar: "البريد الإلكتروني" },
  "auth.password": { en: "Password", ar: "كلمة المرور" },
  "auth.login": { en: "Log in", ar: "تسجيل الدخول" },
  "auth.register": { en: "Create account", ar: "إنشاء حساب" },
  "auth.pleaseWait": { en: "Please wait…", ar: "لحظة من فضلك…" },
  "auth.newHere": { en: "New here?", ar: "جديد هنا؟" },
  "auth.haveAccount": { en: "Have an account?", ar: "لديك حساب؟" },
  "onboarding.welcome": { en: "Welcome", ar: "مرحباً" },
  "onboarding.sub": { en: "A few details before you start reciting.", ar: "بعض التفاصيل قبل أن تبدأ التلاوة." },
  "onboarding.qiraah": { en: "Qira'ah", ar: "القراءة" },
  "onboarding.gender": { en: "Gender", ar: "الجنس" },
  "onboarding.preferNo": { en: "Prefer not to say", ar: "أفضل عدم الإفصاح" },
  "onboarding.male": { en: "Male", ar: "ذكر" },
  "onboarding.female": { en: "Female", ar: "أنثى" },
  "onboarding.ageRange": { en: "Age range", ar: "الفئة العمرية" },
  "onboarding.under18": { en: "Under 18", ar: "أقل من 18" },
  "onboarding.tajweed": { en: "Tajweed experience", ar: "الخبرة في التجويد" },
  "onboarding.select": { en: "Select…", ar: "اختر…" },
  "onboarding.beginner": { en: "Beginner", ar: "مبتدئ" },
  "onboarding.intermediate": { en: "Intermediate", ar: "متوسط" },
  "onboarding.advanced": { en: "Advanced / certified", ar: "متقدم / مجاز" },
  "onboarding.consent": { en: "I consent to my recitations being stored and used to train Tilawah's recitation model.", ar: "أوافق على تخزين تلاواتي واستخدامها لتدريب نموذج التلاوة في تلاوة." },
  "onboarding.consentError": { en: "Please consent to recording storage & training use.", ar: "يرجى الموافقة على تخزين التسجيلات واستخدامها في التدريب." },
  "onboarding.save": { en: "Saving…", ar: "جارٍ الحفظ…" },
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
