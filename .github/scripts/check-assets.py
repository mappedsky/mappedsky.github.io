#!/usr/bin/env python3
"""Static checks on the published HTML.

Guards the two things that quietly break this site:

  1. A script tag pointing at a local file that the build doesn't produce
     (renaming a .jsx source without updating index.html), which ships a
     blank page.
  2. A remote <script> without an integrity attribute, which hands a
     third-party CDN the ability to run arbitrary code on the site.

Remote stylesheets are exempt from (2) on purpose: the Google Fonts CSS
endpoint varies its response by User-Agent, so it has no stable hash.

Run after `npm run build`, from the repo root.
"""

import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HTML_FILES = ["index.html", "brand/index.html"]


class AssetParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.scripts = []   # (src, integrity, is_babel)
        self.links = []     # (href, rel)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "script":
            self.scripts.append(
                (a.get("src"), a.get("integrity"), a.get("type") == "text/babel")
            )
        elif tag == "link":
            self.links.append((a.get("href"), (a.get("rel") or "").lower()))


def is_remote(url):
    return url.startswith(("http://", "https://", "//"))


def main():
    errors = []
    for rel_path in HTML_FILES:
        page = ROOT / rel_path
        if not page.exists():
            errors.append(f"{rel_path}: missing")
            continue

        parser = AssetParser()
        parser.feed(page.read_text(encoding="utf-8"))
        base = page.parent
        where = rel_path

        for src, integrity, is_babel in parser.scripts:
            if is_babel:
                errors.append(
                    f"{where}: found a type=\"text/babel\" script"
                    f" ({src or 'inline'}) — JSX must be compiled by"
                    f" `npm run build`, not transpiled in the browser"
                )
            if not src:
                continue
            if is_remote(src):
                if not integrity:
                    errors.append(
                        f"{where}: remote script has no integrity attribute: {src}"
                    )
                elif not integrity.startswith(("sha256-", "sha384-", "sha512-")):
                    errors.append(
                        f"{where}: malformed integrity value on {src}: {integrity!r}"
                    )
            else:
                target = (base / src.split("?", 1)[0]).resolve()
                if not target.is_file():
                    errors.append(f"{where}: script src does not exist: {src}")

        for href, rel in parser.links:
            if not href or is_remote(href):
                continue
            if rel in ("stylesheet", "icon", "shortcut icon"):
                target = (base / href.split("?", 1)[0]).resolve()
                if not target.is_file():
                    errors.append(f"{where}: {rel} href does not exist: {href}")

    if errors:
        print("Asset checks failed:\n", file=sys.stderr)
        for e in errors:
            print(f"  - {e}", file=sys.stderr)
        return 1

    print("Asset checks passed: local references resolve, remote scripts pinned with SRI.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
