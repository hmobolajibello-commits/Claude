#!/usr/bin/env bash
# Wraps src/guide.html (an Artifact-shaped fragment: no <html>/<head>/<body>)
# into a complete standalone document at index.html.
# The fragment's leading <title>/<link>/<style> block is lifted into <head>;
# everything after it becomes the <body>.
set -euo pipefail
cd "$(dirname "$0")"

python3 - <<'PY'
src = open("src/guide.html", encoding="utf-8").read()
cut = src.index("</style>") + len("</style>")
head, body = src[:cut], src[cut:]

open("index.html", "w", encoding="utf-8").write(
"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="An unofficial field manual for the Roblox game Lineage Piece: island route, devil fruit and race odds, weapon recipes, boss keys, and build planning tools.">
<style>
:root{color-scheme:light dark}
img{max-width:100%}
[hidden]{display:none!important}
</style>
""" + head + """
</head>
<body>
""" + body + """
</body>
</html>
""")
print("built index.html", len(open("index.html", encoding="utf-8").read()), "chars")
PY
