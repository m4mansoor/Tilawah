// Shared design-system components for the Tilawah redesign.
import type { ReactNode } from "react";

export function Crescent({ size = 40, green = false }: { size?: number; green?: boolean }) {
  return (
    <div
      className={green ? "crescent crescent-green" : "crescent"}
      style={{ width: size, height: size }}
    >
      <span style={{ fontSize: Math.round(size * 0.47) }}>☾</span>
    </div>
  );
}

export function Brand({ green = false, subtitle = "Tilawah" }: { green?: boolean; subtitle?: string }) {
  return (
    <span className={green ? "brand green" : "brand"}>
      <Crescent size={40} green={green} />
      <span>
        <div className="ar-name">تلاوة</div>
        <div className="en-name">{subtitle}</div>
      </span>
    </span>
  );
}

export type NavLink = { label: string; key: string };

export function NavBar(props: {
  links: NavLink[];
  active: string;
  onNav: (key: any) => void;
  learn?: boolean;
  user?: string | null;
  points?: number;
  streak?: number;
  onLogout?: () => void;
  onToggleLang?: () => void;
  lang?: string;
  right?: ReactNode;
}) {
  const { links, active, onNav, learn, user, points, streak } = props;
  return (
    <div className={learn ? "topnav learn" : "topnav"}>
      <div className="nav-inner">
        <a href="#" onClick={(e) => { e.preventDefault(); onNav(learn ? "learn" : "home"); }}>
          <Brand green={learn} subtitle={learn ? "Learn mode" : "Tilawah"} />
        </a>
        <div className="nav-links">
          {links.map((l) => (
            <a
              key={l.key}
              href="#"
              onClick={(e) => { e.preventDefault(); onNav(l.key); }}
              className={active === l.key ? (learn ? "active green" : "active") : ""}
            >
              {l.label}
            </a>
          ))}
        </div>
        <div className="spacer" />
        <div className="nav-right">
          {props.right}
          {props.onToggleLang && (
            <button className="lang-btn" onClick={props.onToggleLang}>{props.lang === "ar" ? "EN" : "عربي"}</button>
          )}
          {user && (
            <>
              <a href="#" onClick={(e) => { e.preventDefault(); onNav("profile"); }} className={active === "profile" ? "nav-user active" : "nav-user"}>
                {user}
              </a>
              {(points !== undefined || streak !== undefined) && (
                <span className={learn ? "nav-points green" : "nav-points"}>
                  {learn ? `🔥 ${streak ?? 0} · 📖 ${points ?? 0}` : `★ ${points ?? 0} · 🔥 ${streak ?? 0}`}
                </span>
              )}
              {props.onLogout && (
                <button className="nav-logout" onClick={props.onLogout}>Log out</button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function Footer(props: { learn?: boolean; onNav: (key: any) => void }) {
  return (
    <div className="footer">
      <div className="footer-inner">
        <span>Tilawah · {props.learn ? "Learn for a lifetime" : "Recite for the Ummah"}</span>
        <div className="footer-links">
          <a href="#" onClick={(e) => { e.preventDefault(); props.onNav("privacy"); }}>Privacy</a>
          <a href="#" onClick={(e) => { e.preventDefault(); props.onNav("terms"); }}>Terms</a>
          <a href="#" onClick={(e) => { e.preventDefault(); props.onNav("donate"); }}>Donate</a>
        </div>
        <span className="footer-ar">وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا</span>
      </div>
    </div>
  );
}

export function PageHead({ children, learn = false }: { children: ReactNode; learn?: boolean }) {
  return (
    <div className="pagehead">
      <div className={learn ? "pattern-overlay-green" : "pattern-overlay"} />
      <div className="inner">{children}</div>
    </div>
  );
}

export function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="center">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
