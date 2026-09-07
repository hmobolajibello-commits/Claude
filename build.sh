#!/usr/bin/env bash
# Builds the website from the sources in src/.
#
# Two apps live in this repo, each a self-contained single-file wiki:
#   src/fisch.html  ->  index.html          (Fisch Field Guide — the main site)
#   src/guide.html  ->  lineage-piece.html  (Lineage Piece Field Manual)
#
# Dependencies: bash, awk, head, tail, cat, printf. No Python, no Node, no
# package install — so it runs on any host build image without configuration.
#
# Each source is an Artifact-shaped fragment (no <html>/<head>/<body>), so the
# same file publishes both as a Claude Artifact and as this site. This script
# wraps each one into a document, adds its site metadata, and assembles _site/.
#
# Outputs:
#   index.html                     the Fisch guide, committed so the repo root can
#   lineage-piece.html             be served as-is, with the Lineage Piece manual
#                                  beside it
#   _site/                         the deploy directory (pages + assets + generated
#                                  robots/sitemap). / is the Fisch guide,
#                                  /lineage-piece/ the manual, /fisch/ an alias
#
# Canonical and social-card URLs come from SITE_URL, auto-detected on the
# common hosts. Override it for anything else:
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

# build_page <src> <out> <page-url> <site-name> <title> <description>
build_page() {
  src=$1; out=$2; page=$3; name=$4; title=$5; desc=$6; light=$7; dark=$8

  # The fragment's <title>/<link>/<style> block belongs in <head>; everything
  # after the stylesheet is the <body>.
  split=$(awk '/<\/style>/{print NR; exit}' "$src")
  if [ -z "${split:-}" ]; then
    echo "build.sh: no </style> found in $src — cannot split head from body" >&2
    exit 1
  fi

  {
    printf '<!doctype html>\n<html lang="en">\n<head>\n'
    cat <<META
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="$desc">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="$light" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="$dark" media="(prefers-color-scheme: dark)">
<link rel="canonical" href="$page">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<meta property="og:type" content="website">
<meta property="og:site_name" content="$name">
<meta property="og:title" content="$title">
<meta property="og:description" content="$desc">
<meta property="og:url" content="$page">
<meta property="og:image" content="${SITE_URL}og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="$title">
<meta name="twitter:description" content="$desc">
<meta name="twitter:image" content="${SITE_URL}og.png">
<style>
:root{color-scheme:light dark}
img{max-width:100%}
[hidden]{display:none!important}
</style>
META
    head -n "$split" "$src"
    printf '</head>\n<body>\n'
    tail -n +"$((split + 1))" "$src"
    printf '\n</body>\n</html>\n'
  } > "$out"
}

LP_DESC="An unofficial Lineage Piece wiki: 164 pages covering every island, boss, NPC, devil fruit, race, weapon, fighting style, key and system, plus reroll-odds and build-planning tools."
FI_DESC="An unofficial Fisch wiki: locations, rods, baits, fish, enchants and mutations, a beginner's guide, an eight-phase progression roadmap, and a planner that takes your level, rod and C\$ and tells you what to do next."

build_page src/fisch.html index.html "$SITE_URL" \
  "Fisch Field Guide" "Fisch Field Guide — wiki & progression planner" "$FI_DESC" "#e8eef2" "#06121a"
build_page src/guide.html lineage-piece.html "${SITE_URL}lineage-piece/" \
  "Lineage Piece Field Manual" "Lineage Piece Field Manual" "$LP_DESC" "#e7ecec" "#081215"

rm -rf _site
mkdir -p _site/lineage-piece _site/fisch
cp index.html _site/index.html
cp lineage-piece.html _site/lineage-piece.html
cp lineage-piece.html _site/lineage-piece/index.html
# /fisch/ kept as an alias for anyone who already has the link; its canonical
# tag points at the site root, so it is not a competing copy
cp index.html _site/fisch/index.html
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
  printf '  <url>\n    <loc>%slineage-piece/</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>\n' "$SITE_URL"
  printf '</urlset>\n'
} > _site/sitemap.xml

printf 'built index.html (Fisch) + lineage-piece.html and _site/ for %s\n' "$SITE_URL"
