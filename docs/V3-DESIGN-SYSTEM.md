# Enigma V3 design system

## Intent

V3 applies the supplied Figma marketing analysis to an editor surface, rather than reproducing a marketing page. The interface remains a practical design tool: controls stay compact, the canvas remains the visual focus, and pastel colors are used for orientation and creation feedback. The working palette intentionally softens pure black and white into warm charcoal and ivory so long sessions feel calmer.

## Tokens implemented

| Role | Token | Value |
| --- | --- | --- |
| Ink / primary action | `--ink` | `#302d38` |
| Canvas | `--canvas` | `#fffefa` |
| Soft workspace | `--surface-soft` | `#f5f2ed` |
| Hairline border | `--hairline` | `#e4ded6` |
| Lime selection | `--block-lime` | `#e3edca` |
| Lilac creation / hover | `--block-lilac` | `#d9cff0` |
| Cream | `--block-cream` | `#f6eedf` |
| Pink | `--block-pink` | `#f1dde0` |
| Mint | `--block-mint` | `#d7e9d9` |
| Inverse navy | `--block-navy` | `#403c59` |

The source brief's magenta and success tokens are also retained for future promotional and status states. V3 purposefully does not make them default editor colors.

## Type and controls

- Inter is the local `figmaSans` substitute; `JetBrains Mono` is used for panel taxonomy and metadata.
- Panel labels are uppercase mono text with deliberate tracking.
- Text actions are pills; small tool actions and resize handles are circles.
- Buttons use a 40px footprint and primary export uses a black pill, aligning the interaction model with the brief's touch-target guidance.

## Layout and responsive behaviour

- The desktop editor is a three-region workspace: layers, canvas, properties.
- The canvas uses a 16px dot field and a low-elevation paper surface so the work, not the app chrome, carries focus.
- At narrower desktop widths the sidebars contract. At mobile widths the editor maintains a usable minimum workspace and scrolls instead of crushing essential controls.

## Maintenance

Edit Sass in `styles/` by layer: `base` for tokens, `layout` for the shell, and `components` for panels. Compile `styles/main.scss` to `styles/main.css`; `index.html` intentionally loads the compiled file directly so no build tool is required to run the app.
