# Word Games Single-Page App

This package ships as a single self-contained `index.html` file with inline CSS and JavaScript.

It includes:
- **Anagram Sprint** for Scrabble-style unscrambling practice
- **Word Vault** for spaced recall of memorable words
- **Word Ladder** for short brain-shaping puzzles
- **Challenge Arena** for friend competition through shareable challenge seeds and result cards
- **Local-only persistence** through `localStorage`
- **Backup / restore** so a user can move their history between devices

## Files

- `index.html` — the entire app
- `word_games_readme.md` — configuration notes and rollout guidance

## How to run

Open `index.html` in any modern browser.

No server is required.

## How state is stored

All user data stays in the browser in `localStorage` under the key:

```text
lexispark-state-v1
```

The page does not send gameplay data to a server.

## How backup / restore works

Users can:
- click **Backup** to download a JSON file
- click **Copy JSON** to copy the raw backup payload
- click **Restore** to import a backup JSON file on another device

This is the bridge for multi-device continuity until you add server sync later.

## Configure the Google Form link

Near the top of the script inside `index.html`, update this block:

```js
const APP_CONFIG = {
  googleFormUrl: "https://forms.gle/REPLACE_WITH_YOUR_FORM",
  appName: "LexiSpark",
  feedbackText: "Tell us which game you love most and what should change."
};
```

Replace `googleFormUrl` with your real Google Form URL.

There is also a **Google Form URL override** field inside the UI. That override is stored locally in the browser, which is handy if you deploy multiple copies of the page and want different feedback destinations.

## Recommended simple Google Form fields

Keep the form minimal:

1. **Which game do you like most?**
   - Multiple choice
   - Anagram Sprint
   - Word Vault
   - Word Ladder
   - Challenge Arena

2. **What do you like?**
   - Paragraph

3. **What do you dislike or want changed?**
   - Paragraph

4. **Anything else?**
   - Paragraph

That is enough to capture product signal without creating form fatigue.

## Changing the visual branding

Also in `APP_CONFIG`, you can change:
- `appName`
- `feedbackText`

If you want deeper branding changes, edit the CSS variables near the top of the `<style>` block:

```css
:root {
  --accent: #7c9cff;
  --accent-2: #44d4b0;
  --accent-3: #f7b267;
}
```

## Replacing or expanding the vocabulary list

The word data lives in the `WORD_BANK` array in `index.html`.

Each item looks like this:

```js
{
  word: "pellucid",
  definition: "clear in style or meaning; easy to understand",
  hint: "Think luminous clarity.",
  tags: ["clarity", "adjective"],
  example: "Her pellucid explanation finally made the rule click."
}
```

You can add more entries or swap them out entirely.

### Important Scrabble note

The included word bank is **curated** and useful for practice, but it is **not** an official licensed Scrabble tournament lexicon.

If you want true competitive Scrabble prep, replace the anagram pool with your approved source word list.

## How friend competition works without a server

Because the page is static, it uses a lightweight share model:

- A player creates a challenge
- The challenge generates a shareable code and URL hash
- A friend loads the same seed
- When each player finishes, the app generates a result card
- Result cards can be imported into the arena to compare locally

This gives you social competition without requiring accounts or a backend.

## What you are probably still missing

These are the next upgrades I would prioritize:

### 1. Official or larger lexicon support
For serious Scrabble practice, the default bank is too small. Add a much larger allowed word source and possibly separate modes for:
- common words
- advanced words
- official Scrabble lexicon

### 2. Verified competition
Right now result cards are portable, but not cheat-resistant. If you later add a server, add:
- challenge verification
- tamper-resistant scoring
- shared leaderboards

### 3. Accessibility hardening
The app is already keyboard-friendly, but a production pass should include:
- screen reader testing
- color-contrast review
- reduced-motion settings
- more explicit focus states

### 4. Difficulty personalization
A good next layer is adaptive difficulty based on:
- word length
- prior misses
- response speed
- puzzle completion rate

### 5. Offline installability
A future enhancement is making it a true PWA with:
- service worker
- home-screen install
- cached assets for smoother offline use

### 6. Data version migrations
Before launch, plan for schema evolution. If you later add fields to saved state, add migration helpers so old backups still restore cleanly.

## Suggested deployment options

Because this is a static page, easy deployment targets include:
- GitHub Pages
- Netlify
- Cloudflare Pages
- S3 static hosting
- any plain CDN-backed static host

## Quick acceptance checklist

- [ ] `index.html` opens with no server
- [ ] a game can be started in one click
- [ ] progress survives refresh
- [ ] backup downloads as JSON
- [ ] restore reloads the same state
- [ ] Google Form link opens correctly
- [ ] challenge URL or code can be shared
- [ ] result cards can be imported in the arena

