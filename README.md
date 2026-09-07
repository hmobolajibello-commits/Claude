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

## Running it

```bash
open index.html          # macOS
xdg-open index.html      # Linux
python3 -m http.server   # or serve the directory
```

`index.html` is committed, so this repo can go straight to GitHub Pages with no build step.

## Repo layout

```
src/guide.html   the app: markup, CSS, data and router in one fragment
                 (no <html>/<head>/<body> — it publishes directly as a Claude Artifact)
build.sh         lifts the fragment's <title>/<link>/<style> into a <head>, wraps the
                 rest in a document -> index.html
index.html       generated standalone page (committed)
```

Edit `src/guide.html`, then run `./build.sh`.

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

Not affiliated with Prlz's Den or Roblox Corporation.
