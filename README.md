# lxyhook site

The landing page for LxYHook (Rivals). Static files, no build step, no npm install:

```
index.html
assets/app.js       scroll chapters, what each chapter switches on, notifications, copy button  (CONFIG is here)
assets/world.js     the ascii world: a three.js scene rendered small, then redrawn as letters by a shader
assets/hud.js       the in-game overlay drawn on top: esp boxes, names, health bars, fov circle, tracers, sound rings
assets/menu.js      a working copy of the Starlight menu (pages, groupboxes, toggles, sliders, dropdowns)
assets/style.css
assets/logo.png     the LY logo, taken from the script (base layer + accent-tinted Y)
assets/vendor/three.module.min.js   three.js r169 (MIT, licence next to it), plus GLTFLoader / meshopt / RoundedBox in vendor/jsm
players.json        the people in the arena (display name, headshot, and a 3D model if there is one)
media/players/      headshots, <id>.webp
media/avatars/      Roblox 3D avatars, <id>.glb (OBJ thumbnail converted to GLB, meshopt + webp)
media/weapons/      keyper_sniper.glb: the Keyper sniper skin (supplied OBJ, centred, converted to GLB + meshopt)
```

## Players

Enemies in the arena wear the avatars in `media/avatars/` and show the `displayName` from `players.json` on their ESP
box. A player without a `model` still shows up by name on a blocky stand-in. To add someone, put their `<id>.glb` in
`media/avatars/` and add `"model": "media/avatars/<id>.glb"` to their entry.

## Things to change

At the top of `assets/app.js`:

```js
const CONFIG = {
  discord: '',   // invite link, e.g. 'https://discord.gg/abc123'
  loader: 'https://api.luarmor.net/files/v4/loaders/d2b05e953ac72861d1cfd7e9297caccd.lua',
};
```

While `discord` is empty the discord buttons stay hidden; once it's set they show up and "the discord" in the copy turns into a link.

## The menu copy

`assets/menu.js` rebuilds the LxYHook window from the live one: 930x560, 210px sidebar in the real tab order, 40px top bar,
two 345px columns of groupboxes, Inter, the default "Starlight" theme colours and accent gradient, 20px checkboxes,
50px slider rows, 72px label + dropdown rows. The Aimbot page matches the live window row for row; the other pages use
the script's own section titles and labels, with a few filler rows where the preview needed one. To add or fix a page,
edit `PAGES` in that file; the shorthand (`t`, `s`, `d`, `l`, `b`, `i`) is explained above it.

## Running it locally

ES modules need a server (opening the file directly won't load them):

```
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Hosting

Live on GitHub Pages: https://engnyg.github.io/lxyhook/

Pages serves the repo's default branch (`claude/fervent-bell-esb6ia`) from `/ (root)`, set in Settings > Pages >
Build and deployment > Deploy from a branch. Every push to that branch redeploys in a minute or two. `.nojekyll` tells
Pages to serve the files as they are. All paths in the site are relative, so it works under `/lxyhook/`.

## Notes

- Without WebGL the page still works; the background becomes a plain gradient and the menu stays interactive.
- With `prefers-reduced-motion` the world slows down and the pointer scramble is off.
