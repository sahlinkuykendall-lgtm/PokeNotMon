# PokeNotMon

A 2.5D monster-catching adventure for iPhone, built with plain HTML, CSS and JavaScript.
It runs in the browser, is hosted on GitHub Pages, and installs to your Home Screen like an app.

See **[PLAN.md](PLAN.md)** for the full design and phase roadmap.

## Play it on your iPhone

1. **Turn on GitHub Pages** (one time):
   - Go to the repo on GitHub → **Settings** → **Pages**.
   - Under **Build and deployment**, set **Source** to **Deploy from a branch**.
   - Pick the branch (`main`, or the development branch while testing) and the **/ (root)** folder, then click **Save**.
   - After a minute or two the site is live at `https://<your-username>.github.io/PokeNotMon/`.
2. Open that link in **Safari** on your iPhone.
3. Tap **Share** → **Add to Home Screen**.
4. Launch **PokeNotMon** from your Home Screen. It opens fullscreen and works offline.

> The iPhone ringer switch mutes web audio. Flip it off silent to hear the music.

## Controls

| Action | Touch | Keyboard |
|--------|-------|----------|
| Move | Press or slide your thumb on the D-pad (acts like a joystick) | Arrow keys / WASD |
| Run | Hold **B** while moving | Hold X or Shift |
| Talk, read, confirm | **A**, or tap the dialog box | Z / Enter / Space |
| Cancel / back | **B** | X / Backspace |
| Menu | ☰ button | Esc / M |

The layout is **landscape** by default. Switch to **portrait** in *Menu → Settings*.
Either layout works with the iPhone's rotation lock on, because the game turns itself to fit.

## Run it locally

Any static web server works, for example:

```sh
npx http-server -c-1 .
```

Then open `http://localhost:8080`.

## Project layout

```
index.html            app shell and on-screen controls
manifest.webmanifest  Home Screen / PWA settings
sw.js                 offline cache (bump CACHE when releasing)
css/style.css         UI, controls, and layouts
js/main.js            boot, game loop, save/load flow
js/render.js          2.5D perspective renderer
js/world.js           movement, collision, NPCs, warps, interactions
js/maps.js            towns, routes, and interiors (tile maps + NPC scripts)
js/sprites.js         all pixel art, drawn in code
js/audio.js           chiptune music and sound effects (WebAudio)
js/ui.js              dialogs, menus, title, new game, settings
js/input.js           D-pad, buttons, and keyboard
js/layout.js          landscape/portrait sizing and auto-rotation
tools/icon.html       generates the app icons
```
