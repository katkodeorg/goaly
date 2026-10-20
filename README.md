# Goaly

A minimal goal tracker that lives in your browser. Set daily, weekly or monthly goals, tick them off or rate your effort from 1 to 10, and see what you did when on a calendar.

Live: https://katkodeorg.github.io/goaly/

## Features

- **Daily, weekly and monthly goals.** Each section resets with its period: a weekly goal marked on Tuesday stays done until the week ends, then clears.
- **Tick or effort.** Log a goal as done/not done, or as an effort level from 1 to 10.
- **Calendar.** Coloured dots per goal on every day, or filter to one goal for a heatmap. Click any past day to log something you forgot.
- **Streaks** for consecutive periods, and progress per section.
- **Backup and restore.** Export everything as JSON and restore it later (merge or replace).
- **Local only.** All data is stored in `localStorage`. Nothing leaves your browser.
- Light and dark mode.

## Development

```sh
npm install
npm run dev      # http://localhost:5173/goaly/
npm run build    # builds into docs/ for GitHub Pages
```

Built with Vite, React, TypeScript, Tailwind CSS v4 and [shadcn/ui](https://ui.shadcn.com).

## Deploying

GitHub Pages serves the `docs/` folder on `main`. Run `npm run build`, commit the `docs/` output and push.

## Backup format

```json
{
  "version": 1,
  "goals": [{ "id": "…", "title": "Go to the gym", "cadence": "daily", "kind": "check", "color": "teal", "createdAt": "…" }],
  "entries": [{ "goalId": "…", "date": "2026-10-19", "value": 1 }]
}
```

`cadence` is `daily`, `weekly` or `monthly`. `kind` is `check` (value is always 1) or `effort` (value 1–10).
