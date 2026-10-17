# Enigma V3

Enigma is a lightweight, browser-based composition tool built with vanilla JavaScript. V3 refreshes the editor with a Figma-inspired editorial interface: a calm monochrome workspace, purposeful pastel accents, rounded controls, hairline boundaries, and a clearer panel hierarchy.

![Enigma mark](favicon.svg)

## V3 highlights

- Rebuilt the slate-and-blue V2 chrome as a white, ink, and soft-canvas editor system.
- Added the V3 pastel palette to new shape defaults and selection feedback: lilac, lime, cream, mint, and pink stay deliberate rather than decorative.
- Made controls consistently circular or pill-shaped, with mono taxonomy labels and restrained borders instead of heavy shadows.
- Improved the layers panel with a live count and useful empty state.
- Migrates existing V2 saved work into the new `enigma_v3_data` local-storage key on first save.
- Kept the original canvas interactions, local auto-save, keyboard workflow, and JSON/HTML/PNG exports intact.

## Project structure

```text
.
├── index.html                  # App shell and accessible control markup
├── js/
│   └── core/elements.js         # Editor state, rendering, interaction and export engine
├── styles/
│   ├── base/                   # Design tokens and global reset
│   ├── components/             # Layers and properties panel components
│   ├── layout/                 # App, canvas, sidebars and toolbar layout
│   ├── main.scss               # Sass entry point
│   └── main.css                # Compiled stylesheet loaded by index.html
├── fonts/                      # Local font assets
├── DESIGN-figma.md             # Source design analysis used for V3
└── docs/
    └── V3-DESIGN-SYSTEM.md     # Implemented V3 design decisions
```

## Run locally

Open [index.html](index.html) in a modern browser. A local server such as VS Code Live Server is recommended so browser module and export behaviour matches production use.

To rebuild the stylesheet after editing Sass:

```powershell
sass styles/main.scss styles/main.css --no-source-map
```

## Keyboard workflow

| Key | Action |
| --- | --- |
| Arrow keys | Nudge selected element by 5px |
| Shift + Arrow keys | Nudge selected element by 10px |
| Ctrl/Cmd + Z | Undo |
| Ctrl/Cmd + Y | Redo |
| Ctrl/Cmd + C / V | Copy / paste selection |
| Delete / Backspace | Delete selection |
| Escape | Clear selection |
| Double-click text | Edit text |

## Design direction

The implementation follows the `DESIGN-figma.md` system: Inter is the practical figmaSans fallback and JetBrains Mono is used for editorial labels. The primary visual language is black ink on white, supported by the documented pastel blocks. See [the V3 design system](docs/V3-DESIGN-SYSTEM.md) for tokens and implementation notes.

## Roadmap

- Infinite canvas with pan and zoom
- Multi-select and drag selection
- Grouping and nested layer support

Designed and engineered by Sanket Vishwakarma.
