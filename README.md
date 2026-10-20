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

Local production build and manual checks at widths 320, 390, 801, 1440 and 1920 px passed: no horizontal overflow or record cover/text overlap, poster zoom and event navigation working, no application console errors. Publication of this revision is in progress; these local checks do not establish that it is already deployed.

No source video files were found in the repository or accessible project folders. `heroVideo` remains empty and `films` contains no verified YouTube set. The Fifteen Frames Instagram embed is available; its poster and the other JPG/WebP frames are still images. Original video attachments from other chats have not been recovered. Do not substitute unverified footage or invent event details.
