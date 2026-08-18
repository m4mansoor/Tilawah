import { useEffect, useState } from "react";
import type { View } from "./AppNew";
import { Brand } from "./ui";

const MARQUEE = ["الفاتحة", "البقرة", "آل عمران", "يس", "الرحمن", "الواقعة", "الملك", "النبأ", "الضحى", "القدر", "الإخلاص", "الفلق", "الناس"];

export default function LandingPage({ nav }: { nav: (v: View) => void }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / 1800);
      setCount(1 - Math.pow(1 - t, 3));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#06201a", overflowX: "hidden" }}>
      {/* NAV */}
      <div className="topnav" style={{ background: "rgba(6,32,26,.85)", backdropFilter: "blur(14px)", borderBottom: "1px solid rgba(212,169,74,.3)" }}>
        <div className="nav-inner" style={{ maxWidth: 1280, padding: "16px 32px" }}>
          <a href="#" onClick={(e) => { e.preventDefault(); nav("landing"); }}><Brand /></a>
          <div className="spacer" />
          <div className="nav-right" style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700, gap: 22 }}>
            <a href="#qaris" style={{ color: "rgba(247,241,227,.7)" }}>For Qaris</a>
            <a href="#learners" style={{ color: "rgba(247,241,227,.7)" }}>For Learners</a>
            <a href="#loop" style={{ color: "rgba(247,241,227,.7)" }}>Mission</a>
            <a href="#" onClick={(e) => { e.preventDefault(); nav("donate"); }} style={{ color: "rgba(247,241,227,.7)" }}>Donate</a>
            <a href="#" onClick={(e) => { e.preventDefault(); nav("login"); }} style={{ color: "rgba(247,241,227,.7)" }}>Sign in</a>
            <a href="#" onClick={(e) => { e.preventDefault(); nav("register"); }} className="btn btn-md btn-gold">Join free</a>
          </div>
        </div>
      </div>

      {/* HERO */}
      <div style={{ position: "relative", overflow: "hidden", background: "radial-gradient(1400px 700px at 50% -20%, #14584a 0%, #06201a 60%)" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "var(--bg-pattern-dark)", animation: "drift 70s linear infinite", opacity: .6 }} />
        <div style={{ position: "absolute", top: 110, left: "6%", width: 140, height: 140, opacity: .22, animation: "spinSlow 60s linear infinite" }}>
          <svg viewBox="0 0 100 100" width="140" height="140"><g fill="none" stroke="#f0d488" strokeWidth="1.2"><rect x="20" y="20" width="60" height="60" /><rect x="20" y="20" width="60" height="60" transform="rotate(45 50 50)" /><circle cx="50" cy="50" r="12" /></g></svg>
        </div>
        <span style={{ position: "absolute", top: 180, right: "8%", fontSize: 28, opacity: .4, animation: "floatY 7s ease-in-out infinite" }}>🏺</span>
        <span style={{ position: "absolute", top: 110, right: "24%", fontSize: 16, opacity: .3, animation: "floatY 9s 1s ease-in-out infinite", color: "#f0d488" }}>✦</span>

        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "90px 32px 30px", textAlign: "center", position: "relative" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "rgba(212,169,74,.12)", border: "1px solid rgba(212,169,74,.45)", borderRadius: 99, padding: "8px 22px", marginBottom: 28 }} className="fade-up">
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#8fd4b4" }} />
            <span className="rk" style={{ fontSize: 13, fontWeight: 700, color: "#f0d488" }}>Open-source · Non-profit · For the whole ummah</span>
          </div>
          <h1 className="rk" style={{ fontSize: 66, lineHeight: 1.12, margin: "0 0 10px", fontWeight: 600 }}>
            One Quran.<br />
            <span style={{ background: "linear-gradient(90deg,#d4a94a,#f5e3a8,#d4a94a)", backgroundSize: "200% auto", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", animation: "shimmer 4s linear infinite" }}>Two ways to serve it.</span>
          </h1>
          <p style={{ fontSize: 19, lineHeight: 1.7, color: "rgba(247,241,227,.72)", maxWidth: 640, margin: "20px auto 46px" }}>
            Qaris lend their voices to build the world's first open Quran recitation collection — and every Muslim, from a child sounding out their first surah to a grandmother perfecting tajweed, learns from it free, forever.
          </p>
          {/* DUAL PATH CARDS */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, maxWidth: 900, margin: "0 auto" }}>
            <a href="#qaris" style={{ display: "block", textAlign: "left", background: "linear-gradient(180deg,rgba(212,169,74,.16),rgba(212,169,74,.05))", border: "1px solid rgba(212,169,74,.6)", borderRadius: "150px 150px 22px 22px", padding: "52px 36px 32px", color: "#f7f1e3" }}>
              <div style={{ width: 60, height: 60, borderRadius: "50%", background: "var(--gold-grad)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto 20px" }}>🎙</div>
              <div className="rk center" style={{ fontSize: 13, letterSpacing: ".24em", textTransform: "uppercase", color: "#d4a94a", fontWeight: 700, marginBottom: 8 }}>I am a reciter</div>
              <div className="rk center" style={{ fontSize: 26, fontWeight: 600, marginBottom: 12 }}>Lend your voice</div>
              <div className="center" style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(247,241,227,.65)" }}>Huffaz, qaris, and confident reciters — record verses, pass review, and leave a recitation that teaches the ummah for generations.</div>
              <div className="center rk" style={{ marginTop: 20, fontWeight: 700, fontSize: 14, color: "#f0d488" }}>Begin your tilawah ↓</div>
            </a>
            <a href="#learners" style={{ display: "block", textAlign: "left", background: "linear-gradient(180deg,rgba(24,122,94,.25),rgba(24,122,94,.08))", border: "1px solid rgba(143,212,180,.45)", borderRadius: "150px 150px 22px 22px", padding: "52px 36px 32px", color: "#f7f1e3" }}>
              <div style={{ width: 60, height: 60, borderRadius: "50%", background: "var(--green-grad)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto 20px" }}>📖</div>
              <div className="rk center" style={{ fontSize: 13, letterSpacing: ".24em", textTransform: "uppercase", color: "#8fd4b4", fontWeight: 700, marginBottom: 8 }}>I want to learn</div>
              <div className="rk center" style={{ fontSize: 26, fontWeight: 600, marginBottom: 12 }}>Learn to recite</div>
              <div className="center" style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(247,241,227,.65)" }}>Kids, adults, beginners returning to the Quran — listen ayah by ayah, practice tajweed, and get gentle feedback at your own pace.</div>
              <div className="center rk" style={{ marginTop: 20, fontWeight: 700, fontSize: 14, color: "#8fd4b4" }}>Start learning ↓</div>
            </a>
          </div>

          {/* COUNTER STRIP */}
          <div style={{ margin: "56px auto 60px", maxWidth: 900, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1, background: "rgba(212,169,74,.35)", border: "1px solid rgba(212,169,74,.35)", borderRadius: 20, overflow: "hidden" }}>
            <div className="center" style={{ background: "#0a352b", padding: 24 }}><div className="rk" style={{ fontSize: 36, fontWeight: 700, color: "#f0d488" }}>{Math.round(6236 * count).toLocaleString()}</div><div style={{ fontSize: 12, fontWeight: 700, color: "rgba(247,241,227,.55)", letterSpacing: ".08em", textTransform: "uppercase" }}>Verses to collect</div></div>
            <div className="center" style={{ background: "#0a352b", padding: 24 }}><div className="rk" style={{ fontSize: 36, fontWeight: 700, color: "#f0d488" }}>{Math.round(5 * count)} qaris</div><div style={{ fontSize: 12, fontWeight: 700, color: "rgba(247,241,227,.55)", letterSpacing: ".08em", textTransform: "uppercase" }}>Per verse · training goal</div></div>
            <div className="center" style={{ background: "#0a352b", padding: 24 }}><div className="rk" style={{ fontSize: 36, fontWeight: 700, color: "#f0d488" }}>Free</div><div style={{ fontSize: 12, fontWeight: 700, color: "rgba(247,241,227,.55)", letterSpacing: ".08em", textTransform: "uppercase" }}>Forever · for everyone</div></div>
          </div>
        </div>

        {/* MARQUEE */}
        <div style={{ borderTop: "1px solid rgba(212,169,74,.25)", borderBottom: "1px solid rgba(212,169,74,.25)", padding: "16px 0", overflow: "hidden", background: "rgba(6,32,26,.6)" }}>
          <div className="marquee-track" style={{ gap: 56, fontFamily: "var(--font-arabic)", fontSize: 24, color: "rgba(212,169,74,.65)", whiteSpace: "nowrap" }}>
            {[...MARQUEE, ...MARQUEE].map((s, i) => <span key={i} style={{ display: "inline-flex", gap: 56 }}><span>{s}</span><span>✦</span></span>)}
          </div>
        </div>
      </div>
      {/* FOR QARIS */}
      <div id="qaris" style={{ maxWidth: 1280, margin: "0 auto", padding: "100px 32px 50px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "rgba(212,169,74,.12)", border: "1px solid rgba(212,169,74,.45)", borderRadius: 99, padding: "7px 18px", marginBottom: 18 }}>
              <span style={{ fontSize: 15 }}>🎙</span>
              <span className="rk" style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase", color: "#f0d488" }}>For respected qaris & huffaz</span>
            </div>
            <h2 className="rk" style={{ fontSize: 44, margin: "0 0 20px", fontWeight: 600, lineHeight: 1.2 }}>Your recitation, preserved as a waqf of sound</h2>
            <p style={{ fontSize: 16, lineHeight: 1.8, color: "rgba(247,241,227,.7)", margin: "0 0 28px" }}>Whether you hold an ijazah or simply recite with care, your voice can teach students you will never meet. Every approved verse becomes part of a permanent, open collection — a sadaqah jariyah that recites on your behalf.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 32 }}>
              {[
                ["🕌", "Recite at your own pace", "One ayah at a time, from home — re-record until you're satisfied."],
                ["✅", "Reviewed with respect", "Trained reviewers verify every recording for accuracy and clarity — your name is never published without consent."],
                ["🌍", "Teach generations", "Your tilawah trains tajweed tutors and guides learners across the world, long after the session ends."],
              ].map(([icon, title, sub]) => (
                <div key={title} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <span style={{ width: 34, height: 34, flexShrink: 0, borderRadius: "50%", background: "rgba(212,169,74,.15)", border: "1px solid rgba(212,169,74,.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>{icon}</span>
                  <div><div className="rk" style={{ fontWeight: 700, fontSize: 16 }}>{title}</div><div style={{ fontSize: 14, color: "rgba(247,241,227,.6)", lineHeight: 1.6 }}>{sub}</div></div>
                </div>
              ))}
            </div>
            <button className="btn btn-gold btn-gold-pulse" style={{ fontSize: 16, padding: "16px 38px" }} onClick={() => nav("register")}>🎙 Begin your tilawah</button>
          </div>
          <div className="flex-center">
            <div style={{ width: 400, background: "linear-gradient(180deg,rgba(247,241,227,.08),rgba(247,241,227,.02))", border: "1px solid rgba(212,169,74,.55)", borderRadius: "200px 200px 22px 22px", padding: "70px 38px 38px", textAlign: "center", animation: "floatY 9s ease-in-out infinite" }}>
              <div className="rk" style={{ fontSize: 11, letterSpacing: ".3em", textTransform: "uppercase", color: "#d4a94a", fontWeight: 700, marginBottom: 20 }}>Recording · Al-Fatihah 1</div>
              <div className="ar" style={{ fontSize: 32, lineHeight: 2, direction: "rtl" }}>بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ</div>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 4, height: 38, margin: "28px 0 22px" }}>
                {[30, 70, 50, 90, 60, 80, 45].map((h, i) => <span key={i} style={{ width: 4, height: h + "%", background: "#d4a94a", borderRadius: 2, transformOrigin: "bottom", animation: `eq 1.1s ${i * 0.05}s ease-in-out infinite` }} />)}
              </div>
              <div className="rk" style={{ fontSize: 13, fontWeight: 700, color: "#8fd4b4" }}>✓ Approved · now teaching 3 learners</div>
            </div>
          </div>
        </div>
      </div>
      {/* FOR LEARNERS */}
      <div id="learners" style={{ background: "linear-gradient(160deg,#0a352b,#0d4436)", borderTop: "1px solid rgba(143,212,180,.2)", borderBottom: "1px solid rgba(143,212,180,.2)", marginTop: 50 }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "100px 32px" }}>
          <div className="center" style={{ maxWidth: 700, margin: "0 auto 60px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "rgba(24,122,94,.25)", border: "1px solid rgba(143,212,180,.45)", borderRadius: 99, padding: "7px 18px", marginBottom: 18 }}>
              <span style={{ fontSize: 15 }}>📖</span>
              <span className="rk" style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase", color: "#8fd4b4" }}>For every learner in the ummah</span>
            </div>
            <h2 className="rk" style={{ fontSize: 44, margin: "0 0 18px", fontWeight: 600, lineHeight: 1.2 }}>Learn tajweed in any voice you love</h2>
            <p style={{ fontSize: 16, lineHeight: 1.8, color: "rgba(247,241,227,.7)", margin: 0 }}>Children learning their first surah, mothers and fathers returning to the Quran, students perfecting makharij — everyone learns free, at their own pace, in their own home.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 22 }}>
            {[
              ["🦻", "Listen & repeat", "Stream any reciter from the online library — Alafasy, Abdul Basit, Al-Husary and more — and repeat at your pace."],
              ["🎯", "Gentle tajweed feedback", "Recite back and get kind, specific guidance on makharij and rules — no embarrassment, ever."],
              ["🧒", "Made for kids too", "Short daily surahs, streaks and badges — a child can finish Juz Amma one ayah a day."],
              ["🏡", "Learn anywhere", "Men and women practice privately at home — no class schedule, no judgment, always free."],
            ].map(([icon, title, sub]) => (
              <div key={title} className="center" style={{ background: "rgba(6,32,26,.5)", border: "1px solid rgba(143,212,180,.3)", borderRadius: "120px 120px 18px 18px", padding: "44px 26px 30px" }}>
                <div style={{ width: 54, height: 54, margin: "0 auto 16px", borderRadius: "50%", background: "rgba(24,122,94,.3)", border: "1px solid rgba(143,212,180,.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{icon}</div>
                <div className="rk" style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>{title}</div>
                <div style={{ fontSize: 13, lineHeight: 1.7, color: "rgba(247,241,227,.6)" }}>{sub}</div>
              </div>
            ))}
          </div>
          <div className="center" style={{ marginTop: 48 }}>
            <button className="btn btn-green" style={{ fontSize: 16, padding: "16px 38px", boxShadow: "0 14px 40px rgba(24,122,94,.4)" }} onClick={() => nav("learn")}>📖 Start learning free</button>
          </div>
        </div>
      </div>
      {/* THE LOOP */}
      <div id="loop" style={{ maxWidth: 1280, margin: "0 auto", padding: "100px 32px 60px" }}>
        <div className="center" style={{ marginBottom: 56 }}>
          <div className="ar" style={{ fontSize: 26, color: "#d4a94a", marginBottom: 8 }}>﴾ ۞ ﴿</div>
          <h2 className="rk" style={{ fontSize: 44, margin: "0 0 14px", fontWeight: 600 }}>A circle of knowledge</h2>
          <p style={{ fontSize: 16, color: "rgba(247,241,227,.65)", maxWidth: 560, margin: "0 auto", lineHeight: 1.7 }}>"The best of you are those who learn the Quran and teach it." Tilawah connects both halves of that hadith.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr auto 1fr", gap: 20, alignItems: "center" }}>
          <div className="center" style={{ background: "rgba(212,169,74,.08)", border: "1px solid rgba(212,169,74,.45)", borderRadius: 20, padding: "36px 30px" }}>
            <div style={{ fontSize: 36, marginBottom: 14 }}>🎙</div>
            <div className="rk" style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Qaris recite</div>
            <div style={{ fontSize: 14, color: "rgba(247,241,227,.6)", lineHeight: 1.7 }}>Verse by verse, five voices per ayah, reviewed for accuracy.</div>
          </div>
          <div className="rk" style={{ fontSize: 28, color: "#d4a94a" }}>→</div>
          <div className="center" style={{ background: "rgba(247,241,227,.05)", border: "1px solid rgba(212,169,74,.35)", borderRadius: 20, padding: "36px 30px" }}>
            <div style={{ fontSize: 36, marginBottom: 14 }}>🧠</div>
            <div className="rk" style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>The collection grows</div>
            <div style={{ fontSize: 14, color: "rgba(247,241,227,.6)", lineHeight: 1.7 }}>An open dataset and voice model — a permanent waqf, owned by no one.</div>
          </div>
          <div className="rk" style={{ fontSize: 28, color: "#8fd4b4" }}>→</div>
          <div className="center" style={{ background: "rgba(24,122,94,.15)", border: "1px solid rgba(143,212,180,.4)", borderRadius: 20, padding: "36px 30px" }}>
            <div style={{ fontSize: 36, marginBottom: 14 }}>📖</div>
            <div className="rk" style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>The ummah learns</div>
            <div style={{ fontSize: 14, color: "rgba(247,241,227,.6)", lineHeight: 1.7 }}>Kids, parents, students — free tajweed tutoring powered by real qaris.</div>
          </div>
        </div>
        <div className="center" style={{ marginTop: 26, fontSize: 13, color: "rgba(247,241,227,.5)" }}>…and today's learners become tomorrow's qaris. The circle continues.</div>
      </div>

      {/* HADITH BAND */}
      <div style={{ background: "linear-gradient(160deg,#0a352b,#0e4a3a)", borderTop: "1px solid rgba(212,169,74,.25)", borderBottom: "1px solid rgba(212,169,74,.25)" }}>
        <div className="center" style={{ maxWidth: 900, margin: "0 auto", padding: "70px 32px" }}>
          <div className="ar" style={{ fontSize: 30, lineHeight: 1.9, color: "#f7f1e3", direction: "rtl", marginBottom: 18 }}>«خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ»</div>
          <div style={{ fontSize: 17, fontStyle: "italic", color: "rgba(247,241,227,.7)", lineHeight: 1.7 }}>"The best of you are those who learn the Quran and teach it."</div>
          <div style={{ color: "#d4a94a", fontSize: 13, fontWeight: 800, letterSpacing: ".1em", marginTop: 12 }}>SAHIH AL-BUKHARI · 5027</div>
        </div>
      </div>

      {/* FINAL CTA */}
      <div className="center" style={{ maxWidth: 1280, margin: "0 auto", padding: "100px 32px 90px" }}>
        <h2 className="rk" style={{ fontSize: 52, margin: "0 0 16px", fontWeight: 600 }}>Whichever path is yours,<br />it starts with one ayah</h2>
        <p style={{ fontSize: 18, color: "rgba(247,241,227,.65)", maxWidth: 540, margin: "0 auto 44px", lineHeight: 1.7 }}>Join free today — recite, learn, or support the mission with a donation.</p>
        <div className="flex-center" style={{ gap: 18, flexWrap: "wrap" }}>
          <button className="btn btn-gold btn-gold-pulse" style={{ fontSize: 17, padding: "17px 40px" }} onClick={() => nav("register")}>🎙 Recite</button>
          <button className="btn btn-green" style={{ fontSize: 17, padding: "17px 40px" }} onClick={() => nav("learn")}>📖 Learn</button>
          <button className="btn btn-ghost" style={{ fontSize: 17, padding: "17px 40px" }} onClick={() => nav("donate")}>🤲 Donate</button>
        </div>
      </div>
      {/* FOOTER */}
      <div style={{ borderTop: "1px solid rgba(212,169,74,.25)", background: "#051a15" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "44px 32px 30px", display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 40 }}>
          <div>
            <div style={{ marginBottom: 12 }}><Brand /></div>
            <div style={{ fontSize: 13, color: "rgba(247,241,227,.5)", lineHeight: 1.7, maxWidth: 280 }}>An open, non-profit Quran voice collection. Recite for the Ummah, learn for a lifetime.</div>
          </div>
          {([
            { head: "Reciters", color: "#d4a94a", links: [["browse", "Browse surahs"], ["challenge", "Ramadan challenge"], ["leaderboard", "Leaderboard"], ["review", "Become a reviewer"]] as [View, string][] },
            { head: "Learners", color: "#8fd4b4", links: [["learn", "Learner dashboard"], ["register", "Get started"], ["surah", "Explore Al-Fatihah"]] as [View, string][] },
            { head: "Mission", color: "#d4a94a", links: [["donate", "Donate"], ["privacy", "Privacy"], ["terms", "Terms"]] as [View, string][] },
          ]).map(({ head, color, links }) => (
            <div key={head} style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
              <div className="rk" style={{ fontWeight: 700, fontSize: 12, letterSpacing: ".2em", textTransform: "uppercase", color, marginBottom: 4 }}>{head}</div>
              {links.map(([view, label]) => (
                <a key={label} href="#" onClick={(e) => { e.preventDefault(); nav(view); }} style={{ color: "rgba(247,241,227,.6)" }}>{label}</a>
              ))}
            </div>
          ))}
        </div>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 32px 30px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "rgba(247,241,227,.4)", borderTop: "1px solid rgba(212,169,74,.15)" }}>
          <span>© 2026 Tilawah · A community waqf</span>
          <span className="ar" style={{ fontSize: 15, color: "rgba(212,169,74,.7)" }}>وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا</span>
        </div>
      </div>




    </div>
  );
}
