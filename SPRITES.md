# KIST arcade motion

Direction approved by the owner on 15 October 2026: **16 bit**, very large head and tiny body, based on the supplied approved character. Preserve the face, short black curls, silver septum and earrings, striped red/white top, tattoos, blue jeans, black/cream sneakers, cyan/violet edges.

Assets were generated with the built-in imagegen tool from that approved reference. Each atlas is 1536 × 1024 with four columns and two rows of 384 × 512 frames. WebP files preserve full alpha; a separate first-frame poster makes the character visible while the atlas decodes.

| Mode | Frames | Use |
| --- | --- | --- |
| mix | 0,1,2,3,4,5,6,7 | Entrance in front of the logo and music player |
| wave | 0,1,2,3,5,6,7 | Contact section |
| groove | 0,1,2,3,4,6,7 | Interlude after the photo wall |
| run | 0,1,2,3,4,5,6,7 | Side-scrolling interlude before the event archive |

Two generated poses that flipped details are intentionally excluded from wave and groove. The run cycle always faces right. Its movement across the screen is separate from its eight-frame running loop.

The harmonic trail is rendered as three mathematical sine waves on a low-resolution canvas with square pixels. It stays behind the running character; the same system provides the quieter groove backdrop. No waveform asset or third-party animation library is required.

Both sprites and harmonics pause off screen and in hidden tabs. Reduced-motion preference freezes a composed first-frame view. The entrance is a single 3.1-second logo-led sequence: a smaller character settles just below the wordmark, overlaps only its bottom edge, performs one listening gesture and then holds. The player invitation follows the completed entrance rather than interrupting it.

## Prompt set

Common: identity-preserve; exact approved 16-bit arcade character; one transparent 4×2 atlas of eight evenly aligned full-body frames; huge head and tiny body; preserve reference face, outfit, hair, jewelry, tattoos, lighting and pixel treatment; no labels, background scene, grid lines, watermark or side flips.

Mix: subtle headphone-listening and knob-turning loop; slight head nod, quick blink, curls moving a few pixels; fixed black controller with cyan left and magenta right platter rings; return smoothly to the first pose.

Wave: same figure behind the fixed controller; one hand stays at the mixer, the other raises next to the head, performs a small wrist wave and returns; no hand across the face.

Groove: no controller; headphones around neck; gentle alternating weight shift and knee dip with bent elbows, relaxed hands, tiny joyful dance and subtle hair bounce.

Run: no controller or props, black headphones worn over both ears; full side view facing right in all eight frames; real alternating running contacts, compression, passing and flight poses; counter-swinging arms; short chibi body and legs, consistent head position and scale; curls bounce, identity remains unchanged.
