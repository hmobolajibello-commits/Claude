#!/usr/bin/env node
"use strict";
/* ═══════════════ Fisch Field Guide — static site generator ═══════════════
   Reads src/data/*.js and writes a real multi-page website into site/:
   one directory per page, one HTML file each, relative links throughout so
   the same output works from a file:// path, a domain root, or a project
   subpath like /Claude/ without being rebuilt.

     node tools/build-site.js [outdir]      (default: site)                */

const fs = require("fs");
const path = require("path");
const D = require("../src/data/fisch.js");
const GUIDES_BODY = require("../src/data/guides.js");

const OUT = path.resolve(__dirname, "..", process.argv[2] || "site");
const SRC = path.resolve(__dirname, "..", "src");

/* ── category → url segment ───────────────────────────────────────────── */
const SEG = {loc:"locations", npc:"npcs", hunt:"bosses", rod:"rods", bait:"baits",
  ench:"enchants", item:"items", fish:"fish", mut:"mutations", mech:"mechanics"};
const TOOLSEG = {path:"path-planner", budget:"rod-budget", odds:"odds", value:"fish-value"};

/* strip tags for titles, meta descriptions and the search index — entities are
   decoded rather than blanked, so a title reads "Accuracy & sources", not
   "Accuracy  sources". */
const ENT = {"&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&nbsp;": " ",
  "&mdash;": "\u2014", "&ndash;": "\u2013", "&middot;": "\u00b7", "&times;": "\u00d7",
  "&minus;": "\u2212", "&rarr;": "\u2192", "&larr;": "\u2190", "&hellip;": "\u2026",
  "&ldquo;": "\u201c", "&rdquo;": "\u201d", "&rsaquo;": "\u203a", "&#8217;": "\u2019"};
const strip = h => String(h).replace(/<[^>]+>/g, "")
  .replace(/&#?[a-z0-9]+;/gi, m => (ENT[m] !== undefined ? ENT[m] : " "))
  .replace(/\s+/g, " ").trim();
const commas = n => Math.round(n).toLocaleString("en-US");
const BY = {}; D.DB.forEach(e => { BY[e.id] = e; });

/* every page in the site, with the depth its URL sits at */
const PAGES = [];
const reg = (url, depth) => { PAGES.push({url, depth}); return url; };
const urlHome = "index.html";
const urlCat = t => SEG[t] + "/index.html";
const urlEntry = e => SEG[e.type] + "/" + e.id + "/index.html";
const urlGuide = k => "guides/" + k + "/index.html";
const urlTool = k => "tools/" + TOOLSEG[k] + "/index.html";

/* ── link rewriting ───────────────────────────────────────────────────────
   Data uses the wiki's #/e/<id> scheme; turn it into a relative path. */
function resolveHash(h) {
  const m = h.match(/^#\/([egtc])\/([a-z0-9-]+)$/);
  if (!m) return null;
  if (m[1] === "e") return BY[m[2]] ? urlEntry(BY[m[2]]) : null;
  if (m[1] === "c") return D.CATS[m[2]] ? urlCat(m[2]) : null;
  if (m[1] === "g") return GUIDES_BODY[m[2]] ? urlGuide(m[2]) : null;
  if (m[1] === "t") return D.TOOLS[m[2]] ? urlTool(m[2]) : null;
  return null;
}
const up = depth => (depth ? "../".repeat(depth) : "");
function rel(depth, target) { return up(depth) + target.replace(/index\.html$/, "") || "./"; }
/* rewrite every #/… href inside a blob of html for a page at `depth` */
function links(html, depth) {
  return String(html).replace(/href="(#\/[^"]+)"/g, (all, h) => {
    const t = resolveHash(h);
    return t ? 'href="' + rel(depth, t) + '"' : 'href="' + rel(depth, urlHome) + '"';
  });
}
/* an id from a `see` list resolves like the router's link() did */
function seeLink(id, depth) {
  if (BY[id]) return [rel(depth, urlEntry(BY[id])), BY[id].name];
  if (D.INDEXES[id]) return [rel(depth, urlCat(D.INDEXES[id])), D.CATS[D.INDEXES[id]].n];
  if (GUIDES_BODY[id]) return [rel(depth, urlGuide(id)), GUIDES_BODY[id].n];
  if (D.TOOLS[id]) return [rel(depth, urlTool(id)), D.TOOLS[id].n];
  return null;
}

/* Canonical and social-card URLs need the real host, so they are emitted only
   when SITE_URL is set (build.sh always sets it). Everything else on the page
   is relative, so the output stays host-agnostic without them. */
const SITE_URL = process.env.SITE_URL || "";
const rootPath = u => u.replace(/index\.html$/, "");

/* ── the page shell ───────────────────────────────────────────────────── */
const NAVGROUPS = (() => {
  const g = {};
  Object.keys(D.CATS).forEach(t => {
    (g[D.CATS[t].g] = g[D.CATS[t].g] || []).push([urlCat(t), D.CATS[t].n, D.DB.filter(e => e.type === t).length]);
  });
  Object.keys(GUIDES_BODY).forEach(k => (g.Guides = g.Guides || []).push([urlGuide(k), GUIDES_BODY[k].n, ""]));
  Object.keys(D.TOOLS).forEach(k => (g.Tools = g.Tools || []).push([urlTool(k), D.TOOLS[k].n, ""]));
  return g;
})();

function shell(o) {
  const d = o.depth, u = up(d);
  let nav = '<a href="' + rel(d, urlHome) + '"' + (o.url === urlHome ? ' class="on"' : "") + ' style="font-weight:600">Main page</a>';
  Object.keys(NAVGROUPS).forEach(grp => {
    nav += '<div class="sgroup">' + grp + "</div>";
    NAVGROUPS[grp].forEach(r => {
      nav += '<a href="' + rel(d, r[0]) + '"' + (o.url === r[0] ? ' class="on"' : "") + ">" + r[1]
        + (r[2] ? "<em>" + r[2] + "</em>" : "") + "</a>";
    });
  });
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${o.title}</title>
<meta name="description" content="${o.desc.replace(/"/g, "&quot;")}">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#e8eef2" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#06121a" media="(prefers-color-scheme: dark)">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Fisch Field Guide">
<meta property="og:title" content="${o.title}">
<meta property="og:description" content="${o.desc.replace(/"/g, "&quot;")}">${SITE_URL ? `
<meta property="og:url" content="${SITE_URL}${rootPath(o.url)}">
<meta property="og:image" content="${SITE_URL}og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${o.title}">
<meta name="twitter:description" content="${o.desc.replace(/"/g, "&quot;")}">
<meta name="twitter:image" content="${SITE_URL}og.png">
<link rel="canonical" href="${SITE_URL}${rootPath(o.url)}">` : ""}
<link rel="icon" href="${u}favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${u}assets/style.css">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="top">
  <a class="mark" href="${rel(d, urlHome)}"><b>Fisch</b><span>Field Guide</span></a>
  <div class="searchwrap">
    <input id="search" type="search" autocomplete="off" spellcheck="false" placeholder="Search ${D.DB.length} pages — rods, baits, fish, locations…  (press /)" aria-label="Search the wiki">
    <div class="results" id="results" hidden></div>
  </div>
  <div class="topright">
    <span class="stamp">Sept 2026</span>
    <button class="ghost" id="randbtn" type="button">Random</button>
    <button class="ghost" id="themebtn" type="button">Theme: auto</button>
  </div>
</header>
<div class="frame">
  <nav class="side" aria-label="Sections">${nav}</nav>
  <main class="view" id="main">${o.body}</main>
</div>
<footer class="sitefoot">
  <span>Unofficial fan documentation &mdash; not affiliated with the Fisch developers or Roblox Corporation.</span>
  <span>Data compiled September 2026 &middot; <a href="${rel(d, urlGuide("sources"))}">Accuracy &amp; sources</a> &middot; <a href="${u}lineage-piece.html">Lineage Piece Field Manual</a></span>
</footer>
<script>window.BASE=${JSON.stringify(u)};</script>
<script src="${u}assets/search-index.js"></script>
<script src="${u}assets/app-data.js"></script>
<script src="${u}assets/site.js"></script>
</body>
</html>
`;
}

function write(url, html) {
  const f = path.join(OUT, url);
  fs.mkdirSync(path.dirname(f), {recursive: true});
  fs.writeFileSync(f, html);
}

/* ── shared bits ──────────────────────────────────────────────────────── */
function crumb(depth, trail) {
  return '<div class="crumb"><a href="' + rel(depth, urlHome) + '">Main page</a>'
    + trail.map(t => " &rsaquo; " + (t[1] ? '<a href="' + rel(depth, t[1]) + '">' + t[0] + "</a>" : "<span>" + t[0] + "</span>")).join("")
    + "</div>";
}
function table(head, rows, cls) {
  return '<div class="tablewrap"><table' + (cls ? ' class="' + cls + '"' : "") + "><thead><tr>"
    + head.map(h => "<th>" + h + "</th>").join("") + "</tr></thead><tbody>"
    + rows.map(r => "<tr>" + r.map(c => "<td>" + c + "</td>").join("") + "</tr>").join("")
    + "</tbody></table></div>";
}

const CATNOTE = {
  rod:  "Fisch adds rods faster than anyone documents them &mdash; the counts published by community databases in September 2026 are <strong>188, 227, 232, 244 and 257</strong>. Listed here are the <strong>" + D.RODS.length + "</strong> this wiki could source a real acquisition route for, ordered by roughly where they sit in a progression. Where a price or route is not consistently published, the row says so instead of guessing.",
  fish: "Fisch has more than a thousand species. These are the ones that <strong>change a decision</strong>: quest fish, farm targets, weather-gated bestiary holes and trophies.",
  ench: "Only the enchants the sources agree on are listed. The regular relic pool is documented inconsistently across community wikis, so rather than reproduce a list that might be wrong, this page covers the exalted enchants and the <a href=\"#/g/enchanting\">enchanting guide</a> covers the process.",
  bait: "The commonly-quoted bait roster runs past sixty entries and changes with patches. These are the archetypes &mdash; once you can tell preferred luck from universal luck, any bait in the game reads clearly.",
  mut:  "Multipliers as published by community mutation tables. Attributes (Shiny, Sparkling) are listed alongside mutations because they stack with them."
};

/* ── home ─────────────────────────────────────────────────────────────── */
function buildHome() {
  const d = 0;
  const tiles = [
    [urlTool("path"), "Where am I? &mdash; path planner", "Put in your level, rod and bank balance. Get the next five things to do, in order, with what they cost.", "Start here"],
    [urlGuide("beginner"), "Beginner&#8217;s guide", "The first hour, the three-part minigame, and the purchases that are worth making.", "Guide"],
    [urlCat("rod"), "All " + D.RODS.length + " rods", "Every rod with a sourced route, from the free Flimsy to the 50,000,000 C$ Olympian Godbreaker.", "Database"],
    [urlGuide("progression"), "Progression roadmap", "Eight phases from the Moosewood dock to the money meta, with a checklist that saves.", "Guide"]];
  const body = '<div class="hero"><h1>The Fisch <em>field guide</em>.</h1>'
    + "<p>" + D.DB.length + " pages on Roblox&#8217;s fishing game &mdash; " + D.RODS.length
    + " rods, every location on the progression route, baits, enchants, mutations, bosses and systems &mdash; plus a planner that takes your level, rod and C$ and tells you what to do next.</p></div>"
    + '<div class="tiles">' + tiles.map((t, i) => '<a class="tile' + (i ? "" : " hi") + '" href="' + rel(d, t[0]) + '"><em>'
        + t[3] + "</em><b>" + t[1] + "</b><span>" + t[2] + "</span></a>").join("") + "</div>"
    + '<h2 class="sh">Browse the database</h2><div class="catgrid">'
    + Object.keys(D.CATS).map(t => '<a class="cat" href="' + rel(d, urlCat(t)) + '"><b>' + D.CATS[t].n
        + "</b><span>" + D.DB.filter(e => e.type === t).length + " pages</span></a>").join("") + "</div>"
    + '<h2 class="sh">The route, in one table</h2>'
    + table(["Phase", "Level", "The one thing that matters"],
        [["Phase 0", "1&ndash;10", "Rowboat (400 C$), then the Carbon Rod (2,000 C$). Nothing else."],
         ["Phase 1", "10&ndash;40", "Steady Rod, then Agaric&#8217;s <strong>free</strong> Fungal Rod. Open the Keepers Altar for 400 C$."],
         ["Phase 2", "40&ndash;80", "Farm Forsaken Shores. Bank relics, enchant once, properly."],
         ["Phase 3", "80&ndash;150", "Trident Rod, 150,000 C$. Its 30% Atlantean passive pays part of itself back."],
         ["Phase 4", "150&ndash;180", "Vertigo to 100%, The Depths Key, Rod of the Depths at 750,000 C$."],
         ["Phase 5", "180+", "Atlantis: five levers, the Kraken, the Kraken Rod."],
         ["Phase 6", "Endgame", "Great Dreamer at 500,000 C$; an exalted enchant on the rod you keep."],
         ["Phase 7", "Endgame", "Castaway Cliffs or the Calm Zone, and the money stops being a constraint."]]
        .map(r => ["<strong>" + r[0] + "</strong>", '<span class="num">' + r[1] + "</span>", r[2]]))
    + '<h2 class="sh">Quick facts</h2>'
    + table(["", ""],
        [["Game", "Fisch &mdash; Roblox fishing RPG"],
         ["You start with", "A Flimsy Rod, no bait and no money, on the Moosewood dock"],
         ["First purchase", "Carbon Rod &mdash; 2,000 C$"],
         ["Cheapest important purchase", "Rowboat &mdash; 400 C$"],
         ["Best free item in the game", "Fungal Rod, from Agaric, for catching one Alligator"],
         ["Rods documented here", D.RODS.length + ' of a reported <span class="flag" title="188, 227, 232, 244 and 257 all appear in September 2026 databases">188&ndash;257</span>'],
         ["Cheapest rod", "Training Rod &mdash; 300 C$"],
         ["Most expensive rod", "Olympian Godbreaker &mdash; 50,000,000 C$, at level 981"],
         ["XP per level", "190 &times; your current level"],
         ["Max level", "2,000 &mdash; about 997 million XP"],
         ["Bestiary gate", "70% total unlocks the Destiny Rod at 190,000 C$"],
         ["Hardest base-game gate", "100% Vertigo bestiary, for The Depths Key"],
         ["Top mutation multiplier", "Aether, 12&times;"],
         ["Endgame income", '<span class="flag" title="Community figures; the high number is specific to the Elder Moss Ripper setup">2&ndash;4M C$/hr, or 15&ndash;25M with the Elder Moss Ripper</span>']]
        .map(r => ["<strong>" + r[0] + "</strong>", r[1]]))
    + '<div class="warnbox"><strong>On accuracy:</strong> Fisch patches constantly and shop prices, drop rates and event islands move with it. Figures that community sources disagree on are marked <span class="flag" title="Like this">like this</span> and collected on the <a href="'
    + rel(d, urlGuide("sources")) + '">Accuracy &amp; sources</a> page. Verify anything expensive at the merchant before you commit to it.</div>';
  reg(urlHome, 0);
  write(urlHome, shell({url: urlHome, depth: 0, title: "Fisch Field Guide — wiki & progression planner",
    desc: "An unofficial Fisch wiki: " + D.RODS.length + " rods, locations, baits, fish, enchants and mutations, a beginner's guide, an eight-phase roadmap, and a planner that tells you what to do next.",
    body: links(body, 0)}));
}

/* ── category index pages ─────────────────────────────────────────────── */
function buildCategory(t) {
  const url = urlCat(t), d = 1, cat = D.CATS[t];
  const rows = D.DB.filter(e => e.type === t);
  const facets = []; rows.forEach(e => { const k = e.tier || e.rar; if (k && facets.indexOf(k) < 0) facets.push(k); });
  const body = crumb(d, [[cat.n, null]])
    + '<h1 class="pt">' + cat.n + '</h1><div class="chips"><span class="chip">' + rows.length + " pages</span>"
    + '<span class="chip">Click a column to sort</span></div>'
    + (CATNOTE[t] ? '<div class="note" style="margin-top:14px">' + CATNOTE[t] + "</div>" : "")
    + (facets.length ? '<div class="filters"><button class="fbtn on" data-f="">All</button>'
        + facets.map(k => '<button class="fbtn" data-f="' + k + '">' + k + "</button>").join("") + "</div>" : "")
    + '<div class="tablewrap"><table class="sortable"><thead><tr>'
    + cat.cols.map((c, i) => '<th class="s" data-i="' + i + '">' + c + "</th>").join("")
    + '</tr></thead><tbody>'
    + rows.map(e => '<tr data-facet="' + (e.tier || e.rar || "") + '"><td><a href="' + rel(d, urlEntry(e)) + '">' + e.name + "</a></td>"
        + e.t.map(c => "<td>" + c + "</td>").join("") + "</tr>").join("")
    + "</tbody></table></div>"
    + '<p class="note">Every row is its own page. Search from the bar above to jump straight to one.</p>';
  reg(url, d);
  write(url, shell({url, depth: d, title: strip(cat.n) + " — Fisch Field Guide",
    desc: rows.length + " " + strip(cat.n).toLowerCase() + " pages in the Fisch Field Guide.",
    body: links(body, d)}));
}

/* ── entry pages ──────────────────────────────────────────────────────── */
function buildEntry(e) {
  const url = urlEntry(e), d = 2, cat = D.CATS[e.type];
  const sibs = D.DB.filter(x => x.type === e.type), i = sibs.indexOf(e);
  const chips = ['<span class="chip">' + cat.n + "</span>"]
    .concat(e.rar ? ['<span class="chip t rar-' + e.rar + '">' + e.rar + "</span>"] : [])
    .concat(e.tier ? ['<span class="chip t" style="color:var(--r-' + (e.tier === "S" ? "mythical" : e.tier === "A" ? "legendary" : e.tier === "B" ? "rare" : "common") + ')">Tier ' + e.tier + "</span>"] : [])
    .concat(e.stage !== undefined ? ['<span class="chip">Stage ' + e.stage + " &middot; " + D.STAGES[e.stage] + "</span>"] : []);
  const see = (e.see || []).map(id => seeLink(id, d)).filter(Boolean)
    .filter(l => l[0] !== rel(d, url))
    .filter((l, idx, arr) => arr.findIndex(x => x[0] === l[0]) === idx)
    .map(l => '<a href="' + l[0] + '">' + l[1] + "</a>").join("");
  const body = '<div class="page"><article>'
    + crumb(d, [[cat.n, urlCat(e.type)], [e.name, null]])
    + '<h1 class="pt">' + e.name + '</h1><div class="chips">' + chips.join("") + "</div>"
    + '<p class="lead">' + e.lead + "</p>"
    + (e.sec || []).map(s => '<h2 class="sh">' + s[0] + '</h2><div class="prose">' + s[1] + "</div>").join("")
    + (see ? '<h2 class="sh">See also</h2><div class="seealso">' + see + "</div>" : "")
    + '<div class="pagefoot"><span>Data: September 2026</span><span>'
    + (i > 0 ? '<a href="' + rel(d, urlEntry(sibs[i - 1])) + '">&larr; ' + sibs[i - 1].name + "</a>" : "")
    + (i > 0 && i < sibs.length - 1 ? " &nbsp;&middot;&nbsp; " : "")
    + (i < sibs.length - 1 ? '<a href="' + rel(d, urlEntry(sibs[i + 1])) + '">' + sibs[i + 1].name + " &rarr;</a>" : "")
    + "</span></div></article>"
    + '<aside class="infobox"><div class="ibhead"><span>' + cat.n + "</span><b>" + e.name + "</b></div>"
    + (e.info || []).map(r => '<dl class="ibrow"><dt>' + r[0] + "</dt><dd>" + r[1] + "</dd></dl>").join("")
    + "</aside></div>";
  reg(url, d);
  write(url, shell({url, depth: d, title: strip(e.name) + " — Fisch Field Guide",
    desc: strip(e.lead).replace(/\s+/g, " ").trim().slice(0, 180),
    body: links(body, d)}));
}

/* ── guide pages ──────────────────────────────────────────────────────── */
const MISTAKES = [
 ["Buying the Plastic or Training rod", "They cost 900 C$ and 300 C$; the <a href=\"#/e/carbon-rod\">Carbon Rod</a> costs 2,000 and outclasses both. Buying them means earning the 2,000 anyway, later."],
 ["Not buying the boat first", "400 C$ opens the entire map. Nothing else you can buy at that price does anything comparable."],
 ["Skipping Agaric", "The <a href=\"#/e/fungal-rod\">Fungal Rod</a> is <em>free</em> and beats the rods on sale at that stage. One Alligator in <a href=\"#/e/mushgrove-swamp\">Mushgrove Swamp</a>."],
 ["Leaving the Keepers Altar unopened", "A one-time 400 C$ bribe gates the whole <a href=\"#/g/enchanting\">enchanting</a> system &mdash; and the <a href=\"#/e/kings-rod\">King&#8217;s Rod</a> is sitting down there next to a skeleton."],
 ["Re-rolling an enchant you liked", "Every roll <strong>overwrites</strong> the last one. Farm a stack of relics, roll until something good lands, then stop."],
 ["Stacking preferred luck for general farming", "A +300% preferred bait does nothing measurable if you are not hunting the species it prefers. Use universal luck for sweeps."],
 ["Fishing wherever you happen to be", "Base species value is the biggest term in what a fish sells for. Where you fish matters more than what you fish with."],
 ["Waiting for weather", "Fog, rain, wind and time of day are all purchasable as <a href=\"#/e/totems\">totems</a>. Waiting is a choice."],
 ["Appraising everything", "<a href=\"#/e/appraisal\">Appraisal</a> re-rolls mutation too, so it can make a fish worse. Appraise fish that already show a mutation."],
 ["Ignoring the bestiary until it is asked for", "70% total unlocks the <a href=\"#/e/destiny-rod\">Destiny Rod</a> and 100% of Vertigo is the only route to The Depths. Both are far more painful retroactively."],
 ["Upgrading instead of mastering", "<a href=\"#/e/rod-mastery\">Rod Mastery</a> permanently buffs the rod you already carry. A mastered mid-tier rod can beat a fresh higher-tier one."],
 ["Assuming a guide&#8217;s price is current", "Fisch patches often. Every figure on this site &mdash; including the ones without a warning mark &mdash; is worth a glance at the merchant before you commit."]];

const MONEYROWS = [
 ["0&ndash;1", "Moosewood dock, Roslit Bay", "A few thousand C$/hr", "Volume. Sell the trash too."],
 ["2&ndash;3", "<a href=\"#/e/forsaken-shores\">Forsaken Shores</a> waterfall pond", "<span class=\"flag\" title=\"Community estimate; depends heavily on rod, bait and luck\">100K&ndash;500K C$/hr</span>", "The best money <em>and</em> XP spot of the mid-game, which is rare."],
 ["4&ndash;5", "Forsaken Shores with the <a href=\"#/e/trident-rod\">Trident Rod</a>", "Same spot, better rate", "30% Atlantean at 3&times; value is roughly a 60% raise on the average sale."],
 ["6&ndash;7", "<a href=\"#/e/calm-zone\">The Calm Zone</a>", "~26,100 C$ per Crystallized Seadragon", "Rewards whatever rod you already own &mdash; no specific drop required."],
 ["8", "<a href=\"#/e/castaway-cliffs\">Castaway Cliffs</a>", "<span class=\"flag\" title=\"2-4M without the rod; 15-25M is the Elder Moss Ripper figure\">2&ndash;4M C$/hr, or 15&ndash;25M</span>", "The <a href=\"#/e/elder-moss-ripper\">Elder Moss Ripper</a>&#8217;s Mossjaw passive is a two-minute <em>timer</em>, not a roll."],
 ["8", "Anywhere, with the <a href=\"#/e/ethereal-prism-rod\">Ethereal Prism Rod</a>", "8&times; on half your catches", "A 50% Prismize rate is not a bonus, it is a different economy."]];

const CODES = [
 ["SkycrestIsInTheSky", "1,000 coins, Banana boat, 5&times; Icy Fisch&#8217;n Dots, 5&times; Coral Pearl, 5&times; Cotton Candy Pieces, 5&times; Tropical Fruit mix, random totem"],
 ["Shady", "1,000 coins, Neongrinder skin, Chainsaw skin, 5&times; Golden Tentacles, 20&times; Shady Scrip, random totem"],
 ["HumpbackAndMegamouth", "1,000 coins, 5&times; Golden Tentacles, random totem"],
 ["Sovereign", "1,000 coins, Shiny Flopping Salmon companion, 5&times; Golden Tentacles"]];

const DISPUTES = [
 ["How many rods exist", "<b>188</b>, <b>227</b>, <b>232</b>, <b>244</b> and <b>257</b> all appear in September 2026 databases. This wiki documents the " + D.RODS.length + " it could source a route for."],
 ["Kraken Rod price", "<b>950,000 C$</b> vs. <b>1,333,333 C$</b>."],
 ["Ethereal Prism Rod price", "<b>3,500,000 C$</b> vs. <b>15,000,000 C$</b>."],
 ["Leviathan&#8217;s Fang price", "<b>350,000 C$</b> in the Mariana&#8217;s Veil round-ups vs. <b>1,850,000 C$</b> in a Sunken Depths write-up."],
 ["Tempest Rod price", "<b>500,000 C$</b> vs. <b>1,850,000 C$</b>."],
 ["King&#8217;s Rod price", "<b>100,000 C$</b> vs. <b>120,000 C$</b>."],
 ["Fast and Lucky rod prices", "Fast Rod <b>4,000</b> vs. <b>4,500 C$</b>; Lucky Rod <b>4,500</b> vs. <b>5,250 C$</b>."],
 ["The every-third-catch passive", "Credited to the <a href=\"#/e/rod-of-the-depths\">Rod of the Depths</a> in one source and the <a href=\"#/e/great-dreamer-rod\">Great Dreamer Rod</a> in another."],
 ["Rarity tier count", "12, 17 or 18, plus separate Limited / Special / Extinct categories."],
 ["100% bestiary reward", "Aurora Bobber, Aurora Glow Lantern, or the <a href=\"#/e/masterline-rod\">Masterline Rod</a>, depending on the source."],
 ["Totem count", "20 vs. 26 &mdash; almost certainly a patch-date difference."],
 ["Bait roster size", "25, 62 and 65 by different databases in 2026."],
 ["Money rates per hour", "Every figure on this site is a community estimate under an unstated setup. Use them to rank spots, never as a prediction."]];

const SOURCELIST = ["The official Fisch wiki (fischipedia.org)", "The Fisch Fandom wiki", "FischNexus", "BloxGuidesGG",
 "Fisch Calculator", "Bloxodes", "EnchantFisch", "Pro Game Guides", "Destructoid", "Beebom", "PCGamesN", "Sportskeeda",
 "Dot Esports", "Droid Gamers", "Deltia&#8217;s Gaming", "allthings.how", "VideoGamesChronicle", "GameRant", "TechWiser",
 "Roonby", "howtofisch.wiki", "Try Hard Guides", "TheGamer", "GINX TV", "Free to Player"];

function guideBody(k, d) {
  const g = GUIDES_BODY[k];
  let html = g.html;
  if (html === "MISTAKES_TABLE") {
    html = table(["#", "Mistake", "Why it costs you"],
      MISTAKES.map((m, i) => ['<span class="num">' + (i + 1) + "</span>", "<strong>" + m[0] + "</strong>", m[1]]));
  } else if (html === "CODES_BLOCK") {
    html = '<div class="codegrid">' + CODES.map(c => '<div class="code"><span class="c">' + c[0] + "<small>" + c[1]
        + '</small></span><button class="copy" type="button" data-c="' + c[0] + '">Copy</button></div>').join("") + "</div>"
      + '<h2 class="sh">Redeeming</h2><div class="prose"><ol><li>Open Fisch on Roblox.</li><li>Tap the <strong>Menu</strong> button.</li>'
      + "<li>Go to <strong>Rewards</strong>.</li><li>Type the code exactly &mdash; they are case-sensitive &mdash; and press <strong>Redeem</strong>.</li></ol>"
      + "<p>Rewards land instantly. A code that fails has almost certainly expired rather than been typed wrong &mdash; one tracker counted 36 working out of 139 ever issued.</p></div>"
      + '<div class="warnbox"><strong>These expire.</strong> This list is a snapshot from September 2026, not a live feed. If a code fails, it is dead &mdash; check the game&#8217;s own social channels for current ones.</div>';
  } else if (html === "SOURCES_BLOCK") {
    html = '<h2 class="sh">How this wiki treats disagreement</h2><div class="prose">'
      + "<p>Where sources conflict, both readings are shown and the figure is marked <span class=\"flag\" title=\"Like this\">like this</span> rather than smoothed into one confident number. Where sources are simply thin &mdash; the regular enchant pool, a good many shop prices, the acquisition routes for several late-game rods &mdash; this wiki says so instead of filling the gap.</p>"
      + "<p>Data was compiled in <strong>September 2026</strong>, immediately after the Skycrest update. Event content on this site (Skycrest, Fischfest 2026) has since closed on its published schedule; the systems those events introduced are treated as live.</p>"
      + "<p><strong>On the rod list specifically:</strong> the community counts between 188 and 257 rods. This wiki documents <strong>" + D.RODS.length + "</strong> &mdash; every one it could find a real acquisition route or shop for. The rest exist; they are simply not documented anywhere this wiki could verify, and inventing plausible prices for a 750,000 C$ purchase would be worse than leaving them out.</p></div>"
      + '<h2 class="sh">Known disputes</h2>'
      + table(["Figure", "Readings in circulation"], DISPUTES.map(x => ["<strong>" + x[0] + "</strong>", x[1]]))
      + '<h2 class="sh">Source families</h2><div class="prose"><ul class="srclist">'
      + SOURCELIST.map(s => "<li>" + s + "</li>").join("") + "</ul></div>"
      + '<div class="warnbox"><strong>Before you spend anything large:</strong> check the price at the merchant, and check the drop you are farming against the in-game bestiary. A 750,000 C$ rod is not the place to trust a community figure &mdash; including one on this page.</div>';
  } else if (html === "ROADMAP_BLOCK") {
    html = '<div class="progline"><b id="pcount">0 / ' + D.MILESTONES.length + ' done</b><div class="progtrack"><div class="progfill" id="pfill"></div></div><button class="ghost" id="reset" type="button">Reset</button></div>'
      + D.PHASES.map((p, pi) => {
          const ms = D.MILESTONES.filter(m => m.ph === pi);
          return '<div class="phase"><div class="phasehead"><h3>' + p.n + '</h3><span class="lv">' + p.lv + "</span></div>"
            + '<div class="note" style="margin:8px 12px 0;border:0;padding-left:0">' + p.note + "</div><ul class=\"tasks\">"
            + ms.map(m => '<li class="task" data-k="' + m.id + '"><input type="checkbox" tabindex="-1"><span><strong>' + m.t + "</strong>"
                + (m.cost ? ' <span class="num">&mdash; ' + commas(m.cost) + " C$</span>" : "")
                + (m.lvl ? ' <span class="num">&mdash; level ' + m.lvl + "</span>" : "")
                + "<br>" + m.body + "</span></li>").join("")
            + "</ul></div>";
        }).join("");
  } else if (html.indexOf("MONEY_TABLE") >= 0) {
    html = html.replace("MONEY_TABLE", table(["Stage", "Where", "Roughly", "What makes it work"],
      MONEYROWS.map(r => ['<span class="num">' + r[0] + "</span>", r[1], '<span class="num">' + r[2] + "</span>", r[3]])));
  }
  return html;
}

function buildGuide(k) {
  const url = urlGuide(k), d = 2, g = GUIDES_BODY[k];
  const body = crumb(d, [["Guides", null], [g.n, null]])
    + '<h1 class="pt">' + g.n + '</h1><p class="lead">' + g.lede + "</p>"
    + guideBody(k, d);
  reg(url, d);
  write(url, shell({url, depth: d, title: strip(g.n) + " — Fisch Field Guide",
    desc: strip(g.lede).replace(/\s+/g, " ").trim().slice(0, 180), body: links(body, d)}));
}

/* ── tool pages ───────────────────────────────────────────────────────── */
const TOOLBODY = {
 path: '<div class="tool"><div class="controls">'
   + '<div class="field"><label for="p-lvl">Your level</label><input id="p-lvl" type="number" min="1" max="2000" value="25"></div>'
   + '<div class="field"><label for="p-rod">Your best rod</label><select id="p-rod"></select></div>'
   + '<div class="field"><label for="p-cash">C$ on hand</label><input id="p-cash" type="number" min="0" value="5000"></div>'
   + '<div class="field"><label for="p-goal">What you want right now</label><select id="p-goal"></select></div></div>'
   + '<div><label class="fieldlabel">Already done</label><div class="checkgrid" id="p-flags"></div></div>'
   + '<button class="ghost" id="p-reset" type="button" style="justify-self:start">Reset answers</button></div><div id="p-out"></div>',
 budget: '<div class="tool"><div class="controls">'
   + '<div class="field"><label for="b-cash">C$ on hand</label><input id="b-cash" type="number" min="0" value="150000"></div>'
   + '<div class="field"><label for="b-stage">Where you fish now</label><select id="b-stage"></select></div></div>'
   + '<div id="b-out"></div>'
   + '<p class="note">Hourly rates are rough community figures, and rods without a published price are left out entirely rather than guessed at. Prices with a dotted underline on their own page are disputed between sources &mdash; budget the higher one.</p></div>',
 odds: '<div class="tool"><div class="controls">'
   + '<div class="field"><label for="o-t">Rate</label><select id="o-t"></select></div>'
   + '<div class="field"><label for="o-p">Rate, %</label><input id="o-p" type="number" min="0.001" max="100" step="0.001" value="30"></div>'
   + '<div class="field"><label for="o-n">Attempts</label><input id="o-n" type="number" min="1" value="20"></div></div>'
   + '<input id="o-slide" type="range" min="1" max="200" value="20">'
   + '<div class="readout" id="o-out"></div><div class="chartbox"><svg id="o-chart" viewBox="0 0 620 150" width="100%" height="150" role="img" aria-label="Cumulative probability curve"></svg></div>'
   + '<p class="note" id="o-note"></p>'
   + '<div class="warnbox"><strong>The gambler&#8217;s fallacy, stated plainly:</strong> every cast is independent. Forty dry attempts at 1% does not make the forty-first likelier. These numbers tell you how much patience a grind needs on average &mdash; not what you are owed.</div></div>',
 value: '<div class="tool"><div class="controls">'
   + '<div class="field"><label for="v-base">Plain sale value, C$</label><input id="v-base" type="number" min="1" value="8000"></div>'
   + '<div class="field"><label for="v-mut">Mutation</label><select id="v-mut"></select></div>'
   + '<div class="field"><label for="v-weight">Weight vs. average</label><select id="v-weight"></select></div>'
   + '<div class="field"><label for="v-overlord">Sea Overlord enchant</label><select id="v-overlord"><option value="1">No</option><option value="1.25">Yes &mdash; +25% weight</option></select></div></div>'
   + '<div class="checkgrid"><label><input type="checkbox" id="v-shiny"> Shiny (1.85&times;, appraisal-safe)</label>'
   + '<label><input type="checkbox" id="v-spark"> Sparkling (1.85&times;, appraisal-safe)</label></div>'
   + '<div class="readout" id="v-out"></div><div class="stack" id="v-stack"></div>'
   + '<p class="note">A model of the multiplier structure, not the game&#8217;s exact arithmetic &mdash; Fisch does not publish its value formula, and weight scaling in particular is an approximation here. Use it to compare two catches, not to predict a sale.</p></div>'
};
const TOOLLEDE = {
 path: "Tell it your level, your best rod, your bank balance and what you have already unlocked. It walks the same milestone list the <a href=\"#/g/progression\">roadmap</a> uses, works out where you actually are, and gives you the next five things to do &mdash; in order, with what each one costs and where to earn it. Your answers save in this browser.",
 budget: "Every rod in this wiki that carries a published price, sorted against what you have in the bank &mdash; what you can buy right now, and how long the next ones are away at your current earning rate.",
 odds: "Fisch does not publish most of its drop rates, so this tool does not pretend to know them. Pick one of the rates that <em>is</em> published &mdash; the rod and enchant passives &mdash; or type in the rate you believe, and it will tell you what a given number of attempts actually buys.",
 value: "A fish sells for its species&#8217; base value scaled by weight and then multiplied by whatever mutation and attributes it carries. This models that structure so you can see what a mutation is actually worth before you decide whether to <a href=\"#/e/appraisal\">appraise</a> it."
};

function buildTool(k) {
  const url = urlTool(k), d = 2;
  const body = crumb(d, [["Tools", null], [D.TOOLS[k].n, null]])
    + '<h1 class="pt">' + D.TOOLS[k].n + '</h1><p class="lead">' + TOOLLEDE[k] + "</p>" + TOOLBODY[k];
  reg(url, d);
  write(url, shell({url, depth: d, title: strip(D.TOOLS[k].n) + " — Fisch Field Guide",
    desc: strip(TOOLLEDE[k]).replace(/\s+/g, " ").trim().slice(0, 180), body: links(body, d)}));
}

/* ── generated client assets ──────────────────────────────────────────────
   Pages sit at different depths, so anything emitted here uses a {{B}} token
   where a path prefix belongs; site.js swaps it for window.BASE on injection. */
const tok = html => String(html).replace(/href="(#\/[^"]+)"/g, (all, h) => {
  const t = resolveHash(h);
  return t ? 'href="{{B}}' + rootPath(t) + '"' : 'href="{{B}}"';
});

function buildAssets() {
  /* search index */
  const idx = D.DB.map(e => ({
    u: rootPath(urlEntry(e)), n: e.name, t: D.CATS[e.type].n,
    h: (strip(e.name) + " " + strip(D.CATS[e.type].n) + " " + strip(e.lead || "") + " "
      + (e.info || []).map(r => strip(r[0]) + " " + strip(r[1])).join(" ")).toLowerCase().replace(/\s+/g, " ")
  })).concat(Object.keys(D.CATS).map(t => ({u: rootPath(urlCat(t)), n: D.CATS[t].n, t: "Index",
      h: strip(D.CATS[t].n).toLowerCase() + " index list all"})))
    .concat(Object.keys(GUIDES_BODY).map(k => ({u: rootPath(urlGuide(k)), n: GUIDES_BODY[k].n, t: "Guide",
      h: strip(GUIDES_BODY[k].n).toLowerCase() + " guide walkthrough"})))
    .concat(Object.keys(D.TOOLS).map(k => ({u: rootPath(urlTool(k)), n: D.TOOLS[k].n, t: "Tool",
      h: strip(D.TOOLS[k].n).toLowerCase() + " tool calculator planner"})));
  write("assets/search-index.js", "window.SEARCH_INDEX=" + JSON.stringify(idx) + ";\n");

  /* data the tool pages need, milestone predicates included */
  const rods = D.RODS.map(r => ({id: r[0], n: r[1], stage: r[2], cost: r[3], costL: tok(r[4]), src: tok(r[5]), tier: r[6], u: rootPath(urlEntry(BY[r[0]]))}));
  const ms = D.MILESTONES.map(m => "{id:" + JSON.stringify(m.id) + ",ph:" + m.ph + ",t:" + JSON.stringify(m.t)
    + ",cost:" + (m.cost || 0) + ",lvl:" + (m.lvl || 0) + ",where:" + JSON.stringify(tok(m.where))
    + ",body:" + JSON.stringify(tok(m.body)) + ",done:" + m.done.toString() + "}");
  const muts = D.MUTS.filter(m => m[2]).map(m => ({n: m[1], v: m[2]}));
  const farms = [];
  for (let s = 0; s <= 9; s++) { const f = D.farmFor(s); farms.push({n: f[0], u: tok('href="' + f[1] + '"').replace(/^href="|"$/g, ""), r: f[2]}); }
  var ordTable = {}; D.RODS.forEach(function (r, i) { ordTable[r[0]] = i; });
  write("assets/app-data.js",
    "/* generated by tools/build-site.js — do not edit */\n" +
    "window.RODORD=" + JSON.stringify(ordTable) + ";\n" +
    "function ordOf(id){return window.RODORD[id]===undefined?0:window.RODORD[id];}\n" +
    "window.STAGES=" + JSON.stringify(D.STAGES) + ";\n" +
    "window.RODS=" + JSON.stringify(rods) + ";\n" +
    "window.PHASES=" + JSON.stringify(D.PHASES) + ";\n" +
    "window.MUTS=" + JSON.stringify(muts) + ";\n" +
    "window.FARMS=" + JSON.stringify(farms) + ";\n" +
    "window.MILESTONES=[" + ms.join(",\n") + "];\n");

  /* hand-written assets */
  ["style.css", "site.js"].forEach(f => {
    fs.mkdirSync(path.join(OUT, "assets"), {recursive: true});
    fs.copyFileSync(path.join(SRC, "assets", f), path.join(OUT, "assets", f));
  });
  ["favicon.svg", "og.png"].forEach(function (f) {
    const src = path.resolve(__dirname, "..", f);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(OUT, f));
  });
  /* the footer links to the sibling wiki; build.sh generates it before we run */
  const lp = path.resolve(__dirname, "..", "lineage-piece.html");
  if (fs.existsSync(lp)) fs.copyFileSync(lp, path.join(OUT, "lineage-piece.html"));
}

/* ── 404, sitemap, robots ─────────────────────────────────────────────── */
function buildExtras(siteUrl) {
  const body = '<h1 class="pt">Page not found</h1>'
    + '<p class="lead">That address is not part of this wiki. Try the search bar above, or start from the <a href="./">main page</a>.</p>'
    + '<div class="catgrid">' + Object.keys(D.CATS).map(t => '<a class="cat" href="' + rootPath(urlCat(t)) + '"><b>'
        + D.CATS[t].n + "</b><span>" + D.DB.filter(e => e.type === t).length + " pages</span></a>").join("") + "</div>";
  write("404.html", shell({url: "404.html", depth: 0, title: "Page not found — Fisch Field Guide",
    desc: "Page not found.", body: body}));

  /* so the committed site/ can be published straight to GitHub Pages */
  write(".nojekyll", "");
  if (siteUrl) {
    const urls = PAGES.map(p => "  <url>\n    <loc>" + siteUrl + rootPath(p.url)
      + "</loc>\n    <changefreq>monthly</changefreq>\n    <priority>" + (p.depth ? "0.7" : "1.0") + "</priority>\n  </url>").join("\n");
    write("sitemap.xml", '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + "\n</urlset>\n");
    write("robots.txt", "User-agent: *\nAllow: /\nSitemap: " + siteUrl + "sitemap.xml\n");
  }
}

/* ── run ──────────────────────────────────────────────────────────────── */
fs.rmSync(OUT, {recursive: true, force: true});
buildHome();
Object.keys(D.CATS).forEach(buildCategory);
D.DB.forEach(buildEntry);
Object.keys(GUIDES_BODY).forEach(buildGuide);
Object.keys(D.TOOLS).forEach(buildTool);
buildAssets();
buildExtras(process.env.SITE_URL || "");
console.log("built " + PAGES.length + " pages into " + path.relative(process.cwd(), OUT) + "/  ("
  + D.DB.length + " entries, " + D.RODS.length + " rods, " + Object.keys(GUIDES_BODY).length + " guides, "
  + Object.keys(D.TOOLS).length + " tools)");
