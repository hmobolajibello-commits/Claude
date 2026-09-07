#!/usr/bin/env bash
# Builds the website from src/guide.html.
#
# Dependencies: bash, awk, head, tail, cat, printf. No Python, no Node, no
# package install — so it runs on any host build image without configuration.
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
# common hosts. Override it for anything else:
#   SITE_URL=https://lineagepiece.example/ bash build.sh
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

DESC="An unofficial Lineage Piece wiki: 164 pages covering every island, boss, NPC, devil fruit, race, weapon, fighting style, key and system, plus reroll-odds and build-planning tools."

# The fragment's <title>/<link>/<style> block belongs in <head>; everything after
# the stylesheet is the <body>.
SPLIT=$(awk '/<\/style>/{print NR; exit}' src/guide.html)
if [ -z "${SPLIT:-}" ]; then
  echo "build.sh: no </style> found in src/guide.html — cannot split head from body" >&2
  exit 1
fi

{
  printf '<!doctype html>\n<html lang="en">\n<head>\n'
  cat <<META
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="$DESC">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#e7ecec" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#081215" media="(prefers-color-scheme: dark)">
<link rel="canonical" href="$SITE_URL">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Lineage Piece Field Manual">
<meta property="og:title" content="Lineage Piece Field Manual">
<meta property="og:description" content="$DESC">
<meta property="og:url" content="$SITE_URL">
<meta property="og:image" content="${SITE_URL}og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Lineage Piece Field Manual">
<meta name="twitter:description" content="$DESC">
<meta name="twitter:image" content="${SITE_URL}og.png">
<style>
:root{color-scheme:light dark}
img{max-width:100%}
[hidden]{display:none!important}
</style>
META
  head -n "$SPLIT" src/guide.html
  printf '</head>\n<body>\n'
  tail -n +"$((SPLIT + 1))" src/guide.html
  printf '\n</body>\n</html>\n'
} > index.html

rm -rf _site
mkdir -p _site
cp index.html _site/index.html
for asset in favicon.svg og.png _headers; do
  if [ -f "$asset" ]; then cp "$asset" "_site/$asset"; fi
done
: > _site/.nojekyll

# robots and sitemap carry the real host, so they are generated per deploy
printf 'User-agent: *\nAllow: /\nSitemap: %ssitemap.xml\n' "$SITE_URL" > _site/robots.txt
{
  printf '<?xml version="1.0" encoding="UTF-8"?>\n'
  printf '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
  printf '  <url>\n    <loc>%s</loc>\n    <changefreq>monthly</changefreq>\n    <priority>1.0</priority>\n  </url>\n' "$SITE_URL"
  printf '</urlset>\n'
} > _site/sitemap.xml

printf 'built index.html and _site/ for %s\n' "$SITE_URL"
