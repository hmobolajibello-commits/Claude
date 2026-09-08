# Study Planner

A single-page study planner for students. Enter your subjects, exam date and how many
hours you can study, and it builds a day-by-day plan from today up to the exam.

One HTML file. No build step, no framework, no backend, no accounts, no network calls —
everything is saved in the browser's `localStorage` on the student's own device.

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

## Deploying it

The app is `index.html` and nothing else, so any static host works:

- **Open it directly** — double-click the file; it works from `file://` with no server.
- **GitHub Pages / Netlify / Cloudflare Pages / Vercel** — upload or point the host at this
  folder. In this repo, `build.sh` already copies it into `_site/study-planner/`, so it
  deploys at `/study-planner/` next to the site at the repo root.
- **Any other host** — drop `index.html` wherever you serve static files.

There is no configuration and no API key. To rename it, change the `<title>` and the `<h1>`.

## Notes

- Dates are handled as local `YYYY-MM-DD` strings, so a plan never shifts a day across timezones.
- The page follows the device's light/dark setting and is built for phone screens first.
- Storage is per-browser: a plan made on a phone won't appear on a laptop, and clearing
  site data clears the plan. If `localStorage` is blocked (private mode), the app still
  works for the session, it just won't remember anything.
- English only, and nothing in it is specific to any country's school system.
