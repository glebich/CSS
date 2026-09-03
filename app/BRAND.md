# Brand source of truth, and one open item

The visual identity is extracted from two Figma files, per the build
prompt's Section 11.

**Product design direction:** Figma file `yHZK6lcmzVAndYuYTmrYkF`,
page `0:1`. The tokens and component language in `src/styles.css` were
calibrated against the three reference frames named in the spec:

- `3:5360`, the canvas statement pattern
- `7:30495`, the project surface with cards and the dark pill action
- `3:11547`, the drop state with the dotted canvas and floating bottom bar

A second calibration pass measured page 6 (section `323:7107`, frames
`323:118338`, `323:119850`, `323:119753`) and the tokens now carry those
exact values:

- Canvas `#f3f1ef`. Secondary ink `#4f515a`, tertiary `rgba(79,81,90,0.6)`,
  small labels `#696a6b`, body `#262626`, dark controls `#181818`.
- Statements: SF Pro 120/100, weight 510, tracking -2.4px, filled with a
  left-to-right gradient from black to `#4c4c4c` at 65.3 percent,
  background-clipped. The quiet word is set in Thin, not in gray.
- Type pills: 70 tall, padding 30 by 25, radius 91, `rgba(255,255,255,0.5)`,
  24px text. Selected: `linear-gradient(234deg, rgba(192,76,221,0.5),
  rgba(247,104,255,0.5))` with white text. Outline: 2.5px `#212121`.
- Controls: 56 tall, radius 72, pure white, 15px medium. The ask input is
  transparent with a 0.5px `#181818` border at radius 30.
- Top bar: 74 tall, backdrop blur, `rgba(237,235,233,0.1)`. Wordmark
  26.67 Medium with a 0.42px white emboss shadow, `®` in Light 13.33.
  Resident chip: `#f6f6f6` multiplied, radius 9, 13px medium `#4f515a`.
  Avatar: 44px white circle.
- Bottom bar: blurred container, padding 10, gap 5, radius 140; 56px white
  circles for utilities.

The type renders on the SF Pro stack where available; the stack falls back
through Inter and the system metal elsewhere, where the Thin quiet word
degrades gracefully to regular weight.

**Logos:** Figma file `o798c61sKzTcX4Xqtp9Icx`, node `2106:4`
("Avatar Logo", 188 by 188).

## Open item: the exported logo asset

The spec requires the logo to appear only as exported assets from the
Figma file, never redrawn. This build environment's network policy blocks
downloads from figma.com, so the exported bytes could not be committed.

`public/brand/osyle-avatar.svg` is therefore a measured reconstruction
built from the node's design context (geometry, the white to `#7b6bff`
gradient at 51.4 percent, the 43px blur, screen blending), not the export.
It is used only as the favicon. Before launch, export node `2106:4` and
its sibling variants from the file and replace this asset in place; no
code changes are needed. Acceptance criterion 45 stays open until then.

## The landing hero: the Blue UI phone

The landing (`src/views/Landing.tsx`) is light paper with one dark
surface: the hero frame, which opens edge to edge under the nav and
settles into a 40px rounded card over the first sixty percent of a
viewport of scroll (progress rides on the `--p` custom property).

Its hero image is Figma file `d9Fl4WYdMCD8ZKfWapRdU9` (Blue, UI Design),
node `2292:6611`, the Pixel 10 Pro XL "Obsidian" render with the 08:45
lock screen. The same network policy that blocks the logo export blocks
this one, so the phone is rebuilt in markup and CSS from the render
(`.lp-phone`). To use the export itself: save the node as PNG at
`public/brand/hero-phone.png` and set `HERO_IMAGE` in `Landing.tsx` to
`"brand/hero-phone.png"`. Nothing else changes.
