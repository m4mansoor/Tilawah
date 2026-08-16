export function Crescent({
  size = 64,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="crescent-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c9a227" />
          <stop offset="1" stopColor="#a8851f" />
        </linearGradient>
        <mask id="crescent-m">
          <rect width="64" height="64" fill="#fff" />
          <circle cx="44" cy="22" r="17" fill="#000" />
        </mask>
      </defs>
      <circle cx="30" cy="34" r="19" fill="url(#crescent-g)" mask="url(#crescent-m)" />
      <path
        d="M44 10 l1.9 4.2 4.2 1.9 -4.2 1.9 -1.9 4.2 -1.9 -4.2 -4.2 -1.9 4.2 -1.9 Z"
        fill="url(#crescent-g)"
      />
    </svg>
  );
}

export function HeroBanner() {
  return (
    <div className="auth-hero">
      <img className="auth-hero-img" src="/img/mosque.jpg" alt="" />
      <div className="auth-hero-overlay">
        <Crescent size={52} />
        <div className="brand-calligraphy light">تِلاوَة</div>
        <div className="brand-latin light">Tilawah</div>
        <div className="bismillah light">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
      </div>
    </div>
  );
}
