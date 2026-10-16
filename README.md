# Accounting App Builder

A small wizard that asks you how you'd like to track your monthly finances, then writes a detailed **build prompt** (Markdown) that you can hand to an AI coding agent such as Claude Code. That agent then builds you a custom monthly-accounting app.

This tool doesn't do any accounting itself, and it never sees your bank data. It only asks questions.

## How to open it

1. Keep the three files together in one folder: `index.html`, `styles.css`, `app.js`.
2. Double-click **`index.html`**. It opens in your web browser.

That's all. Nothing to install, no account to create, no internet needed (the internet is only used to load the font; without it the page falls back to your system font).

You can also put the folder on any static host (GitHub Pages, Netlify, a shared drive) and open it from there.

## Using it

- Work through the steps on the left: accounts, itemized stores, categories, automation, receipts, output, and safety. Every question is optional.
- Click **Peek at prompt** at the top right at any time to see the prompt update live.
- On the last step, click **Copy to clipboard** or **Download as .md**.
- Any question you skipped shows up in the prompt as `[ASK USER: …]`, so the coding agent will ask you about it rather than guess. The last step lists them, with a button to jump back and answer each one.

Your answers are saved automatically **in this browser only** (localStorage), so you can close the tab and pick up later. **Start over** (top right, click twice) erases them.

## Then what?

1. Make an empty folder for your new app.
2. Open Claude Code (or a similar agent) in that folder.
3. Paste the prompt, or save the downloaded `accounting-app-build-prompt.md` there and ask the agent to build what it describes.
4. When it asks, give it one sample export per account so it can learn your exact file formats.

## Privacy

There is no server and no tracking. Nothing you type leaves the page. Clearing your browser's site data (or clicking **Start over**) removes everything.

## Files

| File | What it is |
|---|---|
| `index.html` | Page shell |
| `styles.css` | All styling (light and dark mode, mobile layout) |
| `app.js` | Wizard steps, autosave, and the prompt generator (`buildPrompt`) |
