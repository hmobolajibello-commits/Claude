# Study Planner

An installable study planner for students. Enter your subjects, exam date and how many
hours you can study, and it builds a day-by-day plan from today up to the exam.

A progressive web app: add it to your home screen and it opens full screen like a normal
app and keeps working with no connection. No build step, no framework, no backend, no
accounts, no network calls — everything is saved in the browser’s `localStorage` on the
student’s own device.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The whole app — markup, styles, planner logic, install prompt |
| `manifest.webmanifest` | Name, icons, colours, standalone display, Today / All days shortcuts |
| `sw.js` | Service worker: caches the app shell so it launches offline |
| `icons/` | 192px and 512px icons, a maskable 512px icon, and a 180px Apple touch icon |

## What it does

**Inputs (Setup tab)**
- Subjects — add as many as you need, up to 12 (typing `Math, Physics, English` adds all three)
- Exam date — one overall date, any time from tomorrow onward
- Hours available on a school day (Mon–Fri) and on a weekend day (Sat & Sun), in half hours
- Busy days — optional weekday checkboxes for days you can't study at all

**The plan**
- Covers every day from today up to the day before the exam; the exam date itself is marked, not scheduled
- Each day is a school day or a weekend day, and gets that day's hours — busy days get none
- Hours become blocks of about an hour each (15-minute grid, never under 30 minutes, at most 4 a day and never more than you have subjects)
- Subjects rotate continuously across the whole plan, so time lands evenly rather than resetting each day
- Task text follows the calendar: learning and note-taking early on, practice questions in the middle, timed practice near the end, and light revision in the final days

**Views**
- **Today** — only today's blocks, with a progress bar and days-to-exam count
- **All days** — the whole plan grouped by day, plus total hours per subject so you can see the split is fair
- Tick a block on either view to mark it done; ticks are saved immediately

**Changing things** — edit anything on the Setup tab and press *Generate my plan*. The plan
rebuilds from today with whatever days are left, and blocks already ticked stay ticked.
*Clear all saved data* removes everything from the device.

## Installing it

On **Android or desktop Chrome / Edge**, an *Add to your home screen* bar appears the first
time the browser judges the app installable; *Install* triggers the browsers own prompt,
*Not now* hides it for good. The browser menus install entry works too.

On **iPhone and iPad**, Safari has no install event, so the same bar shows the manual steps:
**Share → Add to Home Screen**.

Once installed it launches full screen with no browser chrome, and long-pressing the icon
gives shortcuts straight into **Today** or **All days**.

## Offline

The service worker caches the app shell (page, manifest, icons) on first visit, so after
that the app launches with no connection. Plans are in `localStorage`, which never needed
the network, so an offline launch is a full-featured one.

Navigations are served from the cache and refreshed in the background, so a new deploy
appears on the launch after the one that downloaded it. Editing `index.html` alone needs
no version change; bump `CACHE_VERSION` in `sw.js` when you add or rename a precached
file, and the old cache is deleted on activate.

## Deploying it

Any static host works — there is no server side:

- **Open it directly** — double-click `index.html` and it runs from `file://`, minus the
  service worker (browsers only register those over http/https). Everything else works.
- **GitHub Pages / Netlify / Cloudflare Pages / Vercel** — upload or point the host at this
  folder. In this repo, `build.sh` already copies it into `_site/study-planner/`, so it
  deploys at `/study-planner/` next to the site at the repo root.
- **Any other host** — copy the whole folder; the page, manifest, service worker and icons
  must stay together, and the service worker needs **https** (or `localhost`) to register.

There is no configuration and no API key. To rename it, change the `<title>`, the `<h1>`,
and `name` / `short_name` in `manifest.webmanifest`.

## Notes

- Dates are handled as local `YYYY-MM-DD` strings, so a plan never shifts a day across timezones.
- The page follows the device's light/dark setting and is built for phone screens first.
- The installed app and the same page in the browser share one origin, so they share the
  same saved plan.
- Storage is per-browser: a plan made on a phone won't appear on a laptop, and clearing
  site data clears the plan. If `localStorage` is blocked (private mode), the app still
  works for the session, it just won't remember anything.
- English only, and nothing in it is specific to any country's school system.
