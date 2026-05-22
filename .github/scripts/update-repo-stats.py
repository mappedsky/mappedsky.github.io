#!/usr/bin/env python3
"""Refresh `stars` and `updated` fields in repos.jsx from the GitHub API.

Reads every repo block's `gh: 'owner/name'`, fetches the live stargazer
count and pushed_at timestamp, and rewrites the matching `stars:` and
`updated:` lines inside that block. Repos without a `gh` field are left
untouched. On any per-repo error (rate limit, network, missing repo), the
existing value is preserved.

Designed to run from the repo root (e.g. by a GitHub Actions workflow that
runs `python3 .github/scripts/update-repo-stats.py`).
"""

from __future__ import annotations

import datetime as dt
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path


REPOS_PATH = Path("repos.jsx")
GITHUB_API = "https://api.github.com/repos/{slug}"


def relative_time(iso: str) -> str:
    then = dt.datetime.fromisoformat(iso.replace("Z", "+00:00"))
    now = dt.datetime.now(dt.timezone.utc)
    days = (now - then).days
    if days <= 0:
        return "today"
    if days == 1:
        return "yesterday"
    if days < 14:
        return f"{days} days ago"
    if days < 60:
        return f"~{round(days / 7)} weeks ago"
    if days < 365:
        return f"~{round(days / 30)} months ago"
    return f"~{round(days / 365)} years ago"


def fetch(slug: str) -> dict | None:
    req = urllib.request.Request(
        GITHUB_API.format(slug=slug),
        headers={"Accept": "application/vnd.github+json"},
    )
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.load(resp)
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as e:
        print(f"  failed to fetch {slug}: {e}", file=sys.stderr)
        return None


REPO_BLOCK = re.compile(
    r"\{\s*\n\s*name:\s*'[^']+',[\s\S]*?\n\s*\},",
    re.MULTILINE,
)


def update_block(match: re.Match[str]) -> str:
    block = match.group(0)
    gh_match = re.search(r"gh:\s*'([^']+)'", block)
    if not gh_match:
        return block
    slug = gh_match.group(1)
    print(f"fetching {slug}…")
    data = fetch(slug)
    if not data:
        return block
    stars = data.get("stargazers_count")
    pushed_at = data.get("pushed_at")
    if isinstance(stars, int):
        block = re.sub(r"stars:\s*\d+,", f"stars: {stars},", block, count=1)
    if pushed_at:
        updated = relative_time(pushed_at).replace("'", "\\'")
        block = re.sub(
            r"updated:\s*'[^']*',",
            f"updated: '{updated}',",
            block,
            count=1,
        )
    return block


def main() -> int:
    if not REPOS_PATH.exists():
        print(f"error: {REPOS_PATH} not found (run from repo root)", file=sys.stderr)
        return 1
    src = REPOS_PATH.read_text()
    new_src = REPO_BLOCK.sub(update_block, src)
    if new_src == src:
        print("no changes")
        return 0
    REPOS_PATH.write_text(new_src)
    print(f"wrote {REPOS_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
