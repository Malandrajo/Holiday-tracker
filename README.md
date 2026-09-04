# Uxbridge Vets4Pets — Holiday Tracker

A colourful installable app (PWA) for tracking the team's holiday allowance: add team members, set their allowance in weeks, choose whether bank holidays count towards it, and log time off in hours. Works on iPhone and Android once installed, and works offline.

It's a set of static files — no server, no account, no monthly cost. Each phone keeps its own copy of the data, and you keep everyone in sync using the built-in **export / import / print** tools (Data tab), the same way your other apps work.

## What's included

- `index.html`, `style.css`, `app.js` — the app itself
- `manifest.json`, `service-worker.js` — makes it installable and usable offline
- `icons/` — app icon in the sizes iOS and Android need

## Put it on GitHub Pages

1. Create a new repository on your `Malandrajo` GitHub account — e.g. `Uxbridge-Holidays`.
2. Upload every file in this folder to the repository, keeping the `icons` folder as a folder (don't flatten it).
3. Go to the repo's **Settings → Pages**.
4. Under "Build and deployment", set **Source** to "Deploy from a branch", branch `main`, folder `/ (root)`. Save.
5. After a minute or two your app is live at:
   `https://malandrajo.github.io/Uxbridge-Holidays/`

## Install it on a phone

**iPhone (Safari):** open the link above → tap the Share icon → **Add to Home Screen**.

**Android (Chrome):** open the link → tap the ⋮ menu → **Add to Home screen** / **Install app**.

Once installed it opens full-screen with its own icon, just like a normal app, and keeps working without signal.

## Keeping everyone in sync

There's no shared server, so:

- After you set up the team and allowances, go to **Data → Export backup (.json)** and share that file with each teammate (AirDrop, WhatsApp, email — however you'd send any file).
- They open the app, go to **Data → Import**, and pick the file. It replaces what's on their phone with your version.
- From then on, whenever someone logs time off, export again and pass the file along the same way to keep everyone's copy matching — exactly like the export/import you already use in your rota tools.
- **Export payroll CSV** gives a per-person hours summary for the selected year, ready for payroll.
- **Print** opens a clean printable summary — handy for a notice board or a payroll file.

## How the numbers are worked out

- Each person's allowance is entered in **weeks** — 5.6 and 6.6 are quick presets, but the field itself accepts any custom number.
- Contracted hours are tracked as a **history**, not a single fixed number: add a row every time someone's hours change, with the date the new hours started. The app works out exactly how many hours they've earned by adding up each day of the year at whatever rate was in effect that day — so a mid-year contract change, a new starter, or someone leaving partway through the year are all handled automatically and precisely (this matches head office's own day-by-day pro-rata method).
- **Bank holidays are normal working days** — per the practice's leave policy, the 5.6/6.6 week allowance already includes public holidays rather than adding them on top, and staff work them as usual unless someone specifically books a bank holiday off (which then just needs your sign-off, same as any other leave request). So the app doesn't deduct anything automatically for bank holidays — the **Bank Holidays** tab is purely a reference (so you and the team know the dates in case someone wants to book one off), and any bank holiday actually taken as leave is logged the normal way via **Log time off**, which reduces their remaining hours exactly like any other day booked.
- If someone leaves partway through the year, add their leave date on their profile.
- You can add a manual **carry-over** figure per person per year if they're bringing unused hours forward.
- Each person gets a colour — pick one of the presets or tap the custom swatch for any colour you like.
- **Delete** permanently removes a person and their history; **Archive** just hides them from the dashboard while keeping their record.

## Starting data

The team (Oscar, Claire, Saba, Kajol, Maria) is pre-loaded with their correct allowance (weeks) and current contracted hours as a starting point, each dated 1 January — open **Team** and add a contract-hours row for anyone whose hours changed partway through the year (head office's figures) so the numbers match exactly.

## Notes

- Holiday year runs 1 January – 31 December.
- All data stays on-device (localStorage) — nothing is sent anywhere.
- To wipe a phone's data, use **Data → Reset all data**.
