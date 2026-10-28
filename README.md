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
Open <http://localhost:8080> in your browser.

## Upload to GitHub

1. Extract `typewell-github.zip` on your computer.
2. Create a GitHub repository, or open the repository you want to use.
3. Choose **Add file > Upload files** and upload the extracted files. Put `index.html`, `style.css`, `app.js`, and `engine.js` directly at the repository root, not inside another folder.
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
| `index.html` | Page structure, metadata, controls, and help dialog |
| `style.css` | Responsive styles, themes, keyboard, and test display |
| `app.js` | Typing interactions, metrics, views, charts, and local storage |
| `engine.js` | Statistical learning, pattern ranking, and drill generation |
| `.nojekyll` | Static serving configuration for GitHub Pages |
| `.gitignore` | Excludes common local and secret files from Git |
| `README.md` | Setup, publishing, and implementation notes |

## How the coach works

The coach is a statistical learning engine, not a cloud language model. It records errors for expected keys and letter pairs, and times transitions between keystrokes. Pauses longer than 2.5 seconds are excluded from hesitation analysis. Patterns need at least three observations before they can be ranked. Error rate, relative hesitation, and sample size determine which patterns receive priority.

Personalized practice draws from an English word bank and weights the word mix toward your highest-impact patterns. Before enough practice data exists, a starter mix is used. The model learns from up to 100 recent completed tests. No external AI service or API key is required.

WPM is correct characters divided by five, divided by elapsed minutes. Accuracy counts all character attempts, including mistakes that are later corrected. Backspace changes the current text but does not erase a mistake from the learning history. Consistency describes variation in the cumulative WPM samples collected during a test; very short tests provide limited evidence.

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
