#!/usr/bin/env bash
# Builds the website from src/guide.html.
#
# src/guide.html is an Artifact-shaped fragment (no <html>/<head>/<body>), so the
# same source publishes both as a Claude Artifact and as this site. This script
# wraps it into a document, adds the site metadata, and assembles _site/.
#
# Outputs:
#   index.html   standalone page, committed so the repo root can be served as-is
#   _site/       the deploy directory (index.html + assets + generated robots/sitemap)
#
# The canonical and social-card URLs come from SITE_URL, auto-detected on the
# common hosts. Override it directly for anything else:
#   SITE_URL=https://lineagepiece.example/ ./build.sh
set -euo pipefail
cd "$(dirname "$0")"

# Netlify exposes $URL, Cloudflare Pages exposes $CF_PAGES_URL (both without a
# trailing slash); fall back to the GitHub Pages address for this repo.
if [ -z "${SITE_URL:-}" ]; then
  if [ -n "${URL:-}" ]; then SITE_URL="${URL%/}/"
  elif [ -n "${CF_PAGES_URL:-}" ]; then SITE_URL="${CF_PAGES_URL%/}/"
  else SITE_URL="https://hmobolajibello-commits.github.io/Claude/"
  fi
fi

SITE_URL="$SITE_URL" python3 - <<'PY'
import os, shutil, pathlib

url = os.environ["SITE_URL"]
desc = ("An unofficial Lineage Piece wiki: 164 pages covering every island, boss, NPC, devil fruit, "
        "race, weapon, fighting style, key and system, plus reroll-odds and build-planning tools.")

src = open("src/guide.html", encoding="utf-8").read()
cut = src.index("</style>") + len("</style>")
head, body = src[:cut], src[cut:]

meta = f"""<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="{desc}">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#e7ecec" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#081215" media="(prefers-color-scheme: dark)">
<link rel="canonical" href="{url}">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Lineage Piece Field Manual">
<meta property="og:title" content="Lineage Piece Field Manual">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{url}og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Lineage Piece Field Manual">
<meta name="twitter:description" content="{desc}">
<meta name="twitter:image" content="{url}og.png">
<style>
:root{{color-scheme:light dark}}
img{{max-width:100%}}
[hidden]{{display:none!important}}
</style>
"""

page = ("<!doctype html>\n<html lang=\"en\">\n<head>\n" + meta + head
        + "\n</head>\n<body>\n" + body + "\n</body>\n</html>\n")
open("index.html", "w", encoding="utf-8").write(page)

site = pathlib.Path("_site")
if site.exists():
    shutil.rmtree(site)
site.mkdir()
(site / "index.html").write_text(page, encoding="utf-8")
for asset in ("favicon.svg", "og.png", "_headers"):
    if pathlib.Path(asset).exists():
        shutil.copy(asset, site / asset)
(site / ".nojekyll").write_text("", encoding="utf-8")

# robots and sitemap carry the real host, so they are generated rather than committed stale
(site / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {url}sitemap.xml\n", encoding="utf-8")
(site / "sitemap.xml").write_text(
    '<?xml version="1.0" encoding="UTF-8"?>\n'
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    f"  <url>\n    <loc>{url}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>1.0</priority>\n  </url>\n"
    "</urlset>\n", encoding="utf-8")

print(f"built index.html and _site/ ({len(page)} chars) for {url}")
PY
