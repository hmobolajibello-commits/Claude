# Roblox wiki apps

Two unofficial, self-contained **wiki apps**, each one HTML file with no framework, no
build dependencies and no network calls beyond Google Fonts:

| App | Source | Deployed at | What it covers |
| --- | --- | --- | --- |
| **Fisch Field Guide** | `src/fisch.html` | `/` — the main site | Roblox's fishing game — 135 pages, a beginner's guide, an eight-phase roadmap and a "where am I" progression planner |
| **Lineage Piece Field Manual** | `src/guide.html` | `/lineage-piece/` | Prlz's Den's anime-crossover action RPG — 164 pages, odds calculator and build planner |

`/fisch/` is kept as an alias of the root for anyone who already has that link.

---

# Fisch Field Guide

An unofficial wiki for **Fisch**, the Roblox fishing game — built around the question the
other wikis do not answer: *given where I actually am, what do I do next?*

## The path planner

The headline tool. Put in your **level**, your **best rod**, your **C$ on hand**, what you
have already unlocked and what you want right now, and it:

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

## 135 pages

| Category | Pages | What's on each page |
| --- | --- | --- |
| Locations | 24 | Stage, how you get there, what to do while you're there, what it gates |
| Rods | 21 | Stage, price, source, passive — the progression spine, not all 230+ rods |
| Items & gear | 20 | Boats, relics, keys, totems, potions, charms, crates |
| Mutations | 22 | Multipliers, and which ones you can manufacture on purpose |
| Mechanics | 15 | The three-part minigame, both kinds of luck, XP maths, weather, appraisal |
| NPCs | 11 | Who sells what, and who hands things over free |
| Fish | 8 | The ones that change a decision — quest fish, money fish, weather-gated holes |
| Baits | 6 | Preferred vs. universal luck, and when each is the wrong choice |
| Enchants | 4 | The exalted enchants the sources actually agree on |
| Bosses & hunts | 4 | Megalodon, Kraken, Abaia, Isonade — and how each one starts |

**Guides:** beginner's guide · progression roadmap (8 phases, saved checklist) · 12 beginner
mistakes · making money · XP & levelling · enchanting · codes · accuracy & sources.

**Tools:** path planner · rod budget planner · drop & catch odds · fish value calculator.

## About the Fisch data

Fisch patches constantly and its community documentation disagrees with itself in exactly
the places you would expect — shop prices, drop rates, anything a recent update touched.
This app **marks the disagreements** rather than picking one reading and sounding certain,
and where the sources are simply thin (the regular enchant pool, several shop prices) it
says so instead of filling the gap with a guess. Every disputed figure carries a dotted
underline and is listed on the *Accuracy & sources* page:

| Disputed | Readings in circulation |
| --- | --- |
| Kraken Rod price | 950,000 C$ vs. 1,333,333 C$ |
| The "extra fish every third catch" passive | Credited to the Rod of the Depths in one source, the Great Dreamer Rod in another |
| Rarity tier count | 12, 17 or 18, plus Limited / Special / Extinct |
| 100% bestiary reward | Aurora Bobber, Aurora Glow Lantern, or the Masterline Rod |
| Totem count | 20 vs. 26 |
| Bait roster size | 25 vs. 62 vs. 65 |
| Money rates per hour | All community estimates under unstated setups |

Data compiled **September 2026**, right after the Skycrest update. Verify anything
expensive at the merchant before you commit to it.

---

# Lineage Piece Field Manual

An unofficial, self-contained **wiki app** for **Lineage Piece**, the One Piece–inspired
anime-crossover action RPG on Roblox by *Prlz's Den*
([game page](https://www.roblox.com/games/104761395312874/Lineage-Piece)).

Built in the shape of a game database — like the Fisch or Sailor Piece community wikis:
a category sidebar, sortable index tables, and a routed page for every single thing in
the game, each with its own infobox and cross-links.

One HTML file. No framework, no build dependencies, no network calls beyond Google Fonts.

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

**Guides:** progression roadmap (6 phases, 33 steps, persisted checklist) · the first hour ·
tier lists (generated from the database) · codes · accuracy & sources.

**Tools:** reroll & drop odds calculator · build planner.

## The app parts

- **Hash router** — every page has its own URL (`#/e/solemn-lament`, `#/c/boss`, `#/t/odds`), so pages are linkable and the back button works.
- **Search** — instant, ranked over names, categories and infobox contents; `/` focuses it, arrows and Enter navigate. Searching `shrine` finds the key, the NPC, the boss that needs it and the island it drops on.
- **Sortable index tables** — click any column; numeric columns sort numerically, so you can rank drop rates or level bands directly.
- **Rarity / tier facet filters** on category pages.
- **Reroll & drop odds calculator** — pick a target (Light fruit 2%, mythic race bucket 0.25%, Haki Book 0.1%, Shrine Key 1%…), set attempts, get cumulative chance, the coin-toss point, 95%-confidence count, currency cost, and a plotted probability curve.
- **Build planner** — choose a damage channel, race, artifact 4-piece and Haki; it stacks only what applies to that channel and names what you'd be wasting.
- **Progression checklist** — saved to `localStorage`.
- **Random page**, light/dark/auto theme, cross-linked "See also" and prev/next within each category.

## Putting it online

The repo is ready to deploy as-is on either host below. Both build with `./build.sh` and
serve the generated `_site/` directory.

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

The build needs nothing but a shell — no Python, no Node, no package install — so there is
nothing to configure and no language version to pin. If a host still refuses to build,
skip the build entirely:

- **Build command:** *(leave empty)*
- **Output / publish directory:** `/` (the repo root)

`index.html` and `lineage-piece.html` are committed and complete, so the site works served
straight from the root (the manual lands at `/lineage-piece.html` rather than
`/lineage-piece/`).
The only thing lost is host-specific metadata: the canonical link and social-card URLs
keep pointing at the GitHub Pages address, and `sitemap.xml` isn't generated.

### What the build does with the host

`build.sh` picks up the deploy URL automatically — Netlify's `$URL`, Cloudflare's
`$CF_PAGES_URL` — and writes it into the canonical link, the Open Graph / Twitter card
URLs, `robots.txt` and `sitemap.xml`. For a custom domain, nothing needs editing; for
anything unusual, `SITE_URL=https://example.com/ ./build.sh`.

`_headers` sets caching and the usual security headers on both hosts.

### GitHub Pages, if you'd rather

`.github/workflows/pages.yml` is set to **manual runs only**, because GitHub Actions is
not allowed to switch Pages on by itself. To use it: **Settings → Pages → Build and
deployment → Source → GitHub Actions**, then run the workflow from the Actions tab. The
site would land at `https://hmobolajibello-commits.github.io/Claude/`.

### Running it locally

```bash
open index.html          # macOS — or lineage-piece.html for the other wiki
xdg-open index.html      # Linux
python3 -m http.server   # or serve the directory
```

Both generated pages are committed, so the repo root is also directly serveable if a host
offers no build step.

## Repo layout

```
src/fisch.html          Fisch app: markup, CSS, data, milestone engine, router and
                        tools in one fragment
src/guide.html          Lineage Piece app, same shape
                        (neither has <html>/<head>/<body>: each publishes directly as a
                         Claude Artifact and as a page of this site)
build.sh                wraps each fragment into a document, adds its site metadata,
                        assembles _site/
index.html              generated Fisch page — the site root (committed)
lineage-piece.html      generated Lineage Piece page (committed)
_site/                  deploy directory (generated, gitignored)
                        index.html + lineage-piece.html + lineage-piece/index.html
                        + fisch/index.html (alias of the root)
favicon.svg  og.png     site icon and social card
_headers                cache and security headers (Cloudflare Pages / Netlify)
netlify.toml            Netlify build config
.github/workflows/      manual GitHub Pages deploy, as an alternative
```

Edit a file in `src/`, then run `./build.sh`.

Both apps share one architecture: a `DB` of entries built by an `E()` helper, a hash
router (`#/e/<id>`, `#/c/<category>`, `#/g/<guide>`, `#/t/<tool>`), a ranked search index
and sortable category tables — everything else (sidebar counts, indexes, search, prev/next,
"see also") derives from the data. In `src/fisch.html` the `MILESTONES` array is the single
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
