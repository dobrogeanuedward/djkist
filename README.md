# KIST — Personal frequency

Astro portfolio by DOGO Studio for DJ KIST, based in Bologna.

Run npm install then npm run dev. Build with npm run build.

Artist content: `src/data/artist.ts`. Verified event and asset sources: `ASSET-SOURCES.md` and `RESEARCH.md`. The older draft notes in `RESEARCH.md` are historical; the current site uses verified photography, the artist's SoundCloud profile and three mixes.

## Work resumed — 20 October 2026

The interrupted chat “Aggiorna evento ottobre” was recovered. This revision preserves the custom SoundCloud player and adds:

- Responsive record spacing and a larger desktop poster/details layout for “Notti” in `src/styles/desktop.css`.
- Three original KIST scenes — Night Drive, Frequency Blocks and Afterhours Maze — with scroll/parallax, animated WebP character, pause control and reduced-motion support. See `KistInterlude.astro`, `KistSprite.astro` and `src/scripts/interludes.ts`. Audio playback state affects the lighting; this is not beat detection or audio analysis.
- Bologna/booking metadata, canonical URL, social previews, Person/WebSite/WebPage structured data, `public/robots.txt` and `public/sitemap.xml`. The current revision permits indexing.
- The confirmed 25 October 2026 Cantina Letteraria market event. “Market dalle 17:00” refers to the market opening, not a separately confirmed KIST set time.

The first world revision shipped in PR #2 (merge commit 186fda3). The development notes below describe the subsequent continuous-city experience.

No source video files were found in the repository or accessible project folders. `heroVideo` remains empty and `films` contains no verified YouTube set. The Fifteen Frames Instagram embed is available; its poster and the other JPG/WebP frames are still images. The selected video originals were supplied on 20 October 2026; see asset-manifest.md. Do not substitute unverified footage or invent event details.

## Bologna / 16-bit scrolling world

The background is an imagined Bologna in 16-bit arcade pixel art: portici, piazza and rooftops share a restrained palette. Separate sky, city, transparent foreground and character planes create 2.5D parallax. There is no separate game, game dialog or required input beyond scrolling.

`WorldExperience.astro`, `world.ts`, `world-renderer.ts` and `world.css` own the continuous background, six-stop navigation, lighting and pause. `WorldGate.astro` places the approved KIST character directly in the scrolling route: she runs with scroll input and pauses when it stops. The world consumes SoundCloud playback state and track progress only; no beat or spectral analysis is claimed. Rendering sleeps while a dialog is open or the document is hidden; reduced motion keeps a static composition.

`experience.ts` keeps the same SoundCloud widget, session and seek behavior. Its header transport now displays the current artwork and title, play/pause and close. Navigation includes Sound, Mondo KIST, Notti, Luoghi, Kist and Contatti, with an accessible compact menu on smaller screens.

`hero-video.ts` selects the user-supplied desktop/mobile silent footage. The hero has its own pause control and static posters for reduced motion. The verified Plug Radio session opens through YouTube only after a click. Provenance is recorded in `asset-manifest.md`; final built-in imagegen prompts and pixel-art assets are recorded in `design/world-art-prompts.md`.

Build with `npm run build`. Browser validation covers the header, hero video, scrolling world and character, parallax layers, reduced motion, media dialogs, event navigation and the SoundCloud persistence contract.
