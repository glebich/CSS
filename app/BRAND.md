# Brand source of truth, and one open item

The visual identity is extracted from two Figma files, per the build
prompt's Section 11.

**Product design direction:** Figma file `yHZK6lcmzVAndYuYTmrYkF`,
page `0:1`. The tokens and component language in `src/styles.css` were
calibrated against the three reference frames named in the spec:

- `3:5360`, the canvas statement pattern
- `7:30495`, the project surface with cards and the dark pill action
- `3:11547`, the drop state with the dotted canvas and floating bottom bar

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
