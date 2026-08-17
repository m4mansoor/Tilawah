import { useEffect, useState, type ReactNode } from "react";

function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("http"))))
      .then((j: T) => {
        if (active) setData(j);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [url]);

  return { data, error, loading };
}

function dayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 86400000);
}

function WidgetCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card widget-card">
      <h3 className="widget-title">{title}</h3>
      {children}
    </section>
  );
}

export function DailyVerseCard() {
  const ref = ((dayOfYear() * 37 + 19) % 6236) + 1;
  const { data, error, loading } = useFetch<any>(
    `https://api.alquran.cloud/v1/ayah/${ref}/editions/quran-uthmani,en.asad`,
  );

  if (loading) {
    return (
      <WidgetCard title="Verse of the day">
        <p className="muted">Loading…</p>
      </WidgetCard>
    );
  }
  if (error || !data?.data?.[0]) {
    return (
      <WidgetCard title="Verse of the day">
        <p className="muted">Unavailable right now.</p>
      </WidgetCard>
    );
  }

  const ar = data.data[0];
  const en = data.data[1];
  return (
    <WidgetCard title="Verse of the day">
      <p className="verse-ar">{ar.text}</p>
      <p className="verse-en">"{en?.text}"</p>
      <span className="muted">
        Surah {ar.surah?.englishName} · {ar.numberInSurah}
      </span>
    </WidgetCard>
  );
}

export function HadithCard() {
  const n = ((dayOfYear() * 29 + 7) % 7563) + 1;
  const { data, error, loading } = useFetch<any>(
    `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-bukhari/${n}.json`,
  );

  if (loading) {
    return (
      <WidgetCard title="Hadith of the day">
        <p className="muted">Loading…</p>
      </WidgetCard>
    );
  }

  const h = data?.hadiths?.[0];
  const text = h?.text || "";
  if (error || !text) {
    return (
      <WidgetCard title="Hadith of the day">
        <p className="muted">Unavailable right now.</p>
      </WidgetCard>
    );
  }

  const source = `${data?.metadata?.name || "Sahih al-Bukhari"} · #${h.hadithnumber}`;
  return (
    <WidgetCard title="Hadith of the day">
      <p className="hadith-text">{text}</p>
      <span className="muted">{source}</span>
    </WidgetCard>
  );
}

export function PrayerTimesCard() {
  const { data, error, loading } = useFetch<any>(
    "https://api.aladhan.com/v1/timingsByCity?city=Mecca&country=Saudi%20Arabia",
  );

  if (loading) {
    return (
      <WidgetCard title="Prayer times">
        <p className="muted">Loading…</p>
      </WidgetCard>
    );
  }
  if (error || !data?.data?.timings) {
    return (
      <WidgetCard title="Prayer times">
        <p className="muted">Unavailable right now.</p>
      </WidgetCard>
    );
  }

  const t = data.data.timings;
  const items: Array<[string, string]> = [
    ["Fajr", t.Fajr],
    ["Dhuhr", t.Dhuhr],
    ["Asr", t.Asr],
    ["Maghrib", t.Maghrib],
    ["Isha", t.Isha],
  ];

  return (
    <WidgetCard title="Prayer times">
      <div className="prayer-grid">
        {items.map(([name, time]) => (
          <div className="prayer" key={name}>
            <div className="prayer-name">{name}</div>
            <div className="prayer-time">{time}</div>
          </div>
        ))}
      </div>
      <span className="muted">Mecca, Saudi Arabia</span>
    </WidgetCard>
  );
}
