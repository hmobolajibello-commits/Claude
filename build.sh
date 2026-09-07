#!/usr/bin/env bash
# Wraps src/guide.html (an Artifact-shaped fragment: no <html>/<head>/<body>)
# into the standalone index.html that ships as the website.
#
# The fragment's leading <title>/<link>/<style> block is lifted into <head>,
# the site metadata below is added, and everything after it becomes the <body>.
# Keeping the site chrome here rather than in the fragment means src/guide.html
# stays publishable as a Claude Artifact unchanged.
set -euo pipefail
cd "$(dirname "$0")"

SITE_URL="${SITE_URL:-https://hmobolajibello-commits.github.io/Claude/}"

SITE_URL="$SITE_URL" python3 - <<'PY'
import os

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

open("index.html", "w", encoding="utf-8").write(
    "<!doctype html>\n<html lang=\"en\">\n<head>\n" + meta + head
    + "\n</head>\n<body>\n" + body + "\n</body>\n</html>\n")
print("built index.html", len(open("index.html", encoding="utf-8").read()), "chars")
PY
