// repos.jsx — public, non-fork repos in github.com/mappedsky, plus the
// upstream cartography project that we contribute to.
//
// Omnibot is excluded for now. mappedsky.github.io is excluded (it's this
// site).
//
// `url` points the "view project" link at the project's docs splash page
// when one exists; otherwise it falls back to the GitHub repo URL. `gh`
// is the GitHub slug used to hydrate live stars + last-pushed dates from
// the API at page load; the `stars` and `updated` fields below are the
// fallback values shown if the API can't be reached.

const REPOS = [
  {
    name: 'seizu',
    tagline: 'A neo4j dashboard and reporting tool',
    summary:
      'A React + Python frontend for Neo4j graph databases — dashboards, an interactive Cypher console, scheduled reports, and an MCP endpoint your agents can query. Built for Cartography graphs and security observability.',
    language: 'Python',
    stars: 4,
    license: 'Apache-2.0',
    updated: 'today',
    flagship: true,
    logoSvg: 'assets/seizu-logo-mark.svg',
    url: 'https://mappedsky.github.io/seizu/',
    gh: 'mappedsky/seizu',
    // Asterism from the seizu logo-mark, projected into the 100×60 box
    stars3d: [
      { x: 29, y: 19 }, { x: 45, y: 10 }, { x: 62, y: 17 },
      { x: 72, y: 36 }, { x: 49, y: 36 }, { x: 36, y: 50 },
    ],
    edges: [[0,1],[1,2],[2,3],[1,4],[4,3],[4,5]],
    bright: 1,
    skyX: 0.22, skyY: 0.30, skyScale: 1.25,
  },
  {
    name: 'confidant',
    tagline: 'Your secret keeper',
    summary:
      'A secret management service with KMS-backed envelope encryption, IAM-based auth, and a versioned audit history. Client libraries for Python, Go, and Node; AWS-native by default.',
    language: 'Python',
    stars: 0,
    license: 'Apache-2.0',
    updated: '~4 weeks ago',
    logoSvg: 'assets/confidant-logo.svg',
    url: 'https://mappedsky.github.io/confidant/',
    gh: 'mappedsky/confidant',
    // Birds-in-flight chevron — the carrier pigeon in motion
    stars3d: [
      { x: 16, y: 28 }, { x: 32, y: 18 }, { x: 50, y: 24 },
      { x: 68, y: 18 }, { x: 84, y: 28 }, { x: 50, y: 38 },
      { x: 50, y: 50 },
    ],
    edges: [[0,1],[1,2],[2,3],[3,4],[2,5],[5,6]],
    bright: 2,
    skyX: 0.78, skyY: 0.30, skyScale: 1.1,
  },
  {
    name: 'neo4j-read-only-plugin',
    tagline: 'Read-only mode for Neo4j Community',
    summary:
      'A small Java plugin that limits a Neo4j Community Edition instance to read-only for everyone except a specific allow-list of users. Useful when you want analysts in the graph but not in the seat of an admin.',
    language: 'Java',
    stars: 0,
    license: 'GPL-3.0',
    updated: '12 days ago',
    gh: 'mappedsky/neo4j-read-only-plugin',
    // Padlock — body box + arch
    stars3d: [
      { x: 32, y: 34 }, { x: 68, y: 34 },
      { x: 32, y: 54 }, { x: 68, y: 54 },
      { x: 32, y: 22 }, { x: 50, y: 12 }, { x: 68, y: 22 },
    ],
    edges: [[0,1],[1,3],[3,2],[2,0],[0,4],[4,5],[5,6],[6,1]],
    skyX: 0.24, skyY: 0.72, skyScale: 1.0,
  },
  {
    name: 'cartography',
    tagline: 'A graph of your infrastructure',
    summary:
      'A CNCF project that pulls infrastructure assets and their relationships into a Neo4j graph — AWS, GCP, GitHub, Okta, and more. MappedSky is a stakeholder and active contributor; cartography is the engine that feeds seizu.',
    language: 'Python',
    stars: 3894,
    license: 'Apache-2.0',
    updated: 'today',
    logoSvg: 'assets/cartography-logo.svg',
    url: 'https://cartography-cncf.github.io/cartography/',
    gh: 'cartography-cncf/cartography',
    // Globe with meridians — a stylized world map
    stars3d: [
      { x: 50, y:  8 }, { x: 84, y: 22 }, { x: 84, y: 48 },
      { x: 50, y: 58 }, { x: 16, y: 48 }, { x: 16, y: 22 },
      { x: 50, y: 33 },
    ],
    edges: [
      [0,1],[1,2],[2,3],[3,4],[4,5],[5,0],
      [0,6],[6,3],[6,1],[6,4],
    ],
    bright: 6,
    skyX: 0.78, skyY: 0.72, skyScale: 1.15,
  },
];

// Per-language dot color.
const LANG_COLORS = {
  'TypeScript': '#7aa7ff',
  'Python':     '#ffd166',
  'Go':         '#7be7d8',
  'Rust':       '#ff9b7a',
  'JavaScript': '#f7df1e',
  'Java':       '#e76f51',
};

Object.assign(window, { REPOS, LANG_COLORS });
