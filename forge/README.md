# forge

Link a Roblox place, describe a game, and ship it.

`forge` is a local command-line app (plus a small web dashboard) that connects to
your Roblox experience through **Open Cloud**, has **Claude** design a game as
data, compiles that into a real `.rbxlx` place file, publishes it to your place,
and then runs a script inside a live cloud server to confirm it actually booted.

```sh
cd forge
npm install                     # only needed for the AI commands
node bin/forge.js link          # connect your Roblox place
node bin/forge.js generate "a neon rooftop parkour course with a shop"
node bin/forge.js deploy games/neon-rooftops
node bin/forge.js verify        # confirm it is live
```

Add `forge` to your path if you like: `npm link`, or
`alias forge="node $PWD/bin/forge.js"`.

## What it actually does

| Step | What happens |
| --- | --- |
| `forge link` | Verifies an Open Cloud API key against your universe, stores it `0600` in `~/.roblox-forge/config.json` |
| `forge new` / `forge generate` | Writes a project directory: settings, a map, and a copy of the Luau runtime |
| `forge build` | Compiles the project into `build/place.rbxlx` -- geometry, services, scripts, generated config modules |
| `forge deploy` | Builds, lints, and `POST`s the place file to `universes/v1/{universe}/places/{place}/versions` |
| `forge iterate` | Sends the project to Claude with a change request, applies the returned edits, rebuilds |
| `forge verify` | Runs a probe script in a real server for the published version and reports bricks, tags and systems |
| `forge run` | Runs any Luau file of yours the same way, with logs |
| `forge ui` | All of the above in a localhost dashboard |

## How it links to Roblox

Through **Open Cloud**, with an API key you create yourself at
[create.roblox.com/dashboard/credentials](https://create.roblox.com/dashboard/credentials).
Never an account password, never a `.ROBLOSECURITY` cookie -- those are both
against Roblox's terms and a bad idea besides.

**An API key is the only option, not a shortcut.** Roblox's OAuth 2.0 ("sign in
with Roblox") does not cover place publishing -- there is no scope for it, so no
app of any kind can publish a place on your behalf from an OAuth login. API keys
are the only credential the publishing endpoint accepts.

When you create the key, add your experience and enable:

| Scope | Needed for |
| --- | --- |
| `universe-places:write` | `deploy`, `publish` |
| `universe:read` | `link`, `status` |
| `universe.place.luau-execution-session:write` | `verify`, `run` |

Also set the key's **IP allowlist** to `0.0.0.0/0` (or your own address) -- an
empty allowlist rejects every request, which is the most common reason `link`
fails.

Then `forge link` asks for two things: the key, and **your game's roblox.com
link** (the numeric place ID works too). It reads the place ID out of the link
and looks the universe ID up for you. That lookup uses a legacy endpoint Roblox
may withdraw, so if it fails, forge asks for the universe ID -- it is the number
in the configure URL for your experience on create.roblox.com.

Three things Open Cloud cannot do, so neither can forge:

- **Create** an experience or a place. Make an empty one in Studio or on the
  website first; forge publishes *into* it.
- Publish to a place you do not own or that the key is not scoped to.
- **List your experiences.** There is no Open Cloud endpoint for it, which is
  why you supply the place yourself instead of picking from a menu.

Publishing **replaces the contents of that place**. Point forge at a place you
are happy to overwrite -- not at a live game with players in it -- and note that
`--saved` uploads a Studio-only copy instead of a live version.

Credentials come from `~/.roblox-forge/config.json`, or from
`ROBLOX_API_KEY` / `ROBLOX_UNIVERSE_ID` / `ROBLOX_PLACE_ID` if you prefer
environment variables (they win over the file, and are never written to it).

## How it builds a game

A project is a directory, and the mapping into a Roblox place is by convention:

```
games/my-obby/
  forge.project.json      -> ReplicatedStorage.Forge.Settings
  map.json                -> Workspace.Map + ReplicatedStorage.Forge.MapData
  src/server/*.server.lua        -> ServerScriptService (Script)
  src/server/modules/*.lua       -> ServerScriptService.Forge (ModuleScript)
  src/client/*.client.lua        -> StarterPlayerScripts (LocalScript)
  src/shared/*.lua               -> ReplicatedStorage.Forge (ModuleScript)
  build/place.rbxlx              <- what gets published
```

**No brick carries a script.** Geometry is data, and a brick becomes
interactive by listing a tag:

```json
{
  "name": "Checkpoint3",
  "size": [18, 2, 18], "position": [0, 24, 310],
  "color": "#2fe08f", "material": "Neon",
  "tags": ["ForgeCheckpoint"],
  "data": { "order": 3, "reward": 75 }
}
```

The behaviour for every tag lives in `src/server/modules/Tags.lua`. Run
`forge tags` for the full list -- kill bricks, checkpoints, coins, conveyors,
moving platforms, jump and speed pads, sell pads, tycoon droppers and buy
buttons, arena spawns.

That split is the whole trick: it is why Claude can design a 300-brick game
without writing a game engine, and why a generated game is still a normal
project you can open and edit by hand.

### The runtime

Copied into every project, so a generated game is self-contained:

| Module | Does |
| --- | --- |
| `Save` | DataStore profiles: retried loads, autosave, `BindToClose` flush, and read-only mode after a failed load so nobody's save gets wiped |
| `Leaderstats` | Currency and wins in the player list |
| `Economy` | The only place currency changes; keeps profile, leaderboard and HUD in step |
| `Tags` | Every map tag, plus checkpoint respawn and one loop for all moving bricks |
| `Shop` | Server-authoritative purchases, re-applied on respawn |
| `Plots` | Tycoon plot claiming, droppers, collectors, buy buttons |
| `Rounds` | Arena intermission / match / winner loop |
| `Hud` (client) | Currency counter, toasts, round banner, shop UI -- all built in code |

`settings.systems` decides which start. `forge.project.json` is the one file you
edit to retune a game; `map.json` is the one file you edit to change the world.

## Templates

```sh
node bin/forge.js templates
node bin/forge.js new games/my-tycoon --template tycoon --seed 7
```

| Template | Loop |
| --- | --- |
| `obby` | Staged obstacle course: checkpoints, lava, conveyors, moving platforms, coins, a finish pad |
| `tycoon` | Claim a plot, buy droppers, a conveyor pays you out |
| `simulator` | Fill a backpack with orbs, sell at the hub, buy capacity and multipliers |
| `arena` | Lobby, timed round in a pit, last one standing wins |

Generation is seeded: the same `--seed` gives the same map every time, a
different one gives a different course.

## Having Claude build it

```sh
node bin/forge.js generate "an underwater base defence game where you buy turrets"
node bin/forge.js iterate games/underwater-base "the second stage is too easy -- add lava and a moving bridge"
```

Claude is given the tag vocabulary and the settings schema, and asked for a
design as JSON: name, settings, map, and -- only when a mechanic genuinely needs
new code -- extra server modules. The result is validated (unique names, working
cross-references, reachable spawn, a floor to land on) and, if something is
wrong, sent back once for repair. Anything still questionable is printed as a
warning rather than silently shipped.

Credentials come from the Anthropic SDK's normal resolution: `ANTHROPIC_API_KEY`,
`ANTHROPIC_AUTH_TOKEN`, or an `ant auth login` profile. Requests run on
`claude-opus-5` with adaptive thinking and server-side refusal fallbacks;
override the model with `FORGE_MODEL`.

## Dashboard

```sh
node bin/forge.js ui
```

Binds to `127.0.0.1:7171`. Link a place, generate a game, build, deploy, request
a change, verify -- with a running activity log. The Roblox API key is never sent
to the browser; the page only sees a masked version and whether the link works.

Projects live in `./games` by default (`FORGE_WORKSPACE` to change it).

## Tests

```sh
node test/run.js
```

34 tests, no network: the XML serializer's property names and colour packing,
the Luau emitter's escaping, map normalization and linting, all four templates
built end to end, the Open Cloud request shape and error messages against an
injected `fetch`, the AI output handling, and the dashboard's routes and path
guards. There is no Luau interpreter here, so `test/luau.js` checks block
structure across the runtime instead -- and `forge verify` is the real check,
since it runs the published place in an actual Roblox server.

## Limits worth knowing

- Publishing overwrites the target place. Use `--saved` while experimenting.
- `forge verify` and `forge run` need at least one published version, and pick
  it up from the version number the last deploy returned.
- Geometry is bricks: no meshes, unions, terrain sculpting or imported assets.
  Those belong in Studio, and a place you edit in Studio will be overwritten by
  the next deploy -- treat the project directory as the source of truth.
- Attributes are not serialized into the place file (Roblox stores them as a
  binary blob); per-brick config travels through the generated `MapData` module
  instead, which is why brick names must be unique.
- A generated game is a real starting point, not a finished product. Play it,
  then `forge iterate`.
