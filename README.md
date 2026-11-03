# Typewell

A focused, Monkeytype-inspired typing website with an on-device adaptive coach.

## What's included

- Timed tests: 15, 30, 60, or 120 seconds.
- Word tests: 10, 25, 50, or 100 words.
- Optional punctuation and numbers.
- Live WPM and accuracy, a result chart, and consistency metrics.
- Missed-key and letter-pair analysis, hesitation detection, and a keyboard heatmap.
- Personalized drills, rhythm practice, and precision practice.
- Practice history and light/dark themes saved in this browser.
- Responsive layouts and mobile keyboard input.

## Run locally

No build step, package installation, backend, or API key is needed.

From this folder, run:

```bash
python -m http.server 8080
```

If your system uses `python3`, use `python3 -m http.server 8080` instead.
Open <http://localhost:8080> in your browser. The home URL opens `practice.html`, and the navigation links to three other independent pages.

## Upload to GitHub

1. Extract `typewell-space-advance.zip` on your computer.
2. Create a GitHub repository, or open the repository you want to use.
3. Choose **Add file > Upload files** and upload the extracted files. Put all extracted HTML, CSS, and JavaScript files directly at the repository root, not inside another folder.
4. Commit the upload. Do not upload only the ZIP if you want GitHub to serve the website.

You can also add this folder to a repository with Git or GitHub Desktop. There are no generated dependencies or build outputs to prepare: the HTML, CSS, and JavaScript files are the complete application.

## Publish with GitHub Pages

1. In the repository, open **Settings > Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select the branch containing these files, usually `main`, and the **/(root)** folder.
4. Save. GitHub will show the website URL in the Pages settings when publishing completes.

The included `.nojekyll` file tells GitHub Pages to serve the static files directly. All application asset paths are relative, so the app also works under a repository subpath. Hosting on GitHub Pages does not require the ChatGPT sign-in used by the original private preview; this source has no authentication backend.

Official publishing guide: <https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site>

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Redirects the GitHub Pages root URL to Practice |
| `practice.html` | Typing tests, virtual keyboard, adaptive coach, and drills |
| `insights.html` | Mistake patterns, hesitation analysis, and practice suggestions |
| `progress.html` | WPM history, personal bests, and practice journal |
| `settings.html` | Typing behavior, themes, import and export |
| `style.css` | Responsive styles, themes, keyboard, and test display |
| `app.js` | Shared client-side logic; initializes the active page only |
| `engine.js` | Statistical learning, pattern ranking, and drill generation |
| `.nojekyll` | Static serving configuration for GitHub Pages |
| `.gitignore` | Excludes common local and secret files from Git |
| `README.md` | Setup, publishing, and implementation notes |

## How the coach works

The coach is a statistical learning engine, not a cloud language model. It records errors for expected keys and letter pairs, and times transitions between keystrokes. Pauses longer than 2.5 seconds are excluded from hesitation analysis. Patterns need at least three observations before they can be ranked. Error rate, relative hesitation, and sample size determine which patterns receive priority.

Personalized practice draws from an English word bank and weights the word mix toward your highest-impact patterns. Before enough practice data exists, a starter mix is used. The model learns from up to 100 recent completed tests. No external AI service or API key is required.

WPM is correct characters divided by five, divided by elapsed minutes. Accuracy counts all character attempts, including mistakes that are later corrected. Backspace changes the current text but does not erase a mistake from the learning history. Consistency describes variation in the cumulative WPM samples collected during a test; very short tests provide limited evidence.

## Four independent pages

Typewell uses four real HTML pages, not hidden sections on one page:

- `practice.html`: tests, adaptive coaching, typing modes, and drills.
- `insights.html`: recurring errors, difficult sequences, and hesitation patterns.
- `progress.html`: recent WPM chart, practice history, and data deletion.
- `settings.html`: behavior controls, themes, and JSON import/export.

The header links between those pages. The landing page, `index.html`, automatically forwards to `practice.html`. The same `engine.js`, `app.js`, and `style.css` files are shared by all pages. Clicking **Build my personal mix** on Insights opens `practice.html?drill=adaptive`, ready to type.

**Your stats and preferences stay connected across pages** because they use the same `typewell-v1` browser `localStorage` key under one domain. Navigate among pages without losing saved tests or theme settings. An active unfinished test cannot be saved when you leave the page; the navigation blocks leaving during an active test.

## Storage and dependencies

Practice results, aggregate key/pair observations, timing samples, and theme preferences use the `typewell-v1` key in browser `localStorage`. They stay in that browser and are not uploaded or synchronized. Moving the website to a different address starts a separate history. This source export contains no practice history, accounts, credentials, or API keys.

Google Fonts supplies DM Sans and DM Mono through a CSS import. System-font fallbacks work when the font service is unavailable. The application otherwise uses native browser APIs and has no third-party JavaScript dependencies.

## Controls

- Click the test, or start typing while the page has focus, to begin.
- Use Backspace to correct the current text.
- Press Tab, then Enter while Tab is held, to restart; or use the restart button.
- Press Escape to release the typing field.
- On mobile, tap the test to open the keyboard.
- After finishing, select **Practice my patterns** for a personalized drill.

## Basic syntax checks

If Node.js is installed:

```bash
node --check app.js
node --check engine.js
```

There is no build command. You can deploy this same folder to any static website host.

## Word-by-word WPM and smooth result charts

After a test, select **Show words history** to see each word's individually calculated WPM.
Select a word to inspect each typed character's or correction's elapsed time since the previous key.
In **Progress**, select **View WPM** beside a saved test to reopen its word history.
Tests saved before this feature was added have no per-word timing data.

Word WPM is the number of correctly typed characters (including a correct word-ending space for completed words), divided by five, divided by the time assigned to that word in minutes. Every typed key, separator, and backspace contributes to its word's measured time, including pauses. The first keystroke starts the overall timer, so that one unknown key interval is estimated from the median of observed intervals (or a 180 ms fallback for exceptionally short tests). Its detail view is labeled accordingly. Partial words are marked. Saved tests include their per-key intervals in the `wordHistory` field of the locally stored JSON. If result saving is disabled, the data is only visible immediately after that test.

The post-test speed graph now draws shape-preserving cubic curves through the **actual measured samples**. This removes sharp line corners without altering or averaging the underlying WPM values.

## Optional Space-to-advance behavior

Open **Settings → Behavior** and enable **Space advances to next word**. While enabled, pressing the Space key advances to the next word even when the current word has no letters or is incomplete. Any omitted letters appear as missed in your completed test results and word-by-word WPM history; the skipped word and its Space keystroke are timed. In a word-count test, pressing Space on the final word also finishes the test.

This toggle defaults to **off**, so the original behavior is unchanged until you enable it. If enabled alongside **Strict space** or **Stop on error → word**, the Space-to-advance setting takes priority for Space. The preference is saved in the same local browser storage as the rest of your settings, and is included in settings exports/imports.
