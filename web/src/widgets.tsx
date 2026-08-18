import { useEffect, useState, type ReactNode } from "react";
import { api } from "./api";
import type { LeaderboardEntry } from "./types";
import { t } from "./i18n";

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

export function LeaderboardCard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    api
      .leaderboard()
      .then(setEntries)
      .catch(() => setError(true));
  }, []);

  return (
    <WidgetCard title={t("widget.leaderboard")}>
      {error ? (
        <p className="muted">{t("common.unavailable")}</p>
      ) : entries.length === 0 ? (
        <p className="muted">{t("widget.noPoints")}</p>
      ) : (
        <ol className="leaderboard">
          {entries.map((e, i) => (
            <li key={i}>
              <span className="rank">{i + 1}</span>
              <span className="lname">{e.name}</span>
              <span className="lpoints">⭐ {e.points}</span>
            </li>
          ))}
        </ol>
      )}
    </WidgetCard>
  );
}

export function DailyVerseCard() {
  const ref = ((dayOfYear() * 37 + 19) % 6236) + 1;
  const { data, error, loading } = useFetch<any>(
    `https://api.alquran.cloud/v1/ayah/${ref}/editions/quran-uthmani,en.asad`,
  );

  if (loading) {
    return (
      <WidgetCard title={t("widget.verse")}>
        <p className="muted">{t("common.loading")}</p>
      </WidgetCard>
    );
  }
  if (error || !data?.data?.[0]) {
    return (
      <WidgetCard title={t("widget.verse")}>
        <p className="muted">{t("common.unavailableNow")}</p>
      </WidgetCard>
    );
  }

  const ar = data.data[0];
  const en = data.data[1];
  return (
    <WidgetCard title={t("widget.verse")}>
      <p className="verse-ar">{ar.text}</p>
      <p className="verse-en">"{en?.text}"</p>
      <span className="muted">
        {t("common.surah")} {ar.surah?.englishName} · {ar.numberInSurah}
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
      <WidgetCard title={t("widget.hadith")}>
        <p className="muted">{t("common.loading")}</p>
      </WidgetCard>
    );
  }

  const h = data?.hadiths?.[0];
  const text = h?.text || "";
  if (error || !text) {
    return (
      <WidgetCard title={t("widget.hadith")}>
        <p className="muted">{t("common.unavailableNow")}</p>
      </WidgetCard>
    );
  }

  const source = `${data?.metadata?.name || "Sahih al-Bukhari"} · #${h.hadithnumber}`;
  return (
    <WidgetCard title={t("widget.hadith")}>
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
      <WidgetCard title={t("widget.prayer")}>
        <p className="muted">{t("common.loading")}</p>
      </WidgetCard>
    );
  }
  if (error || !data?.data?.timings) {
    return (
      <WidgetCard title={t("widget.prayer")}>
        <p className="muted">{t("common.unavailableNow")}</p>
      </WidgetCard>
    );
  }

  const timings = data.data.timings;
  const items: Array<[string, string]> = [
    [t("widget.fajr"), timings.Fajr],
    [t("widget.dhuhr"), timings.Dhuhr],
    [t("widget.asr"), timings.Asr],
    [t("widget.maghrib"), timings.Maghrib],
    [t("widget.isha"), timings.Isha],
  ];

  return (
    <WidgetCard title={t("widget.prayer")}>
      <div className="prayer-grid">
        {items.map(([name, time]) => (
          <div className="prayer" key={name}>
            <div className="prayer-name">{name}</div>
            <div className="prayer-time">{time}</div>
          </div>
        ))}
      </div>
      <span className="muted">{t("widget.mecca")}</span>
    </WidgetCard>
  );
}
