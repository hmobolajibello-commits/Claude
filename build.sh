#!/usr/bin/env bash
# Builds the website.
#
# Two wikis live in this repo:
#
#   src/data/*.js + tools/build-site.js  ->  site/        the Fisch Field Guide,
#                                                         a real multi-page site:
#                                                         one HTML file per page
#   src/guide.html                       ->  lineage-piece.html
#                                                         the Lineage Piece Field
#                                                         Manual, still a single-file
#                                                         app (and a Claude Artifact)
#
# Outputs:
#   site/                generated Fisch site, committed — a host can publish this
#                        directory directly with no build command at all
#   lineage-piece.html   generated single-file page, committed
#   _site/               the deploy directory: site/ at the root, plus a pretty
#                        /lineage-piece/ URL and host-specific robots + sitemap
#
# Dependencies: bash and Node 14.14 or newer (no npm install, no packages).
# Node ships in the build image of every static host this is aimed at. If a host
# has none, point it at the committed site/ directory with an empty build command.
#
# The canonical and sitemap URLs come from SITE_URL, auto-detected on the common
# hosts. Override it for anything else:
#   SITE_URL=https://example.com/ bash build.sh
set -eu
cd "$(dirname "$0")"

# Netlify exposes $URL, Cloudflare Pages exposes $CF_PAGES_URL (both without a
# trailing slash); fall back to the GitHub Pages address for this repo.
if [ -z "${SITE_URL:-}" ]; then
  if [ -n "${URL:-}" ]; then
    SITE_URL="${URL%/}/"
  elif [ -n "${CF_PAGES_URL:-}" ]; then
    SITE_URL="${CF_PAGES_URL%/}/"
  else
    SITE_URL="https://hmobolajibello-commits.github.io/Claude/"
  fi
fi

# ── the Lineage Piece manual: one fragment wrapped into a document ──────────
# src/guide.html is Artifact-shaped (no <html>/<head>/<body>), so the same file
# publishes both as a Claude Artifact and as this page. Its <title>/<link>/<style>
# block belongs in <head>; everything after the stylesheet is the <body>.
LP_DESC="An unofficial Lineage Piece wiki: 164 pages covering every island, boss, NPC, devil fruit, race, weapon, fighting style, key and system, plus reroll-odds and build-planning tools."
split=$(awk '/<\/style>/{print NR; exit}' src/guide.html)
if [ -z "${split:-}" ]; then
  echo "build.sh: no </style> found in src/guide.html — cannot split head from body" >&2
  exit 1
fi
{
  printf '<!doctype html>\n<html lang="en">\n<head>\n'
  cat <<META
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="$LP_DESC">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#e7ecec" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#081215" media="(prefers-color-scheme: dark)">
<link rel="canonical" href="${SITE_URL}lineage-piece/">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Lineage Piece Field Manual">
<meta property="og:title" content="Lineage Piece Field Manual">
<meta property="og:description" content="$LP_DESC">
<meta property="og:url" content="${SITE_URL}lineage-piece/">
<meta property="og:image" content="${SITE_URL}og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Lineage Piece Field Manual">
<meta name="twitter:description" content="$LP_DESC">
<meta name="twitter:image" content="${SITE_URL}og.png">
<style>
:root{color-scheme:light dark}
img{max-width:100%}
[hidden]{display:none!important}
</style>
META
  head -n "$split" src/guide.html
  printf '</head>\n<body>\n'
  tail -n +"$((split + 1))" src/guide.html
  printf '\n</body>\n</html>\n'
} > lineage-piece.html

# ── the Fisch site: one HTML file per page, generated from src/data ─────────
# Runs after the manual, because the generator copies lineage-piece.html into
# site/ so the committed directory is self-sufficient.
SITE_URL="$SITE_URL" node tools/build-site.js site

# ── assemble the deploy directory ──────────────────────────────────────────
rm -rf _site
cp -R site _site
mkdir -p _site/lineage-piece
cp lineage-piece.html _site/lineage-piece/index.html
# the manual's <link rel="icon"> is relative, so the pretty URL needs its own copy
cp favicon.svg _site/lineage-piece/favicon.svg
for asset in favicon.svg og.png _headers; do
  if [ -f "$asset" ]; then cp "$asset" "_site/$asset"; fi
done
: > _site/.nojekyll

printf 'built site/ (%s pages) + lineage-piece.html, assembled _site/ for %s\n' \
  "$(find site -name '*.html' | wc -l | tr -d ' ')" "$SITE_URL"
