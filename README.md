# Lineage Piece Field Manual

An unofficial, self-contained web app that guides a player through **Lineage Piece**, the
One Piece–inspired anime-crossover action RPG on Roblox by *Prlz's Den*
([game page](https://www.roblox.com/games/104761395312874/Lineage-Piece)).

It is one HTML file with no build dependencies, no framework and no network calls beyond
Google Fonts — open it and it works, online or off.

## What's in it

**Reference**
- **Island route** — all 13 zones in order, what each one exists to give you, and what not to leave without.
- **Devil fruits** — the four fruits with their published roll rates (Bomb 61% / Flame 24% / Quake 10% / Light 2%) and why Light tops every list.
- **Races** — the seven rarity bands, the six Mythicals that share one 0.25% bucket, and the Exclusive hand-in races that gate style masteries.
- **Traits, weapons, fighting styles, Haki, accessories** — including full crafting recipes (Excalibur Morgan, Solemn Lament, Player's Dagger, Tensa Zangetsu) and every mastery requirement found in the sources.
- **Bosses & keys** — the summon/portal chain that is the real endgame progression, with key drop rates.
- **Simulated Sea, artifact sets, skill tree, rank buffs, stats and currencies.**

**Tools**
- **Progression checklist** — six phases, ~30 steps, with a progress bar. Saved to `localStorage`, so the page remembers where you were on that device.
- **Reroll & drop odds calculator** — pick a target (Light fruit, mythic race bucket, Haki Book, Shrine Key, a 2% outfit…), set an attempt count, and get the cumulative chance, the coin-toss point, the 95%-confidence attempt count, the currency cost, and a plotted probability curve.
- **Build planner** — choose a damage channel (Weapon / Strength / Power) plus race, artifact 4-piece and Haki, and it stacks only the bonuses that actually apply to that channel — then names the ones you'd be wasting.
- **Live filter** — one search box filters every table on the page.
- **Codes** — current list with one-click copy and level requirements.

## Running it

```bash
open index.html          # macOS
xdg-open index.html      # Linux
python3 -m http.server   # or serve the directory
```

`index.html` is committed, so the repo can be published straight to GitHub Pages
with no build step.

## Repo layout

```
src/guide.html   the app: markup, CSS and JS in one fragment (no <html>/<head>/<body>)
build.sh         lifts the fragment's <title>/<link>/<style> into a <head> and wraps
                 the rest in a document -> index.html
index.html       generated standalone page (committed)
```

Edit `src/guide.html`, then run `./build.sh`. The fragment shape is deliberate: the same
file publishes directly as a Claude Artifact, where the document skeleton is supplied by
the host.

## About the data

Lineage Piece has **no official public database** — the developer posts to a Trello and a
Discord, and everything else is community-maintained. This app cross-checks several
community wikis and guides (Fandom, Bloxodes, Gamezebo, Gamepur, Pro Game Guides,
Kongbakpao, Roonby, Destructoid, Nerdschalk, Deltia's Gaming, PCGamesN, Pocket Tactics,
Rolimon's) and **marks the places they disagree** rather than picking one and sounding
certain. Known conflicts, all flagged in the app's *Accuracy & sources* section:

| Disputed | Readings in circulation |
| --- | --- |
| Max level | 6,000 in most guides, 7,000 in newer ones |
| Island level bands | 1–25–75–150 vs 250–600–1000 |
| Observation Haki level gate | 1,500 in questline write-ups, 500+ in one overview |
| Devil fruit rates | published figures total 97%, not 100% |
| Trait magnitudes | rankings agree, percentages don't |
| Best weapon-build outfit | Solemn's vs Player's |

Data compiled **September 2026 (Frieren patch)**. Recipes, rates and level gates change
with updates — verify anything load-bearing against the in-game Trello before spending a
30-million-coin recipe on it. Codes expire fastest of all.

Not affiliated with Prlz's Den or Roblox Corporation.
