# Roblox wiki apps

Two unofficial wikis for Roblox games, built from one repo:

| Site | Source | Deployed at | Shape |
| --- | --- | --- | --- |
| **Fisch Field Guide** | `src/data/*.js` + `tools/build-site.js` | `/` — the main site | A real multi-page site: **217 pages**, one HTML file each |
| **Lineage Piece Field Manual** | `src/guide.html` | `/lineage-piece/` | A single-file hash-routed app (also publishable as a Claude Artifact) |

---

# Fisch Field Guide

An unofficial wiki for **Fisch**, the Roblox fishing game — built around the question the
other wikis do not answer: *given where I actually am, what do I do next?*

Every page has its own URL and its own HTML file, like a wiki should: `/rods/trident-rod/`,
`/locations/marianas-veil/`, `/guides/beginner/`. No client-side router, no JavaScript
needed to read anything — the scripts only power search, the sortable tables and the tools.

## The path planner

The headline tool, at `/tools/path-planner/`. Put in your **level**, your **best rod**, your
**C$ on hand**, what you have already unlocked and what you want right now, and it:

- works out which of **19 route milestones** you have cleared and which phase you are in;
- gives you the **next five steps in order**, each with its cost, its level gate and where
  to do it;
- marks a step **blocked** when you cannot afford it yet, and tells you how many hours of
  farming that gap is *at your stage*, at the right farm for your stage;
- flags things you **skipped** — the 400 C$ Keepers Altar bribe you never paid, the free
  Fungal Rod you walked past, money sitting unspent on a stage-1 rod;
- infers what your rod proves (you cannot own a Rod of the Depths without having cleared
  Vertigo), so a returning player does not have to re-tick everything.

The planner and the roadmap read **the same milestone list**, so the two can never drift
apart. Your answers save to `localStorage`.

## 194 database pages

| Category | Pages | What's on each page |
| --- | --- | --- |
| Rods | **67** | Stage, price, source, passive, and what it actually does for you |
| Locations | 31 | Stage, how you get there, what to do there, what it gates |
| Mutations | 22 | Multipliers, and which ones you can manufacture on purpose |
| Items & gear | 20 | Boats, relics, keys, totems, potions, charms, crates |
| Mechanics | 17 | The three-part minigame, both kinds of luck, XP maths, crafting, Rod Mastery |
| NPCs | 15 | Who sells what, and who hands things over free |
| Fish | 8 | The ones that change a decision — quest fish, money fish, weather-gated holes |
| Baits | 6 | Preferred vs. universal luck, and when each is the wrong choice |
| Bosses & hunts | 4 | Megalodon, Kraken, Abaia, Isonade — and how each one starts |
| Enchants | 4 | The exalted enchants the sources actually agree on |

**Guides:** beginner's guide · progression roadmap (8 phases, saved checklist) · 12 beginner
mistakes · making money · XP & levelling · enchanting · codes · accuracy & sources.

**Tools:** path planner · rod budget planner · drop & catch odds · fish value calculator.

## On the rod list

Fisch adds rods faster than anyone documents them. The counts published by community
databases in September 2026 are **188, 227, 232, 244 and 257** — they do not agree with each
other either.

This wiki documents the **67 rods it could source a real acquisition route for**, from the
free Flimsy Rod to the 50,000,000 C$ Olympian Godbreaker at level 981. That is not all of
them, and the site says so on the rod index and on the sources page rather than padding the
table. Where a price or route is not consistently published, the row says *"verify in
game"* instead of carrying a number that might cost someone 750,000 C$.

Where sources conflict — and they do, constantly — **both readings are shown** with a dotted
underline, and every dispute is collected on the *Accuracy & sources* page:

| Disputed | Readings in circulation |
| --- | --- |
| How many rods exist | 188 / 227 / 232 / 244 / 257 |
| Kraken Rod price | 950,000 C$ vs. 1,333,333 C$ |
| Ethereal Prism Rod price | 3,500,000 C$ vs. 15,000,000 C$ |
| Leviathan's Fang price | 350,000 C$ vs. 1,850,000 C$ |
| Tempest Rod price | 500,000 C$ vs. 1,850,000 C$ |
| King's Rod price | 100,000 C$ vs. 120,000 C$ |
| Fast / Lucky rod prices | 4,000 vs. 4,500 · 4,500 vs. 5,250 |
| The "extra fish every third catch" passive | Rod of the Depths in one source, Great Dreamer Rod in another |
| Rarity tier count | 12, 17 or 18, plus Limited / Special / Extinct |
| 100% bestiary reward | Aurora Bobber, Aurora Glow Lantern, or the Masterline Rod |
| Totem count | 20 vs. 26 |
| Bait roster size | 25 vs. 62 vs. 65 |

Data compiled **September 2026**, right after the Skycrest update.

## How the site is built

```
src/data/fisch.js       every entry, the rod table, the milestone engine
src/data/guides.js      guide bodies as HTML
src/assets/style.css    one stylesheet for every page
src/assets/site.js      search, sortable tables, checklist and the four tools
tools/build-site.js     the static site generator
site/                   the generated site (committed) — one directory per page
```

`node tools/build-site.js` writes `site/`. Everything else derives from the data: sidebar
counts, category indexes, the search index, "see also" links, prev/next, the sitemap.

Links inside the data use a `#/e/<id>` shorthand and are rewritten into **relative** paths at
build time, so the same output works from a `file://` path, a domain root, or a project
subpath like `/Claude/` without being rebuilt.

To add a page, call `E()` with a category, id, name and an object holding its table row
(`t`), infobox rows (`info`), a `lead` paragraph, optional `sec` sections and `see` links.
To add a rod, add a row to `RODS` in progression order — the planner reads that order.

---

# Lineage Piece Field Manual

An unofficial, self-contained **wiki app** for **Lineage Piece**, the One Piece–inspired
anime-crossover action RPG on Roblox by *Prlz's Den*
([game page](https://www.roblox.com/games/104761395312874/Lineage-Piece)).

Still a single HTML file with its own hash router, 164 pages, an odds calculator and a build
planner. Deployed at `/lineage-piece/`.

## 164 pages

| Category | Pages | What's on each page |
| --- | --- | --- |
| Islands | 13 | Level band, role, key NPCs, collectibles, what not to leave without |
| Bosses | 19 | Location, access (field / summon / portal key), drops, respawn |
| NPCs | 28 | Which island, what they sell, craft or gate |
| Devil fruits | 4 | Roll chance, tier, reroll cost, and the odds math for that rate |
| Races | 8 | Rarity, exact buff list, best channel, roll vs. hand-in |
| Traits | 6 | Tier and standing |
| Weapons | 10 | Tier, crafting NPC, full ingredient list |
| Fighting styles | 11 | Purchase cost and the full mastery requirement |
| Haki | 2 | Effect, gates, and the whole Observation questline in order |
| Accessories | 11 | Drop rate, best channel |
| Artifact sets | 6 | 2-piece, 4-piece, channel, trial difficulty odds |
| Items & keys | 33 | All 9 dungeon keys, materials, collectibles, sources and uses |
| Systems | 13 | Stats, ranks, chests, quests, currencies, Simulated Sea, skill tree, mastery, titles |

Its data also has no official source — figures the community wikis disagree on are marked in
place and listed on its own *Accuracy & sources* page.

---

## Putting it online

The repo is ready to deploy as-is on either host below. Both build with `./build.sh` and
serve the generated `_site/` directory. The build needs **bash and Node 14.14+** — no `npm install`,
no packages — and both hosts ship Node in their build image.

### Cloudflare Pages (recommended)

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Pick `hmobolajibello-commits/Claude`, branch `claude/fisch-wiki-progression-jfb5x0`
3. Build command `bash build.sh` · Build output directory `_site` · Framework preset **None**
4. Save and Deploy

Unlimited bandwidth on the free plan, and a custom domain is one click under
**Custom domains** if you ever want one.

### Netlify

1. [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project** → GitHub
2. Pick the repo and branch

`netlify.toml` already sets the build command and publish directory, so there is nothing
to type. Deploy.

### If a build ever fails

`site/` is committed and complete &mdash; the whole generated wiki, plus a copy of the
Lineage Piece manual. If a host refuses to build, skip the build entirely:

- **Build command:** *(leave empty)*
- **Output / publish directory:** `site`

Everything works from there. The only things lost are host-specific: the sitemap and
`robots.txt` keep pointing at the GitHub Pages address, and the manual lands at
`/lineage-piece.html` rather than `/lineage-piece/`.
The only thing lost is host-specific metadata: the canonical link and social-card URLs
keep pointing at the GitHub Pages address, and `sitemap.xml` isn't generated.

### What the build does with the host

`build.sh` picks up the deploy URL automatically — Netlify's `$URL`, Cloudflare's
`$CF_PAGES_URL` — and writes it into `robots.txt`, the 217-URL `sitemap.xml` and the manual's
canonical and social-card links. The wiki's own page links are relative, so they need no
host at all. For a custom domain nothing needs editing; for anything unusual,
`SITE_URL=https://example.com/ ./build.sh`.

`_headers` sets caching and the usual security headers on both hosts.

### GitHub Pages, if you'd rather

`.github/workflows/pages.yml` is set to **manual runs only**, because GitHub Actions is
not allowed to switch Pages on by itself. To use it: **Settings → Pages → Build and
deployment → Source → GitHub Actions**, then run the workflow from the Actions tab. The
site would land at `https://hmobolajibello-commits.github.io/Claude/`.

### Running it locally

```bash
./build.sh
cd site && python3 -m http.server     # then open http://localhost:8000
```

Serve it rather than opening the files directly: a multi-page site wants directory URLs
(`/rods/`), which `file://` will not resolve. `site/` is committed, so the build step is
optional if you only want to read it.

## Repo layout

```
src/data/fisch.js       Fisch: entries, rod table, milestone engine
src/data/guides.js      Fisch: guide bodies
src/assets/style.css    Fisch: one stylesheet for every page
src/assets/site.js      Fisch: search, tables, checklist, the four tools
tools/build-site.js     the static site generator
site/                   generated Fisch site (committed) — one directory per page
src/guide.html          Lineage Piece: one Artifact-shaped fragment, no
                        <html>/<head>/<body>, so it also publishes as a Claude Artifact
lineage-piece.html      generated Lineage Piece page (committed)
build.sh                builds both, assembles _site/
_site/                  deploy directory (generated, gitignored)
favicon.svg  og.png     site icon and social card
_headers                cache and security headers (Cloudflare Pages / Netlify)
netlify.toml            Netlify build config
.github/workflows/      manual GitHub Pages deploy, as an alternative
```

Edit a file in `src/`, then run `./build.sh`.

Both wikis share one data shape: a `DB` of entries built by an `E()` helper, with sidebar
counts, category indexes, search, prev/next and "see also" all derived from it. The Fisch
site renders that data to static HTML at build time; the Lineage Piece manual renders it in
the browser with a hash router. In `src/data/fisch.js` the `MILESTONES` array is the single
source of truth for both the roadmap checklist and the path planner.

To add a page, call the `E()` helper with a category, id, name and an object holding its
table row (`t`), infobox rows (`info`), lead paragraph, optional `sec` sections and `see`
links. Everything else — sidebar counts, index table, search index, tier lists, prev/next
— derives from that.

## About the data

Lineage Piece has **no official public database** — the developer posts to a Trello and a
Discord, and everything else is community-maintained. This app cross-checks community
wikis and guides (Fandom, Bloxodes, Gamezebo, Gamepur, Pro Game Guides, Kongbakpao,
Roonby, Destructoid, Nerdschalk, Deltia's Gaming, Lineage Piece Site, PCGamesN, Pocket
Tactics, Rolimon's) and **marks the places they disagree** rather than picking one and
sounding certain. Every disputed figure carries a dotted underline in the app and is
listed on the *Accuracy & sources* page:

| Disputed | Readings in circulation |
| --- | --- |
| Max level | 6,000 in most guides, 7,000 in newer ones (level-5000 mobs exist, so the cap is above 5,000) |
| Island level bands | 1–25–75–150 vs 250–600–1000; both are shown on every island page |
| Observation Haki gate | 1,500 in questline write-ups, 500+ in one overview |
| Devil fruit rates | published figures total 97%, not 100% |
| Trait magnitudes | rankings agree, percentages don't |
| Best weapon-build outfit | Solemn's vs Player's |
| RedStone / Lapis ranks | in later patch notes, buffs undocumented |

Data compiled **September 2026 (Frieren patch)**. Recipes, rates and level gates change
with updates — verify anything load-bearing against the in-game Trello before spending a
30-million-coin recipe on it. Codes expire fastest of all.

Not affiliated with Prlz's Den, the Fisch developers, or Roblox Corporation.
