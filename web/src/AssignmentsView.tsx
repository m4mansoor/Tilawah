import { useEffect, useState } from "react";
import type { Assignment, Selection } from "./types";
import { api } from "./api";
import { statusLabel, t } from "./i18n";

export function AssignmentsView({
  onRecite,
  onBack,
}: {
  onRecite: (s: Selection) => void;
  onBack: () => void;
}) {
  const [items, setItems] = useState<Assignment[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.myAssignments().then(setItems).catch((e) => setError((e as Error).message));
  }, []);

  async function recite(a: Assignment) {
    try {
      onRecite(await selectionFromAssignment(a));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <main className="wrap">
      <header className="topbar">
        <h1>{t("nav.assignments")}</h1>
        <div className="spacer" />
        <button className="link" onClick={onBack}>{t("common.home")}</button>
      </header>
      {items.length === 0 && !error && <p className="muted">{t("assignments.empty")}</p>}
      <ul className="list">
        {items.map((a) => (
          <li key={a.id} className="list-row static">
            <span className="badge">{assignmentLabel(a)}</span>
            <span className="muted">{statusLabel(a.status)}</span>
            <div className="spacer" />
            <button className="link" onClick={() => recite(a)}>{t("assignments.recite")}</button>
          </li>
        ))}
      </ul>
      {error && <p className="error">{error}</p>}
    </main>
  );
}

async function selectionFromAssignment(a: Assignment): Promise<Selection> {
  if (a.scope === "surah") {
    const ayahs = await api.surahAyahs(a.surah ?? 1);
    return {
      scope: "surah",
      surah: a.surah,
      ayah: null,
      juz: null,
      text: ayahs.map((x) => x.text).join(" "),
      label: `Surah ${a.surah}`,
    };
  }
  if (a.scope === "juz") {
    const ayahs = await api.juzAyahs(a.juz ?? 1);
    return {
      scope: "juz",
      surah: null,
      ayah: null,
      juz: a.juz,
      text: ayahs.map((x) => x.text).join(" "),
      label: `Juz ${a.juz}`,
    };
  }
  const ayahs = await api.surahAyahs(a.surah ?? 1);
  const ay = ayahs.find((x) => x.ayah === a.ayah);
  return {
    scope: "ayah",
    surah: a.surah,
    ayah: a.ayah,
    juz: null,
    text: ay?.text ?? "",
    label: `${a.surah}:${a.ayah}`,
  };
}

function assignmentLabel(a: Assignment): string {
  if (a.scope === "surah") return `Surah ${a.surah}`;
  if (a.scope === "juz") return `Juz ${a.juz}`;
  return `${a.surah}:${a.ayah}`;
}
