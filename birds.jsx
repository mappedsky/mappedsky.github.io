// birds.jsx — a flock of carrier pigeons that fly across the sky as the
// user scrolls from day to night. Each bird owns a sub-range of scroll
// progress; within that range it moves from off-screen left to off-screen
// right. Wing flap is still time-driven (looks more natural than
// scroll-coupled flap).

const FLOCK = [
  // start/end are scroll-progress windows. y is vh from top; size in px.
  // Lead V (7 birds, foreground)
  { start: 0.00, end: 0.45, y: 20, size: 38 },             // leader
  { start: 0.02, end: 0.47, y: 22, size: 32 },
  { start: 0.02, end: 0.47, y: 22, size: 32 },
  { start: 0.05, end: 0.50, y: 25, size: 27 },
  { start: 0.05, end: 0.50, y: 25, size: 27 },
  { start: 0.08, end: 0.53, y: 28, size: 23 },
  { start: 0.08, end: 0.53, y: 28, size: 23 },
  // Middle V (4 birds, midground)
  { start: 0.14, end: 0.60, y: 34, size: 26 },
  { start: 0.16, end: 0.62, y: 36, size: 22 },
  { start: 0.16, end: 0.62, y: 36, size: 22 },
  { start: 0.19, end: 0.65, y: 39, size: 18 },
  // Trailing pair (background — further along the sky)
  { start: 0.28, end: 0.75, y: 46, size: 20 },
  { start: 0.31, end: 0.78, y: 48, size: 17 },
  { start: 0.31, end: 0.78, y: 48, size: 17 },
];

const V_OFFSET = [
  // Lead V
  { dx:  0,    dy:  0   },
  { dx: -1.6,  dy:  0.9 },
  { dx:  1.6,  dy:  0.9 },
  { dx: -3.2,  dy:  1.8 },
  { dx:  3.2,  dy:  1.8 },
  { dx: -4.8,  dy:  2.7 },
  { dx:  4.8,  dy:  2.7 },
  // Middle V
  { dx:  0,    dy:  0   },
  { dx: -1.6,  dy:  0.9 },
  { dx:  1.6,  dy:  0.9 },
  { dx:  0,    dy:  1.8 },
  // Trailing trio
  { dx:  0,    dy:  0   },
  { dx: -1.6,  dy:  0.9 },
  { dx:  1.6,  dy:  0.9 },
];

function Bird({ size, flap = 0 }) {
  const tilt = Math.sin(flap) * 14;
  return (
    <svg className="bird" viewBox="-50 -30 100 60"
         width={size} height={size * 0.6}
         style={{ overflow: 'visible' }}>
      <path
        d={`M -36 ${10 - tilt} Q -18 ${-10 - tilt * 0.4} 0 4 Q 18 ${-10 - tilt * 0.4} 36 ${10 - tilt}`}
        fill="none"
        stroke="#1a2540"
        strokeOpacity="0.55"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Birds({ animation }) {
  const [tick, setTick] = React.useState(0);
  // Birds run on their OWN scroll progress (0 → 2.2 viewports of scroll),
  // independent of stageProgress. That gives them the entire daytime hero
  // to traverse, instead of just the short sky-stage window.
  const [progress, setProgress] = React.useState(0);
  React.useEffect(() => {
    const onScroll = () => {
      const vh = window.innerHeight || 1;
      setProgress(Math.max(0, Math.min(1, window.scrollY / (vh * 2.2))));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  React.useEffect(() => {
    if (animation === 'off') return undefined;
    let raf;
    const start = performance.now();
    const loop = () => {
      setTick((performance.now() - start) / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [animation]);

  // Overall visibility — birds belong to the day half of the journey.
  // Each bird also fades in/out at the edges of its own window so it doesn't
  // pop into existence.
  if (progress > 0.85) return null;

  const flapHz = animation === 'off' ? 0 : (animation === 'minimal' ? 1.8 : 3.2);

  return (
    <div className="birds" aria-hidden="true">
      {FLOCK.map((b, i) => {
        const off = V_OFFSET[i] || V_OFFSET[0];
        // Local progress for this bird's flight window
        const local = (progress - b.start) / (b.end - b.start);
        if (local < -0.05 || local > 1.05) return null;
        const lc = Math.max(0, Math.min(1, local));
        // x from -14vw to 114vw across the window
        const xvw = -14 + lc * 128;
        // Soft fade at entry / exit
        const edgeFade = Math.min(
          Math.max(0, Math.min(1, lc * 6)),       // first ~17% fades in
          Math.max(0, Math.min(1, (1 - lc) * 6)), // last  ~17% fades out
        );
        const flap = tick * flapHz + i * 0.7;
        return (
          <div
            key={i}
            className="bird-track"
            style={{
              top: `${b.y}vh`,
              transform: `translateX(${xvw}vw)`,
              opacity: edgeFade,
            }}
          >
            <div
              className="bird-formation"
              style={{
                transform: `translate(${off.dx * b.size}px, ${off.dy * b.size}px)`,
              }}
            >
              <Bird size={b.size} flap={flap} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

Object.assign(window, { Birds });
