# Stackboard

Your Chrome bookmarks as a board on the new tab page. Spaces down the side, stacks of links across, and you can drag anything anywhere.

> **This fork: Brave-hardened Stackboard.** Fork of [swole/stackboard](https://github.com/swole/stackboard) (MIT) with fixes for a Brave report where "New space" and starter packs did nothing and the bookmark import came up empty. Everything still works in Chrome. See [Brave changes](#brave-changes) below.

**[Get it free on the Chrome Web Store](https://chromewebstore.google.com/detail/bgcedhchngcopaefchpkbhioagknnpma?utm_source=github&utm_medium=readme&utm_campaign=oss)**

![A Stackboard board in Catppuccin Mocha over a dusk wallpaper: a Work space with Daily, Design, Dashboards and Docs stacks](docs/mocha.png)

## What it does

- **Themes:** Catppuccin (Latte and Mocha), Gruvbox (light and dark), Nord, and the cream default with a dark version, all in their official colors. Light, dark or follow your system, plus gradients or your own wallpaper with dim and blur. Compact density for big boards, and keys 1 to 9 switch spaces.
- **First run:** copies your bookmarks bar and its folders into a board, one stack per folder. Your originals stay where they are. No bookmarks yet? Pick a starter pack.
- **Drag everything:** spaces, stacks and links, within and across stacks.
- **Undo every delete** with the toast or Ctrl+Z. Chrome has no trash for bookmarks, so this matters.
- **Cards are real links:** Ctrl+click, middle-click and the right-click menu work the way your browser already does. A dot marks links that are already open, and clicking one jumps to that tab.
- **Search every space** from the sidebar (press `/`).
- **Stash this window** (Alt+Shift+S or the toolbar popup): saves every open tab as a stack, one per tab group, and can close them. Open the stack later and they come back as a tab group.
- **Tab bankruptcy** (toolbar popup, under Stash this window): stashes every tab in every window, closes them all and gives you a certificate you can save as an image.

## Where your data lives

Everything is plain Chrome bookmarks under **Other bookmarks → Stackboard** (space folders, then stack folders, then bookmarks). So it syncs through Chrome sync, works offline, and if you uninstall the extension your bookmarks stay put.

No account, no server, no analytics. A few preferences (last space opened, your theme, whether you've answered the one-time rating ask) stay in local storage on your device, and a wallpaper you pick stays in the browser's local database on that device. [Privacy policy](https://stackboard.vercel.app/privacy)

## Permissions

| Permission | Why |
|---|---|
| `bookmarks` | Read and write the Stackboard folder; read your other folders only when you choose to copy them in |
| `tabs`, `tabGroups` | The "already open" dot, saving the current tab, stashing a window and reopening it as a group |
| `storage` | A few local flags (first-run hints) and your appearance settings |
| `favicon` | Site icons from Chrome's own favicon cache |

## Build it yourself

```bash
npm install
npm run build
```

Then open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and pick the `dist` folder. `npm run dev` gives you hot reload while you work.

## Tests

- **Unit** (pure logic: titles, icons, import and stash planning, the rating rule, and contrast checks for every palette):

  ```bash
  npx esbuild tests/unit.test.ts --bundle --platform=node --format=esm --loader:.css=text --outfile=unit.mjs && node unit.mjs
  ```

- **End to end** in a real browser: Chrome for Testing plus puppeteer-core, because branded Chrome ignores `--load-extension` since Chrome 137. Setup and run instructions are in the header of [tests/e2e.mjs](tests/e2e.mjs).

## Stack

Manifest V3, React 18, TypeScript, Vite with the crxjs plugin, Tailwind 4, Zustand and dnd-kit. Built with Claude Code.

## Fork features (0.6.0)

Everything below is optional and set in **Settings** (with a jump bar: Look, Style, Motion, Widgets, Data) or from the **command palette** (Cmd/Ctrl+K). The new tab still makes no network requests unless you switch on the weather.

**Presets**, one click each, all adjustable afterwards: Stackboard, Liquid Glass, Frutiger Aero, Floating, Forest calm, Terminal, Synthwave, Retro OS, Game Boy, Compact, Detailed, Zen. Export and import a look as a JSON file.

**19 palettes**, grouped:

| Group | Palettes |
|---|---|
| Classic | Stackboard, Catppuccin, Gruvbox, Nord |
| Editor favourites | Dracula (and Alucard), Tokyo Night (Night, Day), Rosé Pine (Main, Dawn), One (Dark, Light), Monokai, Solarized |
| Calm and natural | Everforest, Kanagawa (Wave, Lotus) |
| Retro | Synthwave '84, Vaporwave, Phosphor (green CRT), Amber CRT, Game Boy, Windows Classic |
| Y2K | Frutiger Aero (Sky, Night) |

The extra palettes are generated from each theme's official colours by `scripts/palettes.mjs`, which derives all 59 tokens and nudges any that miss WCAG AA; the unit suite checks every variant.

**Style**: surfaces (Flat, Liquid glass, Aero gloss, Floating, Terminal, Retro OS bevels), corners (sharp, soft, round), font (system, rounded, mono, serif; Nunito is bundled for rounded), density (compact, comfortable, spacious) and an optional site line under each link.

**Motion**, each part on its own: amount (off, subtle, full; the OS reduced-motion setting always wins), space switch (instant, fade, slide, zoom via View Transitions), card hover (lift, 3D tilt with shine, glow), entrance (rise, cascade), animated background (aurora, drift, bubbles, synth grid, CRT lines) and a springy drop.

**Widgets** in the spirit of r/startpages, above the stacks: clock with greeting and extra time zones, search with your engine (Brave Search by default), `!bangs` (`!yt`, `!gh`, `!w`, `!r`, `!tr` and more) and your own links as suggestions, to-do (synced across tabs), notes, quote of the day (bundled, offline), calendar, focus timer (pomodoro with a chime), countdown, day/week/month/year progress, weather (Open-Meteo, no key, opt-in), most visited (asks for the optional `topSites` permission only when you switch it on) and a calculator.

**Also fixed**: Chromium injects its own unlayered `body { font-family }` into extension pages, which beat Tailwind's layered rule, so no font setting (upstream's Inter included) ever applied. An unlayered rule fixes it.

> **Note:** this fork is a playground. Lots of features went in to see what's possible; they will be trimmed and organised over the next days.

### 0.8.0

- **Nested folders:** sub-folders inside a stack show as foldable sub-stacks. Drag a stack onto another stack's header to nest it, drag it back onto the board to un-nest, or use Move into stack / Move to space. Search, open-all and undo include sub-stacks.
- **Folding:** every stack and sub-stack folds to its header (remembered per stack), plus Collapse all / Expand all.
- **Right-click everything** (or Shift+F10): spaces, stacks, links, widgets and the clock. Colour-code any of them in the theme's own tints, pick a stack layout (List, Tiles like Brave's top sites, Compact) and width (Normal, Wide), and move, rename or delete from the same menu.
- **Clock:** Left, Centre (big, foreground, search below) or Right; S to XL; System, Bold, Thin, Serif, Mono or Rounded; None, Glow, Neon, Shadow, Outline or Glass, plus glow on hover and a blinking colon.
- **Y2K, built out:** palettes Chrome, Bubblegum, Aqua, Cyber and Vista next to Frutiger Aero; Chrome (brushed metal, chrome capsules) and Aqua (gel, pinstripes) styles; Y2K controls for gloss, glow and its colour, sparkles, reflections and pill shapes; Pinstripes, Checker, Y2K stars, Hearts, Butterflies and Orbs patterns; six Y2K presets.
- **Widgets:** right-click for colour, fold, wide, move earlier/later, hide.
- Tests: unit and tree suites pass, e2e 118/118 in Brave.

### 0.7.0

- **Brave and Apple looks.** Brave: Leo design tokens and the brave-core new tab page (16px cards, Leo elevation, frosted widgets over the wallpaper). Fresh installs in Brave start in this look. Apple: HIG system colours, grouped-list stacks with hairlines, vibrancy sidebar, pill buttons, Apple's curves. Note for anyone building on this: in Chromium `-apple-system` does not resolve; `BlinkMacSystemFont` and `system-ui` do.
- **Settings in real tabs** (Look, Style, Motion, Widgets, Data) in a fixed-size window, with preset previews that show each preset's style, not just its colours.
- **Backgrounds:** 9 gradients (the palette's 3 plus Mesh, Sunset, Aurora, Spotlight, Twilight, Prism, mixed from its accents) and 16 patterns in the theme's colours with a strength slider. **Save as wallpaper** exports the current background as a PNG (or SVG) at screen resolution. `scripts/palettes.mjs` computes a per-palette glow strength so text stays AA on every gradient; the unit suite checks it.
- **Motion:** stars with shooting stars, waves, fireflies and lava backgrounds; swipe and blur space transitions; button press, modal and focus micro-interactions. All still when motion is off or the OS asks for reduced motion.
- **Layout polish** from a design audit: bookmarks on the first screen (clock and search on top, widget cards below the stacks), one left edge for titles and icons, AA text everywhere, a themed focus ring, quieter header actions, a sticky header.

## Brave changes

What went wrong: every write (new space, starter pack, import) first runs `ensureRoot()`, which
waits on a Web Lock shared by all Stackboard tabs. If another Stackboard tab held that lock and
never released it (a frozen or hung background tab), every write waited forever. Since nothing
caught the errors, the button simply "did nothing", and a failed import looked exactly like
"no bookmarks to copy". A fresh Brave profile does not trigger it (the full suite passes there),
which is why it only bites some setups.

| Change | Where |
|---|---|
| Root lock gives up after 3 s and continues (the scan still picks the fullest root), and a known root skips the lock entirely, so refreshes are cheaper too | `src/lib/bookmarks.ts` |
| "Other bookmarks" found by `folderType` instead of the hard-coded id `'2'`; the root scan covers every top-level folder; with two "Other bookmarks" (account storage) the syncing one is used | `src/lib/bookmarks.ts` |
| Failed writes show a toast with the reason instead of doing nothing: spaces, stacks, bookmarks, starter packs, import, drag and drop, delete, export | store `reportError`, modals, `App.tsx` |
| Settings › Troubleshooting › **Copy diagnostics**: browser, top-level folder ids, types and sync state, where the Stackboard folder is, held locks, recent errors (no links) | `src/lib/diagnostics.ts` |
| Says "Brave" and `brave://bookmarks` in Brave, "Chrome" in Chrome | `src/lib/browser.ts` |
| e2e suite runs in Brave (extension loaded over the CDP pipe), works on macOS (Cmd+click) and non-English profiles, plus 4 checks for the above | `tests/e2e.mjs` |

Verified in Brave 1.97 (Chromium 155): 89/89 e2e checks. Unit tests pass.

### Install in Brave

```bash
npm install
npm run build
```

Open `brave://extensions`, turn on **Developer mode**, click **Load unpacked** and pick `dist`.
Turn off the Web Store version of Stackboard first, since only one extension can own the new tab.
Your board carries over: both versions use the same `Stackboard` bookmark folder.

### e2e in Brave

```bash
STACKABLE_TEST_CHROME="/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" STACKABLE_DIST="$PWD/dist" node tests/e2e.mjs
```

## License

[MIT](LICENSE)
