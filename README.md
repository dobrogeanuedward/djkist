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

No source video files were found in the repository or accessible project folders. `heroVideo` remains empty and `films` contains no verified YouTube set. The Fifteen Frames Instagram embed is available; its poster and the other JPG/WebP frames are still images. Original video attachments from other chats have not been recovered. Do not substitute unverified footage or invent event details.

## Bologna / Frequency Quest

The world is now a continuous, original imaginary Bologna: portici, Due Torri, terracotta roofs, Colli and a piazza. Six districts follow the site content from arrival and music to nights, places, the artist and booking. Camera, color, architecture and lighting interpolate rather than changing with hard cuts. This is an artistic interpretation, not a geographic map.

- `WorldExperience.astro`, `world.ts` and `world-renderer.ts` own one fixed background, chapter navigation, lighting and pause. Motion preferences and document/dialog visibility control rendering. Only `kist:audio` playback state and position are consumed; no PCM, BPM or beat analysis is claimed.
- `WorldGate.astro` is the optional quest entrance. The same SoundCloud player, widget lifecycle, persistence, transport and artwork remain in `experience.ts` without changes.
- `world-game.ts` provides a complete optional platformer with three frequencies, safe checkpoints, coyote time, jump buffering, pause/resume, restart, keyboard and touch controls. Falling keeps collected signals. Reach the console to unlock the ending; all site content remains available without playing.
- The game ends by linking back to real listening and dates. Opening the player uses `header-music`, avoiding the hero toggle that could stop existing playback.
- Old isolated interludes and duplicated procedural background loops were retired. The unused Three.js festival entry is no longer shipped; the continuous world and quest use Canvas 2D with no new dependencies.

Build with `npm run build`. The browser workflow checks responsive layout, scrolling chapters, scene pause, game input and completion, reduced motion, poster navigation and the existing SoundCloud persistence contract. Original performance video recovery remains separate from this interaction work.
