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

- Each person's allowance is entered in **weeks** (e.g. 5.6 or 6.6) and converted to hours using *their own* contracted hours per week — so part-time hours are automatically pro-rated correctly.
- **Bank holidays**: if switched on for someone, the app works out that year's 8 England & Wales bank holidays automatically (New Year's Day, Good Friday, Easter Monday, both May bank holidays, Summer bank holiday, Christmas Day and Boxing Day, including the weekend substitution rule) and deducts a standard day's hours for each one. This is calculated correctly for any past or future year — no need to update it annually.
- One-off extra bank holidays (like a Coronation or Jubilee day) aren't predictable by formula, so add those manually in the **Bank Holidays** tab for the relevant year.
- If someone joins or leaves partway through the year, add their start/leave date on their profile and their allowance is pro-rated automatically.
- You can add a manual **carry-over** figure per person per year if they're bringing unused hours forward.

## Starting data

The team (Oscar, Claire, Saba, Kajol, Maria) is pre-loaded with placeholder hours (40h/week, 5.6 weeks) so you can see the app working straight away — open **Team** and edit each person's real contracted hours and allowance before sharing it out.

## Notes

- Holiday year runs 1 January – 31 December.
- All data stays on-device (localStorage) — nothing is sent anywhere.
- To wipe a phone's data, use **Data → Reset all data**.
