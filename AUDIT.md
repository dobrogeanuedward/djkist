# KIST — visual and functional review, 2 October 2026

## Reconciled requests

- Real artist photography: two supplied performance frames retouched to remove Instagram interface controls; optimized WebP, automatic full-bleed slideshow, portrait and session poster. Original low-resolution assets retained in the archive, not used as hero portraits.
- Custom branding: KIST wordmark and geometric sigil, black base, cyan/violet/magenta/lime refraction, shared atmospheric treatment and CSS interface icons rather than emoji.
- SoundCloud: the artist's verified linked account and Declinatio electronica set; opt-in native dialog, rotating artwork, pause/resume, bottom dock, connection timeout and retry, direct provider fallback link.
- Motion: procedural entrance waves; shaders; 3D ray-marched crystal with CSS fallback; atmospheric visuals respond to actual playback state/progress. Manual BPM and Tap removed at the user's request. Automatic beat analysis is not claimed: the embedded widget does not provide audio samples. An authorized original audio source is needed for genuinely instantaneous beat/spectral reactivity.
- Mobile: portrait visibility corrected, verbose hero invitation replaced by a compact vinyl preview with centered Play/Pause, safe-area-aware bottom dock, large controls, mobile-native event viewer without desktop perspective, touch swipe, previous/next, cover thumbnails.
- Listening invitation: smaller title and compact “Daje” button, two clear choices, opens the site when playback starts. Fixed header always exposes music access.
- Editorial restraint: removed long framing copy and redundant presentation panels; retained only verified artist, set, session and event material. Venue/session links are compact source credits, not claimed endorsements.

## Verification

- Astro production build passed.
- Visual audit using real 320×740, 390×844 and 768×1000 embedded viewports; prior desktop audit at 1363×936. No horizontal page overflow in inspected mobile views.
- Native SoundCloud playback confirmed during browser audit. Popup opening/closing, slideshow pause, event next (Sinergie → Love (P)ride), past/future empty state verified.
- Browser console checked: no application errors in the inspected run.
- Audit browser lacks WebGL: fallback renderer verified. GPU ray-marching must additionally be checked on a WebGL-capable device; it has not been visually certified in this environment.
- GitHub workflow performs desktop/390/320 screenshots, overflow checks, dialog lifecycle, event navigation and photo viewer checks. Workflow result is independent of the manual observations above.

## Honest outstanding limits

- DOGO R2 migration awaits configured bucket access and public asset origin. Assets are included in public repository/site assets meanwhile.
- No confirmed future dates or uniquely verified YouTube set were available; no fabricated events or namesake videos were added.
- Further Instagram carousel media behind sign-in was not extracted. More original photos and the source performance video would materially improve variety and photographic quality.
- Retouched photos are edited versions of the supplied frames, not new documentary captures.
# Update: approved imagegen branding and transport

- SoundCloud public profile UI verified three own uploads: THIRTYTEEN, Bipolar, Declinatio electronica. Opening selection is random, excluding the previous visit's selection when session storage is available. Current native track metadata updates title, source link and artwork.
- Daje is an explicit play command for initial entry, not a toggle; deliberate pause/resume remains available after entry. Selecting a different mix replaces the previous widget safely. CI includes a deterministic widget-contract regression test, separate from real-provider playback verification.

- Approved generated KIST wordmark applied to hero, header, entrance and footer. Built-in imagegen prompt: interlocking geometric KIST, tactical negative-space cuts and sinusoidal fissure; transparent white production mark. Optimized asset: `public/media/kist-wordmark-imagegen.webp`.
- Desktop hero reserves the left 35% for the identity; photographs are positioned to keep Benedetta's face separate, including portrait-shaped desktop viewports.
- Real SoundCloud playback, pause/resume and transfer of the same dock to the header after leaving the hero verified manually. Circular shadowed close control is on the left.
- Entrance: modular blurred color orbits, procedural waves, DJ above identity and smaller Based in Bologna below. Reduced-motion preference honored.
- Social stack links to verified SoundCloud and Instagram; YouTube explicitly opens a search, not an unverified artist channel.

## Resumed desktop, motion and SEO work — 20 October 2026

The interrupted chat “Aggiorna evento ottobre” was recovered and its last requests reconciled with the repository. This update preserves the custom SoundCloud listening experience while improving the desktop layout and establishing local discovery for KIST in Bologna. Older “draft/noindex”, “no confirmed future dates” and pending-SoundCloud notes describe earlier states and are superseded by the current source and verified asset/event records.

### Changes

- `src/styles/desktop.css` reserves enough room for each tilted record and its metadata, preventing cover/title overlap. “Notti” uses a large poster beside the event information on desktop while keeping the mobile viewer responsive.
- The KIST world now has three original scenes: Night Drive, Frequency Blocks and Afterhours Maze. Scroll changes the scene and parallax; the existing animated character remains part of the experience. A pause button and reduced-motion support apply to the background and character. Rendering pauses when the scene is offscreen or the document is hidden.
- The world responds to SoundCloud playback state through lighting. No beat synchronization, spectral analysis or instantaneous audio reactivity is claimed.
- The home page adds Bologna/booking title and description, canonical URL, Open Graph/Twitter previews and Person/WebSite/WebPage JSON-LD with the verified artist links. `robots.txt` and `sitemap.xml` permit discovery. The market's 17:00 opening is not represented as KIST's unconfirmed set start.
- The 25 October 2026 Cantina Letteraria event and its source links are retained. The distinction between the market opening and the DJ set time remains visible.

### Verification and release state

- Production build passed locally.
- Manual browser checks completed at widths 320, 390, 801, 1440 and 1920 px: no horizontal overflow and no record cover/text overlap.
- Poster enlargement and event switching passed; the inspected application console had no errors.
- Publication of this revision is in progress. The checks above establish the local result, not a completed deployment.

### Video inventory and remaining evidence

- No source video files were found in the repository or accessible project folders. `artist.heroVideo` is empty and `films` is empty.
- The verified Fifteen Frames session uses the Instagram reel embed `DbbEcZJt6uv`. `kist-techno-console.jpg` is a thumbnail from reel `DYpWOdks35v`, not a source video. The other performance frames are JPG/WebP stills; the character animations are WebP assets.
- Original video attachments mentioned in other chats have not been recovered. Integrating them into the hero or other sections requires recovering the actual files or a verified usable source; no substitute footage was added.
