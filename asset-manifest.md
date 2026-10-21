# Selected hero media — 20 October 2026

The user supplied both WhatsApp ZIP archives, the standalone video and the YouTube session URL on 20 October 2026. Original Downloads files remain unchanged. Only the selected derivatives below are intended for the public website; incoming media and QA contact sheets remain outside the site source tree.

## Desktop hero

- Original archive: `C:/Users/dobro/Downloads/WhatsApp Unknown 2026-10-20 at 15.46.18.zip`.
- Extracted input: `C:/Users/dobro/Documents/ChatGPT/DJ KIST/media-incoming/archive-1/WhatsApp Video 2026-10-20 at 14.34.32.mp4`.
- Input: H.264, 464 × 832 encoded pixels, 17.165 seconds. The footage is physically sideways without a rotation tag.
- Selection: source seconds 3.000–15.000. Counterclockwise rotation (`transpose=2`) corrects the orientation; the opening camera rotation is excluded.
- Output: `public/media/hero/kist-night-desktop-v1.mp4`, H.264/yuv420p, 832 × 464, 24 fps, exactly 12 seconds, 1,871,107 bytes. Audio removed; fast-start MP4 metadata.
- Poster: `public/media/hero/kist-night-desktop-poster-v1.webp`, extracted at output second 1.2 (source second 4.2), 832 × 464, 32,118 bytes.
- Visual review: upright crowd from beside the console, colorful mural and booth equipment; no baked Instagram sticker. This is crowd atmosphere, not a close-up of the artist.

## Mobile hero

- Input: `C:/Users/dobro/Downloads/WhatsApp Video 2026-10-20 at 14.35.07.mp4`.
- Input: H.264, 480 × 704, approximately 60 fps, 11.996667 seconds.
- Selection: first 12 seconds; crop to `480:592:0:0` removes the bottom 112 pixels containing the baked Instagram support sticker. No generated imagery or retouching.
- Output: `public/media/hero/kist-night-mobile-v1.mp4`, H.264/yuv420p, 480 × 592, 24 fps, exactly 12 seconds, 879,806 bytes. Audio removed; fast-start MP4 metadata.
- Poster: `public/media/hero/kist-night-mobile-poster-v1.webp`, extracted at output second 1.2, 480 × 592, 16,616 bytes.
- Visual review: artist's face, hands and upper console remain visible in four distributed review frames; support sticker and hearts are excluded. The artist is toward the left of the frame, so responsive cover cropping should favor the left side.

## Full session

- User-supplied source: `https://www.youtube.com/live/sP0j9EdBOxc?si=7R97zFRsFIGHmjrK`.
- Site embed ID: `sP0j9EdBOxc`.
- Display title: `KIST — Plug Radio`; label: `PLUG RADIO / 26.09.2026`.
- The session recording is streamed through YouTube; no recording has been downloaded into the repository. The public preview thumbnail is documented separately below.

## Verification

`ffprobe` confirmed both outputs have one H.264 video stream, no audio stream, square pixels, 24 fps and 12-second duration. Desktop output is below 3 MB and mobile output below 1.5 MB. Four distributed frames per output were inspected for orientation, face framing and removal of the baked sticker. Posters match the selected footage. Public derivatives contain no original container metadata.


## Additional selections for the rotating hero — 20 October 2026

The user requested faster rotation through the supplied content. These assets supplement the crowd footage and existing Fifteen Frames stills; the presentation runtime controls their ordering and display duration.

- Desktop purple clip input: `C:/Users/dobro/Documents/ChatGPT/DJ KIST/media-incoming/archive-2/WhatsApp Video 2026-10-03 at 12.42.51.mp4`, from `C:/Users/dobro/Downloads/WhatsApp Unknown 2026-10-20 at 15.47.18.zip`. Source range 0–8 seconds; no crop or synthesized content. Output `public/media/hero/kist-purple-desktop-v1.mp4`: 1024 × 576, 8 seconds, 24 fps, H.264/yuv420p, silent, fast-start, 909,384 bytes. Matching poster `kist-purple-desktop-poster-v1.webp` is extracted at output second 1 (31,910 bytes).
- Mobile purple clip input: same archive, `WhatsApp Video 2026-10-03 at 12.42.42.mp4`. Source range 3–11 seconds; automatic rotation honors the input −90° display matrix, then scales to 480 × 854. Output `public/media/hero/kist-purple-mobile-v1.mp4`: 8 seconds, 24 fps, H.264/yuv420p, silent, fast-start, 709,139 bytes. Matching poster `kist-purple-mobile-poster-v1.webp` is extracted at output second 1 (21,536 bytes). The first half shows the artist at the console; the camera subsequently pans toward the crowd.
- Sharp mural portrait input: same archive, `WhatsApp Image 2026-10-03 at 12.42.37.jpeg`, original 4032 × 3024. Full-frame resizing without retouching to quality-80 WebP yields `public/media/hero/kist-mural-portrait-desktop-v1.webp` (1600 × 1200, 177,992 bytes) and `public/media/hero/kist-mural-portrait-mobile-v1.webp` (900 × 676, 68,552 bytes). The artist occupies the left half; responsive cropping should favor that side.
- Verification: four distributed frames from each video and the optimized mobile portrait were visually inspected. Both videos are upright, contain one video stream and no audio, and have `moov` before `mdat`. Desktop video is below 1.4 MB and mobile below 1 MB. No artist data, page markup or playback runtime was changed in this asset preparation.

## Plug Radio preview — 21 October 2026

- Original public YouTube thumbnail: `https://i.ytimg.com/vi/sP0j9EdBOxc/maxresdefault.jpg`, from the performance supplied by the user. HTTP200 and image dimensions verified.
- Stored unchanged at `public/media/plug-radio-poster-v2.jpg`: 1280 × 720 JPEG, 126,772 bytes. No upscaling, AI reconstruction or facial retouching.
- Replaces a 480 × 360 thumbnail enlarged across the viewport. The new preview keeps 16:9 on all screens and caps its desktop width at 1120px; an explicit play control and 53:12 duration identify the video.

## Notti sky — 21 October 2026

The Canvas2D sky is original procedural code with cached nebula and star textures. The Galaxy background at https://reactbits.dev/backgrounds/galaxy was used as a visual research reference; no third-party component, shader or source code was copied. No new runtime dependency or generated bitmap was added.

## KIST signature v2 — 21 October 2026

- Direction explored with the built-in imagegen tool from the existing wordmark. The user requested a typographic final mark without the mascot, fine multicolor vibration lines and cleaner lettering. Raster drafts were rejected and are not shipped.
- Final production asset `public/media/kist-wordmark-v2.svg`: original geometric K/I/S/T paths, three clipped cyan/violet/lime signal traces and one subtle traveling highlight. Transparent, no external resources, no fonts or scripts. Reduced motion disables the highlight. Used consistently in header, hero, loading screen, footer and watch-page identity; the established separate loading/arcade character remains.
- Transparent PNG export `design/kist-wordmark-v2-master.png` and lossless WebP `public/media/kist-wordmark-v2.webp`, both 2987 × 693, rendered from that SVG without retouching. The editable SVG remains the source.
- Prompt and production notes: `design/kist-logo-v2-prompt.md`.
