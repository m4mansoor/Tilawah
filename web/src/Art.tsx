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

export function Mosque({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 1200 220"
      preserveAspectRatio="xMidYMax meet"
      aria-hidden="true"
      focusable="false"
    >
      <g fill="#0a4d3a">
        <rect x="0" y="196" width="1200" height="24" />
        <path d="M262 196 L262 66 L284 32 L306 66 L306 196 Z" />
        <rect x="248" y="118" width="72" height="8" rx="4" />
        <path d="M894 196 L894 66 L916 32 L938 66 L938 196 Z" />
        <rect x="880" y="118" width="72" height="8" rx="4" />
        <path d="M388 196 C388 162 412 148 440 148 C468 148 492 162 492 196 Z" />
        <path d="M708 196 C708 162 732 148 760 148 C788 148 812 162 812 196 Z" />
        <path d="M500 196 C500 116 546 56 600 56 C654 56 700 116 700 196 Z" />
      </g>
      <g fill="#c9a227">
        <rect x="598" y="44" width="4" height="12" />
        <path d="M600 30 L604 38 L612 40 L604 42 L600 50 L596 42 L588 40 L596 38 Z" />
      </g>
    </svg>
  );
}
