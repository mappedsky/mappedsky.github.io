// sky.jsx — fixed-position sky background with scroll-driven day/night
// gradient, ambient stars, and per-repo constellations.
//
// Ambient stars are HTML divs (round on every aspect ratio). Each
// constellation gets its own square SVG positioned over the sky, so its
// own circles stay round and don't get stretched by viewport aspect.

// Seeded RNG so ambient star positions are stable across renders.
const __rand = (seed) => {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
};
// Subtler set: fewer stars, smaller, gentler base opacities.
const AMBIENT = (() => {
  const r = __rand(11);
  return Array.from({ length: 160 }, () => ({
    x: r() * 100,
    y: r() * 100,
    s: 0.8 + r() * 1.4,                 // diameter in px
    o: 0.25 + r() * 0.55,                // base opacity (max ~0.8)
    tw: r() * 6,                         // twinkle phase offset (sec)
    tws: 4 + r() * 5,                    // twinkle period (slower than before)
  }));
})();

const __mix = (a, b, t) => {
  const p = (s) => [1,3,5].map((i) => parseInt(s.slice(i, i+2), 16));
  const [r1,g1,b1] = p(a), [r2,g2,b2] = p(b);
  const m = (x, y) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return '#' + m(r1,r2) + m(g1,g2) + m(b1,b2);
};
const __clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

const PALETTE = {
  day:   { top: '#a8d3f0', mid: '#cfe6f5', bot: '#f4f1ea' },
  dusk:  { top: '#2c3e6b', mid: '#5b4d7a', bot: '#d49773' },
  night: { top: '#06091a', mid: '#0c1430', bot: '#1a2148' },
};

function skyStops(progress, intensity) {
  const p = __clamp(progress, 0, 1);
  let top, mid, bot;
  if (p < 0.5) {
    const t = p / 0.5;
    top = __mix(PALETTE.day.top, PALETTE.dusk.top, t);
    mid = __mix(PALETTE.day.mid, PALETTE.dusk.mid, t);
    bot = __mix(PALETTE.day.bot, PALETTE.dusk.bot, t);
  } else {
    const t = (p - 0.5) / 0.5;
    top = __mix(PALETTE.dusk.top, PALETTE.night.top, t);
    mid = __mix(PALETTE.dusk.mid, PALETTE.night.mid, t);
    bot = __mix(PALETTE.dusk.bot, PALETTE.night.bot, t);
  }
  if (intensity < 1) {
    const calm = '#d8d0c2';
    const k = (1 - intensity) * 0.5;
    top = __mix(top, calm, k);
    mid = __mix(mid, calm, k);
    bot = __mix(bot, calm, k);
  }
  return { top, mid, bot };
}

function starVisibility(progress) {
  return __clamp((progress - 0.2) / 0.55, 0, 1);
}

// One constellation rendered in its own square SVG (stays round under any
// viewport aspect because the wrapper is sized in vmin).
function ConstellationSvg({ repo, cp, sv, accent, fontMono }) {
  // local stars3d coords are 100×60; viewBox includes padding for the label.
  return (
    <svg viewBox="0 0 100 78" preserveAspectRatio="xMidYMid meet"
         width="100%" height="100%">
      <g>
        {repo.edges.map(([a, b], i) => {
          const reach = __clamp(cp * repo.edges.length - i, 0, 1);
          if (reach <= 0) return null;
          const p1 = repo.stars3d[a], p2 = repo.stars3d[b];
          const x2 = p1.x + (p2.x - p1.x) * reach;
          const y2 = p1.y + (p2.y - p1.y) * reach;
          return (
            <line key={i} x1={p1.x} y1={p1.y} x2={x2} y2={y2}
                  stroke={accent} strokeOpacity={0.45 + 0.35 * cp}
                  strokeWidth="0.35" strokeLinecap="round" />
          );
        })}
        {repo.stars3d.map((p, i) => {
          const isBright = repo.bright === i;
          const baseR = isBright ? 0.95 : 0.55;
          return (
            <circle key={i} cx={p.x} cy={p.y}
                    r={baseR * (0.55 + cp * 0.5)}
                    fill={isBright ? accent : '#fff'}
                    opacity={Math.max(sv * 0.7, cp)} />
          );
        })}
        {repo.stars3d.map((p, i) => repo.bright === i ? (
          <circle key={`h${i}`} cx={p.x} cy={p.y} r={3 * cp}
                  fill={accent} opacity={0.15 * cp} />
        ) : null)}
      </g>
      {cp > 0.5 && (
        <text x="50" y="74" textAnchor="middle"
              fontFamily={fontMono} fontSize="3.2"
              fill={accent} letterSpacing="0.35"
              opacity={(cp - 0.5) / 0.5 * 0.85}
              style={{ textShadow: '0 0 6px rgba(0,0,0,0.5)' }}>
          {repo.name.toUpperCase()}
        </text>
      )}
    </svg>
  );
}

function Sky({ progress, intensity, animation, constellationProgress, accent, fontMono }) {
  const stops = skyStops(progress, intensity);
  const sv = starVisibility(progress) * Math.min(1.2, intensity);
  const density = intensity < 1 ? 0.35 : intensity > 1.2 ? 0.85 : 0.6;
  const ambient = AMBIENT.slice(0, Math.round(AMBIENT.length * density));
  // minimal: every 3rd star twinkles. full: all twinkle. off: none.
  const twinkleEvery = animation === 'full' ? 1 : animation === 'minimal' ? 3 : 0;

  return (
    <div className="sky" aria-hidden="true">
      <div className="sky-grad" style={{
        background: `linear-gradient(180deg, ${stops.top} 0%, ${stops.mid} 55%, ${stops.bot} 100%)`,
      }} />
      <div className="sky-haze" style={{ opacity: 0.35 + 0.35 * progress }} />

      {/* Ambient stars — HTML divs so they stay perfectly round */}
      <div className="sky-ambient" style={{ opacity: sv }}>
        {ambient.map((s, i) => {
          const tw = twinkleEvery > 0 && (i % twinkleEvery === 0);
          return (
            <div
              key={i}
              className={tw ? 'star twinkle' : 'star'}
              style={{
                left: `${s.x}%`,
                top: `${s.y}%`,
                width: `${s.s}px`,
                height: `${s.s}px`,
                opacity: s.o,
                ['--tw-base']: s.o,
                ['--tw-dur']: `${s.tws}s`,
                ['--tw-delay']: `${-s.tw}s`,
              }}
            />
          );
        })}
      </div>

      {/* Constellations — each in its own square SVG */}
      {REPOS.map((repo, ri) => {
        const cp = constellationProgress[ri] ?? 0;
        // Hide entirely when the sky isn't dim AND the constellation isn't
        // drawing yet — keeps daytime sky clean.
        const wrapOpacity = Math.max(sv * 0.65, cp);
        if (wrapOpacity < 0.02) return null;
        const size = 17 * (repo.skyScale || 1);   // vmin
        const aspect = 78 / 100;
        return (
          <div key={ri} className="constellation-wrap"
               style={{
                 left: `${repo.skyX * 100}%`,
                 top: `${repo.skyY * 100}%`,
                 width: `${size}vmin`,
                 height: `${size * aspect}vmin`,
                 opacity: wrapOpacity,
               }}>
            <ConstellationSvg repo={repo} cp={cp} sv={sv}
                              accent={accent} fontMono={fontMono} />
          </div>
        );
      })}

      {/* Sun / moon — single body traversing left to right with progress */}
      <div className="sky-orb" style={{
        left: `${10 + progress * 80}%`,
        top: `${20 + Math.sin(progress * Math.PI) * -8 + 18 * (progress < 0.5 ? 0 : (progress - 0.5))}%`,
        background: progress < 0.5
          ? `radial-gradient(circle, #fff8d8, #ffd97a 60%, rgba(255,217,122,0) 75%)`
          : `radial-gradient(circle, #f5f1e6 30%, rgba(245,241,230,0.15) 60%, transparent 75%)`,
        opacity: intensity < 1 ? 0.4 : 0.85,
      }} />
    </div>
  );
}

Object.assign(window, { Sky });
