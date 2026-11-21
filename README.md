# lxyhook site

The landing page for LxYHook (Rivals). It's a plain static site with no build step and no dependencies:

```
index.html
assets/style.css
assets/main.js   copy buttons, the fake menu switches, and every ascii animation
```

## Things to change

At the top of `assets/main.js`:

```js
const CONFIG = {
  discord: '',   // put the invite here, e.g. 'https://discord.gg/abc123'
  loader: 'https://api.luarmor.net/files/v4/loaders/d2b05e953ac72861d1cfd7e9297caccd.lua',
};
```

While `discord` is empty, the discord buttons stay hidden. Once it's filled in, they show up in the top bar and the footer, and "the discord" in the hero note and the faq turns into a link.

The build number and changelog are plain text in `index.html` (search for `build 52`).

## Running it locally

```
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Hosting

Any static host works. For GitHub Pages: Settings > Pages > deploy from a branch, and pick the branch and `/ (root)`.

## Notes on the animations

- Each demo is a `<canvas data-scene="...">`. Every scene draws characters into a grid, and the grid paints itself onto the canvas (`SCENES.*` in `main.js`).
- A scene only runs while it's on screen. With `prefers-reduced-motion` on, each scene shows a single still frame and only redraws when one of its switches is flipped.
- The aim curve demo uses the same five functions as the script's linear aim mode (constant, linear, ease in, ease out, s-curve).
