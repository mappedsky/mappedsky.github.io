// app.jsx — MappedSky OSS splash page
//
// Scroll model:
//   • Hero pins to viewport top while you scroll through it.
//   • A long scroll "stage" between hero and grid drives the sky from day
//     (progress=0) to night (progress=1). Each repo gets a sub-range of
//     that scroll where its constellation draws in.
//   • Then the repo grid + footer scroll normally over the night sky.

const FONTS = {
  display: "'EB Garamond', 'Iowan Old Style', Georgia, serif",
  body:    "'EB Garamond', Georgia, serif",
  mono:    "'JetBrains Mono', ui-monospace, monospace",
  gfont:   'family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=JetBrains+Mono:wght@400;500',
  weight:  { display: 500, body: 400 },
};

const ACCENT = '#9fc6ff';
const INTENSITY_VALUE = 1.0;     // balanced
const ANIMATION_LEVEL = 'full';

// Inject the active Google Font once on mount.
function useGoogleFont(query) {
  React.useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?${query}&display=swap`;
    document.head.appendChild(link);
  }, [query]);
}

// relativeTime — format an ISO timestamp the way GitHub's UI tends to:
// "today", "yesterday", "12 days ago", "~3 months ago".
function relativeTime(iso) {
  if (!iso) return null;
  const then = new Date(iso);
  if (isNaN(then)) return null;
  const days = Math.floor((Date.now() - then.getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `~${Math.round(days / 7)} weeks ago`;
  if (days < 365) return `~${Math.round(days / 30)} months ago`;
  return `~${Math.round(days / 365)} years ago`;
}

// useLiveRepoStats — fetches stars + pushed_at from the GitHub API for each
// repo with a `gh` slug, in parallel. Caches the merged result in
// localStorage for an hour to be polite to the 60-req/hr unauthenticated
// rate limit. Returns the original REPOS array augmented with live values;
// falls back to the baked-in values on any error.
const __STATS_CACHE_KEY = 'mappedsky-oss.repoStats.v1';
const __STATS_TTL_MS = 60 * 60 * 1000;
function useLiveRepoStats() {
  const [stats, setStats] = React.useState(() => {
    try {
      const raw = localStorage.getItem(__STATS_CACHE_KEY);
      if (!raw) return null;
      const { at, data } = JSON.parse(raw);
      if (Date.now() - at > __STATS_TTL_MS) return null;
      return data;
    } catch (e) { return null; }
  });
  React.useEffect(() => {
    if (stats) return undefined;
    let cancelled = false;
    const slugs = REPOS.map((r) => r.gh).filter(Boolean);
    Promise.all(
      slugs.map((slug) =>
        fetch(`https://api.github.com/repos/${slug}`, {
          headers: { Accept: 'application/vnd.github+json' },
        })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
          .then((d) => d && {
            gh: slug,
            stars: d.stargazers_count,
            pushedAt: d.pushed_at,
          }),
      ),
    ).then((rows) => {
      if (cancelled) return;
      const next = {};
      rows.forEach((row) => { if (row) next[row.gh] = row; });
      if (Object.keys(next).length === 0) return;
      setStats(next);
      try {
        localStorage.setItem(__STATS_CACHE_KEY,
          JSON.stringify({ at: Date.now(), data: next }));
      } catch (e) {}
    });
    return () => { cancelled = true; };
  }, [stats]);
  return React.useMemo(() => REPOS.map((r) => {
    const live = stats && r.gh && stats[r.gh];
    if (!live) return r;
    return {
      ...r,
      stars: typeof live.stars === 'number' ? live.stars : r.stars,
      updated: relativeTime(live.pushedAt) || r.updated,
    };
  }), [stats]);
}

// useScrollProgress — returns scroll position of an element relative to its
// own height. 0 when its top hits the viewport top, 1 when its bottom does.
function useScrollProgress(ref) {
  const [p, setP] = React.useState(0);
  React.useEffect(() => {
    const onScroll = () => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const traveled = -r.top;
      setP(Math.max(0, Math.min(1, total > 0 ? traveled / total : 0)));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [ref]);
  return p;
}

// ── Constellation chip — small SVG of one repo's constellation ─────────────
function ConstellationChip({ repo, color, size = 88 }) {
  const pad = 8;
  const project = (x, y) => ({
    x: pad + (x / 100) * (100 - pad * 2),
    y: pad + (y / 60) * (100 - pad * 2 * (60 / 100)),
  });
  const pts = repo.stars3d.map(({ x, y }) => project(x, y));
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: 'block' }}>
      {repo.edges.map(([a, b], i) => {
        const p1 = pts[a], p2 = pts[b];
        return (
          <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                stroke={color} strokeOpacity="0.55" strokeWidth="0.7"
                strokeLinecap="round" />
        );
      })}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y}
                r={repo.bright === i ? 2.0 : 1.4}
                fill={repo.bright === i ? color : '#fff'} />
      ))}
    </svg>
  );
}

// ── Repo card ──────────────────────────────────────────────────────────────
function RepoCard({ repo }) {
  const langColor = LANG_COLORS[repo.language] || '#888';
  const href = repo.url || `https://github.com/mappedsky/${repo.name}`;
  return (
    <article className={`repo-card ${repo.flagship ? 'flagship' : ''}`}>
      <div className="repo-chip">
        {repo.logoSvg ? (
          <img src={repo.logoSvg} alt={`${repo.name} mark`}
               width="92" height="92" className="repo-logo" />
        ) : (
          <ConstellationChip repo={repo} color={ACCENT} size={88} />
        )}
      </div>
      <div className="repo-meta">
        <header>
          <h3 style={{ fontFamily: FONTS.display, fontWeight: FONTS.weight.display }}>
            {repo.name}
          </h3>
          <p className="tag" style={{ fontFamily: FONTS.body }}>{repo.tagline}</p>
        </header>
        <p className="summary" style={{ fontFamily: FONTS.body }}>{repo.summary}</p>
        <footer style={{ fontFamily: FONTS.mono }}>
          <span className="lang">
            <i className="dot" style={{ background: langColor }} />
            {repo.language}
          </span>
          <span className="sep">·</span>
          <span>★ {repo.stars.toLocaleString()}</span>
          <span className="sep">·</span>
          <span>{repo.license}</span>
          <span className="sep">·</span>
          <span className="updated">updated {repo.updated}</span>
          <a className="repo-link" href={href} target="_blank" rel="noopener noreferrer">
            view project →
          </a>
        </footer>
      </div>
    </article>
  );
}

// ── Top nav bar ────────────────────────────────────────────────────────────
function NavBar({ scrolled, onJump }) {
  return (
    <nav className={`nav ${scrolled ? 'on-night' : ''}`}>
      <div className="brand" style={{ fontFamily: FONTS.display, fontWeight: FONTS.weight.display }}>
        <span className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 100 100" width="20" height="20">
            <g stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" fill="none">
              <line x1="20" y1="70" x2="50" y2="22" />
              <line x1="50" y1="22" x2="80" y2="54" />
              <line x1="80" y1="54" x2="66" y2="80" />
            </g>
            <circle cx="20" cy="70" r="6"   fill="currentColor" />
            <circle cx="50" cy="22" r="8"   fill="currentColor" />
            <circle cx="80" cy="54" r="6"   fill="currentColor" />
            <circle cx="66" cy="80" r="4.6" fill="currentColor" />
          </svg>
        </span>
        <span style={{ fontStyle: 'italic' }}>MappedSky</span>
        <span className="brand-sub" style={{ fontFamily: FONTS.mono }}>/ open source</span>
      </div>
      <div className="nav-links" style={{ fontFamily: FONTS.mono }}>
        <a onClick={(e) => { e.preventDefault(); onJump('projects'); }} href="#projects">projects</a>
        <a onClick={(e) => { e.preventDefault(); onJump('contribute'); }} href="#contribute">contribute</a>
        <a className="cta" href="https://github.com/mappedsky" target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
      </div>
    </nav>
  );
}

// ── Hero ───────────────────────────────────────────────────────────────────
function Hero({ progress }) {
  const textLight = progress > 0.45;
  return (
    <section className="hero" data-screen-label="01 Hero">
      <div className={`hero-inner ${textLight ? 'on-night' : 'on-day'}`}>
        <p className="eyebrow" style={{ fontFamily: FONTS.mono }}>
          <span className="eyebrow-dot" /> A constellation of security tooling.
        </p>
        <h1 style={{ fontFamily: FONTS.display, fontWeight: FONTS.weight.display }}>
          Map the sky.<br />
          <span className="h1-soft">Mind the surface.</span>
        </h1>
        <p className="lede" style={{ fontFamily: FONTS.body }}>
          MappedSky builds open-source infrastructure for security teams who'd rather
          read source than read brochures.
        </p>
        <div className="hero-ctas" style={{ fontFamily: FONTS.mono }}>
          <a className="btn primary" href="#projects"
             onClick={(e) => { e.preventDefault();
               document.getElementById('projects').scrollIntoView({ behavior: 'smooth' }); }}>
            Browse projects
          </a>
          <a className="btn ghost" href="https://github.com/mappedsky"
             target="_blank" rel="noopener noreferrer">
            github.com/mappedsky ↗
          </a>
        </div>
        <div className="scroll-hint" style={{ fontFamily: FONTS.mono }}>
          ↓ scroll
        </div>
      </div>
    </section>
  );
}

// ── Stage section that drives sky progress ────────────────────────────────
function SkyStage({ stageRef }) {
  return (
    <section ref={stageRef} className="sky-stage" aria-hidden="true">
      {REPOS.map((r, i) => (
        <div key={i} className="sky-stage-marker">
          <span className="sky-stage-num" style={{ fontFamily: FONTS.mono }}>
            {String(i + 1).padStart(2, '0')}
          </span>
        </div>
      ))}
    </section>
  );
}

// ── Repo grid section ─────────────────────────────────────────────────────
function ReposSection({ repos }) {
  return (
    <section id="projects" className="repos" data-screen-label="02 Projects">
      <header className="section-head">
        <p className="kicker" style={{ fontFamily: FONTS.mono }}>
          projects
        </p>
        <p className="section-lede" style={{ fontFamily: FONTS.body }}>
          Each project solves a part of the security stack. Together they form the
          MappedSky platform; on their own, each one runs just fine.
        </p>
      </header>
      <div className="repo-grid">
        {repos.map((r) => (
          <RepoCard key={r.name} repo={r} />
        ))}
      </div>
    </section>
  );
}

// ── Contribute section ────────────────────────────────────────────────────
function ContributeSection() {
  const items = [
    {
      k: '01',
      h: 'File an issue',
      b: 'Bug reports and feature requests live in each project. We triage weekly.',
    },
    {
      k: '02',
      h: 'Open a PR',
      b: (
        <>
          Fork the repo and send it — CI runs on first push. We use the{' '}
          <a href="https://developercertificate.org/"
             target="_blank" rel="noopener noreferrer"
             style={{ borderBottom: '1px solid currentColor' }}>
            DCO
          </a>
          , so all that's needed is to sign off your commits.
        </>
      ),
    },
    {
      k: '03',
      h: 'Start a discussion',
      b: (
        <>
          Questions, ideas, and design conversations live in{' '}
          <a href="https://github.com/orgs/mappedsky/discussions"
             target="_blank" rel="noopener noreferrer"
             style={{ borderBottom: '1px solid currentColor' }}>
            GitHub Discussions
          </a>
          {' '}on the org, or any of the individual projects.
        </>
      ),
    },
  ];
  return (
    <section id="contribute" className="contribute" data-screen-label="03 Contribute">
      <header className="section-head">
        <p className="kicker" style={{ fontFamily: FONTS.mono }}>contribute</p>
        <h2 style={{ fontFamily: FONTS.display, fontWeight: 600 }}>
          We're a small team. Your changes make these tools better for security
          engineers we'll never meet.
        </h2>
      </header>
      <ol className="steps" style={{ fontFamily: FONTS.body }}>
        {items.map((it) => (
          <li key={it.k}>
            <span className="step-k" style={{ fontFamily: FONTS.mono }}>{it.k}</span>
            <h3 style={{ fontFamily: FONTS.display, fontWeight: FONTS.weight.display }}>{it.h}</h3>
            <p>{it.b}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────
function FooterBar() {
  return (
    <footer className="page-footer" style={{ fontFamily: FONTS.mono }}>
      <div className="foot-row">
        <span>© MappedSky, Inc.</span>
        <span className="foot-sep">·</span>
        <a href="https://github.com/mappedsky">github</a>
      </div>
    </footer>
  );
}

// ── Root app ──────────────────────────────────────────────────────────────
function App() {
  useGoogleFont(FONTS.gfont);

  const liveRepos = useLiveRepoStats();
  const stageRef = React.useRef(null);
  const stageProgress = useScrollProgress(stageRef);

  // Per-repo draw-in progress. Each repo owns 1/N of the scroll stage.
  const constellationProgress = React.useMemo(() => {
    const n = REPOS.length;
    return REPOS.map((_, i) => {
      const start = i / n;
      const end = (i + 1) / n;
      const local = (stageProgress - start) / (end - start);
      return Math.max(0, Math.min(1, local));
    });
  }, [stageProgress]);

  // Scroll detection for nav style change
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.6);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const onJump = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className={`page intensity-balanced anim-${ANIMATION_LEVEL}`}
         style={{
           '--accent': ACCENT,
           '--font-display': FONTS.display,
           '--font-body': FONTS.body,
           '--font-mono': FONTS.mono,
         }}>
      <Sky
        progress={stageProgress}
        intensity={INTENSITY_VALUE}
        animation={ANIMATION_LEVEL}
        constellationProgress={constellationProgress}
        accent={ACCENT}
        fontMono={FONTS.mono}
      />
      <Birds animation={ANIMATION_LEVEL} />
      <NavBar scrolled={scrolled} onJump={onJump} />
      <Hero progress={stageProgress} />
      <SkyStage stageRef={stageRef} />
      <ReposSection repos={liveRepos} />
      <ContributeSection />
      <FooterBar />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
